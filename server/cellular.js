var http = require('http');
var url = require('url');
var request = require("request");
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

var get_ip = require('ipware')().get_ip;
//app.use(function(req, res, next) {
//  var ip_info = get_ip(req);
//  console.log(ip_info);
  // { clientIp: '127.0.0.1', clientIpRoutable: false }
//  next();
//});

var url = 'mongodb://localhost:27017/newyest';
var db;
MongoClient.connect(url, function(err, dbc) {
  assert.equal(null, err);
  db = dbc;
});

const PORT=8080;

function handleRequest(request, response){
  
  request.shouldKeepAlive = false;
  response.end('ok');

  try{
    //ex: {"device_id":"0123456789","api_key":"9a8b7c6d5e4f3g2h1i","local_ip":"192.168.0.66"}
    var messageBody = JSON.parse(request.headers['message-body']); //TODO: test behavior with non-json message-body
    //console.log("api_key::",messageBody.api_key);
    if ( messageBody.api_key != '9a8b7c6d5e4f3g2h1i'){
    //not a known api key - exiting
      return;
    }
  }
  catch(e){
    return;
  }

  var singleton = {};

  singleton.datetime = new Date();
  //console.log(dateNow);

  singleton.ip = get_ip(request).clientIp;
  //console.log(ip_info);

  singleton.deviceId = messageBody.device_id;

  //var url_parts = url.parse(request.url, true);
  //var query = url_parts.query;
  //console.log(query);
  //console.log('all headers::',request.headers);
  
  findAddress(singleton);
}

function checkGeocoderCache(singleton){

  var findGeocode = function(db, callback) {
     var cursor =db.collection('geocoderCache').find( { "qa": singleton.qs } );
     cursor.each(function(err, doc) {
        assert.equal(err, null);
        if (doc != null) {
           console.dir(doc);
        } else {
           callback();
        }
     });
  };

  findGeocode(db, function() {});
}

function geocoder(singleton){

  //query findGeocoder
  var findGeocode = function(db, callback) {
    var findCheck = false;
    var cursor = db.collection('geocoderCache').find( { "qs": 'Detroit,+Michigan,+United+States' } );//singleton.qs
    cursor.each(function(err, doc) {
       assert.equal(err, null);
       if (doc != null) {
          callback(doc.location);
       }
       findCheck = true;
    });
    if (findCheck == false) {
      callback(false);
    }
  };

  findGeocode(db, function(dbLocation) {
    if (dbLocation == false) {

      //ex address: 1600+Amphitheatre+Parkway,+Mountain+View,+CA
      request('https://maps.googleapis.com/maps/api/geocode/json?address='+singleton.qs+'&key=AIzaSyDYwgKGdspSSeJXLfMms0nX43sPkUrxzc4', function (error, response, output) {
        if (!error && response.statusCode == 200) {
          var fullGeo = JSON.parse(response.body);
          console.dir(fullGeo.results[0].geometry.location);
          singleton.location = fullGeo.results[0].geometry.location;
          //console.log(fullGeo.results[0].geometry.location);
          saveGeocoderResult(singleton);
        }
      })
    }
    else{
      singleton.location = dbLocation;
    }

    //THATS IT - we just completed building out singleton!!
    //save into the tracking collection
    
  });
}


function saveGeocoderResult(singleton){

  var insertDocument = function(db, callback) {
    db.collection('geocoderCache').insertOne( {
          "qs" : "Detroit,+Michigan,+United+States",
          "city" : "Detroit",
          "stateprov" : "Michigan",
          "country" : "US",
          "location" : {
              "lat" : 42.3314269999999979,
              "lng" : -83.0457538000000000
          }
    }, function(err, result) {
      assert.equal(err, null);
      console.log("Inserted a document into the geocoder collection.");
      callback(result);
    });
  };

  insertDocument(db, function() {});

}

function saveToLog(storeObj, deviceId, dateNow){

  storeObj['dateNow'] = dateNow;
  storeObj['deviceId'] = deviceId;
  console.log(storeObj);
}

function findAddress(singleton){

  request('http://api.db-ip.com/addrinfo?addr='+singleton.ip+'&api_key=6a477de7814852443bf563215c2265cf035ee30e', function (error, response, output) {
    if (!error && response.statusCode == 200) {
      var apiObj = JSON.parse(output);
      singleton.city = apiObj.city;
      singleton.stateprov = apiObj.stateprov;
      singleton.country = apiObj.country;
      
      //create out qs location string
      var city = singleton.city.replace(/ /g, '+');
      var country = singleton.country.replace(/ /g, '+');

      if (!singleton.stateprov || singleton.stateprov != ''){
        var stateprov = singleton.stateprov.replace(/ /g, '+');
        var qs = city + ',+' + stateprov + ',+' + country;
      }
      else{
        var qs = city + ',+' + country;
      }
      singleton.qs = qs;

      geocoder(singleton);
      //callback(JSON.parse(output), deviceId, dateNow);
    }
  })
}

//TEST HERE!
//geocoder('Kalamazoo', 'Michigan', 'United States');
setTimeout(function(){geocoder();}, 3000);
//setTimeout(function(){ saveGeocoderResult(); }, 3000);


//Create a server
var server = http.createServer(handleRequest);

//Lets start our server
server.listen(PORT, function(){
  //Callback triggered when server is successfully listening. Hurray!
  //console.log("Server listening on: http://localhost:%s", PORT);
});

process.stdin.resume();//so the program will not close instantly


function exitHandler(options, err) {
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