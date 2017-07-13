# LoLTwitchLive
Chrome extension which shows rank, runes, masteries, summoner spells, champions, keystones of all players in the live game a twitch streamer is playing.

### Prerequisites Installed
* Mongo DB 
* Node.js

### Running the extension
You download the extension folder and load the unpacked extension using the settings panel in Chrome. (chrome://extensions/)

### Running the server as localhost
You will need to do the following to make run the node.js server locally work, Do the following:

* Your Mongo instance should have a database called 'live_stream_info' with the collections 'stream' and 'data'.


* Create a config file called 'server/config.js' and add the following configurations:
```node
exports.RIOT_API_KEY = "INSERT RIOT API KEY"
exports.TWITCH_CLIENT_ID = "INSERT TWITCH CLIENT ID"
exports.TWITCH_CLIENT_SECRET = "INSERT TWITCH CLIENT SECRET"
exports.EMAIL_USERNAME = "INSERT EMAIL USERNAME"
exports.EMAIL_PASSWORD = "INSERT EMAIL PASSWORD"
exports.DB_USERNAME = "INSERT MONGODB USERNAME"
exports.DB_PASSWORD = "INSERT MONGODB PASSWORD"
```


* Change the MongoDB connection URL in 'server/server.js' to localhost


* Change the server variable to link to localhost in extensions/js/popup.js:
```javascript
var server = "http://188.166.146.140:8080/";
```
to 
```javascript
var server = "http://localhost:8080/";
```


* Run data.js to put the data in the database (if you don't want to wait for the cron job):
```bash
node server/data.js
```


* Run server.js to start up the server:
```bash
node server/server.js
```

