//global data, namespace for helper functions
var History = {
    config: {
        chartTitles: {
            time: 'Time',
            temp: 'Temperature (\u00b0C)',
            co2:  'Carbon Dioxide',
            h2olvl:  'Water Level',
            ph:  'pH',
            light: 'Light',
        },
    },
    render: function render(labels, target){
        labels = labels.map(function(x){return x.toLowerCase()});
        var chartWrapper = document.createElement('div');
//        chartWrapper.id = label + 'Container';
        chartWrapper.classList.add('chartContainer');

        var chartDiv = document.createElement('div');
//       chartDiv.id = label + 'Chart';
        chartDiv.classList.add('chart');

        chartWrapper.appendChild(chartDiv);
        target.appendChild(chartWrapper);

        var summaries = labels.map(function(label){
            return History.summarize(label);
        });
        var annotations = [];
        ['Min', 'Max', 'Median'].forEach(function(stat){
            labels.forEach(function(label, index){
                annotations.push({
                    series: label,
                    x: summaries[index][stat.toLowerCase()].time.replace(/\.\d+$/, ''),
                    shortText: stat + ': \n' + summaries[index][stat.toLowerCase()].value,
                    text: stat.replace(/(min|max)/i, '$1' + 'imum'),
                    width: 55,
                    height: 30,
                    cssClass: 'chartAnnotation',
                });
            });
        });
        console.log(annotations);

        var titles = labels.map(function(label){
            return History.config.chartTitles[label];
        });
        var graphTitle = titles.join(', ');
        var graphLabels = [History.config.chartTitles.time].concat(titles);
        var graph = new Dygraph(chartDiv, History.timeSeries.apply(undefined, labels), {
            title: graphTitle,
            labels: graphLabels,
            width: 560,
        });
        graph.ready(function(){
            graph.setAnnotations(annotations);
            $('.chartAnnotation').transify({
                opacityOrig: 0.1,
            });
        });
    },
    timeSeries: function timeSeries(listOfHeaders){
        //takes a variable number of arguments, in case it's ever needed
        var headers = Array.prototype.slice.call(arguments).map(function(x){
            return x.toLowerCase();
        });
        headers.unshift('time');
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
            tuple[0] = moment(tuple[0])._d.toString();//internal date object.
            series.push(tuple);
        };
        return series;
    },
    summarize: function summarize(label){
        label = label.toLowerCase();
        if (!this[label]){
            throw "Cannot summarize nonexistent data stream " + label;
        };
        var tuples = _.zip(this.time, this[label]);
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
        var sumSquares = this[label].
            map(function(x){
                return Math.pow(x - mean, 2);
            }).
            reduce(function(a,b){
                return a+b;},
            0);
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
        var sortedTimeStamps = Object.keys(data).sort(function(a,b){
            return moment(a).unix() - moment(b).unix();
        });
        History.time = sortedTimeStamps.map(function(str){
            return str.replace(/\.\d+$/, '');
        });

        var headers = Object.keys(data[sortedTimeStamps[0]]);
        headers.forEach(function(header){
            History[header.toLowerCase()] = [];
        });

        for (var i = 0; i<sortedTimeStamps.length; i++){
            var rowData = data[sortedTimeStamps[i]];
            for (var measurement in rowData){
                var value = parseFloat(rowData[measurement]);
                History[measurement.toLowerCase()].push(value);
            };
        };

        var plots = document.getElementById('plots');
        for (var i = 0; i<headers.length; i++){
            History.render([headers[i]], plots);
        };
    });
    
    getCSV.fail(function(){
        $('#plots').text('Unable to retrieve data from server.');
    });
})();
