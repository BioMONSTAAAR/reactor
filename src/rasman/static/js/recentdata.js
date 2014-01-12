//global object containing data from CSV; namespace for helper functions
var History = {
    config: {
        chartTitles: {
            temp: 'Temperature (\u00b0C)',
            co2:  'Carbon Dioxide',
            h2olvl:  'Water Level',
            ph:  'pH',
            light: 'Light',
        },
    },
    render: function render(label, target){
        var chartWrapper = document.createElement('div');
        chartWrapper.id = label + 'Container';
        chartWrapper.classList.add('chartContainer');

        var chartDiv = document.createElement('div');
        chartDiv.id = label + 'Chart';
        chartDiv.classList.add('chart');

        chartWrapper.appendChild(chartDiv);
        target.appendChild(chartWrapper);

        var stats = History.summarize(label);
        var annotations = [];
        ['Min', 'Max', 'Median'].forEach(function(stat){
            annotations.push({
                series: label,
                x: stats[stat.toLowerCase()].time,
                shortText: stat + ': \n' + stats[stat.toLowerCase()].value,
                text: stat.replace(/(min|max)/i, '$1' + 'imum'),
                width: 55,
                height: 30,
                cssClass: 'chartAnnotation',
            });
        });

        var graph = new Dygraph(chartDiv, History.makeCSV(label), {
            title: History.config.chartTitles[label],
            width: 560,
        });
        graph.ready(function(){
            graph.setAnnotations(annotations);
            $('.chartAnnotation').transify({
                opacityOrig: 0.1,
            });
        });
    },
    makeCSV: function makeCSV(listOfHeaders){
        //takes a variable number of arguments, in case it's ever needed
        var headers = Array.prototype.slice.call(arguments);
        //hardcoding the assumption that time is always the x axis
        headers.unshift('Timestamp');
        var that = this;
        var headersValid = headers.every(function(header){
            //ie, there's non-empty list of points to go with that header
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
            if (a[1] === b[1]){
                return 0;
            } else {
                return a[1] < b[1]?-1:1;
            };
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
};

(function main(){
    var getCSV = $.get('/api/history/', function handleRawData(data){
        History.time = Object.keys(data).sort(function(a,b){
            return moment(a).unix() - moment(b).unix();
        });

        var headers = Object.keys(JSON.parse(data[History.time[0]]));
        headers.forEach(function(header){
            History[header.toLowerCase()] = [];
        });

        for (var i = 0; i<History.time.length; i++){
            var rowData = JSON.parse(data[History.time[i]]);
            for (var measurement in rowData){
                var value = parseFloat(rowData[measurement]);
                History[measurement.toLowerCase()].push(value);
            };
        };
        console.log(History);
    });
    
    getCSV.fail(function(){
        $('#plots').text('Unable to retrieve data from server.');
    });
})();
