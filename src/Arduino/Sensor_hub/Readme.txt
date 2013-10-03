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