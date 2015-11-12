var http = require('http');
var url = require('url');
var request = require("request");

var get_ip = require('ipware')().get_ip;
//app.use(function(req, res, next) {
//  var ip_info = get_ip(req);
//  console.log(ip_info);
  // { clientIp: '127.0.0.1', clientIpRoutable: false }
//  next();
//});

const PORT=8080;

function handleRequest(request, response){
  
  request.shouldKeepAlive = false;
  response.end('ok');

  try{
    var messageBody = JSON.parse(request.headers['message-body']); //TODO: test behavior with non-json message-body
    //console.log("api_key::",messageBody.api_key);
    if ( messageBody.api_key != '9a8b7c6d5e4f3g2h1i'){
      //not a known api key - exiting
      return;
  }
  }catch(e){
    return;
  }

  var dateNow = new Date();
  //console.log(dateNow);

  var ip_info = get_ip(request);
  //console.log(ip_info);

  var deviceId = messageBody.device_id;

  //var url_parts = url.parse(request.url, true);
  //var query = url_parts.query;
  //console.log(query);
  //console.log('all headers::',request.headers);
  
  var trackingObj = lookupIP(ip_info.clientIp, deviceId, dateNow, saveToLog);
}

function saveToLog(storeObj, deviceId, dateNow){
  storeObj['dateNow'] = dateNow;
  storeObj['deviceId'] = deviceId;
  console.log(storeObj);
}

function lookupIP(ip, deviceId, dateNow, callback){
  request('http://api.db-ip.com/addrinfo?addr='+ip+'&api_key=6a477de7814852443bf563215c2265cf035ee30e', function (error, response, output) {
    if (!error && response.statusCode == 200) {

      callback(JSON.parse(output), deviceId, dateNow); 
    }
  })
}

//Create a server
var server = http.createServer(handleRequest);

//Lets start our server
server.listen(PORT, function(){
  //Callback triggered when server is successfully listening. Hurray!
  //console.log("Server listening on: http://localhost:%s", PORT);
});