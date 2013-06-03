/**
 * Define the top-level Asana namespace.
 */
Asana = {};

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
