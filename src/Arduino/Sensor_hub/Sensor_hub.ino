/*
File description:
    This program is designed to read and control four serial port based sensors using software
    serial, and also control motors (TODO)
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
  Moto control
  presure sensor (analog)
*/
#include <SoftwareSerial.h> 

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
 [Global states]
 ************************************************
*/
String inputstring = "";  //a string to hold incoming data from the PC
String sensorstring = "";  //a string to hold the data from the Atlas Scientific product
String currentport = ""; // current active sensor/motor 
String currentcmd = ""; // current cmd
boolean input_stringcomplete = false;  //have we received all the data from the PC

/************************************************ 
 [Init]
 ************************************************
*/
void setup(){ 
  Serial.begin(38400);   //set baud rate for the hardware serial port to 38400
  ssPH.begin(9600);  //set baud rate for software serial port to 38400 except for pH
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
 [Utils]
 ************************************************
*/
void pringSensorString(String sensorname) {
  Serial.print(sensorname); 
  Serial.print(","); 
  Serial.println(sensorstring); //use the hardware serial port to send that data to the PC
  sensorstring = "";   //clear the string:
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

    currentport = inputstring.substring(0,1); 
    currentcmd  = inputstring.substring(1); 
    Serial.print("IN,");    Serial.print(inputstring); 
    Serial.print(",ss,");   Serial.print(currentport);
    Serial.print(",cmd,");  Serial.println(currentcmd);

    if (currentport.equals("p")) { ssPH.print(currentcmd); } //TODO - empty buffer before and after sending command
    if (currentport.equals("d")) { ssDO.print(currentcmd); } //       to prevent garbage printing and send failure.
    if (currentport.equals("e")) { ssEC.print(currentcmd); } //       May slow down reading.
    if (currentport.equals("o")) { ssOR.print(currentcmd); }
    if (currentport.equals("c")) { ssCL.print(currentcmd); }

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
}




