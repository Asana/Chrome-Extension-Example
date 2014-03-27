hoverUrls();

function hoverUrls() {
  var links = document.getElementsByTagName("a");
  var matching_links = [];
  for (var i = 0; i < links.length; i++) {
    var href = links[i].href;
    if (href && (href.match(/.*\/\/app\.asana.com.*/) !== null)) {
      matching_links.push(links[i]);
    }
  }

  matching_links.forEach(function(link) {
    var arrow = document.createElement("span").appendChild(
        document.createTextNode("^"));
    link.appendChild(arrow);
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
  view_frame.src = chrome.extension.getURL("view_popup.html");
  view_node.appendChild(view_frame);
  document.body.appendChild(view_node);
}

//  viewTask(11231435051899);
