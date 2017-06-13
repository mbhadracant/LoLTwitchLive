$(function() {
  chrome.tabs.query({
    'active': true,
    'lastFocusedWindow': true
  }, function(tabs) {
    var url = tabs[0].url;
    var pattern = new RegExp("^https:\/\/www.twitch.tv\/\S*");
    var valid = pattern.test(url);

    if (!valid) {
      $("#message").html("The current tab's URL is not a valid twitch page. Open up a twitch streaming page!")
    } else {
      var streamName = url.substring(url.lastIndexOf("/") + 1, url.length);
      $("#message").html(streamName);
      $("#message").css("font-weight", "bold");
      $("#message").css("font-size", "14px");
    }

  });

  $("#add-streamer").click(function() {
    $("#home").fadeOut(function() {
      $("#request").fadeIn();
    });
  });

  $("#request form").on('submit', function(e) {
    $("#request form").fadeOut(function() {
      $("#content").append("<div class='success'>The streamer/summoner info has been submitted sucessfully. It will be validated and added onto the database if valid.</div>");
    });
  });

  $.ajax({
    url: "http://localhost:8080",
    success: function(result) {
      var twitchNames = [];

      for (var i = 0; i < result.length; i++) {
        twitchNames.push(result[i].twitchName);
      }
      $.typeahead({
        input: '.js-typeahead-twitch-name',
        order: "desc",
        maxItem: 5,
        source: {
          data: twitchNames
        }
      });
    }
  });

  $.getJSON("../match.json", function(game) {
    var participants = game['participants'];
    for(var i = 0; i < participants.length; i++) {
      var player = participants[i];
      var teamDiv = (player['teamId'] == 100) ? $("#blue") : $("#red");
      var name = player['summonerName'];
      var playerDiv = $("<div class='player'>");
      var nameDiv = $("<div class='name'>");
      $(nameDiv).html(name);
      $(playerDiv).append(nameDiv);
      $(teamDiv).append(playerDiv);
    }
  });


});
