
var init = function() {
  fillOptions();
  $("#reset_button").click(resetOptions);
};

// Restores select box state to saved value from localStorage.
var fillOptions = function() {
  var options = Asana.Options.loadOptions();
  $("#asana_host_port_input").val(options.asana_host_port);
  fillDomainsInBackground(options);
};

var fillDomainsInBackground = function(opt_options) {
  var options = opt_options || Asana.Options.loadOptions();
  Asana.ServerModel.workspaces(function(workspaces) {
    $("#domains_group").html("");
    workspaces.forEach(function(domain) {
      $("#domains_group").append(
          '<label><input name="default_domain_id" type="radio" id="default_domain_id-' +
              domain.id + '" key="' + domain.id + '"/>' + domain.name + '</label><br/>');
    });
    var default_domain_element = $("#default_domain_id-" + options.default_domain_id);
    if (default_domain_element[0]) {
      default_domain_element.attr("checked", "checked");
    } else {
      $("#domains_group").find("input")[0].checked = true;
    }
    $("#domains_group").find("input").change(onChange);
  }, function(error_response) {
    $("#domains_group").html(
        '<div>Error loading workspaces. Verify the following:<ul>' +
            '<li>Asana Host is configured correctly.</li>' +
            '<li>You are <a target="_blank" href="' +
            Asana.Options.loginUrl() +
            '">logged in</a>.</li>' +
            '<li>You have access to the Asana API.</li></ul>');
  });
};

var onChange = function() {
  setSaveEnabled(true);
};

var setSaveEnabled = function(enabled) {
  var button = $("#save_button");
  if (enabled) {
    button.removeClass("disabled");
    button.addClass("enabled");
    button.click(saveOptions);
  } else {
    button.removeClass("enabled");
    button.addClass("disabled");
    button.unbind('click');
  }
};

var resetOptions = function() {
  Asana.Options.resetOptions();
  fillOptions();
  setSaveEnabled(false);
};

var saveOptions = function() {
  var asana_host_port = $("#asana_host_port_input").val();
  var default_domain_input = $("input[@name='default_domain_id']:checked");
  Asana.Options.saveOptions({
    asana_host_port: asana_host_port,
    default_domain_id: default_domain_input
        ? default_domain_input.attr("key")
        : 0
  });
  setSaveEnabled(false);
  $("#status").html("Options saved.");
  setTimeout(function() {
    $("#status").html("");
  }, 3000);

  fillDomainsInBackground();
};
