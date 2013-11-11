Rasman User's Guide
===================

What is it?
-----------

[Rasman](https://github.com/BioMONSTAAAR/reactor/tree/master/src/rasman) 
(Raspberry Pi Manager) is an open-source software that lets you control 
the BioMonstaaar algae bioreactor, automatically upload your bioreactor's data 
to the BioMonstaar portal and share data with others.

To use Rasman, install it on the Pi and make sure the Pi is connected to your 
home/office network via an Ethernet cable or Wifi. Then fire up a browser on 
your computer and go to:

    http://rasman.local


How it works
------------

The BioMonstaaar algae bioreactor consists of one or more reactor columns. Each
column is equipped with sensors to monitor temperature, pH, CO2 level, etc. to
observe algae growth. The column also has actuators to control the nutrient feed,
culture mixing and algae harvesting. The sensors and actuators are interfaced to
an Arduino microcontroller which serves as the controller of the reactor column.

A Raspberry Pi microcomputer is used as the main system controller. It communicates
with each Arduino to read the reactor columns sensor measurements or sends commands
to control the actuators.

Rasman runs as a web application on the Raspberry Pi, allowing users to control 
the bioreactor from a browser.

Key Features
------------

   * small footprint
   * runs in headless mode.
      * just plug-and-play
      * no need to connect keyboard, mouse and monitor (unless you want to)


Setting up the Raspberry Pi
---------------------------

1. If you haven't done so, create a bootable Raspbian image on an SD card. The eLinux's  
   [RPi Easy SDcard Setup](http://elinux.org/RPi_Easy_SD_Card_Setup) gives excellent 
   instructions on how to do this. 
   
   The steps below make use of the 
   [command line tool](http://elinux.org/RPi_Easy_SD_Card_Setup#Using_command_line_tools_.281.29) 
   for the Mac OSX. If you don't fancy typing cryptic Unix commands, choose your preferred
   procedure from the eLinux guide. Otherwise, here are the steps:

   * [Download](http://www.raspberrypi.org/downloads) the Raspbian Wheezy raw image and unzip.
   * Insert a blank SD card into the Mac's SDCard slot. You'll need to use a microSD adaptor card.
   * Open a terminal console and run these commands:

   Identify the disk (not partition) of your SD card and unmount it.

        $ diskutil list
        $ diskutil unmountDisk /dev/disk2

   Write the image to the card. This will take several minutes and it may look like the 
   command is hung. Be patient and wait for the command to finish.
 
   **NOTE:** I wrote the image to raw disk (rdisk2) for faster copying.

        $ sudo dd bs=1m if="2013-07-26-wheezy-raspbian.img" of=/dev/rdisk2 
    
    When done you should see something like this:

        1850+0 records in
        1850+0 records out
        1939865600 bytes transferred in 371.561630 secs (5220845 bytes/sec)

2. Insert the card to the Pi and power it up.
3. If needed, change keyboard layout. I changed mine to US Keyboard layout as follows.

        $ cd /etc/default
        $ sudo vi keyboard
        Change the value of XKBLAYOUT to "us" then close the file.
        $ sudo reboot

4. Change your Pi's hostname. We'll call it *rasman* but feel free to choose another name.
    
        $ sudo vi /etc/hosts
        
    Look for the line with the entry 127.0.1.1 and hostname *raspberrypi*. 
    Change *raspberrypi* to *rasman* then close the file. This is the only line you edit.
        
        $ sudo vi /etc/hostname
        
    Change the name from *raspberrypi* to *rasman* then close the file.

        $ sudo reboot

5. Make your Raspberry Pi accessible from the local network by its hostname. You need this 
   feature so that you can always connect to Rasman even though its IP address changes. 
   This can happen when you power off/on the Pi and the router assigns it a new IP. We 
   use <a href="http://en.wikipedia.org/wiki/Avahi_(software)">Avahi</a> for this purpose.

        $ sudo apt-get update
        $ sudo apt-get install avahi-daemon
        $ sudo insserv avahi-daemon
        
    Create a new file *multiple.service*.

        $ sudo vi /etc/avahi/services/multiple.service 

    Set the content to the following, courtesy of 
    [aXon](http://www.raspberrypi.org/phpBB3/viewtopic.php?f=29&t=7795&p=94439&hilit=avahi#p94439):
   
        <?xml version="1.0" standalone='no'?>
        <!DOCTYPE service-group SYSTEM "avahi-service.dtd">
        <service-group>
            <name replace-wildcards="yes">%h</name>
            <service>
                <type>_device-info._tcp</type>
                <port>0</port>
                <txt-record>model=RackMac</txt-record>
            </service>
            <service>
                <type>_ssh._tcp</type>
                <port>22</port>
            </service>
        </service-group>

    Save and close the file. Then apply the new configuration with:

        $ sudo /etc/init.d/avahi-daemon restart

    If all went well, you should be able to remotely log into the box:

        $ ssh pi@rasman.local

    Login with the password 'raspberry'.
        
6. Disable the low-power mode of your Pi's USB WiFi. This prevents the WiFi from 
   sleeping when idle for a long time and become inaccessible from the network. 
   For the [Edimax EW-7811Un](http://www.edimax.com/en/produce_detail.php?pd_id=347&pl1_id=1):
   
   Create a new 8192cu.conf file at the following location
   
        $ sudo vi /etc/modprobe.d/8192cu.conf

   Populate it with the following command
    
        options 8192cu rtw_power_mgnt=0 rtw_enusbss=0

   If you are using a different USB WiFi dongle, search for the appropriate instructions 
   for your device.

        
Installing Rasman
-----------------

Login to the Raspberry Pi.

        $ ssh pi@rasman.local

Use the default password 'raspberry'. Then open a terminal console and run these commands:

1. Install [PIP](http://www.pip-installer.org/en/latest/) (Package Installer for Python).

        $ sudo apt-get update
        $ sudo apt-get install python-setuptools
        $ sudo easy_install pip

2. Using PIP, install some packages required by Rasman.

        $ sudo pip install Flask
        $ sudo pip install requests

   The next steps must be done on your computer, not on the Pi!

3. Get the [Rasman source code ](https://github.com/BioMONSTAAAR/reactor). You can 
   clone the Git repo
   
        $ git clone https://github.com/BioMONSTAAAR/reactor.git
        
    or download the ZIP file to your computer and extract the contents. 

4. Open a console terminal and run the following commands to install Rasman on your
   Raspberry Pi.
   
        $ cd reactor/src/rasman
        $ fab zip
        $ fab deploy
    
    When prompted for the password, enter 'raspberry'.

5. Do these steps from the Pi:
    
        $ cd /home/pi/rasman/scripts
        $ sudo cp -p rasmand /etc/init.d/rasmand
        $ cd /etc/init.d
        $ sudo chmod 755 rasmand
        $ sudo chown root:root rasmand
        $ ls -l rasmand
        
    The last command should show something like this (date and time will be different):
    
        -rwxr-xr-x 1 root root 436 Nov 10 22:34 rasmand 

6. Restart the Raspberry Pi.

        $ sudo shutdown -r now

7. You should now be able to access Rasman. From your computer, point the browser to:

        http://rasman.local/

    Enjoy!


Running Rasman on your computer (for Software Developers)
---------------------------------------------------------

You can also run the app on your computer. This is the preferred approach  
for development since it is faster and more efficient to edit/run/test code 
without having to deploy each time on the Pi.

To run locally, do the following:

1. If needed, install Python 2.7 on your machine.

2. Install the Flask package

   pip install flask
   
3. Open a terminal console and go to the rasman/ folder

   cd rasman
   
4. Run the app

   python main.py
   
5. Fire up your browser and go to:

   http://localhost:5000
   
   Login as user 'admin', password is also 'admin'.


References
----------

* [Getting started with Raspberry Pi](http://www.howtogeek.com/138281/the-htg-guide-to-getting-started-with-raspberry-pi/)
* [How to change your Raspberry Pi hostname](http://www.howtogeek.com/167195/how-to-change-your-raspberry-pi-or-other-linux-devices-hostname/)
* [Is your Edimax EW-7811Un wifi dongle dropping connection?](http://forum.stmlabs.com/archive/index.php?thread-9032.html)
