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
import calendar
import json
import os
import re
import sqlite3

from flask import Flask, request, session, g, redirect, url_for, \
     abort, render_template, flash, escape, jsonify

from rasman import Rasman

# configuration
DEBUG = True
SECRET_KEY = 'development key'
USERNAME = 'admin'
PASSWORD = 'admin'

DEFAULT_DATABASE = os.path.join(os.path.dirname(__file__), 'rasman.db')
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
    qvalues = (controller_id, data,)
    con = get_db_connection()
    con.execute(cmd, qvalues)
    con.commit()
    
def get_saved_measurements(limit=25, controller_id=None, for_upload=False):
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
    qvalues = []
    if for_upload:
        cmd = "SELECT timestamp,data FROM sensor_data"
        qfields = []
        if controller_id:
            qfields.append('controller_id')
            qvalues.append(controller_id)
        if for_upload:
            qfields.append('uploaded')
            qvalues.append(0)
        if qfields:
            cmd += " WHERE " + " AND ".join(["%s = ?" % f for f in qfields]) 
    else:
        cmd = "SELECT timestamp,controller_id,data,uploaded FROM sensor_data"
        if controller_id:
            cmd += " WHERE controller_id = ?"
            qvalues.append(controller_id)
    cmd += " ORDER BY timestamp DESC"
    if limit:
        cmd += " LIMIT ?"
        qvalues.append(limit)
    app.logger.debug("In get_saved_measurements().. query is: %s" % cmd)
    con = get_db_connection()
    return [row for row in con.execute(cmd, qvalues)]

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
    #qvalues = (keepDays,)
    #con.execute(cmd, qvalues)

def delete_all_measurements():
    """Delete all sensor measurements from the database"""
    con = get_db_connection()
    con.execute("DELETE FROM sensor_data")
    con.commit()

def upload_measurements():
    """Upload new measurements to the cloud"""
    pass


###############################################################################
#    Webapp routing
###############################################################################

@app.route("/")
def home():
    return render_template("index.html")
"""
    if 'logged_in' in session and session['logged_in']:
        return render_template("index.html")
    else:
        return redirect(url_for('login'))
"""

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
    #if 'logged_in' in session and session['logged_in']:
    if True:
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
        timestamp, controller_id, data, uploaded = meas[0]
        data = json.loads(data)
    else:
        flash("No sensor data found in database!")
        timestamp = None
        data = {}
        for sensor in config['sensors']:
            data[sensor] = None
        uploaded = None
    app.logger.info(data)
    return render_template("status.html", config=config, timestamp=timestamp, data=data,
                            uploaded=uploaded)

@app.route("/recentdata/")
def recentdata():
    app.logger.info("In Recent Data page...")
    config = DEFAULT_CONFIG
    #meas = get_saved_measurements()
    return render_template("recentdata.html", config=config)

@app.route("/contact/")
def contact():
    app.logger.info("In Contact page...")
    return render_template("contact.html")

###############################################################################
#    Web services - for demo mode
###############################################################################

@app.route("/demo/addmeas/")
def addmeas():
    """Read the current sensor measurements and insert to the database"""
    api_addmeas()
    flash('New sensor measurements have been saved locally')
    return setup()

@app.route("/demo/upload/")
def upload():
    """Upload new measurements to the cloud"""
    api_upload()
    flash('New measurements have been uploaded')
    return setup()

@app.route("/demo/purge/")
def purge():
    """Delete sensor measurements in the database older than N days"""
    api_purge()
    flash('Data purging has been completed')
    return setup()

@app.route("/demo/deleteall/")
def deleteall():
    """Upload new measurements to the cloud"""
    api_deleteall()
    flash('All measurements have been deleted')
    return setup()

###############################################################################
#    Web services - used by cron job
###############################################################################

def _convert_jsondata_to_csv(jsonstring, sensors):
    data = json.loads(jsonstring)        
    return ",".join( [str(data.get(s) or '') for s in sensors] )
    
@app.route("/api/history/")
def api_history():
    sensors = DEFAULT_CONFIG['sensors']
    meas = get_saved_measurements(limit=12*24*2, for_upload=True)   # 2-day graph
    #storing in the database as integers to begin with might be more readable :-)
    unixify = lambda x: calendar.timegm(datetime.strptime(x[0:19], "%Y-%m-%d %H:%M:%S").timetuple())
    meas_processed = [(unixify(x[0]), json.loads(x[1])) for x in meas]
    return jsonify(meas_processed)

@app.route("/api/addmeas/")
def api_addmeas():
    """Read the current sensor measurements and insert to the database"""
    app.logger.info("API: adding current sensor measurements to the database...")
    config = DEFAULT_CONFIG
    ras = Rasman(config)
    meas = ras.read_all_sensors()
    save_measurement(config['controller_id'], json.dumps(meas))
    return jsonify(status='OK', meas=meas)

@app.route("/api/upload/")
def api_upload():
    """Upload new measurements to the cloud"""
    app.logger.info("API: uploading new measurements...")
    upload_measurements()
    return jsonify(status='OK')

@app.route("/api/purge/")
def api_purge():
    """Delete sensor measurements in the database older than N days"""
    app.logger.info("API: purging database...")
    purge_measurements(keepDays=30)
    return jsonify(status='OK')

@app.route("/api/deleteall/")
def api_deleteall():
    """Delete all sensor measurements in the database"""
    app.logger.info("API: deleting all data database...")
    delete_all_measurements()
    return jsonify(status='OK')


if __name__ == "__main__":
    # set host to '0.0.0.0' to make the service externally available
    app.run(debug=False, host='0.0.0.0', port=3000)
