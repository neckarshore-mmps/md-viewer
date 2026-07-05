/* md-viewer app logic — decode base64 payload, render both panes, drag divider.
   Placeholders __MD_BASE64__ and __MD_FILENAME_B64__ are replaced by bin/mdview. */
(function () {
  var MD_B64 = "__MD_BASE64__";
  var NAME_B64 = "__MD_FILENAME_B64__";

  function b64ToUtf8(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  var md = b64ToUtf8(MD_B64);
  var name = b64ToUtf8(NAME_B64);

  document.title = name;
  document.getElementById("filename").textContent = name;

  // Left: rendered markdown (sanitized with DOMPurify to neutralize any
  // embedded scripts/handlers in untrusted .md files before injection).
  if (window.marked) {
    marked.setOptions({ gfm: true, breaks: false });
    var html = marked.parse(md);
    if (window.DOMPurify) html = DOMPurify.sanitize(html);
    document.getElementById("rendered").innerHTML = html;
  } else {
    document.getElementById("rendered").textContent = md;
  }

  // Right: raw markdown with syntax highlighting
  var codeEl = document.getElementById("rawcode");
  codeEl.textContent = md;
  if (window.hljs) {
    try { hljs.highlightElement(codeEl); } catch (e) { /* fall back to plain text */ }
  }

  // Draggable divider
  var divider = document.getElementById("divider");
  var left = document.querySelector(".pane.left");
  var split = document.querySelector(".split");
  var dragging = false;

  divider.addEventListener("mousedown", function (e) {
    dragging = true;
    document.body.style.cursor = "col-resize";
    e.preventDefault();
  });
  window.addEventListener("mousemove", function (e) {
    if (!dragging) return;
    var rect = split.getBoundingClientRect();
    var pct = ((e.clientX - rect.left) / rect.width) * 100;
    pct = Math.max(15, Math.min(85, pct));
    left.style.flex = "0 0 " + pct + "%";
  });
  window.addEventListener("mouseup", function () {
    dragging = false;
    document.body.style.cursor = "";
  });
})();
