/*
File description:
    This program is designed to read and control four serial port based sensors using software
    serial, and also control motors and read from the liquid level sensor
    Written for use in the Biomonstaaar project.

Author: Alan Li
Revision: v2.0

This library is free software; you can redistribute it and/or
modify it under the terms of the GNU Lesser General Public
License as published by the Free Software Foundation

- Sensor pinouts:
  (50, 46): ph
  (53, 49): or
  (52, 48): ec
  (51, 47): do
  (10, 11): cl
This can be verified by sending an "i" command to make the sensor identify itself

- issues
  1/ E.C sensor LED is always on but doesn't flash, and dosen't respond to commands

- to do
  Troubleshoot the EC sensor.
  
  20130923 changes
  - added motor control code, tested
  - added eTape liquid sensor code -- does not seem stable, could be the sensor
  - added checksum per print line

  20140114 changes
  - modified main loop
  - serial event handler
  
  
- How to input to the Arduino:
    ph, do, ec, or, cl:
      Input the identifier then the command being sent to specified sensor
      Ex: phc sends command "c" to the ph sensor
    tape:
      etr is the only command - does a single reading
    mc1-4:
      Input mc, the motor number, then command. The commands are h, m, l, and x
        high, medium, low, and stop respectively
      Ex: mc2h sets motor 2 to high speed
          mc1x stops motor 1
Notes:
  Never use the "c" command; constant printing causes corrupt lines
  if no "phx" sent, first pH reading will time out
  first "orr" timed out
  
*/




/*
  main file
 */
#include <SoftwareSerial.h> 
#include <Wire.h>

/************************************************ 
 * [Globals]
 ************************************************
 */
#define DbgPrint  0  // 1 for manual debugging using Arduino terminal
String inputstring = "";  //a string to hold incoming data from the PC
String sensorstring = "";  //a string to hold the data from the Atlas Scientific product
String currentport = ""; // current active sensor/motor 
String currentcmd = ""; // current cmd
boolean input_stringcomplete = false;  //have we received all the data from the PC
int loopCount = 0;

#define SSID_PH  0
#define SSID_OR  1
#define SSID_EC  2
#define SSID_DO  3
#define SSID_CL  4
#define SSID_ET  5  // not serial, not in ssXX[]

String SensorName[] = {
  "pH", "Oxy", "ElCndct", "DisOxy", "Color", "Water"};

int genChecksum(String s) {
  int sum = 0;
  for (int i=0; i<s.length(); i++) sum += s[i];
  return sum;
}

void pringSensorString(int i) {
#if 0 // add checksum 
  String s = SensorName[i] + "," + String(sensorstring) + ",CS,";
  Serial.print(s); Serial.println(genChecksum(s));
#else
  String s = SensorName[i] + "," + String(sensorstring);
  Serial.println(s);
#endif
  sensorstring = "";   //clear the string:
}

/************************************************
 * [eTape] adafruit 12" eTape Liquid Sensor
 ************************************************
 * See http://www.adafruit.com/products/464#Tutorials
 * Connect pin #2 of the sensor to ground, then pin #3 to a 560 ohm resistor. 
 * The other side of the 560 ohm resistor to VCC (3.3V or 5V for example) to 
 * create a resistor divider. The ADC pin connects to the point between the 
 * resistor and sensor.
 */

#define eTape_SERIESRESISTOR 560	// the value of the 'other' resistor
#define eTape_SENSORPIN	  A15 // What pin to connect the sensor to

void etapeControl(int i) { // i only used for sensor name table
  float reading;
  int   intreading;
  delay(100);
  reading = analogRead(eTape_SENSORPIN) + 1; // +1 for reading 0.0 case
  //Serial.println(reading);
  reading = (1023 / reading)  - 1;   // convert the value to resistance
  intreading = eTape_SERIESRESISTOR / reading;
  String s = SensorName[i] + "," + String(intreading) + ",CS,";
  Serial.print(s); 
  Serial.println(genChecksum(s));
}


/************************************************
 * [Motors] on the shield port M1, M2, M3, M4
 ************************************************
 */
#include <Adafruit_MotorShield.h>  // Adafruit Motor Shield v2 
#include "utility/Adafruit_PWMServoDriver.h"

Adafruit_MotorShield AFMS = Adafruit_MotorShield(); // Create the motor shield object with the default I2C address
// Adafruit_MotorShield AFMS = Adafruit_MotorShield(0x61); // Or, create it with a different I2C address (say for stacking)

Adafruit_DCMotor *m[4]; // array id is from 0 to 3

void motorControl() // id is from 1 to 4
{
  uint8_t id = currentcmd[0] - '1' + 1;
  uint8_t speed;

  switch (currentcmd[1]) {
  case 'h': 
    speed = 255; 
    break;
  case 'm': 
    speed = 127; 
    break;
  case 'x': 
    speed = 0;   
    break; // 0 is off
  case 'l': 
  default:  
    speed = 67;  
    break;
  }

  if (DbgPrint) {
    Serial.print("id,");  
    Serial.print(id);
    Serial.print(",speed,");  
    Serial.println(speed);
  }

  id--;
  if (speed==0) {
    m[id]->setSpeed(0);
    m[id]->run(RELEASE);   // turn on motor
  } 
  else {
    //m[id]->setSpeed(30);
    m[id]->run(BACKWARD); //FORWARD
    m[id]->setSpeed(speed);
  }
}

