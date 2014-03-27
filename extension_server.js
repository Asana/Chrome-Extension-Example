// Mark ourselves as the server side for proxied requests, e.g. to the API
// or to extension-y things.
Asana.Proxy.IS_SERVER = true;

/**
 * The "server" portion of the chrome extension, which listens to events
 * from other clients such as the popup or per-page content windows.
 */
Asana.ExtensionServer = {

  /**
   * Call from the background page: listen to chrome events and
   * requests from page clients, which can't make cross-domain requests.
   */
  listen: function() {
    var me = this;

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.type === "api") {
        // Request to the API. Pass it on to the bridge.
        Asana.ApiBridge.request(
            request.method, request.path, request.params, sendResponse,
            request.options || {});
        return true;  // will call sendResponse asynchronously
      } else if (request.type === "call") {
        // Generic proxied method.
        Asana.Proxy.call(request, sendResponse);
        return true;
      }
    });
  }

};
