var app = require('http').createServer(handler)
var io = require('socket.io')(3330);
var fs = require('fs');

//app.listen(3330);

function handler (req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200);
    res.end(data);
  });
}

var mysocket;
io.on('connection', function (socket) {
  mysocket = socket;
});

setInterval(function() {
  mysocket.emit('news', { hello: 'you!' });
}, 16000);
