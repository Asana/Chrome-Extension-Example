console.log("LOADED");

/**
 * Finds an existing Asana tab (if there is one) and instructs it to navigate
 * using the provided fragment.
 * @param fragment
 * @param tabToAvoid
 * @param callback
 */
function navigateExistingAsana(fragment, tabToAvoid, callback) {
  chrome.tabs.query({
    url: "https://app.asana.com/*",
    currentWindow: true
  }, function(asanaTabs) {

    // Filter out the tab that just opened, we don't want to reuse that!
    asanaTabs = asanaTabs.filter(function (eachAsanaTab) {
      return eachAsanaTab.id !== tabToAvoid
    })

    if (asanaTabs.length > 0) {
      var chosenAsanaTab = asanaTabs[0]
      chrome.tabs.highlight({tabs:chosenAsanaTab.index}, function() {})
      chrome.tabs.executeScript(chosenAsanaTab.id, {
        code: "window.postMessage('fragment|" + fragment + "', '*')"
      })
      callback(true)
    }

    callback(false)
  })
}

// Add a handler for naviagtions to app.asana.com, but only if they happened in
// the background (ie the user right clicked and chose open in new window)
var urlFilter = {hostEquals: "app.asana.com"}
chrome.webNavigation.onBeforeNavigate.addListener(function (event) {
  // Check the url being navigated to follows the exact pattern we expect
  if (event.url.lastIndexOf("https://app.asana.com") !== 0) return

  // Get the part of the url that asana needs as a fragment
  var fragment = event.url.substr("https://app.asana.com".length)

  chrome.tabs.get(event.tabId, function(tab) {
    if (!tab.highlighted) {
      navigateExistingAsana(fragment, event.tabId, function(succeeded) {
        if (succeeded) {
          chrome.tabs.remove(tab.id)
        }
      })
    }
  })

}, {url: [urlFilter]})

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (!sender.tab) {
    return;
  }

  navigateExistingAsana(request.fragment, -1, function(b) {});
});