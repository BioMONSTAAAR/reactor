"""
Rasman
Raspberry Pi manager for monitoring and controlling the BioMonstaaar
algae bioreactor.

Author: Ben Bongalon

Copyright 2013, BioMonstaaar.org. All Rights Reserved.

This library is free software; you can redistribute it and/or
modify it under the terms of the GNU Lesser General Public
License as published by the Free Software Foundation
"""

from datetime import datetime
import json
import sqlite3

from flask import Flask, request, session, g, redirect, url_for, \
     abort, render_template, flash, escape, jsonify

from rasman import Rasman

# configuration
DEBUG = True
SECRET_KEY = 'development key'
USERNAME = 'admin'
PASSWORD = 'admin'

DEFAULT_DATABASE = 'rasman.db'
DEFAULT_CONFIG = {
    'controller_id' : 'biomonSF1:adru_1',
    'port': 'com1',
    'sensors' : ['TEMP', 'CO2', 'H2OLVL', 'PH', 'LIGHT'],
    'labels' : ['Temperature', 'CO2 Level', 'Water Level', 'pH', 'Light Level'],
    'units': ['deg C', 'percent', 'inches', 'pH', 'lumens'] 
}

app = Flask(__name__)
app.config.from_object(__name__)    # @TODO: load configs from file

###############################################################################
#    Database access functions
###############################################################################

@app.teardown_appcontext
def teardown_db(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def get_db_connection():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DEFAULT_DATABASE)
    return db

def save_measurement(controller_id, data):
    """Save the current sensor measurements into the database
    
    Input:
        controller_id : string, unique identifier of the bioreactor column
        data : string, dictionary of sensor:value pairs
                       (eg, '{"PH": 8.9, "CO2": 0.09, "H2OLVL": 33.8, "TEMP": 29.7}')
    """
    cmd = ("INSERT INTO sensor_data (timestamp,controller_id,data) "
           "VALUES(strftime('%Y-%m-%d %H:%M:%f','now'), ?, ?)")
    qparams = (controller_id, data,)
    con = get_db_connection()
    con.execute(cmd, qparams)
    con.commit()
    
def get_saved_measurements(limit=25, controller_id=None):
    """Retrieve sensor measurements from the database
    
       Each measurement is a tuple with the following elements:
          timestamp : TEXT, measurement time (eg, "2013-10-05 03:07:09.539")
          controller_id : TEXT, unique identifier of the bioreactor column 
                          controller (eg, "biomonSF1:adru_1")
          data : TEXT, dictionary of sensor:value pairs
                 (eg, '{"PH": 8.9, "CO2": 0.09, "H2OLVL": 33.8, "TEMP": 29.7}')
    Input:
        limit : integer, number of measurements to retrieve
        
    Returns:
        array of measurements, most recent first 
    """
    cmd = "SELECT timestamp,controller_id,data FROM sensor_data"
    qparams = []
    if controller_id:
        cmd += " WHERE controller_id = ?"
        qparams.append(controller_id)
    cmd += " ORDER BY timestamp DESC"
    if limit:
        cmd += " LIMIT ?"
        qparams.append(limit)
    con = get_db_connection()
    return [row for row in con.execute(cmd, qparams)]

def purge_measurements(keepDays=30):
    """Delete sensor measurements from the database older than the specified day
    
    Input:
        keepDays : integer, the number of days' worth of measurements to keep
    """
    cmd = "DELETE FROM sensor_data WHERE timestamp < date('now','-30 day')"
    con = get_db_connection()
    con.execute(cmd)
    con.commit()
    # TODO(Ben): send keepDays a query parameter.. I can't get this to work
    #cmd = "DELETE FROM sensor_data WHERE timestamp < date('now','-? day')"
    #qparams = (keepDays,)
    #con.execute(cmd, qparams)

def delete_measurements():
    """Delete all sensor measurements from the database"""
    con = get_db_connection()
    con.execute("DELETE FROM sensor_data")
    cnn.commit()


###############################################################################
#    Webapp routing
###############################################################################

@app.route("/")
def home():
    if 'logged_in' in session and session['logged_in']:
        return render_template("index.html")
    else:
        return redirect(url_for('login'))

@app.route("/login/", methods=['GET', 'POST'])
def login():
    error = None
    if request.method == 'POST':
        if request.form['username'] != app.config['USERNAME']:
            error = "Invalid username"
        elif request.form['password'] != app.config['PASSWORD']:
            error = "Invalid password"
        else:
            session['logged_in'] = True
            session['username'] = request.form['username']
            return redirect(url_for('home'))
    return render_template('login.html', error=error)

@app.route("/logout/", methods=['GET', 'POST'])
def logout():
    session.pop('logged_in', None)
    session.pop('username', None)
    flash("You have been logged out")
    return redirect(url_for('home'))

@app.route("/setup/")
def setup():
    if 'logged_in' in session and session['logged_in']:
        app.logger.info("In setup page...")
        return render_template("setup.html")
    else:
        flash("You must be logged in to access the Setup Page")
        return redirect(url_for('login'))

@app.route("/status/")
def status():
    app.logger.info("In status page...")
    config = DEFAULT_CONFIG
    meas = get_saved_measurements(limit=1)
    if meas:
        timestamp, controller_id, data = meas[0]
        data = json.loads(data)
    else:
        flash("No sensor data found in database!")
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        data = {}
        for sensor in config['sensors']:
            data[sensor] = None
    app.logger.info(data)
    return render_template("status.html", config=config, timestamp=timestamp, data=data)

@app.route("/recentdata/")
def recentdata():
    app.logger.info("In Recent Data page...")
    config = DEFAULT_CONFIG
    meas = get_saved_measurements()
    return render_template("recentdata.html", config=config, measurements=meas)

@app.route("/contact/")
def contact():
    app.logger.info("In Contact page...")
    return render_template("contact.html")

###############################################################################
#    Web services - used by cron job
###############################################################################

@app.route("/api/purge/")
def purge():
    """Delete old sensor measurements in the database"""
    app.logger.info("API: purging database...")
    purge_measurements(keepDays=30)
    return jsonify(status='OK')

@app.route("/api/addmeas/")
def addmeas():
    """Read the current sensor measurements and insert to the database"""
    app.logger.info("API: adding current sensor measurements to the database...")
    config = DEFAULT_CONFIG
    ras = Rasman(config)
    meas = ras.read_all_sensors()
    save_measurement(config['controller_id'], json.dumps(meas))
    return jsonify(status='OK', meas=meas)


if __name__ == "__main__":
    # set host to '0.0.0.0' to make the service externally available
    app.run(debug=True, host='0.0.0.0', port=80)