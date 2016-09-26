var restify = require('restify');
var request = require('request');
var config = require('./config');
var server = restify.createServer();
var streamers = {
  'froggen': {'summonerNames': [ {region: 'na', name: 'Anivia Kid'} ]},
  'imaqtpie': {'summonerNames': [ {region: 'na', name: 'Imaqtpie'}, {region: 'na', name: 'feed l0rd'}, {region: 'na', name: 'kek'} ]},
  'rush': {'summonerNames': [ {region: 'kr', name: 'Tiltlord'}, {region: 'kr', name: 'C9 Rush'} ]},
  'pobelter': {'summonerNames': [ {region: 'na', name: 'Pobelter'} ]},
  'IMT_WildTurtle': {'summonerNames': [ {region: 'na', name: 'WildTurtle'}, {region: 'na', name: 'Turtle The Cat'} ]},
};



function init() {
  initServer();
  initSummonerIds();
}

function initServer() {
  server.get('/stream/:streamerName', getStreamerData);
  server.get('/', getAllStreamerData);
  server.listen(8080, function() {
    console.log('%s listening at %s', server.name, server.url);
  });
}

function initSummonerIds() {
  for(streamName in streamers) {
    var summonerNames = streamers[streamName]['summonerNames'];
    for(var i = 0; i < summonerNames.length; i++) {
      var summonerName = summonerNames[i];
      setSummonerId(streamName, summonerName, i);
    }
  }
}

function setSummonerId(streamName, summonerName, index) {
  request(`https://${summonerName.region}.api.pvp.net/api/lol/${summonerName.region}/v1.4/summoner/by-name/${summonerName.name}?api_key=${config.RIOT_API_KEY}`,
    function (error, response, body) {
      if (!error && response.statusCode == 200) {
          var summonerNameKey = summonerName.name.toLowerCase().replace(/\s+/g, '');
          streamers[streamName].summonerNames[index]['id'] = JSON.parse(body)[summonerNameKey]['id'];
      }
  });
}

function update() {
  for(streamName in streamers) {
    setStreamerData(streamName);
  }
}

function setStreamerData(streamName) {
  request(`https://api.twitch.tv/kraken/streams/${streamName}?client_id=${config.TWITCH_CLIENT_ID}`,
 function (error, response, body) {
  if (!error && response.statusCode == 200) {
    var isStreamerOnline = (JSON.parse(body)['stream'] == null) ? false : true;
    streamers[streamName]['isOnline'] = isStreamerOnline;

    if(isStreamerOnline == false) return;

    var summonerNames = streamers[streamName]['summonerNames'];
    for(var i = 0; i < summonerNames.length; i++) {
      var summoner = summonerNames[i];
        setLiveGameDataIfFound(streamName, summoner);
    }

  }
})
}

function setLiveGameDataIfFound(streamName, summoner) {
  request(`https://${summoner.region}.api.pvp.net/observer-mode/rest/consumer/getSpectatorGameInfo/${getRegionStringForCurrentGameCall(summoner.region)}/${summoner.id}?api_key=${config.RIOT_API_KEY}`,
  function (error, response, body) {
   if (!error && response.statusCode != 404) {
     var data =  JSON.parse(body);
     streamers[streamName]['liveGameData'] = data;
   } else {
     streamers[streamName]['liveGameData'] = undefined;
   }
 });
}

function getStreamerData(req, res, next) {
  if(streamers[req.params.streamerName] == undefined){
    return next(new restify.NotFoundError("Streamer not found"));
  }
  res.send(streamers[req.params.streamerName]);
  next();
}

function getAllStreamerData(req, res, next) {
  res.send(streamers);
  next();
}

function getRegionStringForCurrentGameCall(region) {
  switch(region) {
    case 'eu':
      return 'EUW1';
      break;
    case 'na':
      return 'NA1';
      break;
    case 'kr':
      return 'KR';
      break;
  }
}

init();
update();
setInterval(update, 10000);
