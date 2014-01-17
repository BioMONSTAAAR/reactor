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
