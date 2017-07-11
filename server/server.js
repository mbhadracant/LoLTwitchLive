var config = require('./config');
var restify = require('restify');
var cron = require('node-cron');
var LolApi = require('leagueapi');

LolApi.init(config.RIOT_API_KEY, 'euw');
LolApi.setRateLimit(100, 60000 * 2);

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
var streamCollection;
var dataCollection;
var url = 'mongodb://localhost:27017/live_stream_info';
MongoClient.connect(url, function(err, db) {
  console.log("Connected successfully to server");
  streamCollection = db.collection('stream');
  dataCollection = db.collection('data');

  streamCollection.updateMany({}, {
    $set: {
      live: null
    }
  });

  cron.schedule('0 0 0 * * *', function() {
    console.log('updating runes/masteries (daily run)!')
    run();
  });

  cron.schedule('0 */1 * * * *', function() {
    console.log('updating live stream info');
    findLiveStreamers();
  });


  serverInit();
});

function serverInit() {
  server.get('/', home);
  server.post('/add', add);
  server.get('/:twitchName', getLiveData);
  server.get('/summoners/:twitchName', getSummoners);
  server.get('/data/:region', getData);
  server.get('/data/:region/masteries', getMasteries);
  server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
  });
}

function home(req, res, next) {
  streamCollection.find().toArray(function(err, docs) {
    res.send(docs);
    next();
  });
}

