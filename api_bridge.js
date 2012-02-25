/**
 * Functionality to communicate with the Asana API. This should get loaded
 * in the "server" portion of the chrome extension because it will make
 * HTTP requests and needs cross-domain priveleges.
 *
 * The bridge does not need to use an auth token to connect to
 * the API, because since it is a browser extension it can access
 * the user's cookies, and can use them to authenticate to the API.
 * This capability is specific to browser extensions, and other
 * types of applications would have to obtain an auth token to communicate
 * with the API.
 */
Asana.ApiBridge = {

  /**
   * @type {String} Version of the Asana API to use.
   */
  API_VERSION: "0.1",

  /**
   * @param opt_options {dict} Options to use; if unspecified will be loaded.
   * @return {String} The base URL to use for API requests.
   */
  baseApiUrl: function(opt_options) {
    var options = opt_options || Asana.Options.loadOptions();
    return 'https://' + options.asana_host_port + '/-/api/' + this.API_VERSION;
  },

  /**
   * Make a request to the Asana API.
   *
   * @param http_method {String} HTTP request method to use (e.g. "POST")
   * @param path {String} Path to call.
   * @param params {dict} Parameters for API method; depends on method.
   * @param callback {Function(response: dict)} Callback on completion.
   *     status {Integer} HTTP status code of response.
   *     data {dict} Object representing response of API call, depends on
   *         method. Only available if response was a 200.
   *     error {String?} Error message, if there was a problem.
   */
  request: function(http_method, path, params, callback) {
    var url = this.baseApiUrl() + path;
    chrome.cookies.get({
      url: url,
      name: 'ticket'
    }, function(cookie) {
      if (!cookie) {
        callback({
          status: 401,
          error: "Not Authorized"
        });
        return;
      }

      // Note that any URL fetched here must be matched by a permission in
      // the manifest.json file!
      var attrs = {
        type: http_method,
        url: url,
        timeout: 30000,   // 30 second timeout
        headers: {
          "X-Requested-With": "XMLHttpRequest"
        },
        accept: "application/json",
        success: function(data, status, xhr) {
          callback(data);
        },
        error: function(xhr, status, error) {
          // jQuery's ajax() method has some rather funky error-handling.
          // We try to accommodate that and normalize so that all types of
          // errors look the same.
          if (status === "error" && xhr.responseText) {
            var response;
            try {
              response = $.parseJSON(xhr.responseText);
            } catch (e) {
              response = {
                errors: [{message: "Could not parse response from server" }]
              };
            }
            callback(response);
          } else {
            callback({ error: error || status });
          }
        },
        xhrFields: {
          withCredentials: true
        }
      };
      if (http_method === "POST" || http_method === "PUT") {
        attrs.data = JSON.stringify({data: params});
        attrs.dataType = "json";
        attrs.processData = false;
        attrs.contentType = "application/json";
      }
      $.ajax(attrs);
    });
  }
};
