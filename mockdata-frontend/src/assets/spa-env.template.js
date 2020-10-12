(function(window) {
  window["env"] = window["env"] || {};
  // Environment variables
  window["env"]["backendUrl"] = "${BACKEND_URL}";
  window["env"]["creators"] = "${CREATORS}";
  window["env"]["frontends"] = "${FRONTENDS}";
})(this);