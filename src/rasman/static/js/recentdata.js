var History = {
    drawGraph: function drawGraph(label, element){
        var container = document.createElement('div');
        container.id = label + 'Container';
        container.classList.add('chartContainer');

        var chartDiv = document.createElement('div');
        chartDiv.id = label + 'Chart';
        chartDiv.classList.add('chart');

        container.appendChild(chartDiv);
        element.appendChild(container);

        var graph = new Dygraph(chartDiv, History.makeCSV(label), {
            title: label,//will need prettier titles eventually
            width: 560,
            stackedGraph: false,
            labelsSeparateLines: true,
        });

        var tableDiv = document.createElement('div');
        tableDiv.classList.add('tableContainer');
        tableDiv.innerHTML = this.table(this.summarize(label));
        
        container.appendChild(tableDiv);
    },
    makeCSV: function makeCSV(args){
        //hardcoding the assumption that time is always the x axis
        var that = this;
        var headers = Array.prototype.slice.call(arguments);
        headers.unshift('Timestamp');
        var headersValid = headers.every(function(header){
            return !!that[header];
        });
        if (!headersValid){
            throw "Cannot generate CSV for nonexistent data stream.";
        };

        var lines = [headers.join(',')];
        for (var i = 0; i<this.Timestamp.length; i++){
            var data = [];
            for (var k = 0; k<headers.length; k++){
                data.push(this[headers[k]][i]);
            };
            lines.push(data.join(','));
        };
        return lines.join('\n');
    },
    summarize: function summarize(label){
        if (!this[label]){
            throw "Cannot summarize nonexistent data stream.";
        };
        var tuples = _.zip(this['Timestamp'], this[label]);
        tuples = tuples.sort(function(a,b){
            return a[1] <= b[1]?-1:1;
        });
        var min = {
            time: tuples[0][0],
            value: tuples[0][1],
        };
        var max = {
            time: tuples[tuples.length-1][0],
            value: tuples[tuples.length-1][1],
        };
        var medianIndex = Math.floor(tuples.length/2);
        var median = {
            time: tuples[medianIndex][0],
            value: tuples[medianIndex][1],
        };
        //how much do we care about ancient browsers?
        var total = this[label].reduce(function(a,b){
            return a + b;
        }, 0);
        var mean = total/this[label].length;
        var sumSquares = this[label].map(function(x){
            return Math.pow(x - mean, 2)}).
            reduce(function(a,b){return a+b;}, 0);
        var stdDev = Math.sqrt(sumSquares/this[label].length);

        return {
            min: min,
            max: max,
            median: median,
            mean: mean,
            stdDev: stdDev,
        };
    },
    table: _.template($('#streamSummary').text()),
};

var getCSV = $.get('/api/history/', function processCSV(data){
    var lines = data.split(/\n+/).filter(function(x){
        return /^[-\w]/.test(x);//avoid blank lines, allow negative numbers
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

    var plots = document.getElementById('plots');
    for (var i = 1; i<labels.length; i++){
        //timestamp always included implicitly
        History.drawGraph(labels[i], plots);
    };
});

getCSV.fail(function(){
    $('#plots').text('Unable to retrieve data from server.');
});
