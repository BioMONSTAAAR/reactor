function fakedata() {
  var r = "date,line,another line,sine wave\n";
  for (var i = 1; i <= 31; i++) {
    r += "2006/10/" + (i > 10 ? i : "0" + i);
    r += "," + 10 * (8 * i);
    r += "," + 10 * (250 - 8 * i);
    r += "," + 10 * (125 + 125 * Math.sin(0.3 * i));
    r += "\n";
  }
  return r;
}


// To show fake data:
//     g = new Dygraph(document.getElementById("chartdiv"), fakedata, {} );
var g = new Dygraph(document.getElementById("chartdiv"), "/api/history/", {
  title: 'Bioreactor History',
  width: 560,
  stackedGraph: false,
  legend: 'always', 
  labelsDiv: 'legenddiv',
  labelsSeparateLines: true,
});

