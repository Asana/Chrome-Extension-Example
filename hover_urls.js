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