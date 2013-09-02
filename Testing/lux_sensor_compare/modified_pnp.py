'''
Overview
- each thread polls a serial port
  error causes the thread to sleep and try again, not terminate
- different port may have different protocols/intervals
  different port may have different maintenance procedures
- two ways to recognize port type
  active ports: continuously printing sensing records with sensor information (Type, 
  passive ports: receive specific commands and act accordingly
- error reporting is also sent to cloud with consistent format!!
'''

import sys
import serial
import string
import binascii
from datetime import datetime, date, time
#from queue import Queue
import threading

MsgFilter = 0x0000
#que = Queue()

Ser = []

###############################
portRange = 8
portNameBase = "\\.\COM"
portActive = [0,0,0,0,  0,0,0,0,  0,0,0,0]

###############################
def timeStamp():
    return datetime.utcnow().strftime("%Y%m%d,%H:%M:%S")

###############################

def initSer():
    global Ser
    for i in range(0, portRange):
        Ser.append(serial.Serial())
        Ser[i].baudrate = 38400
        Ser[i].port = i

def ReadPort(i):
    try:
        ##if (port.inWaiting() > 0):
        rdln = Ser[i].readline()
        ##print ("port ", i, rdln)
        if(MsgFilter):
            print ("ReadPort ", i, rdln.decode('utf-8'))
        return rdln.decode('utf-8')
            
            ##if (port.inWaiting() == 0):
            ##    rdln = port.readline()
            ##    print ("port ", i, rdlnr.strip().decode('utf-8'))
            ##    return rdln
            ##else:
            ##    return ""
    except IOError as e:
        portActive[i] = 0
        if(MsgFilter):
            print ("ReadPort ", i, " I/O error({0}): {1}".format(e.errno, e.strerror))
    except (ValueError):
        portActive[i] = 0
        if(MsgFilter):
            print ("ReadPort ", i, "value error")
    except:
        portActive[i] = 0
        if(MsgFilter):
            print ("ReadPort ", i, "Unexpected error:", sys.exc_info()[0])
        raise

###############################
'''
idealy each Ser[i] is a thread, todo
'''
class SerialThread(threading.Thread):
    def __init__(self,portid):
        threading.Thread.__init__(self)
        self.daemon = True
        self.portid = portid
        
    def run(self):
        for i in range(1,100):
            self.portid += i
            
###############################
''' monitors each inactive port
- the plugged in device must all use same port setting, 9600
  otherwise the code needs to be improved to handle that. TODO!!
'''
def portPnP():
    while (True):
        for i in range(0, portRange):

            # wait 1s
            threading.Event().wait(1) ## time.slee() will sleep the process

            ## active read fail will turn the port to inactive
            ## but not here
            if portActive[i] == 1:
                continue
            
            try:
                ## old way
                ##portname = portNameBase + str(i)
                ##port = serial.Serial(portname, 9600)
                ##port.flushInput()
                
                Ser[i].open()
                Ser[i].flushInput()

                ## dont use this, since the communication may be broken due to
                ## wrong baut rate
                ##if (port.inWaiting() > 0):
                
                rdln = Ser[i].readline()
                rdlnstr = str(object=rdln)

                ## here some checking, setup may needed
                ## if no good, may loop try different baut rate
                ##if len(rdlnstr)>0:
                
                portActive[i] = 1
                
                if(MsgFilter):
                    print ("portPnP(", i, ")=", rdlnstr)

                ##que.put(rdlnstr);
                ##else:
                ##    print ("portPnP(", i, ")=")
                
            except IOError as e:
                if(MsgFilter):
                    print ("portPnP(", i, " I/O error({0}): {1}".format(e.errno, e.strerror))
                ##que.put("portPnP(", i, " I/O error({0}): {1}".format(e.errno, e.strerror));
                Ser[i].close()
            except (ValueError):
                if(MsgFilter):
                    print ("portPnP(", i, "value error")
                ##que.put("portPnP(", i, "value error")
                Ser[i].close()
            except:
                if(MsgFilter):
                    print ("portPnP(", i, "Unexpected error:", sys.exc_info()[0])
                ##que.put("portPnP(", i, "Unexpected error:", sys.exc_info()[0])
                Ser[i].close()
                raise

###############################
'''
experiment to learn serial port communication
'''
def SerTest():
    ## read one by one
    if (False):
        i = 5
        try:
            Ser[i].open()
            Ser[i].flushInput()
        except IOError as e:
            print ("Open ", i, " I/O error({0}): {1}".format(e.errno, e.strerror))
        except (ValueError):
            print ("Open ", i, "value error")
        except:
            print ("Open ", i, "Unexpected error:", sys.exc_info()[0])
            raise

        ##i = 6
        ##portname = portNameBase + str(i)
        ##port = serial.Serial(portname, 9600)
        while True:
            try:
                ##port.flush()
                rdln = Ser[i].readline()
                print ("port ", i, rdln.decode('utf-8'))
            except IOError as e:
                portActive[i] = 0
                if(MsgFilter):
                    print ("port ", i, " I/O error({0}): {1}".format(e.errno, e.strerror))
            except (ValueError):
                portActive[i] = 0
                if(MsgFilter):
                    print ("port ", i, "value error")
            except:
                portActive[i] = 0
                if(MsgFilter):
                    print ("port ", i, "Unexpected error:", sys.exc_info()[0])
                raise
            
###############################
def main(argv):

    ## init serial ports to a array
    initSer()

    ## start Plug&Play monitoring all ports

    currlux=0
    currrgbstring=[]
    currrgblux=0

## Init variables to separate stuff
    if (True):
        portPnpThread = threading.Thread(target=portPnP, args = ())
        portPnpThread.daemon = True
        portPnpThread.start()

    ## SerTest()

    ## loop forever
    while True:
        for i in range(0,portRange):
            if portActive[i] == 1:
                rdln = ReadPort(i)
                rdlnstr = str(object=rdln)
                if len(rdlnstr)>0:
                ##sensorVal = rdlnstr.strip().decode('utf-8')
                    readings = rdlnstr
                    ##crc = binascii.crc32(bytes(lntoCRC, 'UTF-8'))
                    ##print(lntoCRC, ',', crc)

                    
                    try:
                        if readings[-6:]==' lux\r\n':
                            currlux=float(readings[:-6])
                        else:
                            currgbstring=readings.rsplit(',')
                            currgblux=int(currgbstring[3])
                        print(str(currlux)+'      '+str(currgblux))
                    except:
                        print('loading     '+readings)


##                    if readings[-6:]==' lux\r\n':
##                        print readings[:-6]
##                        currlux=float(readings[:-6])
##                    else:
##                        currgbstring=readings.rsplit(',')
##                        print currgbstring
##                        print currgbstring[3]
##                        currgblux=int(currgbstring[3])
##                    print(str(currlux)+'      '+str(currgblux))
                    
                        

###############################
if __name__ == '__main__':
    main(sys.argv)

