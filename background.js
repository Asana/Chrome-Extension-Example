Asana.ExtensionServer.listen();
Asana.ServerModel.startPrimingCache();

// Modify referer header sent to typekit, to allow it to serve to us.
// See http://stackoverflow.com/questions/12631853/google-chrome-extensions-with-typekit-fonts
chrome.webRequest.onBeforeSendHeaders.addListener(function(details) {
  var requestHeaders = details.requestHeaders;
  for (var i = 0; i < requestHeaders.length; ++i) {
    if (requestHeaders[i].name.toLowerCase() === 'referer') {
      // The request was certainly not initiated by a Chrome extension...
      return;
    }
  }
  // Set Referer
  requestHeaders.push({
    name: 'referer',
    // Host must match the domain in our Typekit kit settings
    value: 'https://abkfopjdddhbjkiamjhkmogkcfedcnml'
  });
  return {
    requestHeaders: requestHeaders
  };
}, {
  urls: ['*://use.typekit.net/*'],
  types: ['stylesheet', 'script']
}, ['requestHeaders','blocking']);
