var twitchName;

$(function() {

  chrome.tabs.query({
    'active': true,
    'lastFocusedWindow': true
  }, function(tabs) {
    var url = tabs[0].url;
    var pattern = new RegExp("^https:\/\/www.twitch.tv\/[^\d\W]+");
    var valid = pattern.test(url);
    console.log(valid);
    if (!valid) {
      $("#message").html("The current tab's URL is not a valid twitch page. Open up a twitch streaming page!")
    } else {
      twitchName = url.substring(url.lastIndexOf("/") + 1, url.length);
      makeMatchRequest(twitchName);
      $("#message").html(twitchName);
      $("#message").css("font-weight", "bold");
      $("#message").css("font-size", "18px");
    }

  });

  $(".fa-home").click(function() {
    $(".fa").removeClass("active");
    $(this).addClass("active");
    $("#request").hide(function() {
      $("#home").show();
    });
  });

  $(".fa-plus").click(function() {
    $(".fa").removeClass("active");
    $(this).addClass("active");
    $("#home").hide(function() {
      $("#request").show();
    });
  });

  $("#request form").on('submit', function(e) {
    $("#request form").hide(function() {
      $("#request").append("<div class='success'>The streamer/summoner info has been submitted sucessfully. It will be validated and added onto the database if valid.</div>");
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


  function makeMatchRequest(twitchName) {


    $.getJSON("http://localhost:8080/" + twitchName, function(game) {
      var platformId = game['platformId'];
      var version = game['version']
      var participants = game['participants'];
      for (var i = 0; i < participants.length; i++) {
        var player = participants[i];
        var teamDiv = (player['teamId'] == 100) ? $("#blue") : $("#red");
        var name = player['summonerName'];
        var tier = player['tier'];

        var playerDiv = $("<div class='player'>");
        var nameDiv = $("<div class='name'>");
        var championImg = $("<img class='champion-img'>");
        var spellsDiv = $("<div class='summoner-spells'>");
        var spellsImg1 = $("<img class='spells-img'>");
        var spellsImg2 = $("<img class='spells-img'>");
        var tierImg = $("<img class='tier'>");

        $(spellsDiv).append(spellsImg1);
        $(spellsDiv).append(spellsImg2);
        $(nameDiv).html(name);
        $(playerDiv).append(tierImg);
        $(playerDiv).append(nameDiv);
        $(playerDiv).append(championImg);
        $(playerDiv).append(spellsDiv);


        $(teamDiv).append(playerDiv);
        if(tier == undefined) {
          $(tierImg).css("display","hidden");
        } else {
          $(tierImg).attr("src", "../resources/" + tier.toLowerCase() + ".png");
        }

        var championImageLink = player['championImage'];
        $(championImg).attr("src", championImageLink);
        var spellImage1Link = player['spellImage1'];
        var spellImage2Link = player['spellImage2'];
        $(spellsImg1).attr("src", spellImage1Link);
        $(spellsImg2).attr("src", spellImage2Link);

        //tooltips

        $(tierImg).attr("title",tier);
        var championName = championImageLink.slice(championImageLink.indexOf("champion/") + "champion/".length);
        championName = championName.substring(0,championName.length-4);

        var summonerSpellName1 = spellImage1Link.slice(spellImage1Link.indexOf("spell/") + "spell/".length);
        summonerSpellName1 = summonerSpellName1.substring(8,summonerSpellName1.length-4);
        var summonerSpellName2 = spellImage2Link.slice(spellImage2Link.indexOf("spell/") + "spell/".length);
        summonerSpellName2 = summonerSpellName2.substring(8,summonerSpellName2.length-4);

        $(championImg).attr("title",championName)
        $(spellsImg1).attr("title", summonerSpellName1);
        $(spellsImg2).attr("title", summonerSpellName2);
      }

      tippy("*", {
        position: 'right',
        duration: 200,
        arrow: true,
        arrowSize: 'small',
        size: 'small'
      });
    }).fail(function(err) {

      if (err.status == 400) {
        $("#sub-message").html("The streamer does not have any summoner accounts saved in the database, please add a summoner account using the '+' navigation button.");
        $("#message").css("color", "maroon");
      }
      if (err.status == 404) {
        $("#sub-message").html("The streamer is not currently playing a live game or the summoner account the streamer is playing on is not saved in the database.");
        $("#message").css("color", "maroon");
      }
      getSummoners();
    });
  }

  function getSummoners() {
    $("#summoners").show();
    $.ajax({
      url: "http://localhost:8080/summoners/" + twitchName,
      success: function(summoners) {
        for (var i = 0; i < summoners.length; i++) {
          var summoner = summoners[i];
          var name = summoner['summonerName'];
          var region = summoner['region'];

          var summonerDiv = $("<div>");
          $(summonerDiv).addClass('summoner-item');
          $(summonerDiv).html(name + " - " + region.toUpperCase());
          $("#summoners").append(summonerDiv);
        }

      }
    });
  }

  $(document).ajaxStop(function() {
    $('#loader').hide();
    $('#live-data').css("display", "flex");

    $(".player").click(function() {

      $(".mask").fadeIn(200);
      var modal = $("#modal");
      $(modal).fadeIn(200);

      var name = $(this).find(".name").html();
      var championImgSrc = $(this).find(".champion-img").attr("src");

      $("#modal-summoner-name").html(name);
      $("#modal-champion-img").attr("src",championImgSrc);

      $(".tab-item-selected").removeClass("tab-item-selected");
      var runesTab = $(".modal-tab-item")[0];
      $(runesTab).addClass("tab-item-selected");
      $("#modal-runes").show();
      $("#modal-mastery").hide();
      $(document).mouseup(function(e) {
        var container = $("#modal");

        if (!container.is(e.target) && container.has(e.target).length === 0) {
          container.hide();
          $(".mask").hide();
        }
      });

      $('.modal-tab-item').click(function () {

            var tabItems = $('.modal-tab-item');
            var tabRunes = tabItems[0]
            var tabMastery = tabItems[1]
            var runeText = $(tabRunes).html()
            var masteryText = $(tabMastery).html()
            var selectedTab = $(this)
            var selectedText = $(selectedTab).html()



            if (runeText === selectedText) {
                if(!$(this).hasClass("tab-item-selected")) {
                     $(selectedTab).addClass("tab-item-selected")
                     $(tabMastery).removeClass("tab-item-selected")
                }
                $("#modal-runes").show();
                $("#modal-mastery").hide();

            }
            if (masteryText === selectedText) {
                 if(!$(this).hasClass("tab-item-selected")) {
                     $(selectedTab).addClass("tab-item-selected")
                     $(tabRunes).removeClass("tab-item-selected")
                }
                $("#modal-mastery").show();
                $("#modal-runes").hide();

            }

        });
    });
  });

});
