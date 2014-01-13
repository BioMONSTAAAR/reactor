'use strict';
//global data, namespace for helper functions
var History = {
    config: {
        labels: {
            time: 'Timestamp',
            ph: 'pH',
            h2olvl: 'Water Level',
            temp: 'Temperature',
            co2: 'Carbon Dioxide',
        },
        chartList: [
            {
                title: 'first chart',
                series: ['light', 'temp', 'ph'],
            },
        ],
    },
    render: function render(chart, target){
        var labels = ['time'].concat(chart.series);
        var chartData = History.timeSeries.apply(undefined, labels);

        var chartWrapper = document.createElement('div');
        chartWrapper.classList.add('chartContainer');

        var chartDiv = document.createElement('div');
        chartDiv.classList.add('chart');

        chartWrapper.appendChild(chartDiv);
        target.appendChild(chartWrapper);

        var annotations = [];
        for (var i = 1; i<labels.length; i++){
            var summary = History.summarize(labels[i]);
            ['Min', 'Max', 'Median'].forEach(function(stat){
                annotations.push({
                    series: labels[i],
                    x: new Date(summary[stat.toLowerCase()].time).toISOString(),
                    shortText: stat + ': \n' + summary[stat.toLowerCase()].value,
                    text: stat.replace(/(min|max)/i, '$1' + 'imum'),
                    width: 55,
                    height: 30,
                    cssClass: 'chartAnnotation',
                });
            });
        };

        var graphLabels = labels.map(function(stream){
            return History.config.labels[stream] || stream;
        });
        var graph = new Dygraph(chartDiv, chartData, {
            title: chart.title,
            labels: graphLabels,
            width: 560,
            /* docs say this only applies for csv data, but including this fixed
               my problem */
            xValueParser: function(date){
                return new Date(date).getTime();
            }, 
        });
        graph.ready(function(){
            graph.setAnnotations(annotations);
            console.log(annotations);
            $('.chartAnnotation').transify({
                opacityOrig: 0.1,
            });
        });
    },
    timeSeries: function timeSeries(listOfHeaders){
        //takes a variable number of arguments, in case it's ever needed
        //assumes first argument can be parsed by Date
        var headers = Array.prototype.slice.call(arguments);
        var headersValid = headers.every(function(header){
            //ie, there's non-empty list of points to go with that header
            return !!History[header];
        });
        if (!headersValid){
            console.log(headers);
            throw "Cannot produce time series for nonexistent data stream.";
        };
        var series = [];
        for (var i = 0; i<History.time.length; i++){
            var tuple = [];
            for (var h = 0; h<headers.length; h++){
                var value = History[headers[h]][i];
                tuple.push(value);
            };
            tuple[0] = new Date(tuple[0]);
            series.push(tuple);
        };
        return series;
    },
    summarize: function summarize(label){
        label = label.toLowerCase();
        if (!History[label]){
            throw "Cannot summarize nonexistent data stream " + label;
        };

        var tuples = _.zip(History.time, History[label]);
        tuples.sort(function(a,b){
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
        var total = History[label].reduce(function(a,b){
            return a + b;
        }, 0);
        var mean = total/History[label].length;
        var sumSquares = History[label].
            map(function(x){
                return Math.pow(x - mean, 2);
            }).
            reduce(function(a,b){ return a+b;},
            0);
        var stdDev = Math.sqrt(sumSquares/History[label].length);

        return {
            min: min,
            max: max,
            median: median,
            mean: mean,
            stdDev: stdDev,
            tuples: tuples,
        };
    },
};

(function main(){
    var getCSV = $.get('/api/history/', function handleRawData(data){
        /* POPULATE HISTORY OBJECT */
        //data comes from the server in chronological order
        History.time =_.pluck(data, '0');
        var headers = Object.keys(data[0][1]);//first one chosen arbitrarily
        headers.forEach(function(header){
            History[header] = [];
        });

        for (var i = 0; i<History.time.length; i++){
            headers.forEach(function(header){
                var value = data[i][1][header]
                History[header].push(value);
            });
        };

        /* DRAW PLOTS */
        var plots = document.getElementById('plots');
        for (var i = 0; i<History.config.chartList.length; i++){
            History.render(History.config.chartList[i], plots);
        };
    });
    
    getCSV.fail(function(){
        $('#plots').text('Unable to retrieve data from server.');
    });
})();
