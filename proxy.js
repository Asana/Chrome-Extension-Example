Asana.Proxy = {

  /**
   * @type {Boolean} Set to true on the server (background page), which will
   *     actually make the API requests. Clients will just talk to the API
   *     through the ExtensionServer.
   */
  IS_SERVER: false,

  method: function(object, method, func) {
    var me = this;
    return function() {
      if (me.IS_SERVER) {
        return func.apply(this, arguments);
      } else {
        var args = $A(arguments).slice(0, -1);
        chrome.runtime.sendMessage({
          type: "call",
          object: object,
          method: method,
          args: JSON.stringify(args)
        }, args.slice(-1)[0]);
      }
    };
  },

  call: function(request, callback) {
    var object = eval(request.object);
    var method = object[request.method];
    var args = JSON.parse(request.args);
    args.push(callback);
    method.apply(object, args);
  }

};
