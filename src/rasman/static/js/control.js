/*

    Author: Tod Kaiser
    Date: 01/26/14
    Description: UI Controls for the Rasman

*/

(function () {

    "use strict";

    var i, url, id, length, device = [], styles = {}, lucid = "0.3", opaque = "1",
        animation = "opacity .25s linear",
        errorMessage  = "Error: connection failed",
        checkboxes = document.getElementsByClassName("onoffswitch-checkbox"),
        labels = document.getElementsByClassName("onoffswitch-label"),
        save = document.getElementById("saveButton"),
        edit = document.getElementById("editButton"),
        cancel = document.getElementById("cancelButton"),
        timestamp = document.getElementsByClassName("timestamp");

    // cache length property of [HTMLCollection]
    length = checkboxes.length;


    /* -------------------------------------------------------------------------- */

    function currentState() {
        for (i = 0; i < length; i += 1) {
            //preserve the initial state in an array of objects
            device[i] = {
                "id": checkboxes[i].id,
                "url": "",
                "index": i,
                "clicked": false,
                "check": checkboxes[i].checked,
                "time": timestamp[i].textContent
            };
        }
    }

    /* -------------------------------------------------------------------------- */

    function buttonStyles(styles) {
        edit.disabled = styles.edit[0];
        edit.style.opacity = styles.edit[1];
        edit.style.transition = styles.edit[2];

        cancel.disabled = styles.cancelSave[0];
        cancel.style.opacity = styles.cancelSave[1];
        cancel.style.transition = styles.cancelSave[2];

        save.disabled = styles.cancelSave[0];
        save.style.opacity = styles.cancelSave[1];
        save.style.transition = styles.cancelSave[2];
    }

    /* -------------------------------------------------------------------------- */

    function getURL(index, id) {
        if (id === "motor1" || id === "motor2" || id === "motor3") {
            // this is just a placeholder until API endpoint is implemented
            url = "/api/addmeas/";

            /*
                Control a motor’s speed
                /api/setmotor/<motorId>/<value>    (not yet implemented)
                Note: as of now, there is no way to alter the motor's speed, only off and on

            */

            // Below logs the API Endpoint that will be called once implemented
            var x = checkboxes[index].checked ? "/api/setmotor/" + id + "/1" : "/api/setmotor/" + id + "/0";
            console.log(x);
        }

        if (id === "peltier" || id === "light") {
            // this is just a placeholder until API endpoint is implemented
            // this URL is intentionally mispelled to invoke error handling
            url = "/api/addmea";

            /*
                Control a Peltier or light switch
                /api/setswitch/<deviceId>/<value>    (not yet implemented)

            */

            // Below logs the API Endpoint that will be called once implemented
            var y = checkboxes[index].checked ? "/api/setmotor/" + id + "/on" : "/api/setmotor/" + id + "/off";
            console.log(y);
        }
        return url;
    }

    /* -------------------------------------------------------------------------- */

    function successHandler(index, data) {
        var date = new Date();
        if (data.status === "OK") {
            console.log(data.status);

            // then call whatever code that may be needed 

            // log timestamp on the page
            timestamp[index].textContent = date.toGMTString();
            if (checkboxes[index].checked) {
                timestamp[index].title = "Time last turned ON";
            } else if (!checkboxes[index].checked) {
                timestamp[index].title = "Time last turned OFF";
            }

            // if storing in storedState(), then store "date.getTime().toString()"
            // formate in database, but output date.toGMTString()
            // do something else...
        } else {
            console.log(data.status);
            // then call whatever code that may be needed,
            // e.g. 404

        }
    }

    /* -------------------------------------------------------------------------- */

    function errorHandler(index) {
        console.log("An error occurred, please try again");
        timestamp[index].textContent = errorMessage;
        timestamp[index].style.color = "red";
        timestamp[index].title = "Error: the request failed to reach the device selected";
    }

    /* -------------------------------------------------------------------------- */

    function getJSON(device, successHandler, errorHandler) {
        var xhr = new XMLHttpRequest();
        xhr.open('get', device.url, true);
        xhr.responseType = 'json';
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) { // `DONE`
                if (xhr.status === 200) {
                    successHandler(device.index, xhr.response);
                } else {
                    errorHandler(device.index);
                }
            }
        };
        xhr.send();
        console.log("'" + device.id + "'" + " has been selected");
    }

    /* -------------------------------------------------------------------------- */

    function editButton() {
        edit.addEventListener("click", function () {

            styles = {
                "edit": [true, lucid, animation],
                "cancelSave": [false, opaque, ""]
            };

            buttonStyles(styles);

            for (i = 0; i < length; i += 1) {
                checkboxes[i].disabled = false;
                labels[i].style.cursor = "pointer";
                labels[i].title = "Click switch to turn ON/OFF";
                device[i].clicked = false;
            }

        }, false);
    }

    /* -------------------------------------------------------------------------- */

    function cancelButton() {
        cancel.addEventListener("click", function () {

            styles = {
                "edit": [false, opaque, ""],
                "cancelSave": [true, lucid, animation]
            };

            buttonStyles(styles);

            for (i = 0; i < length; i += 1) {

                if (device[i].clicked && timestamp[i].textContent !== errorMessage) {
                    device[i].url = getURL(i, device[i].id);
                    getJSON(device[i], successHandler, errorHandler);
                }

                checkboxes[i].checked = device[i].check;
                timestamp[i].textContent = device[i].time;
                checkboxes[i].disabled = true;
                labels[i].style.cursor = "default";
                labels[i].title = "Select 'Edit' to toggle ON/OFF";

                if (timestamp[i].textContent === errorMessage) {
                    timestamp[i].textContent = "";
                    checkboxes[i].checked = !device[i].check;
                }
            }
        }, false);
    }

    /* -------------------------------------------------------------------------- */

    function saveButton() {
        save.addEventListener("click", function () {

            styles = {
                "edit": [false, opaque, ""],
                "cancelSave": [true, lucid, animation]
            };

            buttonStyles(styles);
            // save edits
            currentState();

            for (i = 0; i < length; i += 1) {
                checkboxes[i].disabled = true;

                if (device[i].time === errorMessage) {
                    timestamp[i].textContent = "";
                    checkboxes[i].checked = !device[i].check;
                }
                labels[i].style.cursor = "default";
                labels[i].title = "Select 'Edit' to toggle ON/OFF";
            }

            /* call some random function, e.g. storedState(), that does the following:

                1. Stores the current state of the checkbox settings in a database
                   so when a user navigates back to "status.html" their selections are 
                   auto-populated.

                2. This function will also call the relevant APIs to store the timestamp
                   generated during when a user turns a control on and saves that 
                   selection. Similar to saved checkbox settings, this 
            */

        }, false);
    }

    /* -------------------------------------------------------------------------- */

    function buttonHandlers() {
        editButton();
        cancelButton();
        saveButton();
    }

    /* -------------------------------------------------------------------------- */

    function apiEndpoints(index, id) {
        checkboxes[index].addEventListener("click", function () {
            device[index].clicked = true;
            device[index].url = getURL(index, id);
            getJSON(device[index], successHandler, errorHandler);
        }, false);
    }

    /* -------------------------------------------------------------------------- */

    function switchHandler() {
        for (i = 0; i < length; i += 1) {
            id = checkboxes[i].id;
            // call 
            apiEndpoints(i, id);

        } //for
    }

    /* -------------------------------------------------------------------------- */

    // call storedState();
    // populate UI with info - devices, switches and timestamps - from previous session, etc

    // call all all event handlers for the Edit, Cancel, and Save buttons
    currentState(); // this might hvae to be in the editButton();
    buttonHandlers();
    switchHandler();
}());