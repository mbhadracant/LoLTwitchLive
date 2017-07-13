var LolApi = require('leagueapi');
var config = require('./config');

LolApi.init(config.RIOT_API_KEY,'euw');
LolApi.setRateLimit(100, 60000*2);

var MongoClient = require('mongodb').MongoClient;
var dataCollection;

var url = 'mongodb://' + config.DB_USERNAME + ':' + config.DB_PASSWORD + '@188.166.146.140:27017/live_stream_info';
MongoClient.connect(url, function(err, db) {
  dataCollection = db.collection('data');
});

function getRegions() {
  return ['euw','na','kr','br','oce','las','eune','jp','tr','ru','lan'];
}

function run() {
  var regions = getRegions();
  for(var i = 0; i < regions.length; i++) {
    var region = regions[i];
    setData(region);
  }
}

exports.run = run;

function setData(region) {
  LolApi.Static.getVersions(region,function(err,data) {
    if(!err) {
      var version = data[0];
      var doc = {};
      doc['region'] = region;
      doc['version'] = version;

      dataCollection.updateOne({region: region}, {$set: doc},{upsert: true, safe: false}, function(err,r) {

        var options = {runeListData: 'image', version: version, locale: 'en_US'}

        LolApi.Static.getRuneList(options, region, function(err, data) {
          var runesData = data['data'];
          dataCollection.updateOne({region: region}, {$set: {'runes': runesData}}, {upsert: true, safe: false});
        });

        options = {masteryListData: 'image', version: version, locale: 'en_US'}

        LolApi.Static.getMasteryList(options, region, function(err, data) {
          var masteryData = data['data'];
          dataCollection.updateOne({region: region}, {$set: {'masteries' : masteryData}}, {upsert: true, safe: false});
        });

        options = {champData: 'image', version: version, locale: 'en_US', dataById: true}

        LolApi.Static.getChampionList(options, region, function(err,data) {
          var championData = data['data'];
          dataCollection.updateOne({region: region}, {$set: {'champions' : championData}}, {upsert: true, safe: false});
        });

        options = {spellData: 'image', version : '7.13.1', locale: 'en_US', dataById: true}

        LolApi.Static.getSummonerSpellList(options, region, function(err,data) {
          var spellsData = data['data'];
          dataCollection.updateOne({region: region}, {$set: {'spells' : spellsData}}, {upsert: true, safe: false});
        });
      });
    }
  });
}
