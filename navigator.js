console.log(chrome.windows)

//chrome.windows.create({height: 10, top: 10000, width:1}, function(hiddenWindow) {
//  console.log(hiddenWindow)

var urlFilter = {hostEquals: "app.asana.com"}
//chrome.webNavigation.onBeforeNavigate.url(urlFilter)
  chrome.webNavigation.onBeforeNavigate.addListener(function (event) {
    console.log(event)

    chrome.tabs.query({
      url: "https://app.asana.com/*",
      currentWindow: true
    }, function(asanaTabs) {
      if (asanaTabs.length > 0) {
        var chosenAsanaTab = asanaTabs[0]
        chrome.tabs.get(event.tabId, function(tab) {
          console.log(tab)

          if (!tab.highlighted) {
            // They opened in a new tab, close it
            chrome.tabs.remove(tab.id)
//            chrome.tabs.
          }
        })
      }
    })

//    chrome.tabs.reload(event.tabId)

//    chrome.tabs.move(event.tabId, {windowId: hiddenWindow.id, index:-1})


//  chrome.tabs.create({
//    active: true
//  }, function (tab) {
//    console.log("created tab", tab)
//  })
  }, {url: [urlFilter]})
//})
