var config = require('./config');
var restify = require('restify');
var LolApi = require('leagueapi');

LolApi.init(config.RIOT_API_KEY,'euw');
LolApi.setRateLimit(10, 3000);

var server = restify.createServer();
server.use(restify.queryParser());
server.use(restify.bodyParser({
  mapParams: false
}));

var TwitchApi = require('twitch-api');

var twitch = new TwitchApi({
    clientId: config.TWITCH_CLIENT_ID,
    clientSecret: config.TWITCH_CLIENT_SECRET,
    redirectUri: 'http://localhost.',
    scopes: []
});


var MongoClient = require('mongodb').MongoClient;
var collection;

var url = 'mongodb://localhost:27017/live_stream_info';
MongoClient.connect(url, function(err, db) {
  console.log("Connected successfully to server");
  collection = db.collection('stream');
  collection.updateMany({}, {$set: {live: null}});
  serverInit();
  var liveStreamers = findLiveStreamers();
  setInterval(function() {
    var liveStreamers = findLiveStreamers();
  }, 10000);
});

function serverInit() {
  server.get('/', home);
  server.post('/add', add);
  server.get('/:twitchName', getLiveData);
  server.get('/summoners/:twitchName', getSummoners);
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

  LolApi.Summoner.getByName(req.body.summonerName, req.body.region, function(err, summoner) {
  	if(!err) {
      var name = Object.keys(summoner)[0];
      var id = summoner[name]['id'];

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
  });
}



function getSummoners(req, res, next) {

  var twitchName = req.params['twitchName'];


  collection.findOne({twitchName : twitchName}, function(err, item) {
          if(item == null) {
            return next(new restify.BadRequestError("Cannot find the following streamer: " + twitchName));
          }
          res.send(item['summoners']);
  });
}

function getLiveData(req, res, next) {
  var twitchName = req.params['twitchName'];

  collection.findOne({twitchName : twitchName}, function(err, item) {
          if(item == null) {
            return next(new restify.BadRequestError("Cannot find the following streamer: " + twitchName));
          }
          if(item['live'] == null) {
            return next(new restify.ResourceNotFoundError("No live game data found for the streamer: " + twitchName));
          }
          res.send(item['live']);
  });
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
  twitch.getChannelStream(twitchName, function(err, data) {
    var isStreaming = (data['stream'] == null) ? false : true;
    if (isStreaming) {
      checkIfStreamerIsPlaying(twitchName, doc);
    }
  });
}

function checkIfStreamerIsPlaying(twitchName, doc) {
  var summoners = doc['summoners'];
  for (var i = 0; i < summoners.length; i++) {
    var summoner = summoners[i];
    console.log("testing - " + summoner['summonerName']);
    setLiveDataIfFound(twitchName, summoner);
  }
}

function setLiveDataIfFound(twitchName, summoner) {
  LolApi.getCurrentGame(summoner.id, summoner.region, function(err, data) {
    if(!err) {
      collection.findOne({twitchName : twitchName}, function(err, item) {
              if(item['live'] == null) {
                collection.updateOne({'twitchName':twitchName},{$set: {'live':data}}, null, function(err, r) {
                  setLiveData(twitchName, summoner.region);
                });
              } else {
                console.log('already has live data - ' + summoner['summonerName']);
              }
      });
      console.log("YAY - " + summoner['summonerName']);
    } else {
      collection.updateOne({'twitchName':twitchName},{$set: {'live':null}});
      console.log("error - " + summoner['summonerName']);
    }
  });
}

function setLiveData(twitchName, region) {

  function setVersion() {

    LolApi.Static.getVersions(region,function(err,data) {
      if(!err) {
        collection.updateOne({'twitchName':twitchName},{$set: {'live.version':data[0]}}, null, function(err, r) {
          setImages();
        });
      }
    });

  }

  function setImages() {


    collection.findOne({twitchName : twitchName}, function(err, item) {
      if(item['live'] == null) {
        return;
      }

      var participants = item['live']['participants'];
      for(var i = 0; i < participants.length; i++) {
        var player = participants[i];
        var championId = player['championId'];
        var spellId1 = player['spell1Id'];
        var spellId2 = player['spell2Id'];

        function setChampionImage(index, championId) {
          var options = {champData: 'image', version: item['live']['version'], locale: 'en_US'}
          LolApi.Static.getChampionById(championId, options, region, function(err, data) {

            var filename = data['image']['full'];
            var setObject = {};
            setObject['live.participants.' + index + '.championImage'] = `http://ddragon.leagueoflegends.com/cdn/${options.version}/img/champion/${filename}`;
            collection.updateOne({'twitchName':twitchName},{$set: setObject});
          });
        }

        function setSpellsImage(index, spellId, spellNumber) {

          var options = {spellData: 'image', version : item['live']['version'], locale: 'en_US'}


          LolApi.Static.getSummonerSpellById(spellId, options, function(err, data) {
            var filename = data['image']['full'];
            var setObject = {};
            setObject['live.participants.' + index + '.spellImage' + spellNumber] = `http://ddragon.leagueoflegends.com/cdn/${options.version}/img/spell/${filename}`;
            collection.updateOne({'twitchName':twitchName},{$set: setObject});
          });
        }

        setChampionImage(i, championId);
        setSpellsImage(i, spellId1, 1);
        setSpellsImage(i, spellId2, 2);
      }
    });
  }

  setVersion();
}

//db.lul.update({name:"Mayur"}, {$set: {kek:'xda'}});
