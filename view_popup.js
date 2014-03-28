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
    window.parent.postMessage({ type: "asana_task_view.close" }, "*");
  },

  open: function(task_id) {
    var me = this;

    me.showView("loading");

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
    $("#close_popup").click(function() {
      me.close();
    });

    // Make a typeahead for assignee
    me.typeahead = new UserTypeahead("assignee");
  },

  onLoaded: function() {
    var height = $(document.body).height();
    window.parent.postMessage({
      type: "asana_task_view.resize",
      height: height
    }, "*");
  },

  showView: function(name) {
    ["loading", "task"].forEach(function(view_name) {
      $("#" + view_name + "_view").css("display", view_name === name ? "" : "none");
    });
  },

  showTaskView: function(task_id) {
    var me = this;
    me.task = null;

    Asana.ServerModel.me(function(user) {
      me.user_id = user.id;
      Asana.ServerModel.task(task_id, function(task) {
        me.task = task;
        console.log("Got task", task);
        // xcxc escape these
        $("#name_value").html(task.name);
        $("#notes_value").html(task.notes.replace(/\n/g, "<br/>"));

        $("#assignee_value").empty();
        $("#assignee_photo").empty();
        var assignee = task.assignee;
        if (assignee) {
          if (assignee.photo) {
            $("#assignee_photo").append(UserTypeahead.photoForUser(assignee));
          } else {
            $("#assignee_photo").append($('<span class="icon-assignee sprite"></span>'));
          }
          $("#assignee_value").append($('<div class="user-name">').text(assignee.name));
        } else {
          $("#assignee_value").append($('<span class="unassigned">').text("Unassigned"));
          $("#assignee_photo").append($('<span class="icon-assignee sprite"></span>'));
        }
        
        var completed_at = task.completed_at;
        if (completed_at !== null) {
          $("#completion_value").addClass("complete");
          $("#completion_value").text("Completed at: " + task.completed_at);
        } else {
          $("#completion_value").addClass("incomplete");
          $("#completion_value").text("Incomplete")
        }
        me.showView("task");
        me.onLoaded();
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
  Asana.ViewPopup.open(task_id);
});
