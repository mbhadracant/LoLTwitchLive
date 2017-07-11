var twitchName;
var gameData;

$(function() {

    chrome.tabs.query({
        'active': true,
        'lastFocusedWindow': true
    }, function(tabs) {
        var url = tabs[0].url;
        var pattern = new RegExp("^https:\/\/www.twitch.tv\/[^\d\W]+");
        var valid = pattern.test(url);
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
            gameData = game;
            var platformId = game['platformId'];
            var version = game['version']
            var participants = game['participants'];
            for (var i = 0; i < participants.length; i++) {
                var player = participants[i];
                var teamDiv = (player['teamId'] == 100) ? $("#blue") : $("#red");
                var name = player['summonerName'];
                var tier = player['tier'];
                var championName = player['championData']['name'];
                var spellName1 = player['spellsData']['name1'];
                var spellName2 = player['spellsData']['name2'];

                var playerDiv = $("<div class='player'>");
                $(playerDiv).attr("index", i);
                var nameDiv = $("<div class='name'>");
                var championImg = $("<img class='champion-img'>");
                var spellsDiv = $("<div class='summoner-spells'>");
                var spellsImg1 = $("<img class='spells-img'>");
                var spellsImg2 = $("<img class='spells-img'>");
                var tierImg = $("<img class='tier'>");
                var keystoneImg = $("<img class='keystone-img'>");

                $(spellsDiv).append(spellsImg1);
                $(spellsDiv).append(spellsImg2);
                $(nameDiv).html(name);
                $(playerDiv).append(tierImg);
                $(playerDiv).append(nameDiv);
                $(playerDiv).append(championImg);
                $(playerDiv).append(spellsDiv);
                $(playerDiv).append(keystoneImg);

                $(teamDiv).append(playerDiv);
                if (tier == undefined) {
                    $(tierImg).css("display", "hidden");
                } else {
                    $(tierImg).attr("src", "../resources/" + tier.toLowerCase() + ".png");
                }

                var championImageLink = player['championData']['imageLink'];
                $(championImg).attr("src", championImageLink);
                var spellImage1Link = player['spellsData']['imageLink1'];
                var spellImage2Link = player['spellsData']['imageLink2'];
                $(spellsImg1).attr("src", spellImage1Link);
                $(spellsImg2).attr("src", spellImage2Link);

                //tooltips

                $(tierImg).attr("title", tier);


                $(championImg).attr("title", championName)
                $(spellsImg1).attr("title", spellName1);
                $(spellsImg2).attr("title", spellName2);
            }

            tippy("*", {
                position: 'top',
                duration: 200,
                arrow: true,
                arrowSize: 'small',
                size: 'small'
            });

            buildMasteryTrees();

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

    function buildMasteryTrees() {

        $.getJSON("http://localhost:8080/data/" + gameData['region'] + "/masteries", function(masteries) {
            var version = gameData['version'];

            function addRow(masteryTree) {
                var row = $("<div>");
                $(row).addClass("mastery-row");
                $(masteryTree).append(row);
                return row;
            }

            function addMasteryBlock(mastery, row) {
                var block = $("<img>");
                $(block).css("filter", "grayscale(100%)");
                $(block).css("opacity", "0.5");
                $(block).attr("mastery-id", mastery['id']);
                $(block).attr("title", mastery['name']);
                $(block).addClass("mastery-block");
                var imageLink = `http://ddragon.leagueoflegends.com/cdn/${version}/img/mastery/${mastery['image']['full']}`;
                $(block).attr("src", imageLink);
                $(row).append(block);
                return block;
            }

            function addMasteryTree() {
                var masteryTree = $("<div>");
                $(masteryTree).addClass("mastery-tree");
                $("#modal-mastery").append(masteryTree);
                return masteryTree;
            }

            var totalCounter = 0;
            var currentCounter = 0;
            var reach2Row = true;

            var currentMasteryTree = addMasteryTree();
            var currentRow = addRow(currentMasteryTree);

            var row2checker = true;

            $.each(masteries, function(id, mastery) {


                if (currentCounter == 2 && row2checker) {
                    row2checker = false;
                    currentRow = addRow(currentMasteryTree);
                    currentCounter = 0;
                } else if (currentCounter == 3) {
                    row2checker = true;
                    currentRow = addRow(currentMasteryTree);
                    currentCounter = 0;
                }

                currentCounter++;

                totalCounter++;



                if (totalCounter == 15) {
                    totalCounter = 0;
                    currentMasteryTree = addMasteryTree();
                }

                var block = addMasteryBlock(mastery, currentRow);
                console.log(totalCounter + " ~ " + mastery['name'])
                if(totalCounter == 13 ||totalCounter == 14 || totalCounter == 0) {
                  block.attr("keystone","true");
                }

            });

            $(currentMasteryTree).remove();

            var participants = gameData['participants'];

            for(var j = 0; j < participants.length; j++) {
              var participantMasteries = participants[j]['masteries'];

              for(var k = 0; k < participantMasteries.length; k++) {
                var participantMastery = participantMasteries[k];
                var masteryId = participantMastery['masteryId'];
                var masteryBlock = $(".mastery-block[mastery-id='" + masteryId + "']")
                if($(masteryBlock).attr("keystone") == "true") {
                  var playerDiv = $(".player[index='" + j + "']");
                  var keystoneImg = $(playerDiv).find(".keystone-img");
                  $(keystoneImg).attr("title",masteries[masteryId]['name']);
                  $(keystoneImg).attr("src",masteryBlock.attr("src"));
                  break;
                }
              }
            }

            tippy(".keystone-img", {
                position: 'top',
                duration: 200,
                arrow: true,
                arrowSize: 'small',
                size: 'small'
            });

            tippy(".mastery-block", {
                position: 'top',
                duration: 200,
                arrow: true,
                arrowSize: 'small',
                size: 'small'
            });
        });
    }

    $(document).ajaxStop(function() {

        $('#loader').hide();
        $('#live-data').css("display", "flex");

        $(".player").click(function() {
            $("#modal-runes").empty();
            $(".mask").fadeIn(200);
            var modal = $("#modal");
            $(modal).fadeIn(200);

            var name = $(this).find(".name").html();
            var championImgSrc = $(this).find(".champion-img").attr("src");

            $("#modal-summoner-name").html(name);
            $("#modal-champion-img").attr("src", championImgSrc);

            $(".tab-item-selected").removeClass("tab-item-selected");
            var runesTab = $(".modal-tab-item")[0];
            $(runesTab).addClass("tab-item-selected");
            $("#modal-runes").show();
            $("#modal-mastery").hide();
            var index = $(this).attr("index");
            var runes = gameData['participants'][index]['runes'];

            for (var i = 0; i < runes.length; i++) {
                var rune = runes[i];
                var runeName = rune['data']['name'];
                var imageLink = rune['data']['imageLink'];
                var description = rune['data']['description'];

                var quantityText = $("<h4>");
                $(quantityText).html(rune['count'] + "x");
                var runeImg = $("<img>");
                $(runeImg).attr("src", imageLink);
                $(runeImg).attr("title", runeName);
                var descriptionText = $("<h5>");
                $(descriptionText).html(description);

                var container = $("<div>");
                $(container).addClass("rune-item");

                $(container).append(quantityText);
                $(container).append(runeImg);
                $(container).append(descriptionText);

                $("#modal-runes").append(container);
            }

            $(document).mouseup(function(e) {
                var container = $("#modal");

                if (!container.is(e.target) && container.has(e.target).length === 0) {
                    container.hide();
                    $(".mask").hide();
                }
            });

            $('.modal-tab-item').click(function() {

                var tabItems = $('.modal-tab-item');
                var tabRunes = tabItems[0]
                var tabMastery = tabItems[1]
                var runeText = $(tabRunes).html()
                var masteryText = $(tabMastery).html()
                var selectedTab = $(this)
                var selectedText = $(selectedTab).html()



                if (runeText === selectedText) {
                    if (!$(this).hasClass("tab-item-selected")) {
                        $(selectedTab).addClass("tab-item-selected")
                        $(tabMastery).removeClass("tab-item-selected")
                    }
                    $("#modal-runes").show();
                    $("#modal-mastery").hide();



                }
                if (masteryText === selectedText) {
                    if (!$(this).hasClass("tab-item-selected")) {
                        $(selectedTab).addClass("tab-item-selected")
                        $(tabRunes).removeClass("tab-item-selected")
                    }

                    $("#modal-mastery").show();
                    $("#modal-runes").hide();

                    $(".mastery-block").css("filter", "grayscale(100%)");
                    $(".mastery-block").css("opacity", "0.5");

                    var playerMasteries = gameData['participants'][index]['masteries'];

                    for (var j = 0; j < playerMasteries.length; j++) {
                        var playerMastery = playerMasteries[j];
                        var masteryId = playerMastery['masteryId'];
                        var masteryImg = $(".mastery-block[mastery-id='" + masteryId + "']");
                        $(masteryImg).css("filter", "grayscale(0%)");
                        $(masteryImg).css("opacity", "1");

                    }
                    var masteryTrees = $(".mastery-tree");

                    var secondMasteryTree = masteryTrees[1];
                    var thirdMasteryTree = masteryTrees[2];

                    $(secondMasteryTree).before(thirdMasteryTree);
                }
            });

            tippy(".rune-item img", {
                position: 'right',
                duration: 200,
                arrow: true,
                arrowSize: 'small',
                size: 'small'
            });

        });


    });

});
