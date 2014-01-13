/*
File description:
    This program is designed to read and control four serial port based sensors using software
    serial, and also control motors and read from the liquid level sensor
    Written for use in the Biomonstaaar project.

Author: Alan Li
Revision: v1.0

This library is free software; you can redistribute it and/or
modify it under the terms of the GNU Lesser General Public
License as published by the Free Software Foundation

Overview:
- Connected GRB, pH, ORP, E.C., D.O. sensors.
- Wrote code to send commands to specific sensors, read each sensor in round-robin

- issues
  1/ E.C sensor LED is always on but doesn't flash, and dosen't respond to commands
  2/ some printing is corrupted, presumably due to serial communication. 
     Workaround could be to check each line on host side, discard corrupted lines.

- to do
  Debug serial commands
  Troubleshoot the EC sensor.
  
  20130923 changes
  - added motor control code, tested
  - added eTape liquid sensor code -- does not seem stable, could be the sensor
  - added checksum per print line
  
  
- How to input to the Arduino:
    ph, do, ec, or, cl:
      Input the identifier then the command being sent to specified sensor
      Ex: phc sends command "c" to the ph sensor
    mc1-4:
      Input mc, the motor number, then command. The commands are h, m, l, and x
        high, medium, low, and stop respectively
      Ex: mc2h sets motor 2 to high speed
          mc1x stops motor 1
*/
#include <SoftwareSerial.h> 
#include <Wire.h>

/************************************************ 
 [Global states]
 ************************************************
*/
String inputstring = "";  //a string to hold incoming data from the PC
String sensorstring = "";  //a string to hold the data from the Atlas Scientific product
String currentport = ""; // current active sensor/motor 
String currentcmd = ""; // current cmd
boolean input_stringcomplete = false;  //have we received all the data from the PC
boolean tp_constant = false; //constant tape readings

int genChecksum(String s) {
  int sum = 0;
  for (int i=0; i<s.length(); i++) sum += s[i];
  return sum;
}

void pringSensorString(String sensorname) {
  String s = sensorname + "," + String(sensorstring) + ",CS,";
  Serial.print(s); 
  Serial.println(genChecksum(s));

  sensorstring = "";   //clear the string:
}

/************************************************
 [eTape] adafruit 12" eTape Liquid Sensor
 ************************************************
 See http://www.adafruit.com/products/464#Tutorials
 Connect pin #2 of the sensor to ground, then pin #3 to a 560 ohm resistor. 
 The other side of the 560 ohm resistor to VCC (3.3V or 5V for example) to 
 create a resistor divider. The ADC pin connects to the point between the 
 resistor and sensor.
*/

#define eTape_SERIESRESISTOR 560    // the value of the 'other' resistor
#define eTape_SENSORPIN      A15 // What pin to connect the sensor to

void printETapeRead() {
  float reading;
  int   intreading;
  reading = analogRead(eTape_SENSORPIN) + 1; // +1 for reading 0.0 case
  //Serial.println(reading);
  reading = (1023 / reading)  - 1;   // convert the value to resistance
  intreading = eTape_SERIESRESISTOR / reading;
  String s = "TP," + String(intreading) + ",CS,";
  Serial.print(s); 
  Serial.println(genChecksum(s));
}


/************************************************
 [Motors] on the shield port M1, M2, M3, M4
 ************************************************
*/
#include <Adafruit_MotorShield.h>  // Adafruit Motor Shield v2 
#include "utility/Adafruit_PWMServoDriver.h"

Adafruit_MotorShield AFMS = Adafruit_MotorShield(); // Create the motor shield object with the default I2C address
// Adafruit_MotorShield AFMS = Adafruit_MotorShield(0x61); // Or, create it with a different I2C address (say for stacking)

Adafruit_DCMotor *m[4]; // array id is from 0 to 3

void motorControl(uint8_t id, uint8_t speed) // id is from 1 to 4
{
  id--;
  if (speed==0) {
    m[id]->setSpeed(0);
    m[id]->run(RELEASE);   // turn on motor
  } else {
    //m[id]->setSpeed(30);
    m[id]->run(BACKWARD); //FORWARD
    m[id]->setSpeed(speed);
  }
}

/************************************************
 [Four Sensors - pH, ORP, EC, DO]
 These sensors came with separte controlers
 ************************************************
- See http://arduino.cc/en/Reference/SoftwareSerial
 Not all pins on the Mega and Mega 2560 support change interrupts, 
 so only the following can be used for RX: 
 10, 11, 12, 13, 
 50, 51, 52, 53, 
 62, 63, 64, 65, 66, 67, 68, 69

-following single test result shows what controller worked on what baud rate 
                                   Sensor   38.4k 9.6k
                                   (from left)
SoftwareSerial mySSsensor(50, 46); PH 4th   ng    ok
SoftwareSerial mySSsensor(53, 49); OR 3rd   ok    ng
SoftwareSerial mySSsensor(52, 48); EC 2nd   ng    ng
SoftwareSerial mySSsensor(51, 47); DO 1st   ok    ng
*/
SoftwareSerial ssPH(50, 46); //p
SoftwareSerial ssOR(53, 49); //o
SoftwareSerial ssEC(52, 48); //e
SoftwareSerial ssDO(51, 47); //d

