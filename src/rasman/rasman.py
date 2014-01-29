"""
    Rasman
    Raspberry Pi manager for monitoring and controlling the BioMonstaaar
    algae bioreactor.
    
    Author: Ben Bongalon
    Copyright 2013, BioMonstaaar.org. All Rights Reserved.
"""

from random import random, randint

def info(msg):
    print "INFO: %s" % msg

def error(msg):
    print "ERROR: %s" % msg


class Rasman():
    def __init__(self, config):
        self.controller = config    # @todo: add support for multiple controllers
    
    def initialize_controller(self):
        """Initialize the Arduino controller
        
        Returns:
            'OK' or 'ERROR'
        """
        info("Rasman.send: INIT<cr>")
        return 'OK'
    
    def setmotor(self, id, value):
        """Control a motor's speed
        
        Args:
            id : string, the motor identifier as known by the Arduino
            value: string or int, the motor speed. 0=OFF, 1=LOW, 2=MED, 3=HIGH
        
        Returns:
            'OK' or 'ERROR'
        """
        try:
            value = int(value)
        except ValueError, e:
            error("Not an integer '%s'" % value)
            return 'ERR'
        if value in (0, 1, 2, 3):
            info("Rasman.send: SETMOTOR %s %s<cr>" % (id, value))
            return 'OK'
        else:
            error("Invalid motor value %d... expecting 0, 1, 2 or 3" % value)
            return 'ERR'
    
    def setswitch(self, id, value):
        """Turn on/off a Peltier or light switch

        Args:
            id : string, the switch identifier as known by the Arduino
            value: string or int, the switch value. 0=OFF, 1=ON
                
        Returns:
            'OK' or 'ERROR'
        """
        try:
            value = int(value)
        except ValueError, e:
            error("Not an integer '%s'" % value)
            return 'ERR'
        if value in (0, 1):
            info("Rasman.send: SETSWITCH %s %s<cr>" % (id, value))
            return 'OK'
        else:
            error("Invalid switch value %d... expecting 0 or 1" % value)
            return 'ERR'
    
    def read_all_sensors(self):
        """Read all the sensor values
        
        Returns:
            JSON string, the set of sensor names and measured values
        """
        info("Rasman.send READMEAS<cr>")
        meas = {}
        for p in self.controller['sensors']:
            meas[p] = self.read_sensor(p)
        return meas
    
    def read_sensor(self, param):
        """Read the current sensor value
        
        Input:
            param : string, name of the sensor
        
        Returns:
            the current measurement value
        """
        p = param.upper()
        if p == 'TEMP':
            return 25.0 + round(random()*5.0, 1)
        elif p == 'CO2':
            return round(0.04 + random()*0.1, 3)
        elif p == 'H2OLVL':
            return 30.0 + round(random()*4.0, 1)
        elif p == 'PH':
            return 5.0 + round(random()*4.0, 1)
        elif p == 'LIGHT':
            return 120 + randint(0,20)
        else:
            return None

