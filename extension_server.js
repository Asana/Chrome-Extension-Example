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
    Asana.ApiBridge.is_server = true;
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.type === "api") {
        // Request to the API. Pass it on to the bridge.
        Asana.ApiBridge.request(
            request.method, request.path, request.params, sendResponse,
            request.options || {});
        return true;  // will call sendResponse asynchronously
      } else if (request.type === "quick_add") {
        if (request.name === "mod_down") {
          // Mark modifier key as pressed at the current time.
          // If the Q key gets pressed soon enough afterward, we've hit our
          // hotkey combo.
          me._quick_add_modifier_keydown_time = request.time;
        } else if (request.name === "mod_up") {
          me._quick_add_modifier_keydown_time = 0;
        } else if (request.name === "q_down") {
          if (request.force ||
              request.time < me._quick_add_modifier_keydown_time + 5000) {
            // Quick Add should only come from a content script, so it must have
            // a `tab`.
            var window_id = sender.tab.windowId;
            var favicon_url = sender.tab.favIconUrl;
            chrome.tabs.executeScript(sender.tab.id, {
              code: "({ url: window.top.location.href, title: window.top.document.title })"
            }, function(results) {
              var quick_add_request = {
                url: results[0].url,
                title: results[0].title,
                selected_text: request.selected_text,
                favicon_url: favicon_url
              };
              chrome.windows.get(window_id, function(w) {
                var width = 410;
                var height = 310;
                var top = w.top + 72;
                var left = w.left + w.width - width;

                // QuickAdd request, made from a content window.
                // Open up a new popup, and set the request information on its window
                // (see popup.html for how it's used)
                // We cannot open the popup menu itself programmatically, so it's
                // just a regular HTML popup.
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
          }
          me._quick_add_modifier_keydown_time = 0;
        }
      }
    });
  }

};
