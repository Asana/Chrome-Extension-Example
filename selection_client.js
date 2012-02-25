/**
 * Module to install on a page that allows sending of the selection over to
 * the popup window when the user pops up the new task window. The popup
 * calls this method on our content window, and we get the selection
 * and send it back.
 */
Asana.SelectionClient = {
  // We get called when added to asana.
  sendSelection: function() {
    var selected_text = "" + window.getSelection();
    console.info("Sending selection to Asana popup");
    chrome.extension.sendRequest({
      type: "selection",
      value: selected_text
    });
  }
};
