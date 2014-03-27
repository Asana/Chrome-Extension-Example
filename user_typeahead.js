
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
 * @param user_id {Integer} ID of the logged-in user
 * @constructor
 */
UserTypeahead = function(id) {
  var me = this;
  me.id = id;
  me.users = [];
  me.filtered_users = [];
  me.user_id_to_user = {};
  me.selected_user_id = null;
  me.user_id_to_select = null;
  me.has_focus = false;
  me.user_id = null;

  // Store off UI elements.
  me.input = $("#" + id + "_input");
  me.label = $("#" + id);
  me.list = $("#" + id + "_list");
  me.list_container = $("#" + id + "_list_container");

  me.onReassigned = null;

  // Open on focus.
  me.input.focus(function() {
    me.user_id_to_select = me.selected_user_id;
    if (me.selected_user_id !== null) {
      // If a user was already selected, fill the field with their name
      // and select it all.
      var assignee_name = me.user_id_to_user[me.selected_user_id].name;
      me.input.val(assignee_name);
    } else {
      me.input.val("");
    }
    me.has_focus = true;
    me._updateFilteredUsers();
    me.render();
    me._ensureSelectedUserVisible();
  });

  // Close on blur. A natural blur does not cause us to accept the current
  // selection - there had to be a user action taken that causes us to call
  // `confirmSelection`, which would have updated user_id_to_select.
  me.input.blur(function() {
    me.selected_user_id = me.user_id_to_select;
    me.has_focus = false;
    if (me.onReassigned !== null) {
      me.onReassigned();
    }
    me.render();
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
      var index = me._indexOfSelectedUser();
      if (index === -1 && me.filtered_users.length > 0) {
        me.setSelectedUserId(me.filtered_users[0].id);
      } else if (index >= 0 && index < me.filtered_users.length) {
        me.setSelectedUserId(me.filtered_users[index + 1].id);
      }
      me._ensureSelectedUserVisible();
      e.preventDefault();
    } else if (e.which === 38) {
      // Up: select prev.
      var index = me._indexOfSelectedUser();
      if (index > 0) {
        me.setSelectedUserId(me.filtered_users[index - 1].id);
      }
      me._ensureSelectedUserVisible();
      e.preventDefault();
    }
  });

  // When the input changes value, update and re-render our filtered list.
  me.input.bind("input", function() {
    me._updateFilteredUsers();
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

Asana.update(UserTypeahead, {

  SILHOUETTE_URL: "./nopicture.png",

  /**
   * @param user {dict}
   * @returns {jQuery} photo element
   */
  photoForUser: function(user) {
    var photo = $('<div class="user-photo"></div>"');
    var url = user.photo ? user.photo.image_60x60 : UserTypeahead.SILHOUETTE_URL;
    photo.css("background-image", "url(" + url + ")");
    return $('<div class="user-photo-frame"></div>').append(photo);
  }

});

Asana.update(UserTypeahead.prototype, {

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
   * Update the set of all (unfiltered) users available in the typeahead.
   *
   * @param users {dict[]}
   */
  updateUsers: function(users) {
    var me = this;
    // Build a map from user ID to user
    var this_user = null;
    var users_without_this_user = [];
    me.user_id_to_user = {};
    users.forEach(function(user) {
      if (user.id === me.user_id) {
        this_user = user;
      } else {
        users_without_this_user.push(user);
      }
      me.user_id_to_user[user.id] = user;
    });

    // Put current user at the beginning of the list.
    // We really should have found this user, but if not .. let's not crash.
    me.users = this_user ?
        [this_user].concat(users_without_this_user) : users_without_this_user;

    // If selected user is not in this workspace, unselect them.
    if (!(me.selected_user_id in me.user_id_to_user)) {
      me.selected_user_id = null;
      me.input.val("");
    }
    me._updateFilteredUsers();
    me.render();
  },

  _renderLabel: function() {
    var me = this;
    me.label.empty();
    var selected_user = me.user_id_to_user[me.selected_user_id];
    if (selected_user) {
      if (selected_user.photo) {
        me.label.append(UserTypeahead.photoForUser(selected_user));
      }
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

    // Select on mouseover.
    node.mouseenter(function() {
      me.setSelectedUserId(user.id);
    });

    // Select and confirm on click. We listen to `mousedown` because a click
    // will take focus away from the input, hiding the user list and causing
    // us not to get the ensuing `click` event.
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

  /**
   * Helper to call this when the selection was changed by something that
   * was not the mouse (which is pointing directly at a visible element),
   * to ensure the selected user is always visible in the list.
   */
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
  }

});

