var http = require('http');
var url = require('url');
var request = require("request");
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

var io = require('socket.io')(3330);

var get_ip = require('ipware')().get_ip;
//app.use(function(req, res, next) {
//  var ip_info = get_ip(req);
//  console.log(ip_info);
  // { clientIp: '127.0.0.1', clientIpRoutable: false }
//  next();
//});

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

const PORT=8080;

//Create socket server
var mysocket;
io.on('connection', function (socket) {
  mysocket = socket;
});


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

function findAddress(singleton){
// get location from ip address geolocation api
  request('http://api.db-ip.com/addrinfo?addr='+singleton.ip+'&api_key=6a477de7814852443bf563215c2265cf035ee30e', function (error, response, output) {
    if (!error && response.statusCode == 200) {
      var apiObj = JSON.parse(output);
      singleton.city = apiObj.city;
      singleton.stateprov = apiObj.stateprov;
      singleton.country = apiObj.country;
      
      //create out qs location string
      var city = singleton.city.replace(/ /g, '+');
      var country = singleton.country.replace(/ /g, '+');

      if (!singleton.stateprov || singleton.stateprov == ''){
        var qs = city + ',+' + country;
      }
      else{
        var stateprov = singleton.stateprov.replace(/ /g, '+');
        var qs = city + ',+' + stateprov + ',+' + country;
      }
      singleton.qs = qs;

      geocoder(singleton);
      //callback(JSON.parse(output), deviceId, dateNow);
    }
  })
}

function geocodertest(singleton){
// check if we have the geocode in our db, if not get it from google api


  //query findGeocoder
  var findGeocode = function(db, callback) {
    var i = 0;
    var check = false;
    var cursor = db.collection('geocoderCache').find( { "qs": singleton.qs } ).limit(1);
    cursor.each(function(err, doc) {
      assert.equal(err, null);
      if (i == 0 && doc != null) {
        check = true;
        callback(doc.latlng);
      }
      if (i == 1 && check == false) {
        callback(false);
      }
      console.log('geocoder1:',i);
      console.log(doc);
      i++;
    });
  };

  findGeocode(db, function(dbLocation) {
    console.log('findGeocode');
    console.log(dbLocation);
  });
}

function geocoder(singleton){
// check if we have the geocode in our db, if not get it from google api

  //query findGeocoder
  var findGeocode = function(db, callback) {
    var i = 0;
    var check = false;
    var cursor = db.collection('geocoderCache').find( { "qs": singleton.qs } ).limit(1);
    cursor.each(function(err, doc) {
      assert.equal(err, null);
      if (i == 0 && doc == null){
        callback(false);
      }
      if (i == 0 && doc != null) {
        check = true;
        callback(doc.latlng);
      }
      if (i == 1 && check == false) {
        callback(false);
      }
      console.log('geocoder1:',i);
      console.log(doc);
      i++;
    });
  };

  findGeocode(db, function(dbLocation) {
    console.log('findGeocode');
    console.log(dbLocation);

    if (dbLocation == false) {

      //ex address: 1600+Amphitheatre+Parkway,+Mountain+View,+CA
      request('https://maps.googleapis.com/maps/api/geocode/json?address='+singleton.qs+'&key=AIzaSyDYwgKGdspSSeJXLfMms0nX43sPkUrxzc4', function (error, response, output) {
        if (!error && response.statusCode == 200) {
          var fullGeo = JSON.parse(response.body);
          console.dir(fullGeo.results[0].geometry.location);
          singleton.latlng = fullGeo.results[0].geometry.location;
          //console.log(fullGeo.results[0].geometry.location);
          saveGeocoderResult(singleton);

        }
        else{
          console.log('google geocoder api error');
        }

        //THATS IT - we just completed building our singleton!!
        console.log('saveSingleton');
        console.dir(singleton);
        saveSingleton(singleton);
      })

    }
    else{
      singleton.latlng = dbLocation;
      //THATS IT - we just completed building out singleton!!
      console.log('saveSingleton');
      console.dir(singleton);
      saveSingleton(singleton);
    }

  });
}

function saveGeocoderResult(singleton) {

  var insertDocument = function(db, callback) {
    db.collection('geocoderCache').insertOne( singleton, function(err, result) {
      assert.equal(err, null);
      console.log("Inserted a document into the geocoder collection.");
      callback(result);
    });
  };

  insertDocument(db, function() {
    //TODO: report errors
  });

}

//function checkGeocoderCache(singleton){
//
//  var findGeocode = function(db, callback) {
//     var cursor =db.collection('geocoderCache').find( { "qs": singleton.qs } );
//     cursor.each(function(err, doc) {
//        assert.equal(err, null);
//        if (doc != null) {
//           console.dir(doc);
//        }
//        else {
//           callback();
//        }
//     });
//  };
//
//  findGeocode(db, function() {});
//}

function saveSingleton(singleton) {
  console.log('saveSingleton:');
  console.dir(singleton);
// Save into the tracking collection, trigger alert over socket

  // check if deviceId exists, if not then create a new document, else add location to existing doc
  var findTracking = function(db, callback) {
    var i = 0;
    var check = false;
    var cursor =db.collection('tracking').find( { "deviceId": singleton.deviceId } ).limit(1);
    cursor.each(function(err, doc) {
      assert.equal(err, null);
      if (i == 0 && doc == null){
        callback(false);
      }
      if (i == 0 && doc != null) {
        check = true;
        callback(true);
      }
      if (i == 1 && check == false) {
        callback(false);
      }
      console.log('findTracking_i:',i);
      console.log(doc);
      i++;
    });
  };

  findTracking(db, function(found) {
    console.log('findTracking');
    console.log(found);

    var newLocObj = { "deviceId": singleton.deviceId,
                      "locs": [
                        {
                          "datetime": singleton.datetime,
                          "ip": singleton.ip,
                          "city": singleton.city,
                          "latlng": singleton.latlng,
                          "stateprov": singleton.stateprov,
                          "country": singleton.country,
                          "qs": singleton.qs
                        }
                      ]
                    };

    if (found == false) {
    //first time a device hits the api

      var insertDocument = function(db, callback) {
        db.collection('tracking').insertOne( newLocObj, function(err, result) {
          assert.equal(err, null);
          console.log("Inserted a document into the tracking collection.");
          callback();
        });
      };

      insertDocument(db, function() {
        //socket
        console.log('socket emit');
        mysocket.emit('news', JSON.stringify(newLocObj));
      });
    }
    if (found == true) { //add new location to existing document->locs array
      db.collection('tracking').update(
        { "deviceId": singleton.deviceId },
        { $push: { locs: newLocObj.locs[0] } }
      )
    }
  });
}

//TEST HERE!
//var singleton = {};
//singleton.qs = "New+York+(Manhattan),+New+York,+US";
//geocoder('Kalamazoo', 'Michigan', 'United States');
//setTimeout(function(){geocoder(singleton);}, 3000);
//setTimeout(function(){ socketEmit(); }, 16000);

//Create a server
var server = http.createServer(handleRequest);

//Lets start our server
server.listen(PORT, function(){
  //Callback triggered when server is successfully listening. Hurray!
  //console.log("Server listening on: http://localhost:%s", PORT);
});

setInterval(function() {
  mysocket.emit('news', { hello: 'you!' });
}, 16000);

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