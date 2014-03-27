hoverUrls();

function hoverUrls() {
//  var links = document.getElementsByTagName("a");
//  links.filter(function(link) {
//
//  })
//  viewTask(11231435051899);
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
  view_frame.src = chrome.extension.getURL("view_popup.html");
  view_node.appendChild(view_frame);
  document.body.appendChild(view_node);
}