/************************************************
 [Color sensor]
 ************************************************
SoftwareSerial ssCLR(10, 11); // 38.4k ok
*/
SoftwareSerial ssCL(10, 11);

/************************************************ 
 [Init]
 ************************************************
*/
void setup(){ 
  Serial.begin(38400);   //set baud rate for the hardware serial port to 38400
  
  AFMS.begin();  // create with the default frequency 1.6KHz. AFMS.begin(1000); 1KHz
  for (int i=0; i<4; i++)
    m[i] = AFMS.getMotor(i+1);
  
  ssPH.begin(9600);  //set baud rate for software serial port to 38400
  ssDO.begin(38400); 
  ssEC.begin(38400); 
  ssOR.begin(38400); 
  ssCL.begin(38400); 
  
  inputstring.reserve(10);   //set aside some bytes for receiving data from the PC
  sensorstring.reserve(50);  //set aside some bytes for receiving data from Atlas Scientific
  currentport.reserve(2);
  currentcmd.reserve(8);
}

/************************************************ 
 [Eents]
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
 [Main loop]
 ************************************************
*/
void loop() { 
  /*
   get input from user or host
  */
  if (input_stringcomplete) {    //if a string from the PC has been received in its entierty

    currentport = inputstring.substring(0,2); 
    currentcmd  = inputstring.substring(2); 
    Serial.print("IN,");    Serial.print(inputstring); 
    Serial.print(",ss,");   Serial.print(currentport);
    Serial.print(",cmd,");  Serial.println(currentcmd);

    if (currentport.equals("ph")) { ssPH.flush(); ssPH.print(currentcmd); }
    if (currentport.equals("do")) { ssDO.flush(); ssDO.print(currentcmd); }
    if (currentport.equals("ec")) { ssEC.flush(); ssEC.print(currentcmd); }
    if (currentport.equals("or")) { ssOR.flush(); ssOR.print(currentcmd); }
    if (currentport.equals("cl")) { ssCL.flush(); ssCL.print(currentcmd); }
    
    // example: mc2h turns on motor 2 high speed
    // example: mc1x turns off motor 1
    if (currentport.equals("mc")) {
      uint8_t id = currentcmd[0] - '1' + 1;
      uint8_t speed;
      switch (currentcmd[1]) {
        case 'h': speed = 255; break;
        case 'm': speed = 127; break;
        case 'x': speed = 0;   break; // 0 is off
        case 'l': 
        default:  speed = 67;  break;
      }
      Serial.print("id,");  Serial.print(id);
      Serial.print(",speed,");  Serial.println(speed);
      
      motorControl(id, speed);
    }
    
    if (currentport.equals("tp")) {
      switch (currentcmd[0]) {
        case 'r': printETapeRead(); break;
        case 'c': tp_constant = true; break;
        case 'e': tp_constant = false; break;
        default: break;
      }
    }
    if (tp_constant) {
      printETapeRead();
    }

    inputstring = "";   //clear the string:
    input_stringcomplete = false;   //reset the flag used to tell if we have received a completed string from the PC
  }

  /*
   read pH
  */
  ssPH.listen(); delay(100);
  while (ssPH.available()) {   //while a char is holding in the serial buffer
    char inchar = (char)ssPH.read();   //get the new char
    sensorstring += inchar;   //add it to the sensorString
    //Serial.println(sensorstring);
    if (inchar == '\r') {     //if the incoming character is a <CR>, set the flag
      pringSensorString("PH");
      break;
    }
  }

  /*
   read ORP
  */
  ssOR.listen(); delay(100);
  while (ssOR.available()) {   //while a char is holding in the serial buffer
    char inchar = (char)ssOR.read();   //get the new char
    sensorstring += inchar;   //add it to the sensorString
    if (inchar == '\r') {     //if the incoming character is a <CR>, set the flag
      pringSensorString("OR");
      break;
    }
  }
  
  /*
   read DO
  */
  ssDO.listen(); delay(100);
  while (ssDO.available()) {   //while a char is holding in the serial buffer
    char inchar = (char)ssDO.read();   //get the new char
    sensorstring += inchar;   //add it to the sensorString
    if (inchar == '\r') {     //if the incoming character is a <CR>, set the flag
      pringSensorString("DO");
      break;
    }
  }
  
  /*
   read EC
  */
  ssEC.listen(); delay(100);
  while (ssEC.available()) {   //while a char is holding in the serial buffer
    char inchar = (char)ssEC.read();   //get the new char
    sensorstring += inchar;   //add it to the sensorString
    if (inchar == '\r') {     //if the incoming character is a <CR>, set the flag
      pringSensorString("EC");
      break;
    }
  }

  /*
   read CL (RGB)
  */
  ssCL.listen(); delay(100);
  while (ssCL.available()) {   //while a char is holding in the serial buffer
    char inchar = (char)ssCL.read();   //get the new char
    sensorstring += inchar;   //add it to the sensorString
    if (inchar == '\r') {     //if the incoming character is a <CR>, set the flag
      pringSensorString("CL");
      break;
    }
  }
  
  /*
   eTape reading
  */
  delay(100);
}




