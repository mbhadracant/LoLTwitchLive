var config = require('./config');


var LolApi = require('leagueapi');

LolApi.init(config.RIOT_API_KEY,'euw');
LolApi.setRateLimit(100, 60000*2);

var options = {spellData: 'image', version : '7.13.1', locale: 'en_US', dataById: true}


LolApi.Static.getSummonerSpellList(options, 'euw', function(err,data) {

});
