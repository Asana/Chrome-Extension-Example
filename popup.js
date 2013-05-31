Popup = {

  // Options loaded when popup opened.
  options: null,

  // Info from page we were triggered from
  page_title: null,
  page_url: null,
  page_selection: null,

  workspaces: null,
  users: null,

  onLoad: function() {
    var me = this;

    // Our default error handler.
    Asana.ServerModel.onError = function(response) {
      me.showError(response.errors[0].message);
    };

    // Ah, the joys of asynchronous programming.
    // To initialize, we've got to gather various bits of information.
    // Starting with a reference to the window and tab that were active when
    // the popup was opened ...
    chrome.windows.getCurrent(function(w) {
      chrome.tabs.query({
        active: true,
        windowId: w.id
      }, function(tabs) {
        // Now load our options ...
        Asana.ServerModel.options(function(options) {
          me.options = options;
          // And ensure the user is logged in ...
          Asana.ServerModel.isLoggedIn(function(is_logged_in) {
            if (is_logged_in) {
              if (window.quick_add_request) {
                // If this was a QuickAdd request (set by the code popping up
                // the window in Asana.ExtensionServer), then we have all the
                // info we need and should show the add UI right away.
                me.showAddUi(
                    quick_add_request.url, quick_add_request.title,
                    quick_add_request.selected_text);
              } else {
                // Otherwise we want to get the selection from the tab that
                // was active when we were opened. So we set up a listener
                // to listen for the selection send event from the content
                // window ...
                var selection = "";
                var listener = function(request, sender, sendResponse) {
                  if (request.type === "selection") {
                    chrome.runtime.onMessage.removeListener(listener);
                    console.info("Asana popup got selection");
                    selection = "\n" + request.value;
                  }
                };
                chrome.runtime.onMessage.addListener(listener);

                // ... and then we make a request to the content window to
                // send us the selection.
                var tab = tabs[0];
                chrome.tabs.executeScript(tab.id, {
                  code: "(Asana && Asana.SelectionClient) ? Asana.SelectionClient.sendSelection() : 0"
                }, function() {
                  // The requests appear to be handled synchronously, so the
                  // selection should have been sent by the time we get this
                  // completion callback. If the timing ever changes, however,
                  // that could break and we would never show the add UI.
                  // So this could be made more robust.
                  me.showAddUi(tab.url, tab.title, selection);
                });
              }
            } else {
              // The user is not even logged in. Prompt them to do so!
              me.showLogin(Asana.Options.loginUrl(options));
            }
          });
        });
      });
    });

    // Wire up some events to DOM elements on the page.

    // Close the popup if the ESCAPE key is pressed.
    window.addEventListener("keydown", function(e) {
      if (e.keyCode === 27) {
        window.close();
      }
    }, /*capture=*/false);

    $("#close_popup").click(function() {
      window.close();
    });

    $("#use_page_details").click(function() {
      $("#name").val(me.page_title);
      var notes = $("#notes");
      notes.val(notes.val() + me.page_url + me.page_selection);
    });
  },

  showView: function(name) {
    ["login", "add"].forEach(function(view_name) {
      $("#" + view_name + "_view").css("display", view_name === name ? "" : "none");
    });
  },

  showAddUi: function(url, title, selected_text) {
    var me = this;

    // Store off info from page we got triggered from.
    me.page_url = url;
    me.page_title = title;
    me.page_selection = selected_text;

    me.resetFields();
    me.showView("add");
    var name_input = $("#name");
    name_input.focus();
    name_input.select();
    Asana.ServerModel.me(function(user) {
      // Just to cache result.
      Asana.ServerModel.workspaces(function(workspaces) {
        me.workspaces = workspaces;
        var select = $("#workspace_select");
        select.html("");
        workspaces.forEach(function(workspace) {
          $("#workspace_select").append(
              "<option value='" + workspace.id + "'>" + workspace.name + "</option>");
        });
        if (workspaces.length > 1) {
          $("workspace_select_container").show();
        } else {
          $("workspace_select_container").hide();
        }
        select.val(me.options.default_workspace_id);
        me.onWorkspaceChanged();
        select.change(function() { me.onWorkspaceChanged(); });
      });
    });
  },

  setAddEnabled: function(enabled) {
    var me = this;
    var button = $("#add_button");
    if (enabled) {
      button.removeClass("disabled");
      button.addClass("enabled");
      button.click(function() {
        me.createTask();
        return false;
      });
      button.keydown(function(e) {
        if (e.keyCode === 13) {
          me.createTask();
        }
      });
    } else {
      button.removeClass("enabled");
      button.addClass("disabled");
      button.unbind('click');
      button.unbind('keydown');
    }
  },

  showError: function(message) {
    console.log("Error: " + message);
    $("#error").css("display", "");
  },

  hideError: function() {
    $("#error").css("display", "none");
  },

  resetFields: function() {
    $("#name").val("");
    $("#notes").val("");
  },

  // Set the add button as being "working", waiting for the Asana request
  // to complete.
  setAddWorking: function(working) {
    this.setAddEnabled(!working);
    $("#add_button").find(".button-text").text(
        working ? "Adding..." : "Add to Asana");
  },

  // When the user changes the workspace, update the list of users.
  onWorkspaceChanged: function() {
    var me = this;
    var workspace_id = me.readWorkspaceId();

    // Update selected workspace
    $("#workspace").html($("#workspace_select option:selected").text());

    // Save selection as new default.
    me.options.default_workspace_id = workspace_id;
    Asana.ServerModel.saveOptions(me.options, function() {});

    // Update assignee list.
    $("#assignee").html("<option>Loading...</option>");
    me.setAddEnabled(false);
    Asana.ServerModel.users(workspace_id, function(users) {
      $("#assignee").html("");
      users = users.sort(function(a, b) {
        return (a.name < b.name) ? -1 : ((a.name > b.name) ? 1 : 0);
      });
      users.forEach(function(user) {
        $("#assignee").append(
            "<option value='" + user.id + "'>" + user.name + "</option>");
      });
      Asana.ServerModel.me(function(user) {
        $("#assignee").val(user.id);
      });
      me.setAddEnabled(true);
    });
  },

  workspaceById: function(id) {
    var found = null;
    this.workspaces.forEach(function(w) {
      if (w.id === id) {
        found = w;
      }
    });
    return found;
  },

  readAssigneeId: function() {
    return parseInt($("#assignee").val(), 10);
  },

  readWorkspaceId: function() {
    return parseInt($("#workspace_select").val(), 10);
  },

  createTask: function() {
    var me = this;
    console.info("Creating task");
    me.hideError();
    me.setAddWorking(true);
    Asana.ServerModel.createTask(
        me.readWorkspaceId(),
        {
          name: $("#name").val(),
          notes: $("#notes").val(),
          assignee: me.readAssigneeId()
        },
        function(task) {
          me.setAddWorking(false);
          me.showSuccess(task);
        },
        function(response) {
          me.setAddWorking(false);
          me.showError(response.errors[0].message);
        });
  },

  // Helper to show a success message after a task is added.
  showSuccess: function(task) {
    var me = this;
    Asana.ServerModel.taskViewUrl(task, function(url) {
      var name = task.name.replace(/^\s*/, "").replace(/\s*$/, "");
      $("#new_task_workspace_name").text(me.workspaceById(me.readWorkspaceId()).name);
      var link = $("#new_task_link");
      link.attr("href", url);
      link.text(name !== "" ? name : "unnamed task");
      link.unbind("click");
      link.click(function() {
        chrome.tabs.create({url: url});
        window.close();
        return false;
      });
      me.resetFields();
      $("#success").css("display", "");
    });
  },

  // Helper to show the login page.
  showLogin: function(url) {
    var me = this;
    $("#login_button").click(function() {
      chrome.tabs.create({url: url});
      window.close();
      return false;
    });
    me.showView("login");
  }
};

window.addEventListener('load', function() {
  Popup.onLoad();
});
