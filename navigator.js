console.log(chrome.windows)

chrome.windows.create({height: 10, top: 10000, width:1}, function(hiddenWindow) {
  console.log(hiddenWindow)

  chrome.webNavigation.onBeforeNavigate.addListener(function (event) {
    console.log(event)

//    chrome.tabs.reload(event.tabId)

    chrome.tabs.move(event.tabId, {windowId: hiddenWindow.id, index:-1})

    chrome.tabs.get(event.tabId, function(tab) {
      console.log(tab)
    })

//  chrome.tabs.create({
//    active: true
//  }, function (tab) {
//    console.log("created tab", tab)
//  })
  })
})
