'''
File description:
	This program interacts with Arduino sensor hub through one serial port. Written for use 
	in the Biomonstaaar project. 

Author: Alan Li
Revision: v1.0

This library is free software; you can redistribute it and/or
modify it under the terms of the GNU Lesser General Public
License as published by the Free Software Foundation

Overview:
This program collects all sensor data and combines into a line format as
	<sensor name>, <values>, <sensor name>, <values>, <sensor name>, <values>, ...
and writes the line into /tmp/biomon_out.csv
	
It reads motor control instructions from /tmp/biomon_in.csv and drives motors accordingly.

Sample terminal output: 
~/myPiCon$ sudo python oneport_csv_io.py 
	Biomon port= /dev/ttyACM0 baud= 38400
	('readPort rdln=', 'Estimated pre-scale: 2.81\r\n')
	('readPort rdln=', 'Final pre-scale: 3\r\n')
	('readPort rdln=', 'pH,Time Out Error\r\n')
	('readPort rdln=', 'Oxy,Time Out Error\r\n')
	('readPort rdln=', 'ElCndct,Time Out Error\r\n')
	('readPort rdln=', 'DisOxy,63.76\r\r\n')
	('readPort rdln=', 'Color,1,1,0,0,2\r\r\n')
	('readPort rdln=', 'Water,94,CS,906\r\n')
	readAll =  pH,Time Out Error; Oxy,Time Out Error; ElCndct,Time Out Error; DisOxy,63.76; Color,1,1,0,0,2; Water,94,CS,906; 
	loop begin reading ...
	('readPort rdln=', 'pH,7.00\r\r\n')
	('readPort rdln=', 'Oxy,1042.99\r\r\n')
	('readPort rdln=', 'ElCndct,Time Out Error\r\n')
	('readPort rdln=', 'DisOxy,63.76\r\r\n')
	('readPort rdln=', 'Color,1,0,1,1,1\r\r\n')
	('readPort rdln=', 'Water,0,CS,845\r\n')
	pH,7.00; Oxy,1042.99; ElCndct,Time Out Error; DisOxy,63.76; Color,1,0,1,1,1; Water,0,CS,845; 
	loop begin reading ...
	('readPort rdln=', 'pH,7.00\r\r\n')
	('readPort rdln=', 'Oxy,1042.99\r\r\n')
	('readPort rdln=', 'ElCndct,Time Out Error\r\n')
	('readPort rdln=', 'DisOxy,61.31\r\r\n')
	('readPort rdln=', 'Color,1,1,0,0,2\r\r\n')
	('readPort rdln=', 'Water,0,CS,845\r\n')
	pH,7.00; Oxy,1042.99; ElCndct,Time Out Error; DisOxy,61.31; Color,1,1,0,0,2; Water,0,CS,845; 
	loop begin reading ...
	('readPort rdln=', 'pH,7.00\r\r\n')
	('readPort rdln=', 'Oxy,1042.99\r\r\n')
	('readPort rdln=', 'ElCndct,Time Out Error\r\n')
	('readPort rdln=', 'DisOxy,61.31\r\r\n')
	('readPort rdln=', 'Color,1,1,0,0,2\r\r\n')
	('readPort rdln=', 'Water,0,CS,845\r\n')
	pH,7.00; Oxy,1042.99; ElCndct,Time Out Error; DisOxy,61.31; Color,1,1,0,0,2; Water,0,CS,845; 

'''

import os, sys, string
import serial
from datetime import datetime, date, time
from time import sleep

########################################################################

