var restify = require('restify');
var request = require('request');
var config = require('./config');
var server = restify.createServer();
server.use(restify.bodyParser({
  mapParams: false
}));

var MongoClient = require('mongodb').MongoClient;

// Connection URL
var url = 'mongodb://localhost:27017/live_stream_info';
var collection;
// Use connect method to connect to the server
MongoClient.connect(url, function(err, db) {
  console.log("Connected successfully to server");
  collection = db.collection('stream');
  serverInit();
  setInterval(function() {
    var liveStreamers = findLiveStreamers();
  }, 3000);
});

function serverInit() {
  server.get('/', home);
  server.post('/add', add);
  server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
  });
}

function home(req, res, next) {
  collection.find().toArray(function(err, docs) {
    res.send(docs);
    next();
  });
}

function add(req, res, next) {


  function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
      var id = JSON.parse(body)['id'];
      console.log()
      var obj = {
        'id': id,
        'summonerName': req.body.summonerName,
        'region': req.body.region
      };
      collection.find({
        'twitchName': req.body.twitchName
      }).toArray(function(err, docs) {
        if (docs.length >= 1) {
          collection.updateOne({
            'twitchName': req.body.twitchName
          }, {
            $push: {
              'summoners': obj
            }
          });
        } else {
          var doc = {};
          doc['twitchName'] = req.body.twitchName;
          doc['summoners'] = [];
          doc['summoners'].push(obj);
          collection.insertOne(doc);
        }
        res.send("success");
        next();
      });
    }
  }

  request(`https://${req.body.region}.api.riotgames.com/lol/summoner/v3/summoners/by-name/${req.body.summonerName}?api_key=${config.RIOT_API_KEY}`, callback);

}

function getSummonerId(summoner) {

}

function findLiveStreamers() {
  collection.find().toArray(function(err, docs) {
    for (var i = 0; i < docs.length; i++) {
      var doc = docs[i];
      var twitchName = doc['twitchName'];
      checkStreamIsOnline(twitchName, doc);
    }
  });
}

function checkStreamIsOnline(twitchName, doc) {
  function callback(error, response, body) {
    if (!error && response.statusCode == 200) {
      var isStreaming = (JSON.parse(body)['stream'] == null) ? false : true;
      if (isStreaming) {
        checkIfStreamerIsPlaying(twitchName, doc);
      }
    }
  }
  request(`https://api.twitch.tv/kraken/streams/${twitchName}?client_id=${config.TWITCH_CLIENT_ID}`, callback);
}

function checkIfStreamerIsPlaying(twitchName, doc) {
  var summoners = doc['summoners'];
  for (var i = 0; i < summoners.length; i++) {
    var summoner = summoners[i];

    console.log(summoner['id'] + " - " + summoner['summonerName']);
  }
}
