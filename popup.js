Popup = {

  // Options loaded when popup opened.
  options: null,

  // Info from page we were triggered from
  page_title: null,
  page_url: null,
  page_selection: null,
  favicon_url: null,

  // State to track so we only log events once.
  has_edited_name: false,
  has_edited_notes: false,
  has_reassigned: false,
  has_used_page_details: false,
  is_first_add: true,

  workspaces: null,
  users: null,
  typeahead: null,
  user_id: null,

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
    chrome.tabs.query({
      active: true,
      currentWindow: true
    }, function(tabs) {
      // Now load our options ...
      Asana.ServerModel.options(function(options) {
        me.options = options;
        // And ensure the user is logged in ...
        Asana.ServerModel.isLoggedIn(function(is_logged_in) {
          if (is_logged_in) {
            if (window.quick_add_request) {
              Asana.ServerModel.logEvent({
                name: "ChromeExtension-Open-QuickAdd"
              });
              // If this was a QuickAdd request (set by the code popping up
              // the window in Asana.ExtensionServer), then we have all the
              // info we need and should show the add UI right away.
              me.showAddUi(
                  quick_add_request.url, quick_add_request.title,
                  quick_add_request.selected_text,
                  quick_add_request.favicon_url);
            } else {
              Asana.ServerModel.logEvent({
                name: "ChromeExtension-Open-Button"
              });
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
                me.showAddUi(tab.url, tab.title, selection, tab.favIconUrl);
              });
            }
          } else {
            // The user is not even logged in. Prompt them to do so!
            me.showLogin(Asana.Options.loginUrl(options));
          }
        });
      });
    });

    // Wire up some events to DOM elements on the page.

    // Close the popup if the ESCAPE key is pressed.
    $(window).keypress(function(e) {
      if (e.which === 27) {
        Asana.ServerModel.logEvent({
          name: "ChromeExtension-Abort"
        });
        window.close();
      }
    });

    $(".close-x").click(function() {
      Asana.ServerModel.logEvent({
        name: "ChromeExtension-Abort"
      });
      window.close();
    });

    $("#name_input").keyup(function() {
      if (!me.has_edited_name && $("#name_input").val() !== "") {
        me.has_edited_name = true;
        Asana.ServerModel.logEvent({
          name: "ChromeExtension-ChangedTaskName"
        });
      }
      me.checkToDisablePageDetailsButton();
    });
    $("#notes_input").keyup(function() {
      if (!me.has_edited_notes && $("#notes_input").val() !== "") {
        me.has_edited_notes= true;
        Asana.ServerModel.logEvent({
          name: "ChromeExtension-ChangedTaskNotes"
        });
      }
      me.checkToDisablePageDetailsButton();
    });

    $("#use_page_details").click(function() {
      if (!($("#use_page_details").hasClass('disabled'))) {
        $("#name_input").val(me.page_title);
        var notes = $("#notes_input");
        notes.val(notes.val() + me.page_url + me.page_selection);
        if (!me.has_used_page_details) {
          me.has_used_page_details = true;
          Asana.ServerModel.logEvent({
            name: "ChromeExtension-UsedPageDetails"
          });
        }
      }
    });

    me.typeahead = new UserTypeahead("assignee");
  },

  checkToDisablePageDetailsButton: function() {
    if ($("#name_input").val() !== "" || $("#notes_input").val() !== "") {
      $("#use_page_details").addClass('disabled');
    } else {
      $("#use_page_details").removeClass('disabled');
    }
  },

  showView: function(name) {
    ["login", "add"].forEach(function(view_name) {
      $("#" + view_name + "_view").css("display", view_name === name ? "" : "none");
    });
  },

  showAddUi: function(url, title, selected_text, favicon_url) {
    var me = this;

    // Store off info from page we got triggered from.
    me.page_url = url;
    me.page_title = title;
    me.page_selection = selected_text;
    me.favicon_url = favicon_url;

    me.resetFields();
    me.showView("add");
    var name_input = $("#name_input");
    name_input.focus();
    name_input.select();

    if (favicon_url) {
      $(".icon-use-link").css("background-image", "url(" + favicon_url + ")");
    } else {
      $(".icon-use-link").addClass("no-favicon sprite");
    }

    Asana.ServerModel.me(function(user) {
      me.user_id = user.id;
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
        select.change(function() {
          me.onWorkspaceChanged();
        });
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
    $("#error").css("display", "inline-block");
  },

  hideError: function() {
    $("#error").css("display", "none");
  },

  resetFields: function() {
    $("#name_input").val("");
    $("#notes_input").val("");
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
    me.setAddEnabled(false);
    Asana.ServerModel.users(workspace_id, function(users) {
      me.typeahead.updateUsers(users);
      me.typeahead.setSelectedUserId(me.user_id);
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

  readWorkspaceId: function() {
    return parseInt($("#workspace_select").val(), 10);
  },

  createTask: function() {
    var me = this;
    console.info("Creating task");
    me.hideError();
    me.setAddWorking(true);
    if (!me.is_first_add) {
      Asana.ServerModel.logEvent({
        name: "ChromeExtension-CreateTask-MultipleTasks"
      });
    }

    Asana.ServerModel.createTask(
        me.readWorkspaceId(),
        {
          name: $("#name_input").val(),
          notes: $("#notes_input").val(),
          assignee: me.typeahead.selected_user_id
        },
        function(task) {
          Asana.ServerModel.logEvent({
            name: "ChromeExtension-CreateTask-Success"
          });
          me.setAddWorking(false);
          me.showSuccess(task);
        },
        function(response) {
          Asana.ServerModel.logEvent({
            name: "ChromeExtension-CreateTask-Failure"
          });
          me.setAddWorking(false);
          me.showError(response.errors[0].message);
        });
  },

  // Helper to show a success message after a task is added.
  showSuccess: function(task) {
    var me = this;
    Asana.ServerModel.taskViewUrl(task, function(url) {
      var name = task.name.replace(/^\s*/, "").replace(/\s*$/, "");
      //$("#new_task_workspace_name").text(me.workspaceById(me.readWorkspaceId()).name);
      var link = $("#new_task_link");
      link.attr("href", url);
      link.text(name !== "" ? name : "Task");
      link.unbind("click");
      link.click(function() {
        chrome.tabs.create({url: url});
        window.close();
        return false;
      });
      me.resetFields();

      // Reset logging for multi-add
      me.has_edited_name = true;
      me.has_edited_notes = true;
      me.has_reassigned = true;
      me.is_first_add = false;

      $("#success").css("display", "inline-block");
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

UserTypeahead = function(id) {
  var me = this;
  me.id = id;
  me.users = [];
  me.filtered_users = [];
  me.user_id_to_user = {};
  me.selected_user_id = null;
  me.user_id_to_select = null;
  me.has_focus = false;

  me.input = $("#" + id + "_input");
  me.label = $("#" + id);
  me.list = $("#" + id + "_list");
  me.list_container = $("#" + id + "_list_container");

  me.input.focus(function() {
    me.user_id_to_select = me.selected_user_id;
    me.input.val("");
    me.has_focus = true;
    me.render();
    me._ensureSelectedUserVisible();
  });
  me.input.blur(function() {
    me.selected_user_id = me.user_id_to_select;
    me.has_focus = false;
    if (!Popup.has_reassigned && me.selected_user_id !== Popup.user_id) {
      Popup.has_reassigned = true;
      Asana.ServerModel.logEvent({
        name: "ChromeExtension-Reassigned"
      });
    }
    me.render();
  });
  me.input.keydown(function(e) {
    if (e.which === 13) {
      me._confirmSelection();
      $("#add_button").focus();
      return false;
    } else if (e.which === 9) {
      me._confirmSelection();
      return true;
    } else if (e.which === 27) {
      e.stopPropagation();
      me.input.blur();
      return false;
    } else if (e.which === 40) {
      // Down: select next.
      var index = me._indexOfSelectedUser();
      if (index === -1 && me.filtered_users.length > 0) {
        me.setSelectedUserId(me.filtered_users[0].id);
      } else if (index >= 0 && index < me.filtered_users.length) {
        me.setSelectedUserId(me.filtered_users[index + 1].id);
      }
    } else if (e.which === 38) {
      // Up: select prev.
      var index = me._indexOfSelectedUser();
      if (index > 0) {
        me.setSelectedUserId(me.filtered_users[index - 1].id);
      }
    }
  });
  me.input.bind("input", function() {
    me._updateFilteredUsers();
    me._renderList();
  });
  me.label.focus(function() {
    me.input.focus();
  });
  me.render();
};

Asana.update(UserTypeahead, {

  SILHOUETTE_URL: "xcxc",

  photoForUser: function(user) {
    var url = user.photo ? user.photo.image_27x27 : UserTypeahead.SILHOUETTE_URL;
    var photo = $('<div class="user-photo"></div>"');
    photo.css("background-image", "url(" + url + ")");
    return $('<div class="user-photo-frame"></div>').append(photo);
  }

});

Asana.update(UserTypeahead.prototype, {

  render: function() {
    var me = this;
    me._renderLabel();

    if (this.has_focus) {
      me._renderList();
      me.input.show();
      me.label.hide();
      me.list_container.show();
    } else {
      me.input.hide();
      me.label.show();
      me.list_container.hide();
    }
  },

  _renderLabel: function() {
    var me = this;
    me.label.empty();
    var selected_user = me.user_id_to_user[me.selected_user_id];
    if (selected_user) {
      me.label.append(UserTypeahead.photoForUser(selected_user));
      me.label.append($('<div class="user-name">').text(selected_user.name));
    } else {
      me.label.append($('<span class="unassigned">').text("Assignee"));
    }
  },

  _renderList: function() {
    var me = this;
    me.list.empty();
    me.filtered_users.forEach(function(user) {
      me.list.append(me._entryForUser(user, user.id === me.selected_user_id));
    });
  },

  _entryForUser: function(user, is_selected) {
    var me = this;
    var node = $('<div id="user_' + user.id + '" class="user"></div>');
    node.append(UserTypeahead.photoForUser(user));
    node.append($('<div class="user-name">').text(user.name));
    if (is_selected) {
      node.addClass("selected");
    }
    node.mousedown(function() {
      me.setSelectedUserId(user.id);
      me._confirmSelection();
    });
    return node;
  },

  /**
   * Generates a regular expression that will match strings which contain words
   * that start with the words in filter_text. The matching is case-insensitive
   * and the matching words do not need to be consecutive but they must be in
   * the same order as those in filter_text.
   *
   * @param filter_text {String|null} The input text used to generate the regular
   *  expression.
   * @returns {Regexp}
   */
  _regexpFromFilterText: function(filter_text) {
    if (!filter_text || filter_text.trim() === '') {
      return null;
    } else {
      var escaped_filter_text = RegExp.escape(
          filter_text.trim(),
          /*opt_do_not_escape_spaces=*/true);
      var parts = escaped_filter_text.trim().split(/\s+/).map(function(word) {
        return "(" + word + ")";
      }).join("(.*\\s+)");
      return new RegExp("(?:\\b|^|(?=\\W))" + parts, "i");
    }
  },

  _confirmSelection: function() {
    this.user_id_to_select = this.selected_user_id;
  },

  updateUsers: function(users) {
    var me = this;
    me.users = users;
    me.user_id_to_user = {};
    users.forEach(function(user) {
      me.user_id_to_user[user.id] = user;
    });
    me._updateFilteredUsers();
    me.render();
  },

  _updateFilteredUsers: function() {
    var regexp = this._regexpFromFilterText(this.input.val());
    this.filtered_users = this.users.filter(function(user) {
      if (regexp !== null) {
        var parts = user.name.split(regexp);
        return parts.length > 1;
      } else {
        return user.name.trim() !== "";  // no filter
      }
    });
  },

  _indexOfSelectedUser: function() {
    var me = this;
    var selected_user = me.user_id_to_user[me.selected_user_id];
    if (selected_user) {
      return me.filtered_users.indexOf(selected_user);
    } else {
      return -1;
    }
  },

  _ensureSelectedUserVisible: function() {
    var index = this._indexOfSelectedUser();
    if (index !== -1) {
      var node = this.list.children().get(index);
      Asana.Node.ensureBottomVisible(node);
    }
  },

  setSelectedUserId: function(id) {
    if (this.selected_user_id !== null) {
      $("#user_" + this.selected_user_id).removeClass("selected");
    }
    this.selected_user_id = id;
    if (this.selected_user_id !== null) {
      $("#user_" + this.selected_user_id).addClass("selected");
    }
    this._renderLabel();
    if (this.has_focus) {
      this._ensureSelectedUserVisible();
    }
  }

});


$(window).load(function() {
  Popup.onLoad();
});
