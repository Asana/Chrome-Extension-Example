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

  KEY: "_asana_heokijphbgfagjocdkdaedfehiokfifg_tab_down_time",

  USE_TAB: false,

  state: function() {
    return window[Asana.QuickAddClient.KEY];
  },

  keyDown: function(e) {
    var self = Asana.QuickAddClient;
    var now = new Date().getTime();
    var state = self.state();

    console.info("Asana quickadd keydown", e.keyCode, now, state.id, state.tab_down_time);
    if (self.USE_TAB && e.keyCode === 9) {
      // Mark tab key as pressed at the current time.
      // If the Q key gets pressed soon enough afterward, we've hit our
      // hotkey combo.
      state.tab_down_time = now;
      console.info(state.tab_down_time);
    } else if (e.keyCode === 81 &&
        ((self.USE_TAB && now < state.tab_down_time + 5000) || e.altKey)) {
      state.tab_down_time = 0;
      console.info("Asana quickadd invoked");
      // We cannot open the popup programmatically.
      // http://code.google.com/chrome/extensions/faq.html#faq-open-popups
      // So we do this roundabout thing.
      chrome.runtime.sendMessage({
        type: "quick_add",
        url: window.location.href,
        title: document.title,
        selected_text: "" + window.getSelection()
      });
      e.preventDefault();
      return false;
    }
  },

  keyUp: function(e) {

    console.info("Asana quickadd keyup", e.keyCode);
    var self = Asana.QuickAddClient;
    if (e.keyCode === 9) {
      // Mark tab key as released.
      self.state().tab_down_time = 0;
    }
  },

  listen: function() {
    console.info("listening");
    if (!window[Asana.QuickAddClient.KEY]) {
      window[Asana.QuickAddClient.KEY] = {
        tab_down_time: 0,
        id: Math.random()
      };
    }
    // Don't run against Asana, which already has a QuickAdd feature. ;)
    if (!/^https?:\/\/app[.]asana[.]com/.test(window.location.href) &&
        !/^https?:\/\/localhost/.test(window.location.href)) {
      window.addEventListener("keydown", Asana.QuickAddClient.keyDown, true);
      window.addEventListener("keyup", Asana.QuickAddClient.keyUp, true);
    }
  }
};

Asana.QuickAddClient.listen();
