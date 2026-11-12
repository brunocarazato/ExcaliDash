(function () {
  if (typeof window.EXCALIDRAW_ASSET_PATH === "string" && window.EXCALIDRAW_ASSET_PATH.length > 0) return;

  // Derive the deployment base from this script's URL so the app keeps working
  // when served from a sub-path. Falls back to "/" if the URL is unavailable.
  var script = document.currentScript;
  var base = "/";
  if (script && script.src) {
    base = new URL(".", script.src).pathname;
  }

  if (base && base[base.length - 1] !== "/") base += "/";
  window.EXCALIDRAW_ASSET_PATH = new URL(base || "/", window.location.origin).toString();
})();
