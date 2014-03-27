hoverUrls();

function hoverUrls() {
  $('a[href*="//app.asana.com"]').wrap(function() {
    return '<span class="asana-ext-link-wrapper"></span>'
  });

  $('span[class="asana-ext-link-wrapper"]').append(
      '<span class="asana-ext-link-arrow">^</span>');

  $('span[class="asana-ext-link-arrow"]').click(
      function(node) {

      });
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

viewTask(11231435051899);
