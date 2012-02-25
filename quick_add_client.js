/**
 * A module to run in a content window to enable QuickAdd from that window.
 * That is, pressing Tab+Q anywhere in the window will open the same popup
 * as is available from the chrome menu.
 *
 * This is not a perfect solution (though it might be refined further with
 * a little more effort). For one thing, we don't swallow the TAB key because
 * we don't want to interfere with the underlying page (especially if the user
 * wasn't going to press TAB+Q). So using the hotkey may cause you to focus
 * a new input on the page before opening the popup.
 *
 * Also, there's no way to trigger the chrome extension popup itself, so this
 * opens a new window with the popup content in it. This looks slightly
 * different than the real popup (and appears in a different place), but it
 * does the job.
 */
Asana.QuickAddClient = {

  _tab_down_time: 0,

  keyDown: function(e) {
    var self = Asana.QuickAddClient;
    if (e.keyCode === 9) {
      // Mark tab key as pressed at the current time.
      // If the Q key gets pressed soon enough afterward, we've hit our
      // hotkey combo.
      self._tab_down_time = new Date().getTime();
    } else if (e.keyCode === 81) {
      if (new Date().getTime() < self._tab_down_time + 5000) {  // 5s timeout
        self._tab_down_time = 0;
        // Tab-Q!
        // We cannot open the popup programmatically.
        // http://code.google.com/chrome/extensions/faq.html#faq-open-popups
        // So we do this roundabout thing.
        chrome.extension.sendRequest({
          type: "quick_add",
          url: window.location.href,
          title: document.title,
          selected_text: "" + window.getSelection()
        });
        e.preventDefault();
        return false;
      }
    }
  },

  keyUp: function(e) {
    var self = Asana.QuickAddClient;
    if (e.keyCode === 9) {
      // Mark tab key as released.
      self._tab_down_time = 0;
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
