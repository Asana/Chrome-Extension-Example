/**
 * Code for the popup UI.
 */
Popup = {

  // Is this an external popup window? (vs. the one from the menu)
  is_external: false,

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

  // Data from API cached for this popup.
  workspaces: null,
  users: null,
  user_id: null,
  
  // Typeahead ui element
  typeahead: null,
  project_typehead: null,

  onLoad: function() {
    var me = this;

    me.is_external = ('' + window.location.search).indexOf("external=true") !== -1;

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
      var tab = tabs[0];
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
              me.showAddUi(tab.url, tab.title, '', tab.favIconUrl);
            }
          } else {
            // The user is not even logged in. Prompt them to do so!
            me.showLogin(
                Asana.Options.loginUrl(options),
                Asana.Options.signupUrl(options));
          }
        });
      });
    });

    // Wire up some events to DOM elements on the page.

    $(window).keydown(function(e) {
      // Close the popup if the ESCAPE key is pressed.
      if (e.which === 27) {
        if (me.is_first_add) {
          Asana.ServerModel.logEvent({
            name: "ChromeExtension-Abort"
          });
        }
        window.close();
      } else if (e.which === 9) {
        // Don't let ourselves TAB to focus the document body, so if we're
        // at the beginning or end of the tab ring, explicitly focus the
        // other end (setting body.tabindex = -1 does not prevent this)
        if (e.shiftKey && document.activeElement === me.firstInput().get(0)) {
          me.lastInput().focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === me.lastInput().get(0)) {
          me.firstInput().focus();
          e.preventDefault();
        }
      }
    });

    // Close if the X is clicked.
    $(".close-x").click(function() {
      if (me.is_first_add) {
        Asana.ServerModel.logEvent({
          name: "ChromeExtension-Abort"
        });
      }
      window.close();
    });

    $("#name_input").keyup(function() {
      if (!me.has_edited_name && $("#name_input").val() !== "") {
        me.has_edited_name = true;
        Asana.ServerModel.logEvent({
          name: "ChromeExtension-ChangedTaskName"
        });
      }
      me.maybeDisablePageDetailsButton();
    });
    $("#notes_input").keyup(function() {
      if (!me.has_edited_notes && $("#notes_input").val() !== "") {
        me.has_edited_notes= true;
        Asana.ServerModel.logEvent({
          name: "ChromeExtension-ChangedTaskNotes"
        });
      }
      me.maybeDisablePageDetailsButton();
    });

    // The page details button fills in fields with details from the page
    // in the current tab (cached when the popup opened).
    var use_page_details_button = $("#use_page_details");
    use_page_details_button.click(function() {
      if (!(use_page_details_button.hasClass('disabled'))) {
        // Page title -> task name
        $("#name_input").val(me.page_title);
        // Page url + selection -> task notes
        var notes = $("#notes_input");
        notes.val(notes.val() + me.page_url + "\n" + me.page_selection);
        // Disable the page details button once used.        
        use_page_details_button.addClass('disabled');
        if (!me.has_used_page_details) {
          me.has_used_page_details = true;
          Asana.ServerModel.logEvent({
            name: "ChromeExtension-UsedPageDetails"
          });
        }
      }
    });

    // Make a typeahead for assignee and project
    me.typeahead = new ItemTypeahead("assignee");
    me.project_typeahead = new ItemTypeahead("project");
  },

  maybeDisablePageDetailsButton: function() {
    if ($("#name_input").val() !== "" || $("#notes_input").val() !== "") {
      $("#use_page_details").addClass('disabled');
    } else {
      $("#use_page_details").removeClass('disabled');
    }
  },

  setExpandedUi: function(is_expanded) {
    if (this.is_external) {
      window.resizeTo(
          Asana.POPUP_UI_WIDTH,
          (is_expanded ? Asana.POPUP_EXPANDED_UI_HEIGHT : Asana.POPUP_UI_HEIGHT)
              + Asana.CHROME_TITLEBAR_HEIGHT);
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

    // Populate workspace selector and select default.
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
          if (select.val() !== me.options.default_workspace_id) {
            Asana.ServerModel.logEvent({
              name: "ChromeExtension-ChangedWorkspace"
            });
          }
          me.onWorkspaceChanged();
        });

        // Set initial UI state
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
      });
    });
  },

  /**
   * @param enabled {Boolean} True iff the add button should be clickable.
   */
  setAddEnabled: function(enabled) {
    var me = this;
    var button = $("#add_button");
    if (enabled) {
      // Update appearance and add handlers.
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
      // Update appearance and remove handlers.
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

  /**
   * Clear inputs for new task entry.
   */
  resetFields: function() {
    $("#name_input").val("");
    $("#notes_input").val("");
    this.typeahead.setSelectedItemId(this.user_id);
  },

  /**
   * Set the add button as being "working", waiting for the Asana request
   * to complete.
   */
  setAddWorking: function(working) {
    this.setAddEnabled(!working);
    $("#add_button").find(".button-text").text(
        working ? "Adding..." : "Add to Asana");
  },

  /**
   * Update the list of users as a result of setting/changing the workspace.
   */
  onWorkspaceChanged: function() {
    var me = this;
    var workspace_id = me.selectedWorkspaceId();

    // Update selected workspace
    $("#workspace").html($("#workspace_select option:selected").text());

    // Save selection as new default.
    me.options.default_workspace_id = workspace_id;
    Asana.ServerModel.saveOptions(me.options, function() {});

    // Update assignee list.
    me.setAddEnabled(false);
    Asana.ServerModel.users(workspace_id, function(users) {
      me.typeahead.updateItems(users);

    });

    // Then update the projects list.
    Asana.ServerModel.projects(workspace_id, function(project) {
      me.project_typeahead.updateItems(project);
      me.setAddEnabled(true);
    });
  },

  /**
   * @param id {Integer}
   * @return {dict} Workspace data for the given workspace.
   */
  workspaceById: function(id) {
    var found = null;
    this.workspaces.forEach(function(w) {
      if (w.id === id) {
        found = w;
      }
    });
    return found;
  },

  /**
   * @return {Integer} ID of the selected workspace.
   */
  selectedWorkspaceId: function() {
    return parseInt($("#workspace_select").val(), 10);
  },

  /**
   * Create a task in asana using the data in the form.
   */
  createTask: function() {
    var me = this;

    // Update UI to reflect attempt to create task.
    console.info("Creating task");
    me.hideError();
    me.setAddWorking(true);

    if (!me.is_first_add) {
      Asana.ServerModel.logEvent({
        name: "ChromeExtension-CreateTask-MultipleTasks"
      });
    }

    Asana.ServerModel.createTask(
        me.selectedWorkspaceId(),
        {
          name: $("#name_input").val(),
          notes: $("#notes_input").val(),
          // Default assignee to self
          assignee: me.typeahead.selected_user_id || me.user_id,
          // Default add to self's new tasks
          // TODO: better way to handle null case.
          projects: (me.project_typeahead.selected_item_id ?
              [me.project_typeahead.selected_item_id] : [])
        },
        function(task) {
          // Success! Show task success, then get ready for another input.
          Asana.ServerModel.logEvent({
            name: "ChromeExtension-CreateTask-Success"
          });
          me.setAddWorking(false);
          me.showSuccess(task);
          me.resetFields();
          $("#name_input").focus();
        },
        function(response) {
          // Failure. :( Show error, but leave form available for retry.
          Asana.ServerModel.logEvent({
            name: "ChromeExtension-CreateTask-Failure"
          });
          me.setAddWorking(false);
          me.showError(response.errors[0].message);
        });
  },

  /**
   * Helper to show a success message after a task is added.
   */
  showSuccess: function(task) {
    var me = this;
    Asana.ServerModel.taskViewUrl(task, function(url) {
      var name = task.name.replace(/^\s*/, "").replace(/\s*$/, "");
      var link = $("#new_task_link");
      link.attr("href", url);
      link.text(name !== "" ? name : "Task");
      link.unbind("click");
      link.click(function() {
        chrome.tabs.create({url: url});
        window.close();
        return false;
      });

      // Reset logging for multi-add
      me.has_edited_name = true;
      me.has_edited_notes = true;
      me.has_reassigned = true;
      me.is_first_add = false;

      $("#success").css("display", "inline-block");
    });
  },

  /**
   * Show the login page.
   */
  showLogin: function(login_url, signup_url) {
    var me = this;
    $("#login_button").click(function() {
      chrome.tabs.create({url: login_url});
      window.close();
      return false;
    });
    $("#signup_button").click(function() {
      chrome.tabs.create({url: signup_url});
      window.close();
      return false;
    });
    me.showView("login");
  },

  firstInput: function() {
    return $("#workspace_select");
  },

  lastInput: function() {
    return $("#add_button");
  }
};

/**
 * A jQuery-based typeahead similar to the Asana application, which allows
 * the user to select another user in the workspace by typing in a portion
 * of their name and selecting from a filtered dropdown.
 *
 * Expects elements with the following IDs already in the DOM
 *   ID: the element where the current assignee will be displayed.
 *   ID_input: an input element where the user can edit the assignee
 *   ID_list: an empty DOM whose children will be populated from the users
 *       in the selected workspace, filtered by the input text.
 *   ID_list_container: a DOM element containing ID_list which will be
 *       shown or hidden based on whether the user is interacting with the
 *       typeahead.
 *
 * @param id {String} Base ID of the typeahead element.
 * @constructor
 */
ItemTypeahead = function(id) {
  var me = this;
  me.id = id;
  me.items = [];
  me.filtered_items = [];
  me.item_id_to_item = {};
  me.selected_item_id = null;
  me.item_id_to_select = null;
  me.has_focus = false;

  // Store off UI elements.
  me.input = $("#" + id + "_input");
  me.label = $("#" + id);
  me.list = $("#" + id + "_list");
  me.list_container = $("#" + id + "_list_container");

  // Open on focus.
  me.input.focus(function() {
    me.item_id_to_select = me.selected_item_id;
    if (me.selected_item_id !== null) {
      // If a item was already selected, fill the field with their name
      // and select it all.
      var assignee_name = me.item_id_to_item[me.selected_item_id].name;
      me.input.val(assignee_name);
    } else {
      me.input.val("");
    }
    me.has_focus = true;
    Popup.setExpandedUi(true);
    me._updateFilteredItems();
    me.render();
    me._ensureSelectedItemVisible();
  });

  // Close on blur. A natural blur does not cause us to accept the current
  // selection - there had to be a user action taken that causes us to call
  // `confirmSelection`, which would have updated item_id_to_select.
  me.input.blur(function() {
    me.selected_item_id = me.item_id_to_select;
    me.has_focus = false;
    if (!Popup.has_reassigned) {
      Popup.has_reassigned = true;
      Asana.ServerModel.logEvent({
        name: (me.selected_item_id === Popup.user_id || me.selected_item_id === null) ?
            "ChromeExtension-AssignToSelf" :
            "ChromeExtension-AssignToOther"
      });
    }
    me.render();
    Popup.setExpandedUi(false);
  });

  // Handle keyboard within input
  me.input.keydown(function(e) {
    if (e.which === 13) {
      // Enter accepts selection, focuses next UI element.
      me._confirmSelection();
      $("#add_button").focus();
      return false;
    } else if (e.which === 9) {
      // Tab accepts selection. Browser default behavior focuses next element.
      me._confirmSelection();
      return true;
    } else if (e.which === 27) {
      // Abort selection. Stop propagation to avoid closing the whole
      // popup window.
      e.stopPropagation();
      me.input.blur();
      return false;
    } else if (e.which === 40) {
      // Down: select next.
      var index = me._indexOfSelectedItem();
      if (index === -1 && me.filtered_items.length > 0) {
        me.setSelectedItemId(me.filtered_items[0].id);
      } else if (index >= 0 && index < me.filtered_items.length) {
        me.setSelectedItemId(me.filtered_items[index + 1].id);
      }
      me._ensureSelectedItemVisible();
      e.preventDefault();
    } else if (e.which === 38) {
      // Up: select prev.
      var index = me._indexOfSelectedItem();
      if (index > 0) {
        me.setSelectedItemId(me.filtered_items[index - 1].id);
      }
      me._ensureSelectedItemVisible();
      e.preventDefault();
    }
  });

  // When the input changes value, update and re-render our filtered list.
  me.input.bind("input", function() {
    me._updateFilteredItems();
    me._renderList();
  });

  // A user clicking or tabbing to the label should open the typeahead
  // and select what's already there.
  me.label.focus(function() {
    me.input.focus();
    me.input.get(0).setSelectionRange(0, me.input.val().length);
  });

  me.render();
};

Asana.update(ItemTypeahead, {

  SILHOUETTE_URL: "./nopicture.png",

  /**
   * @param item {dict}
   * @returns {jQuery} photo element
   */
  photoForItem: function(item) {
    var photo = $('<div class="item-photo"></div>"');
    var url = item.photo ? item.photo.image_60x60 : ItemTypeahead.SILHOUETTE_URL;
    photo.css("background-image", "url(" + url + ")");
    return $('<div class="item-photo-frame"></div>').append(photo);
  }

});

Asana.update(ItemTypeahead.prototype, {

  /**
   * Render the typeahead, changing elements and content as needed.
   */
  render: function() {
    var me = this;
    me._renderLabel();

    if (this.has_focus) {
      // Focused - show the list and input instead of the label.
      me._renderList();
      me.input.show();
      me.label.hide();
      me.list_container.show();
    } else {
      // Not focused - show the label, not the list or input.
      me.input.hide();
      me.label.show();
      me.list_container.hide();
    }
  },

  /**
   * Update the set of all (unfiltered) items available in the typeahead.
   *
   * @param items {dict[]}
   */
  updateItems: function(items) {
    var me = this;
    // Build a map from item ID to item
    var this_item = null;
    var items_without_this_item = [];
    me.item_id_to_item = {};
    items.forEach(function(item) {
      if (item.id === Popup.user_id) {
        this_item = item;
      } else {
        items_without_this_item.push(item);
      }
      me.item_id_to_item[item.id] = item;
    });

    // Put current item at the beginning of the list.
    // We really should have found this item, but if not .. let's not crash.
    me.items = this_item ?
        [this_item].concat(items_without_this_item) : items_without_this_item;

    // If selected item is not in this workspace, unselect them.
    if (!(me.selected_item_id in me.item_id_to_item)) {
      me.selected_item_id = null;
      me.input.val("");
    }
    me._updateFilteredItems();
    me.render();
  },

  _renderLabel: function() {
    var me = this;
    me.label.empty();
    var selected_item = me.item_id_to_item[me.selected_item_id];
    if (selected_item) {
      if (selected_item.photo) {
        me.label.append(ItemTypeahead.photoForItem(selected_item));
      }
      me.label.append($('<div class="item-name">').text(selected_item.name));
    } else {
      me.label.append($('<span class="unassigned">').text(
              me.id.charAt(0).toUpperCase() + me.id.slice(1)
      ));
    }
  },

  _renderList: function() {
    var me = this;
    me.list.empty();
    me.filtered_items.forEach(function(item) {
      me.list.append(me._entryForItem(item, item.id === me.selected_item_id));
    });
  },

  _entryForItem: function(item, is_selected) {
    var me = this;
    var node = $('<div id="user_' + item.id + '" class="item"></div>');
    if (item.photo)
    {
      node.append(ItemTypeahead.photoForItem(item));
    }
    node.append($('<div class="item-name">').text(item.name));
    if (is_selected) {
      node.addClass("selected");
    }

    // Select on mouseover.
    node.mouseenter(function() {
      me.setSelectedItemId(item.id);
    });

    // Select and confirm on click. We listen to `mousedown` because a click
    // will take focus away from the input, hiding the item list and causing
    // us not to get the ensuing `click` event.
    node.mousedown(function() {
      me.setSelectedItemId(item.id);
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
    this.item_id_to_select = this.selected_item_id;
  },

  _updateFilteredItems: function() {
    var regexp = this._regexpFromFilterText(this.input.val());
    this.filtered_items = this.items.filter(function(item) {
      if (regexp !== null) {
        var parts = item.name.split(regexp);
        return parts.length > 1;
      } else {
        return item.name.trim() !== "";  // no filter
      }
    });
  },

  _indexOfSelectedItem: function() {
    var me = this;
    var selected_item = me.item_id_to_item[me.selected_item_id];
    if (selected_item) {
      return me.filtered_items.indexOf(selected_item);
    } else {
      return -1;
    }
  },

  /**
   * Helper to call this when the selection was changed by something that
   * was not the mouse (which is pointing directly at a visible element),
   * to ensure the selected item is always visible in the list.
   */
  _ensureSelectedItemVisible: function() {
    var index = this._indexOfSelectedItem();
    if (index !== -1) {
      var node = this.list.children().get(index);
      Asana.Node.ensureBottomVisible(node);
    }
  },

  setSelectedItemId: function(id) {
    if (this.selected_item_id !== null) {
      $("#user_" + this.selected_item_id).removeClass("selected");
    }
    this.selected_item_id = id;
    if (this.selected_item_id !== null) {
      $("#user_" + this.selected_item_id).addClass("selected");
    }
    this._renderLabel();
  }

});

$(window).load(function() {
  Popup.onLoad();
});

