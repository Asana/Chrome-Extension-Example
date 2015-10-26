document.onclick = clickHandler;

function clickHandler(e){
  if (!e) e = window.event;

  var closestAnchor = $(e.target).closest("A");
  if (closestAnchor.length === 1){
    var link_url = closestAnchor.prop("href");
    if (link_url.indexOf("https://app.asana.com") === 0) {
      console.log("Asana chrome extension intercepting link ctrl-click")
      var fragment = link_url.substr("https://app.asana.com".length)
      chrome.runtime.sendMessage({fragment: fragment});
      e.preventDefault();
    }
  }
}
