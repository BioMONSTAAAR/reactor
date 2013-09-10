- Connected GRB, pH, ORP, E.C., D.O. sensors.
- Wrote code to send commands to specific sensors, read each sensor in round-robin

- issues
  1/ E.C sensor LED is always on (red) but doesn't flash, and dosen't respond to commands
	This persists even if you set up the sensor as per the example
  2/ some printing is corrupted, presumably due to serial communication. 
     Workaround could be to check each line on host side, discard corrupted lines.

- to do
  Moto control
  presure sensor (analog)