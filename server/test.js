var config = require('./config');
var LolApi = require('leagueapi');

LolApi.init(config.RIOT_API_KEY,'euw');
LolApi.setRateLimit(10, 3000);

var options = {runeData: 'all', version : '7.13.1', locale: 'en_US'}

LolApi.Static.getRuneById(5296, options, function(err, data) {
  console.log(data);
});
