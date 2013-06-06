/**
 * The "server" portion of the chrome extension, which listens to events
 * from other clients such as the popup or per-page content windows.
 */
Asana.ExtensionServer = {

  _quick_add_modifier_keydown_time: 0,

  /**
   * Call from the background page: listen to chrome events and
   * requests from page clients, which can't make cross-domain requests.
   */
  listen: function() {
    var me = this;

    // Mark our Api Bridge as the server side (the one that actually makes
    // API requests to Asana vs. just forwarding them to the server window).
    Asana.ApiBridge.is_server = true;

    // Listen to a hotkey and trigger a popup for quickadd.
    // There's no way to trigger the chrome extension popup itself, so this
    // opens a new window with the popup content in it. This looks slightly
    // different than the real popup.
    chrome.commands.onCommand.addListener(function(command) {
      if (command === "quick_add") {
        // Get the currently selected tab
        chrome.tabs.getSelected(null, function(tab) {
          // Quick Add should only come from a content script, so it must have
          // a `tab`. Get its URL and title.
          var window_id = tab.windowId;
          var favicon_url = tab.favIconUrl;
          chrome.tabs.executeScript(tab.id, {
            code: "({ url: window.top.location.href, " +
                "title: window.top.document.title, " +
                "selected_text: '' + window.getSelection() })"
          }, function(results) {
            // Form a request object to stick in our popup.
            var quick_add_request = {
              url: results[0].url,
              title: results[0].title,
              selected_text: results[0].selected_text,
              favicon_url: favicon_url
            };
            chrome.windows.get(window_id, function(w) {
              // Popup the window in the upper right, near where it would be
              // if the user had clicked the Asana button.
              var width = Asana.POPUP_UI_WIDTH;
              var height = Asana.POPUP_UI_HEIGHT;
              var top = w.top + 72;
              var left = w.left + w.width - width;

              // Open up a new popup, and set the request information on its
              // window (see popup.html for how it's used)
              // We cannot open the popup menu itself programmatically, so
              // it's just a regular HTML popup.
              // http://code.google.com/chrome/extensions/faq.html#faq-open-popups
              var popup = window.open(
                  chrome.extension.getURL('popup.html') + '?external=true',
                  "asana_quick_add",
                  "dependent=1,resizable=0,location=0,menubar=0,status=0," +
                      "toolbar=0,width=" + width + ",height=" + height +
                      ",top=" + top + ",left=" + left);
              popup.quick_add_request = quick_add_request;
            });
          });
        });
      }
    });

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.type === "api") {
        // Request to the API. Pass it on to the bridge.
        Asana.ApiBridge.request(
            request.method, request.path, request.params, sendResponse,
            request.options || {});
        return true;  // will call sendResponse asynchronously
      }
    });
  }

};
