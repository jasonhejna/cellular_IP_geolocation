var http = require('http');
var url = require('url');
var qs = require('querystring');
var request = require("request");
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

var url = 'mongodb://localhost:27017/track';
var db;
MongoClient.connect(url, function(err, dbc) {
  assert.equal(null, err);
  if (err){
    console.log('mongodb error:',err);
  }
  console.log('connected to mongodb');
  db = dbc;
});

const PORT=8081;

//ex: http://localhost:8081/?api_key=1a2b3c4d5c6e&card=0123456789

function handleRequest(request, response){
  
  var str = request.url.split('?')[1];
  var querystring = qs.parse(str);

  console.log(querystring);

  if (querystring.api_key != '1a2b3c4d5c6e'){
  	response.end('wrong api key');
  	return;
  }

  if (querystring.card != '0123456789'){
  	response.end('wrong card id');
  	return;
  }
  
  var tracking = function(db, callback) {
    var i = 0;
    var check = false;
    var cursor = db.collection('tracking').find( { "deviceId": querystring.card } ).limit(1);
    cursor.each(function(err, doc) {
      assert.equal(err, null);
      if (i == 0 && doc == null){
        callback(false);
      }
      if (i == 0 && doc != null) {
        check = true;
        callback(doc);
      }
      if (i == 1 && check == false) {
        callback(false);
      }
      i++;
    });
  };

  tracking(db, function(found) {

    if (found == false) {
    	response.end('card not found');
    }
    else {
    	console.dir(found);
    	var output = {};
    	output.deviceId = found.deviceId;
    	output.locs = found.locs;
    	console.dir(output);
    	response.end(JSON.stringify(output));
    }

  });

}


//Create a server
var server = http.createServer(handleRequest);

//Lets start our server
server.listen(PORT, function(){
  //Callback triggered when server is successfully listening. Hurray!
  //console.log("Server listening on: http://localhost:%s", PORT);
});

process.stdin.resume();//so the program will not close instantly


function exitHandler(options, err) {
//close connection to mongodb
    db.close();
    if (options.cleanup) console.log('clean exit');
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));