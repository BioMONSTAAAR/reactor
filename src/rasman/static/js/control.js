/*

    Author: Tod Kaiser
    Date: 01/26/14
    Description: UI Controls for the Rasman

*/

(function () {

    "use strict";

    var i, url, length, device = [], styles = {}, lucid = "0.3", opaque = "1",
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

    /*
        This function stores the initial state of the UI in an array of objects 
        called "device."" The purpose is two-fold: 
          1) To compare the changes (saved) made in the UI prior to and after user
             selections to alter the UI, e.g. display a new timestamp, toggle a 
             switch value, or make an HTTP request to a specified API endpoint. 
          2) The device object also serves as a convenient access point of commonly
             used element properties like "id" irrespective of state
    */
    function currentState() {
        for (i = 0; i < length; i += 1) {
            //preserve the initial state in an array of objects
            device[i] = {
                "id": checkboxes[i].id, //static
                "url": "", //dynamic
                "index": i,
                "clicked": false, // dynamic...this will change with configure()
                "order": checkboxes[i].checked, //dynamic
                "time": timestamp[i].textContent.trim() //dynamic
            };
        }
    }

    /* -------------------------------------------------------------------------- */

    /*
        This function accepts a "styles" object which contains CSS property values
        used to stylize the Edit, Cancel, and Save buttons. The styles change 
        according to the choices made by the user. 
    */
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

    /*
        This function accepts values denoting a particular device, e.g. the position
        and id. These values are used to determine the which API endpoint to use as
        the URL, e.g. /api/setmotor/<motorId>/<value> or 
        /api/setswitch/<deviceId>/<value>.
    */
    function getURL(index, id) {
        if (id === "motor1" || id === "motor2" || id === "motor3") {
            // Control a motor’s speed
            // /api/setmotor/<motorId>/<value>
            // Note: as of now, there is no way to alter the motor's speed, only off and on
            url = checkboxes[index].checked
                ? "/api/setmotor/" + id + "/1" : "/api/setmotor/" + id + "/0";
            console.log(url);
        }
        //Control a Peltier or light switch
        // /api/setswitch/<deviceId>/<value>
        if (id === "peltier" || id === "light") {
            url = checkboxes[index].checked ? "/api/setmotor/" + id + "/on" : "/api/setmotor/" + id + "/off";
            console.log(url);
        }
        return url;
    }

    /* -------------------------------------------------------------------------- */

    /*
        This function is called when an HTTP request returns 200 OK. The function
        also sets the date a device was successfully turned either ON or OFF, also
        setting the title attribute of the choice in the UI.
    */
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
            // e.g. ERROR, "OFF"
        }
    }

    /* -------------------------------------------------------------------------- */

    /*
        This function is called when an HTTP request fails to return a 200 OK. An 
        example would be a 404 Not Found or 500 Server Error. Errors are logged
        and the timestamp <span/> is displayed as a red generic error message.
    */
    function errorHandler(index) {
        console.log("An error occurred, please try again");
        timestamp[index].textContent = errorMessage;
        timestamp[index].style.color = "red";
        timestamp[index].title = "Error: the request failed to reach the device selected";
    }

    /* -------------------------------------------------------------------------- */

    /*
        This function makes an Ajax call to each device's relevant API endpoints as
        returned though getURL(). 
    */
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

    /*
        This function attaches an event handler to the Edit Button
    */
    function editButton() {
        edit.addEventListener("click", function () {

            // Cache the current state of the UI
            currentState();

            // The "style" object contains the CSS properties that will be needed
            // to stlyize the buttons and switches in reponse to user actions.
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

    /*
        This function attaches an event handler to the Cancel button.
    */
    function cancelButton() {
        cancel.addEventListener("click", function () {

            styles = {
                "edit": [false, opaque, ""],
                "cancelSave": [true, lucid, animation]
            };

            buttonStyles(styles);

            for (i = 0; i < length; i += 1) {

                // This condition checks to see if a user turned any device on or
                // off prior to selecting Cancel. If a device was selected
                if (device[i].clicked && timestamp[i].textContent !== errorMessage) {
                    // Prevent uncessary requests; only make a request if the current selection is different from
                    // the previous state
                    if (checkboxes[i].checked !== device[i].order) {
                        checkboxes[i].checked = device[i].order;
                        device[i].url = getURL(i, device[i].id);
                        getJSON(device[i], successHandler, errorHandler);
                    }
                }
                checkboxes[i].checked = device[i].order;
                timestamp[i].textContent = device[i].time;
                checkboxes[i].disabled = true;
                labels[i].style.cursor = "default";
                labels[i].title = "Select 'Edit' to toggle ON/OFF";

                // Remove the error message timestamp and return the switch to 
                // its previous selection in the UI.
                if (timestamp[i].textContent === errorMessage) {
                    timestamp[i].textContent = "";
                    checkboxes[i].checked = !device[i].order;
                }
            }
        }, false);
    }

    /* -------------------------------------------------------------------------- */

    /* 
        This function attaches an event handler to the Save button.
    */
    function saveButton() {
        save.addEventListener("click", function () {

            styles = {
                "edit": [false, opaque, ""],
                "cancelSave": [true, lucid, animation]
            };

            buttonStyles(styles);
            // Cache the current state of the UI
            currentState();

            for (i = 0; i < length; i += 1) {
                checkboxes[i].disabled = true;

                // This condition removes the error message contained in the 
                // timestamp and sets the switch to its previous position during
                // a connection failure 
                if (device[i].time === errorMessage) {
                    timestamp[i].textContent = "";
                    device[i].time = "";
                    if (checkboxes[i].checked !== device[i].clicked) {
                        checkboxes[i].checked = !device[i].order;
                    }
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

    /* 
        This function calls other functions used to attach event handlers to their 
        relevant Edit, Cancel, and Save buttons 
    */
    function buttonHandlers() {
        editButton();
        cancelButton();
        saveButton();
    }

    /* -------------------------------------------------------------------------- */

    /*
        This function attaches a click handler for the device checkboxes. 
    */
    function apiEndpoints(index) {
        checkboxes[index].addEventListener("click", function () {
            // Once clicked, element now has a "clicked" state. This is useful
            // because this property is checked when a user selects the Cancel 
            // button. Without knowing this value, a switch may visually display
            // "ON" when the reality is it's turned off.
            checkboxes[index].clicked = true;
            // Get the relevant API endpoint
            device[index].url = getURL(index, device[index].id);
            // Ajax
            getJSON(device[index], successHandler, errorHandler);
        }, false);
    }

    /* -------------------------------------------------------------------------- */

    /*
        This function calls the function apiEndPoints() per each device present
        in the UI.
    */
    function switchHandler() {
        for (i = 0; i < length; i += 1) {
            // Attach event handler for each device checkbox
            apiEndpoints(i);

        } //for
    }

    /* -------------------------------------------------------------------------- */

    // Populate UI with info - devices, switches and timestamps - from previous session, etc
    // storedState(); or maybe configuration();

    // Cache the current state of the UI before making changes
    currentState();

    // Event handlers for the Edit, Cancel, and Save buttons
    buttonHandlers();

    // Event handlers for every device switch
    switchHandler();
}());