/************************************************
 * [Atlas Sensors - pH, ORP, EC, DO, CL]
 ************************************************
 * - See http://arduino.cc/en/Reference/SoftwareSerial
 * Not all pins on the Mega and Mega 2560 support change interrupts, 
 * so only the following can be used for RX: 
 * 10, 11, 12, 13, 
 * 50, 51, 52, 53, 
 * 62, 63, 64, 65, 66, 67, 68, 69
 * 
 * -following single test result shows what controller worked on what baud rate 
 * 								   Sensor   		38.4k 9.6k
 * SoftwareSerial mySSsensor(50, 46); PH 4th from left	ng	ok
 * SoftwareSerial mySSsensor(53, 49); OR 3rd from left 	ok	ng
 * SoftwareSerial mySSsensor(52, 48); EC 2nd from left 	ng	ng
 * SoftwareSerial mySSsensor(51, 47); DO 1st from left 	ok	ng
 * 
 * - Color sensor
 * SoftwareSerial ssCLR(10, 11); // 38.4k ok
 * 
 * SoftwareSerial ssPH(50, 46); //p
 * SoftwareSerial ssOR(53, 49); //o
 * SoftwareSerial ssEC(52, 48); //e
 * SoftwareSerial ssDO(51, 47); //d
 * SoftwareSerial ssCL(10, 11);
 */

SoftwareSerial ssXX[] = {
  SoftwareSerial(50, 46), //ph
  SoftwareSerial(53, 49), //or
  SoftwareSerial(52, 48), //ec
  SoftwareSerial(51, 47), //do
  SoftwareSerial(10, 11)  //cl
  };

  void sensorControl(int i) { // altlas serial port sensors only
    int waitCnt=0;
    ssXX[i].flush(); 
    ssXX[i].print(currentcmd); 
    if (DbgPrint) { 
      Serial.print("[Dbg]sent cmd="); 
      Serial.print(currentcmd); 
    }
    switch (currentcmd[0]) {
    case 'i': // read version
    case 'r': // read data
      ssXX[i].listen(); 
      while (!ssXX[i].available()) {   //
        if (DbgPrint) Serial.println("[Dbg]waiting...");
        delay(200);
        if (waitCnt++>10) {
          sensorstring = "Time Out Error";
          pringSensorString(i);
          return; // 200x100 = 2 seconds
        }
      }
      while (ssXX[i].available()) {   //while a char is holding in the serial buffer
        delay(100);
        if (DbgPrint) Serial.println("[Dbg]reading...");
        char inchar = (char)ssXX[i].read();   //get the new char
        sensorstring += inchar;   //add it to the sensorString
        //Serial.println(sensorstring);
        if (inchar == '\r') {	 //if the incoming character is a <CR>, set the flag
          pringSensorString(i);
          return;
        }
      }
      break;
    default:  
      break;
    }
    if (DbgPrint) Serial.print("[Dbg]sensorControl done\n");
  }

/************************************************ 
 * [Init]
 ************************************************
 */
void setup(){ 
  Serial.begin(38400);   //set baud rate for the hardware serial port to 38400

    AFMS.begin();  // create with the default frequency 1.6KHz. AFMS.begin(1000); 1KHz
  for (int i=0; i<4; i++)
    m[i] = AFMS.getMotor(i+1);

  ssXX[SSID_PH].begin(9600);  //set baud rate for software serial port to 38400 failed
  ssXX[SSID_DO].begin(38400); 
  ssXX[SSID_EC].begin(38400); 
  ssXX[SSID_OR].begin(38400); 
  ssXX[SSID_CL].begin(38400); 

  // dangerous! input long string may crash. 
  inputstring.reserve(10);   //set aside some bytes for receiving data from the PC
  sensorstring.reserve(50);  //set aside some bytes for receiving data from Atlas Scientific
  currentport.reserve(2);
  currentcmd.reserve(8);
}

/************************************************ 
 * [Serial Events] 
 * the event is not driven by interrupt handler, thus
 * the function needes to be called directly.
 ************************************************
 */
void serialEvent() { 
  char inchar = (char)Serial.read(); //if the hardware serial port receives a char, get the char we just received, add it to the inputString
  inputstring += inchar; 
  if(inchar == '\r') {  //if the incoming character is a <CR>, set the flag
    input_stringcomplete = true;
  } 
} 

/************************************************ 
 * [Main loop]
 ************************************************
 */
void loop() { 
  loopCount++;

  //get input from user or host
  while (input_stringcomplete != true) {	//if a string from the PC has been received in its entierty
    if (Serial.available()) 
      serialEvent();
    //Serial.print(loopCount++); Serial.print("----\n");
    delay(100);
  } 

  currentport = inputstring.substring(0,2); 
  currentcmd  = inputstring.substring(2); 
  if (DbgPrint) {
    Serial.print("[Dbg]IN,"); 
    Serial.print(inputstring); 
    Serial.print(",ss,"); 
    Serial.print(currentport);
    Serial.print(",cmd,"); 
    Serial.println(currentcmd);
  }

  if (currentport.equals("ph")) { 
    sensorControl(SSID_PH);
  } 
  else if (currentport.equals("or")) { 
    sensorControl(SSID_OR);
  } 
  else if (currentport.equals("ec")) { 
    sensorControl(SSID_EC);
  } 
  else if (currentport.equals("do")) { 
    sensorControl(SSID_DO);
  } 
  else if (currentport.equals("cl")) { 
    sensorControl(SSID_CL);
  } 
  else if (currentport.equals("et")) { 
    etapeControl(SSID_ET);
  } 
  if (currentport.equals("mc")) {
    // example: mc2h turns on motor 2 high speed
    // example: mc1x turns off motor 1
    motorControl();
  }

  inputstring = "";   //clear the string:
  input_stringcomplete = false;   //reset the flag used to tell if we have received a completed string from the PC
}