function add(req, res, next) {

  LolApi.Summoner.getByName(req.body.summonerName, req.body.region, function(err, summoner) {
    if (!err) {
      var name = Object.keys(summoner)[0];
      var id = summoner[name]['id'];

      var obj = {
        'id': id,
        'summonerName': req.body.summonerName,
        'region': req.body.region
      };
      streamCollection.find({
        'twitchName': req.body.twitchName
      }).toArray(function(err, docs) {
        if (docs.length >= 1) {
          streamCollection.updateOne({
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
          streamCollection.insertOne(doc);
        }
        console.log('added - ' + name);
        res.send("success");
        next();
      });
    } else {
      console.log('error adding - ' + name);
    }
  });
}



function getSummoners(req, res, next) {

  var twitchName = req.params['twitchName'];


  streamCollection.findOne({
    twitchName: twitchName
  }, function(err, item) {
    if (item == null) {
      return next(new restify.BadRequestError("Cannot find the following streamer: " + twitchName));
    }
    res.send(item['summoners']);
  });
}

function getLiveData(req, res, next) {
  var twitchName = req.params['twitchName'];

  streamCollection.findOne({
    twitchName: twitchName
  }, function(err, item) {
    if (item == null) {
      return next(new restify.BadRequestError("Cannot find the following streamer: " + twitchName));
    }
    if (item['live'] == null) {
      return next(new restify.ResourceNotFoundError("No live game data found for the streamer: " + twitchName));
    }
    res.send(item['live']);
  });
}

function getData(req, res, next) {
  var region = req.params['region'];

  dataCollection.findOne({
    region: region
  }, function(err, item) {
    res.send(item);
  });

}

function getMasteries(req, res, next) {
  var region = req.params['region'];

  dataCollection.findOne({
    region: region
  }, function(err, item) {
    res.send(item['masteries']);
  });

}


function findLiveStreamers() {
  streamCollection.find().toArray(function(err, docs) {
    for (var i = 0; i < docs.length; i++) {
      var doc = docs[i];
      var twitchName = doc['twitchName'];
      checkStreamIsOnline(twitchName, doc);
    }
  });
}

function checkStreamIsOnline(twitchName, doc) {
  twitch.getChannelStream(twitchName, function(err, data) {
    if (!err) {
      var isStreaming = (data['stream'] == null) ? false : true;
      if (isStreaming) {
        checkIfStreamerIsPlaying(twitchName, doc);
      }
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
    if (!err) {
      streamCollection.findOne({
        twitchName: twitchName
      }, function(err, item) {
        if (item['live'] == null) {
          streamCollection.updateOne({
            'twitchName': twitchName
          }, {
            $set: {
              'live': data
            }
          }, null, function(err, r) {
            var setObject = {};
            setObject['live.summonerName'] = summoner.summonerName;
            streamCollection.updateOne({
              'twitchName': twitchName
            }, {
              $set: setObject
            });
            setLiveData(twitchName, summoner.region);
          });
        } else {
          console.log('already has live data - ' + summoner['summonerName']);
        }
      });
      console.log('YAY - ' + twitchName);
    } else {
      streamCollection.findOne({
        twitchName: twitchName
      }, function(err, item) {
        if (item['live'] != null && item['live']['summonerName'] == summoner['summonerName']) {
          streamCollection.updateOne({
            'twitchName': twitchName
          }, {
            $set: {
              'live': null
            }
          });
        } else {
          console.log("SKIPPED - " + summoner['summonerName']);
        }
      });
    }
  });
}

function setLiveData(twitchName, region) {

  (function setVersion() {
    LolApi.Static.getVersions(region, function(err, data) {
      if (!err) {
        streamCollection.updateOne({
          'twitchName': twitchName
        }, {
          $set: {
            'live.version': data[0],
            'live.region': region,
          }
        }, null, function(err, r) {
          set(data[0]);
        });
      }
    });
  })();



  function set(version) {


    streamCollection.findOne({
      twitchName: twitchName
    }, function(err, streamData) {
      if (streamData['live'] == null) {
        return;
      }

      dataCollection.findOne({
        region: region
      }, function(err, data) {
        var participants = streamData['live']['participants'];


        for (var i = 0; i < participants.length; i++) {
          var player = participants[i];
          //set champion data

          var championId = player['championId'];
          var championName = data['champions'][championId]['name'];
          var championFileName = data['champions'][championId]['image']['full'];
          var championImageLink = `http://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${championFileName}`;
          var championData = {};
          championData['name'] = championName;
          championData['imageLink'] = championImageLink;

          var setObj = {};
          setObj['live.participants.' + i + '.championData'] = championData;
          streamCollection.updateOne({
            'twitchName': twitchName
          }, {
            $set: setObj
          });

          //set spell data
          var spellId1 = player['spell1Id'];
          var spellId2 = player['spell2Id'];
          var spellName1 = data['spells'][spellId1]['name'];
          var spellName2 = data['spells'][spellId2]['name'];
          var spellFileName1 = data['spells'][spellId1]['image']['full'];
          var spellFileName2 = data['spells'][spellId2]['image']['full'];
          var spellImageLink1 = `http://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spellFileName1}`;
          var spellImageLink2 = `http://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spellFileName2}`;

          var spellObj = {};
          spellObj['name1'] = spellName1;
          spellObj['name2'] = spellName2;
          spellObj['imageLink1'] = spellImageLink1;
          spellObj['imageLink2'] = spellImageLink2;

          setObj = {};
          setObj['live.participants.' + i + '.spellsData'] = spellObj;

          streamCollection.updateOne({
            'twitchName': twitchName
          }, {
            $set: setObj
          });

          // set runes data
          var runes = player['runes'];
          for (var j = 0; j < runes.length; j++) {
            var runeId = runes[j]['runeId'];
            var runeName = data['runes'][runeId]['name'];
            var runeDescription = data['runes'][runeId]['description'];
            var runeFileName = data['runes'][runeId]['image']['full'];
            var runeImageLink = `http://ddragon.leagueoflegends.com/cdn/${version}/img/rune/${runeFileName}`;

            var runeObj = {};
            runeObj['name'] = runeName;
            runeObj['description'] = runeDescription;
            runeObj['imageLink'] = runeImageLink;
            setObject = {};
            setObject['live.participants.' + i + '.runes.' + j + '.data'] = runeObj;
            streamCollection.updateOne({
              'twitchName': twitchName
            }, {
              $set: setObject
            });
          }

          (function setRankedData(index, summonerId) {

            LolApi.getLeagueData(summonerId, region, function(err, data) {
              if (data == undefined) {
                return;
              }
              var leagues = data[summonerId];

              for (var j = 0; j < leagues.length; j++) {
                if (leagues[j]['queue'] == 'RANKED_SOLO_5x5') {
                  var setObject = {};
                  setObject['live.participants.' + index + '.tier'] = leagues[j]['tier'];
                  streamCollection.updateOne({
                    'twitchName': twitchName
                  }, {
                    $set: setObject
                  });
                }
              }
            });
          })(i, player['summonerId']);
        }
      });
    });
  }
}