class	Biomon(object):

	def __init__(self, port="/dev/ttyACM0", baudrate=38400):
		self.serial = serial.Serial(port, baudrate)
		self.MsgFilter = 0x0001

	def __str__(self):
		return "Biomon port= %s baud= %d" % (self.serial.port, self.serial.baudrate)

	def io(self, op, inStr, timeOutSec):
		try:
			if (op=="i"):
				'''
				self.serial.setPort(portName)
				self.serial.baudrate = baudrate
				self.serial.parity = serial.PARITY_ODD
				self.serial.stopbits = 1
				self.serial.bytesize = 8
				self.serial.open()
				#self.serial.close()'''
				return
			
			if (op=="c"):
				self.serial.close()
				return
			
			if (op=="f"):
				self.serial.flushInput() # discard all in the input buffer
				self.serial.flushOutput()# discard all write buffer data
				return
			
			if (op=="r"):
				#self.serial.open()
				cnt = 0
				while (self.serial.inWaiting()==0):
					sleep(1)
					cnt += 1
					if (cnt>timeOutSec): # 5 sec
						#self.serial.close()
						return "readPort Time Out Error"
						#print "readPort Time Out Error"
						#break
					
				rdln = self.serial.readline()
				rdlnstr = str(object=rdln)
		
				# # here some checking, setup may needed
				# # if no good, may loop try different baut rate
				# #if len(rdlnstr)>0:
				
				if(self.MsgFilter):
					print ("readPort rdln=", rdln) #,  "; utf=", rdln.decode('utf-8'))
					
				#return rdln.decode('utf-8')
				#self.serial.close()
				return rdln
			
			if (op=="w"):
				#self.serial.open()
				self.serial.write(inStr)
				#self.serial.flush()
				#self.serial.close()
				return inStr
			 
		except IOError as e:
			if(self.MsgFilter):
				print ("portIo error= ", e.strerror)
			self.serial.close()
			raise
		else:
			if(self.MsgFilter):
				print ("portIo error ")
			self.serial.close()
			raise

	def readAll(self, delaySecs=1):
		rd = ""

		self.io("f", "", 5)		
		self.io("r", "", 1)
		self.io("r", "", 1)
		self.io("r", "", 1)
		
		self.io("w", "phr\r", 5)
		sleep(delaySecs)
		rd += self.io("r", "", 5).rstrip('\r\n') + "; "
		
		self.io("w", "orr\r", 5)
		sleep(delaySecs)
		rd += self.io("r", "", 5).rstrip('\r\n') + "; "
		
		self.io("w", "ecr\r", 5)
		sleep(delaySecs)
		rd += self.io("r", "", 5).rstrip('\r\n') + "; "
		
		self.io("w", "dor\r", 5)
		sleep(delaySecs)
		rd += self.io("r", "", 5).rstrip('\r\n') + "; "
		
		self.io("w", "clr\r", 5)
		sleep(delaySecs)
		rd += self.io("r", "", 5).rstrip('\r\n') + "; "
		
		self.io("w", "etr\r", 5)
		sleep(delaySecs)
		rd += self.io("r", "", 5).rstrip('\r\n') + "; "
		
		return rd
	
###############################
def timeStamp():
	return datetime.utcnow().strftime("%Y%m%d,%H:%M:%S")

###############################
def readAllSensors(outFile, mon):
	if os.path.isfile(outFile)==False:
		print "readAllSensors reading ..."
		f = open(outFile, "w")
		rd = mon.readAll()
		print rd
		f.write(rd)
		f.close()
	else:
		sleep(5)
		#print "loop wait ..."

###############################
def motorAction(inFile, mon):
	if os.path.isfile(inFile)==True:
		print "motorAction reading ..."
		f = open(inFile, "r")
		rd = f.read()
		print "motor cmd = ", rd
		f.close()
		rd = rd.rstrip('\n') + '\r'
		mon.io("w", rd, 5)
		os.remove(inFile)
	else:
		sleep(1)
	
###############################
def main(argv):
	inFile = "/tmp/biomon.in.csv"
	outFile = "/tmp/biomon.out.csv"
	
	mon = Biomon("/dev/ttyACM0")
	print mon

	rd = mon.readAll(2)
	print "readAll = ", rd
	
	while (True):
		readAllSensors(outFile, mon)
		motorAction(inFile, mon)
		
	mon.io("c")
	
###############################
if __name__ == '__main__':
	main(sys.argv)
