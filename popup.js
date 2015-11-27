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
//  users: null,
//  user_id: null,
  
  // Typeahead ui element
  typeahead: null,
  SILHOUETTE_URL: "./nopicture.png",

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

    // Make a typeahead for assignee
//    me.typeahead = new UserTypeahead("assignee");

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
    $("#assignee_input").val("");
    $("#project_input").val("");
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
   * Creates a Bloodhound suggestion engine which consumes typeahead data from a
   * given endpoint.
   *
   * @param typeahead_endpoint {String} The API endpoint to get typeahead results from.
   * @param filter_function {Function} Function to filter typeahead results into objects, for UI usage.
   * @returns {Bloodhound} Initialized engine with typeahead endpoint.
   * @private
   */
  _createBloodhoundObject: function(typeahead_endpoint, filter_function) {
    var me = this;
    // Instantiate the Bloodhound suggestion engine
    // Use the typeahead endpoint and filter function
    var selectana = new Bloodhound({
      datumTokenizer: function (datum) {
        return Bloodhound.tokenizers.whitespace(datum.value);
      },
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      remote: {
        url: Asana.ApiBridge.baseApiUrl() + '/workspaces/' + me.selectedWorkspaceId()
          + typeahead_endpoint,
        ajax : {
          beforeSend: function(jqXhr, settings){
            // WARNING: This will be deprecated, please see api_bridge.js
            jqXhr.setRequestHeader('X-Allow-Asana-Client', '1');
          }
        },
        filter: filter_function
      },
      limit: 8
    });

    // Clear suggestions and cache when switching workspaces.
    selectana.clear();
    selectana.clearRemoteCache();
    selectana.clearPrefetchCache();
    // Initialize the Bloodhound suggestion engine. This is truthy, which
    // will recreate the engine as if it were the first call.
    selectana.initialize(true);

    return selectana;
  },

  /**
   * Instantiates a Typeahead.JS UI object using a Bloodhound object as the
   * data source.
   * @param bloodhound_object {Bloodhound} Bloodhound object with typeahead endpoint.
   * @param input_element {jQuery Object} Element to associate typeahead object.
   * @param on_selected_function {Function} Function to update UI on selecting result.
   * @private
   */
  _createTypeaheadUi: function(bloodhound_object, input_element, on_selected_function) {
    // Remove the existing typeahead, we need a new one.
    input_element.typeahead('destroy');

    // Instantiate the Typeahead UI
    input_element.typeahead({
      hint: true,
      highlight: true
    }, {
      displayKey:
        function(item) {
          return item.value;
        },
      source: bloodhound_object.ttAdapter()
    }).on('typeahead:selected', on_selected_function);
  },

  /**
   * Creates a typeahead.js object with a bloodhound engine that is attached
   * to the assignee input.
   */
  createUserTypeahead: function() {
    var me = this;
    var selectana = me._createBloodhoundObject(
      '/typeahead?type=user&query=%QUERY&opt_fields=name,photo.image_21x21',
      function (results) {
        return $.map(results.data, function (result) {
          return {
            value: result.name,
            id: result.id,
            photo_url: result.photo ? result.photo.image_21x21 : me.SILHOUETTE_URL
          };
        });
      }
    );

    me._createTypeaheadUi(selectana, $("#assignee_input"),
      function (eventObject, suggestionObject, suggestionDataset) {
        $('#assignee_list').html(suggestionObject.id);
      }
    );
  },

  /**
   * Creates a typeahead.js object with bloodhound engine that is attached to
   * the project input.
   */
  createProjectTypeahead: function() {
    var me = this;
    var selectana = me._createBloodhoundObject(
      '/typeahead?type=project&query=%QUERY',
      function (results) {
        return $.map(results.data, function (result) {
          return {
            value: result.name,
            id: result.id
          };
        });
      }
    );

    me._createTypeaheadUi(selectana, $("#project_input"),
      function (eventObject, suggestionObject, suggestionDataset) {
        $('#project_list').html(suggestionObject.id);
      }
    );
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

    // Disable while we create new typeahead.
    me.setAddEnabled(false);
    // Update queries and clear out old data.
    me.createUserTypeahead();
    me.createProjectTypeahead();
    // ... and we're ready!
    me.setAddEnabled(true);

  },

  /**
   * @return {Integer} ID of the selected workspace.
   */
  selectedWorkspaceId: function() {
    return parseInt($("#workspace_select").val(), 10);
  },

  assignTaskToUser: function() {
    var me = this;
    var assignee_input = $("#assignee_input");
    // If an assignee was selected, use that person.
    if (assignee_input.val() !== "") {
      return $("#assignee_list").text();
    }
    var project_input = $("#project_input");
    // If there's no assignee AND no project, assign to self.
    if (assignee_input.val() === "" && project_input.val() === "") {
      return "me";
    }

    // Otherwise, let user place task in a project.
    return "";
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
            assignee: me.assignTaskToUser(),
            projects: (($("#project_input").val() !== "") ?
                [$("#project_list").text()] : [])
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

$(window).load(function() {
  Popup.onLoad();
});

// This is a workaround to add a loading indicator for typeahead.js.
// See https://github.com/twitter/typeahead.js/issues/284
$(document).ajaxSend(function(event, jqXHR, settings) {
    // display spinner
    $("#spinner").removeClass("indicator-hide");
    Asana.ServerModel.logEvent({
      name: "ChromeExtension-Typeahead-SearchStarted"
    });
});

$(document).ajaxComplete(function(event, jqXHR, settings) {
    $("#spinner").addClass("indicator-hide");
    Asana.ServerModel.logEvent({
      name: "ChromeExtension-Typeahead-SearchComplete"
    });
});