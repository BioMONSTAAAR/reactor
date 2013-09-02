#include <Atlas.h>
#include <AltSoftSerial.h>

Atlas A = Atlas();

void setup() {
  Serial.begin( 9600 );
  // get version strings for each sensor
  Serial.println( A.version( PORT0 ) );
  Serial.println( A.version( PORT1 ) );
  Serial.println( A.version( PORT2 ) );
  Serial.println( A.version( PORT3 ) );
}

void loop() {
 // get temperature corrected readings
 Serial.println( A.read( PORT0, 23.4 ) );
 Serial.println( A.read( PORT1, 23.4 ) );
 Serial.println( A.read( PORT2, 23.4 ) );
 Serial.println( A.read( PORT3, 23.4 ) );
}
