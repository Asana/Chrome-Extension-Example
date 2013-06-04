/**
 * Loads the appropriate typekit resource for fonts in the popup.
 */

(function() {

  // From luna_page.js
  var ISO3316_LANGUAGE_CODES_FOR_NON_LATIN1 = [
    'cs', // Czech
    // The only German character that seems to not be in our font is 0159
    // (see http://alt-codes.org/list/german/) and it seems close enough to
    // not warrant loading a heavier font so commenting out.
//     'de', // German

    'hu', // Hungarian
    'pl', // Polish
    'ro', // Romanian
    'hr', // Croatian
    'sk', // Slovak
    'sl', // Slovene
    'eo', // Esperanto
    'gl', // Galician
    'mt', // Maltese
    'tr', // Turkish
    'et', // Estonian
    'lv', // Latvian
    'lt', // Lithuanian
    'iu', 'ik', 'kl', // Eskimo
    'se', // "Northern" Sami

//    Cyrillic - seems like this shouldn't be an issue (see comment below)
//    but we've gotten specific reports

    'bg', // Bulgarian
    'be', // Byelorussian aka Belarisuian,
    'mk', // Macedonian
    'ru', // Russian
    'sr', // Serbian
    'uk' // Ukrainian

//    Commented out languages with no Latin characters since
//    other languages only look bad when they mix Latin characters
//    from our font with extended characters from the system font.

//     'el', // Greek

    // Skipping Arabic since RTL
    // Skipping Hebrew since RTL
    // Couldn't find Lappish in http://en.wikipedia.org/wiki/List_of_ISO_639-1_codes
    // Couldn't find Nordic
    // Couldn't find Inuit
  ];

  // If the page could be in a language which is not covered by our latin1
  // font, then load the (larger) full font.
  chrome.i18n.getAcceptLanguages(function(language_list) {
    var languages = language_list.join(",");
    var non_latin1 = ISO3316_LANGUAGE_CODES_FOR_NON_LATIN1.filter(function(code) {
      return languages.indexOf(code) !== -1;
    });
    Asana.TYPEKIT_ID = non_latin1.length > 0 ? "hra6rda" : "sli4yxq";
    console.info("Accepting languages: " + languages + " using typekit " +
        Asana.TYPEKIT_ID);

    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://use.typekit.net/' + Asana.TYPEKIT_ID + '.js';
    script.onload = function() {
      try{Typekit.load();}catch(e){}
    };
    head.appendChild(script);
  });
})();
