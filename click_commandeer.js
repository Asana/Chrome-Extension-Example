document.onclick = clickHandler;

function clickHandler(e){
  if (!e) e = window.event;

  if ((e.metaKey === true ||
      e.ctrlKey === true || e.button == 1)
      && $(e.target).prop("tagName") == "A"){
    var link_url = $(e.target).prop("href") ;
    if (link_url.indexOf("https://app.asana.com") != -1) {
      console.log("Asana chrome extension intercepting link ctrl-click")
      var fragment = link_url.substr("https://app.asana.com".length)
      chrome.runtime.sendMessage({fragment: fragment});
      e.preventDefault();
    }
  }
}
