/**
 * Define the top-level Asana namespace.
 */
Asana = {};

/**
 * Things borrowed from asana library.
 */


update = function(to, from) {
  for (var k in from) {
    to[k] = from[k];
  }
  return to;
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
