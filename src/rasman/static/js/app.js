var History = {};
var getCSV = $.get('/api/history/', function processCSV(data){
    var lines = data.split(/\n+/).filter(function(x){
        return /^\w/.test(x);//avoid blank lines
    });
    var headers = lines.shift();
    var labels = headers.split(/,/);
    labels.forEach(function(label){
        History[label] = [];
    });
    for (var i = 0; i<lines.length; i++){
        var items = lines[i].split(/,/);
        if (items.length != labels.length){
            throw "malformed CSV file";
        };
        for (var k = 0; k<items.length; k++){
            var item = items[k];
            var label = labels[k];
            if (label !== 'Timestamp'){
                item = parseFloat(item);
            };
            History[label].push(item);
        };
    };
    console.log(History);
});


