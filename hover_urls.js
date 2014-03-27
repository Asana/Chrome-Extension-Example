hoverUrls();

function hoverUrls() {
  $('a[href*="//app.asana.com"]').wrap(function() {
    var url = this.href;
    console.info("wrapped: " + url);
    // TODO: url encode
    return '<span class="asana-ext-link-wrapper" data="' + url +'"></span>'
  });

  $('span[class="asana-ext-link-wrapper"]').each(function(i, wrapper) {
    var arrow = $(document.createElement("span"));
    arrow.addClass("asana-ext-link-arrow");
    arrow.html("^");
    arrow.click(function() {
      var url = $(wrapper).attr("data");
      viewTask(taskFromUrl(url));
    });
    $(wrapper).append(arrow);
  });
}

function taskFromUrl(url) {
  // TODO: make more robust
  var parts = url.split("/");
  return parseInt(parts.slice(-1)[0], 10);
}

var view_node = null;

function closeView() {
  if (view_node !== null) {
    view_node.parentNode.removeChild(view_node);
    view_node = null;
  }
}

function viewTask(id) {
  closeView();
  view_node = document.createElement("DIV");
  view_node.className = "asana-view-node";
  var view_frame = document.createElement("IFRAME");
  view_frame.src = chrome.extension.getURL("view_popup.html?task=" + id);
  view_node.appendChild(view_frame);
  document.body.appendChild(view_node);
}

//viewTask(11231435051899);
