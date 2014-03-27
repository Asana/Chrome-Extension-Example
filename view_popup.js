/**
 * Code for the popup UI.
 */
Popup = {

  // Options loaded when popup opened.
  options: null,

  // Data from API cached for this popup.
  workspaces: null,
  users: null,
  user_id: null,

  // Typeahead ui element
  typeahead: null,

  close: function() {
    //xcxc
  },

  onLoad: function() {
    var me = this;

    // Our default error handler.
    Asana.ServerModel.onError = function(response) {
      me.showError(response.errors[0].message);
    };

    // Ah, the joys of asynchronous programming.
    // To initialize, we've got to gather various bits of information.
    // Load our options ...
    Asana.ServerModel.options(function(options) {
      me.options = options;
      // And ensure the user is logged in ...
      Asana.ServerModel.isLoggedIn(function(is_logged_in) {
        if (is_logged_in) {
          Asana.ServerModel.logEvent({
            name: "ChromeExtension-ViewTask-Open"
          });
          //xcxc where do we get task ID?
          me.showViewUi();
        } else {
          // The user is not even logged in. Prompt them to do so!
          me.showLogin(
              Asana.Options.loginUrl(options),
              Asana.Options.signupUrl(options));
        }
      });
    });

    // Wire up some events to DOM elements on the page.

    $(window).keydown(function(e) {
      // Close the popup if the ESCAPE key is pressed.
      if (e.which === 27) {
        if (me.is_first_add) {
          Asana.ServerModel.logEvent({
            name: "ChromeExtension-ViewTask-Close"
          });
        }
        me.close();
      }
    });

    // Close if the X is clicked.
    $(".close-x").click(function() {
      me.close();
    });

    // Make a typeahead for assignee
    me.typeahead = new UserTypeahead("assignee");
  },

  showView: function(name) {
    ["login", "task"].forEach(function(view_name) {
      $("#" + view_name + "_view").css("display", view_name === name ? "" : "none");
    });
  },

  showViewUi: function(task_id) {
    var me = this;

    // Populate workspace selector and select default.
    Asana.ServerModel.me(function(user) {
      me.user_id = user.id;
      me.showView("task");
    });
  },

  /**
   * Show the login page.
   */
  showLogin: function(login_url, signup_url) {
    var me = this;
    me.showView("login");
  }

};

$(window).load(function() {
  Popup.onLoad();
});
