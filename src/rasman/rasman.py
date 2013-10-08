"""
    Rasman
    Raspberry Pi manager for monitoring and controlling the BioMonstaaar
    algae bioreactor.
    
    Author: Ben Bongalon
    Copyright 2013, BioMonstaaar.org. All Rights Reserved.
"""

from random import random, randint


class Rasman():
    def __init__(self, config):
        self.controller = config    # @todo: add support for multiple controllers
    
    def read_all_sensors(self):
        """Read all the sensor values
        
        Returns:
            JSON string, the set of sensor names and measured values
        """
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

