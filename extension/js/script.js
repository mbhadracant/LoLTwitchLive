  var gameId = undefined;

  $(document).ready(function() {
    setTimeout(function() {
      var elemToAddAfter = $(".stats-and-actions");
      var root = $("<div>", {id: "content"});
      var button = $("<div>", {
        type: "button",
        class: "btn-panel",
        "data-toggle": "collapse",
        "data-target": "#panel"
      });

      var loadingIcon = $("<img>", {id: "loading-icon", src: "ellipsis.gif"});
      $(button).append(loadingIcon);
      var collapse = $("<div>", {id: "panel", class: "collapse"});
      $(collapse).html("LULULULULUL");

      $(root).append(button);
      $(root).append(collapse);

      elemToAddAfter.after(root);

      update();
    }, 4000)

  });

function update() {
  var streamerName = window.location.pathname.substring(1);
  $.ajax({
  type: "GET",
  url: "http://localhost:8080/stream/" + 'rush',
  cache: true,
  success: function(data){
    $('#loading-icon').remove();
    console.log(data);
     if(data["liveGameData"] == undefined) {
       unsetLiveGameData(data);
     } else {
       if(gameId != data["liveGameData"]["gameId"]) { setLiveGameData(data); }
     }
  },
  error: function(XMLHttpRequest, textStatus, errorThrown) {
        alert("Status: " + textStatus); alert("Error: " + errorThrown);
    }
});
}

function unsetLiveGameData(data) {
  gameId = undefined;
  alert('kek')
  $('.btn-panel').html("PLAYER IS NOT IN-GAME")
}

function setLiveGameData(data) {
  alert('lul')
  gameId = data["liveGameData"]["gameId"]
  $('.btn-panel').html("PLAYER IS IN GAME - CLICK TO EXPAND")
}
