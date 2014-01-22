(function () {
    "use strict";

    var i, id, collection, apply, edit, length, switches;

    collection = document.getElementsByTagName("input");
    length = collection.length;
    apply = document.getElementById("apply");
    edit = document.getElementById("edit");
    switches = document.getElementsByClassName("onoffswitch");

    edit.addEventListener("click", function () {
        for (i = 0; i < length; i += 1) {
            switches[i].style.opacity = "1";
            switches[i].style.transition = "opacity .25s linear";
        }
        edit.style.display = "none";
        apply.style.display = "block";
    }, false);

    apply.addEventListener("click", function () {
        for (i = 0; i < length; i += 1) {
            id = collection[i].id;
            if (collection[i].checked) {
                console.log(id + " is active");
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

