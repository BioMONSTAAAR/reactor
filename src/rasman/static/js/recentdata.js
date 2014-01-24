'use strict';
//global data, namespace for helper functions
var History = {
    config: {
        //list determines what charts get drawn, what's on the axes, etc.
        //keys of "series" objects should match History.config.labels
        chartList: [
            {
                title: 'Light + Temperature',
                labels: ['light', 'temp'],
                series: {
                    Light: { axis: 'y' },
                    Temperature: { axis: 'y2' },
                },
            },
            {
                title: 'CO2 and pH',
                labels: ['co2', 'ph'],
                series: {
                    'Carbon Dioxide': {axis: 'y'},
                    pH: {axis: 'y2'},
                },
            },
            {
                title: 'Water Level',
                labels: ['h2olvl'],
                series: {
                    'Water Level': {axis: 'y'},
                },
            },
        ],
        //how to label the datastreams in the charts
        labels: {
            time: 'Timestamp',
            ph: 'pH',
            light: 'Light',
            h2olvl: 'Water Level',
            temp: 'Temperature',
            co2: 'Carbon Dioxide',
            reverse: {},//used by click handler.  populated dynamically.
        },
    },
    //keep references to each graph in case they need to be modified later
    graphs: [],
    //no reason to compute summaries twice if the history data isn't updated live
    summaries: {},
    render: function render(chart, target){
        //'chart' argument is entry in this.config.chartList
        var labels = ['time'].concat(chart.labels);
        var chartData = History.timeSeries.apply(undefined, labels);

        var chartWrapper = document.createElement('div');
        chartWrapper.classList.add('chartContainer');

        var chartDiv = document.createElement('div');
        chartDiv.classList.add('chart');

        chartWrapper.appendChild(chartDiv);
        target.appendChild(chartWrapper);

        var graphLabels = labels.map(function(stream){
            return History.config.labels[stream] || stream;
        });
        console.log(graphLabels);
        console.log(chart.series);
        var graph = new Dygraph(chartDiv, chartData, {
            title: chart.title,
            labels: graphLabels,
            width: 560,
            series: chart.series,
            clickCallback: function(e, x, points){
                //create reverse lookup table, because information about 
                //nearest points are given like "Water Level" rather than "h20lvl"
                var config = History.config;
                if (_.size(config.labels.reverse) == 0){
                    var streams = Object.keys(config.labels);
                    streams.forEach(function(label){
                        if (label !== 'reverse'){
                            var key = config.labels[label] || label;
                            config.labels.reverse[key] = label;
                        };
                    });
                };

                var clickY = e.pageY - $(e.target).offset().top;
                var closestPoint = _.min(points, function(pt){
                    return Math.abs(clickY - pt.canvasy);
                });
                var nearestStream = config.labels.reverse[closestPoint.name] || closestPoint.name;

                if (graph.currentTable !== nearestStream){
                    //update table if necessary
                    var divToUpdate = chartWrapper.querySelector('.tableContainer');
                    divToUpdate.innerHTML = History.table(History.summarize(nearestStream));
                    graph.currentTable = nearestStream;
                };
            },
            /* docs say this only applies for csv data, but including this fixed
               my problem with annotations */
            xValueParser: function(date){
                return new Date(date).getTime();
            }, 
        });
        graph.currentTable = chart.labels[0];
        var tableDiv = document.createElement('div');
        tableDiv.classList.add('tableContainer');
        tableDiv.id = graph.currentTable + 'TableContainer';
        tableDiv.innerHTML = History.table(History.summarize(graph.currentTable));
        chartWrapper.appendChild(tableDiv);

        History.graphs.push(graph);
    },
    table: _.template($('#streamSummary').text()),
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
        if (History.summaries[label]){
            //take advantage of cache
            return History.summaries[label];
        };

        //"schwartzian transform"
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
        
        var result = {
            title: History.config.labels[label] || label,
            min: min,
            max: max,
            median: median,
            mean: mean,
            stdDev: stdDev,
        };
        //cache it
        History.summaries[label] = result;

        return result;
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
