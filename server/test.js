var config = require('./config');
var LolApi = require('leagueapi');

LolApi.init(config.RIOT_API_KEY,'euw');
LolApi.setRateLimit(10, 3000);

LolApi.getLeagueData(64709188, 'na', function(err, data) {
  console.log(data);
});
