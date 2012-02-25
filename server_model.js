/**
 * Library of functions for the "server" portion of an extension, which is
 * loaded into the background and popup pages.
 *
 * Some of these functions are asynchronous, because they may have to talk
 * to the Asana API to get results.
 */
Asana.ServerModel = {

  _cached_user: null,

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
   *     workspaces {dict[]} See Asana.Options for details.
   */
  options: function(callback) {
    callback(Asana.Options.loadOptions());
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
  workspaces: function(callback, errback) {
    var self = this;
    Asana.ApiBridge.request("GET", "/workspaces", {},
        function(response) {
          self._makeCallback(response, callback, errback);
        });
  },

  /**
   * Requests the set of users in a workspace.
   *
   * @param callback {Function(users)} Callback on success.
   *     users {dict[]}
   */
  users: function(workspace_id, callback) {
    var self = this;
    Asana.ApiBridge.request("GET", "/workspaces/" + workspace_id + "/users", {},
        function(response) {
          self._makeCallback(response, callback);
        });
  },

  /**
   * Requests the user record for the logged-in user.
   *
   * @param callback {Function(user)} Callback on success.
   *     user {dict[]}
   */
  me: function(callback) {
    var self = this;
    if (self._cached_user !== null) {
      callback(self._cached_user);
    } else {
      Asana.ApiBridge.request("GET", "/users/me", {},
          function(response) {
            if (!response.errors) {
              self._cached_user = response.data;
            }
            self._makeCallback(response, callback);
          });
    }
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

  _makeCallback: function(response, callback, errback) {
    if (response.errors) {
      (errback || this.onError).call(null, response);
    } else {
      callback(response.data);
    }
  }

};