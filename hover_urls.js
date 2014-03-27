hoverUrls();

function hoverUrls() {
  $('a[href*="//app.asana.com"]').wrap(function() {
    var url = this.href;
    console.info("wrapped: " + url);
    // TODO: url encode
    // TODO: change position of container inside the wrapper rather than the
    // wrapper itself to avoid mangling the webpages DOM
    return '<span class="asana-ext-link-wrapper" data="' + url +'"></span>'
  });

  $('span[class="asana-ext-link-wrapper"]').each(function(i, wrapper) {
    var arrow = $(document.createElement("span"));
    var arrow_img = $(document.createElement("img"));
    // TODO: Switch to use same asana logo from sprite
    arrow_img.attr("src", chrome.extension.getURL("icon128.png"));
    arrow_img.attr("height", "18px");
    arrow_img.attr("width", "18px");
    arrow_img.addClass("asana-ext-link-arrow-img");
    arrow.append(arrow_img);
    arrow.addClass("asana-ext-link-arrow");
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
    left: arrow_offset.left,
    top: arrow_offset.top
  });
  view_frame.css("position", "absolute");
  view_frame.css("width", "480px");
  view_frame.css("height", "500px");
  view_frame.attr("src", chrome.extension.getURL("view_popup.html?task=" + id));
  view.append(view_frame);
  $(document.body).append(view);
}
