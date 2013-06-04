/**
 * A module to run in a content window to enable QuickAdd from that window.
 * That is, pressing Alt+Q (or maybe Tab+Q) anywhere in the window will open
 * the same popup as is available from the chrome menu.
 *
 * There's no way to trigger the chrome extension popup itself, so this
 * opens a new window with the popup content in it. This looks slightly
 * different than the real popup.
 *
 * Using TAB+Q, while a good mirror of Asana webapp functionality, is not a
 * perfect solution (though it might be refined further with a little more
 * effort). For one thing, we don't swallow the TAB key because
 * we don't want to interfere with the underlying page (especially if the user
 * wasn't going to press TAB+Q). So using the hotkey may cause you to focus
 * a new input on the page before opening the popup. But that tabbing can also
 * be an annoyance, and causes you to lose your selection too.
 *
 */
Asana.QuickAddClient = {

  // True iff we are using Tab+Q instead of Alt+Q.
  USE_TAB: false,

  keyDown: function(e) {
    var me = Asana.QuickAddClient;
    var now = new Date().getTime();

    if (me.USE_TAB && e.keyCode === 9) {
      chrome.runtime.sendMessage({
        type: "quick_add",
        name: "mod_down",
        time: now
      });
    } else if (e.keyCode === 81) {
      chrome.runtime.sendMessage({
        type: "quick_add",
        name: "q_down",
        force: !me.USE_TAB && e.altKey,
        time: now,
        selected_text: "" + window.getSelection()
      });
    }
  },

  keyUp: function(e) {
    var me = Asana.QuickAddClient;
    if (me.USE_TAB && e.keyCode === 9) {
      chrome.runtime.sendMessage({
        type: "quick_add",
        name: "mod_up"
      });
    }
  },

  listen: function() {
    // Don't run against Asana, which already has a QuickAdd feature. ;)
    if (!/^https?:\/\/app[.]asana[.]com/.test(window.location.href) &&
        !/^https?:\/\/localhost/.test(window.location.href)) {
      window.addEventListener("keydown", Asana.QuickAddClient.keyDown, true);
      window.addEventListener("keyup", Asana.QuickAddClient.keyUp, true);
    }
  }
};

Asana.QuickAddClient.listen();
