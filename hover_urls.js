hoverUrls();

function hoverUrls() {
  $('a[href*="//app.asana.com"]').wrap(function() {
    var url = this.href;
    console.info("wrapped: " + url);
    // TODO: url encode
    return '<span class="asana-ext-link-wrapper" data="' + url +'"></span>'
  });

  $('span[class="asana-ext-link-wrapper"]').each(function(i, wrapper) {
    var arrow = $(document.createElement("img"));
    arrow.attr("src", chrome.extension.getURL("icon128.png"));
    arrow.attr("height", 18);
    arrow.attr("width", 18);
    arrow.addClass("asana-ext-link-arrow");
//    arrow.append('<span class="asana-ext-link-a">a</span>');
//    arrow.append('<span class="asana-ext-link-ellipsis">&#8942;</span>');
//    arrow.html("&#8942;");
    arrow.click(function() {
      var url = $(wrapper).attr("data");
      viewTask(taskFromUrl(url), arrow);
    });
    $(wrapper).append(arrow);
  });
}

function taskFromUrl(url) {
  // TODO: make more robust
  var parts = url.split("/");
  return parseInt(parts.slice(-1)[0], 10);
}

var view = null;

function closeView() {
  if (view !== null) {
    view.remove();
    view = null;
  }
}

function viewTask(id, arrow) {
  closeView();
  view = $(document.createElement("DIV"));
  view.addClass("asana-view-node");
  var view_frame = $(document.createElement("IFRAME"));
  var arrow_offset = arrow.offset();
  // TODO: be smart about where this appears based on where the element is
  // on the screen at the time. Or maybe it's always in a sidebar.
  view_frame.offset({
    left: arrow_offset.left + 10,
    top: arrow_offset.top - 10
  });
  view_frame.css("position", "absolute");
  view_frame.css("width", "480px");
  view_frame.css("height", "500px");
  view_frame.attr("src", chrome.extension.getURL("view_popup.html?task=" + id));
  view.append(view_frame);
  $(document.body).append(view);
}
