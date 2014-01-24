(function () {
    "use strict";

    var i,
        id,
        date,
        length,
        collection = document.getElementsByTagName("input"),
        apply = document.getElementById("apply"),
        edit = document.getElementById("edit"),
        switches = document.getElementsByClassName("onoffswitch"),
        timestamp = document.getElementsByClassName("timestamp");

    // "cache" length
    length = collection.length;

    edit.addEventListener("click", function () {
        for (i = 0; i < length; i += 1) {
            switches[i].style.opacity = "1";
            switches[i].style.transition = "opacity .25s linear";
        }
        edit.style.display = "none";
        apply.style.display = "block";
    }, false);

    apply.addEventListener("click", function () {
        date = new Date().toGMTString();
        for (i = 0; i < length; i += 1) {
            id = collection[i].id;
            if (collection[i].checked) {
                console.log(id + " is active");
                timestamp[i].textContent = date;
            } else {
                console.log(id + " is not active");
            }
        }
        apply.style.display = "none";
        edit.style.display = "block";

        for (i = 0; i < length; i += 1) {
            switches[i].style.opacity = "0";
            switches[i].style.transition = "opacity .25s linear";
        }
    }, false);

})();

