/**
 * Code for the popup UI.
 */
Asana.ViewPopup = {

  // Options loaded when popup opened.
  options: null,

  // Data from API cached for this popup.
  user_id: null,

  // Typeahead ui element
  typeahead: null,

  close: function() {
    //xcxc
  },

  onLoad: function(task_id) {
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
          me.showTaskView(task_id);
        } else {
          //xcxc show login ui like other popup?
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

  showTaskView: function(task_id) {
    var me = this;
    me.task = null;

    me.showView("task");

    Asana.ServerModel.me(function(user) {
      me.user_id = user.id;
      Asana.ServerModel.task(task_id, function(task) {
        me.task = task;
        console.log("Got task", task);
        // xcxc escape these
        $("#name_value").html(task.name);
        $("#notes_value").html(task.notes);

        var assignee = task.assignee;
        if (assignee) {
          if (assignee.photo) {
            $("#assignee_value").append(UserTypeahead.photoForUser(assignee));
          }
          $("#assignee_value").append($('<div class="user-name">').text(assignee.name));
        } else {
          $("#assignee_value").append($('<span class="unassigned">').text("Unassigned"));
        }
      }, undefined, { opt_expand: "assignee" });
    });
  }

};

$(window).load(function() {
  var query = {};
  location.search.slice(1).split("&").forEach(function(pair) {
    var kv = pair.split("=");
    query[kv[0]] = kv[1];
  });
  var task_id = parseInt(query["task"], 10);
  Asana.ViewPopup.onLoad(task_id);
});
