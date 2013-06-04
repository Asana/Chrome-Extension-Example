/**
 * Library of functions for the "server" portion of an extension, which is
 * loaded into the background and popup pages.
 *
 * Some of these functions are asynchronous, because they may have to talk
 * to the Asana API to get results.
 */
Asana.ServerModel = {

  // Make requests to API to refresh cache at this interval.
  CACHE_REFRESH_INTERVAL_MS: 15 * 60 * 1000,

  _url_to_cached_image: {},

  /**
   * Called by the model whenever a request is made and error occurs.
   * Override to handle in a context-appropriate way. Some requests may
   * also take an `errback` parameter which will handle errors with
   * that particular request.
   *
   * @param response {dict} Response from the server.
   */
  onError: function(response) {},

  /**
   * Requests the user's preferences for the extension.
   *
   * @param callback {Function(options)} Callback on completion.
   *     options {dict} See Asana.Options for details.
   */
  options: function(callback) {
    callback(Asana.Options.loadOptions());
  },

  /**
   * Saves the user's preferences for the extension.
   *
   * @param options {dict} See Asana.Options for details.
   * @param callback {Function()} Callback on completion.
   */
  saveOptions: function(options, callback) {
    Asana.Options.saveOptions(options);
    callback();
  },

  /**
   * Determine if the user is logged in.
   *
   * @param callback {Function(is_logged_in)} Called when request complete.
   *     is_logged_in {Boolean} True iff the user is logged in to Asana.
   */
  isLoggedIn: function(callback) {
    chrome.cookies.get({
      url: Asana.ApiBridge.baseApiUrl(),
      name: 'ticket'
    }, function(cookie) {
      callback(!!(cookie && cookie.value));
    });
  },

  /**
   * Get the URL of a task given some of its data.
   *
   * @param task {dict}
   * @param callback {Function(url)}
   */
  taskViewUrl: function(task, callback) {
    // We don't know what pot to view it in so we just use the task ID
    // and Asana will choose a suitable default.
    var options = Asana.Options.loadOptions();
    var pot_id = task.id;
    var url = 'https://' + options.asana_host_port + '/0/' + pot_id + '/' + task.id;
    callback(url);
  },

  /**
   * Requests the set of workspaces the logged-in user is in.
   *
   * @param callback {Function(workspaces)} Callback on success.
   *     workspaces {dict[]}
   */
  workspaces: function(callback, errback, options) {
    var self = this;
    Asana.ApiBridge.request("GET", "/workspaces", {},
        function(response) {
          self._makeCallback(response, callback, errback);
        }, options);
  },

  /**
   * Requests the set of users in a workspace.
   *
   * @param callback {Function(users)} Callback on success.
   *     users {dict[]}
   */
  users: function(workspace_id, callback, errback, options) {
    var self = this;
    Asana.ApiBridge.request(
        "GET", "/workspaces/" + workspace_id + "/users",
        { opt_fields: "name,photo.image_60x60" },
        function(response) {
          self._makeCallback(response, callback, errback);
        }, options);
  },

  /**
   * Requests the user record for the logged-in user.
   *
   * @param callback {Function(user)} Callback on success.
   *     user {dict[]}
   */
  me: function(callback, errback, options) {
    var self = this;
    Asana.ApiBridge.request("GET", "/users/me", {},
        function(response) {
          self._makeCallback(response, callback, errback);
        }, options);
  },

  /**
   * Makes an Asana API request to add a task in the system.
   *
   * @param task {dict} Task fields.
   * @param callback {Function(response)} Callback on success.
   */
  createTask: function(workspace_id, task, callback, errback) {
    var self = this;
    Asana.ApiBridge.request(
        "POST",
        "/workspaces/" + workspace_id + "/tasks",
        task,
        function(response) {
          self._makeCallback(response, callback, errback);
        });
  },

  logEvent: function(event) {
    Asana.ApiBridge.request(
        "POST",
        "/logs",
        event,
        function(response) {});
  },

  _makeCallback: function(response, callback, errback) {
    if (response.errors) {
      (errback || this.onError).call(null, response);
    } else {
      callback(response.data);
    }
  },

  _cacheUserPhoto: function(user) {
    var me = this;
    if (user.photo) {
      var url = user.photo.image_60x60;
      if (!(url in me._url_to_cached_image)) {
        var image = new Image();
        image.src = url;
        me._url_to_cached_image[url] = image;
      }
    }
  },

  /**
   * Start fetching all the data needed by the extension so it is available
   * whenever a popup is opened.
   */
  startPrimingCache: function() {
    var me = this;
    me._cache_refresh_interval = setInterval(function() {
      me.refreshCache();
    }, me.CACHE_REFRESH_INTERVAL_MS);
    me.refreshCache();
  },

  refreshCache: function() {
    var me = this;
    // Fetch logged-in user.
    me.me(function(user) {
      if (!user.errors) {
        // Fetch list of workspaces.
        me.workspaces(function(workspaces) {
          if (!workspaces.errors) {
            var i = 0;
            // Fetch users in each workspace.
            var fetchUsers = function() {
              me.users(workspaces[i].id, function(users) {
                // Prefetch images too
                users.forEach(function(user) {
                  me._cacheUserPhoto(user);
                });
                if (++i < workspaces.length) {
                  fetchUsers();
                }
              }, null, { miss_cache: true });
            };
            fetchUsers();
          }
        }, null, { miss_cache: true })
      }
    }, null, { miss_cache: true });
  }

};