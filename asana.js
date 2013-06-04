/**
 * Define the top-level Asana namespace.
 */
Asana = {

  // When popping up a window, the size given is for the content.
  // When resizing the same window, the size must include the chrome. Sigh.
  CHROME_TITLEBAR_HEIGHT: 24,
  // Natural dimensions of popup window. The Chrome popup window adds 10px
  // bottom padding, so we must add that as well when considering how tall
  // our popup window should be.
  POPUP_UI_HEIGHT: 310 + 10,
  POPUP_UI_WIDTH: 410,
  // Size of popup when expanded to include assignee list.
  POPUP_EXPANDED_UI_HEIGHT: 310 + 10 + 129,

  // If the modifier key is TAB, amount of time user has from pressing it
  // until they can press Q and still get the popup to show up.
  QUICK_ADD_WINDOW_MS: 5000


};

/**
 * Things borrowed from asana library.
 */


Asana.update = function(to, from) {
  for (var k in from) {
    to[k] = from[k];
  }
  return to;
};

Asana.Node = {

  /**
   * Ensures that the bottom of the element is visible. If it is not then it
   * will be scrolled up enough to be visible.
   *
   * Note: this does not take account of the size of the window. That's ok for
   * now because the scrolling element is not the top-level element.
   */
  ensureBottomVisible: function(node) {
    var el = $(node);
    var pos = el.position();
    var element_from_point = document.elementFromPoint(
        pos.left, pos.top + el.height());
    if (element_from_point === null ||
        $(element_from_point).closest(node).size() === 0) {
      node.scrollIntoView(/*alignWithTop=*/ false);
    }
  }

};

if (!RegExp.escape) {
  // Taken from http://simonwillison.net/2006/Jan/20/escape/
  RegExp.escape = function(text, opt_do_not_escape_spaces) {
    if (opt_do_not_escape_spaces !== true) {
      return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"); // nolint
    } else {
      // only difference is lack of escaping \s
      return text.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&"); // nolint
    }
  };
}
