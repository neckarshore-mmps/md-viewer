/* md-viewer web app — interactive browser viewer.
   Load a .md via file picker, drag-and-drop, or paste, then show the split view
   (rendered left, syntax-highlighted source right). Fully client-side. */
(function () {
  var empty = document.getElementById("empty");
  var split = document.getElementById("split");
  var rendered = document.getElementById("rendered");
  var codeEl = document.getElementById("rawcode");
  var filename = document.getElementById("filename");
  var overlay = document.getElementById("dropOverlay");

  if (window.marked) marked.setOptions({ gfm: true, breaks: false });

  function render(md, name) {
    filename.textContent = name || "Markdown";
    document.title = (name ? name + " — " : "") + "Markdown Viewer";

    // Left: rendered + sanitized.
    var html = window.marked ? marked.parse(md) : md;
    if (window.DOMPurify) html = DOMPurify.sanitize(html);
    rendered.innerHTML = html;

    // Right: syntax-highlighted source (hljs.highlight escapes HTML → safe).
    if (window.hljs) {
      codeEl.innerHTML = hljs.highlight(md, { language: "markdown" }).value;
    } else {
      codeEl.textContent = md;
    }

    empty.hidden = true;
    split.hidden = false;
  }

  function openFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () { render(String(reader.result), file.name); };
    reader.readAsText(file, "utf-8");
  }

  // File picker
  document.getElementById("file").addEventListener("change", function (e) {
    if (e.target.files && e.target.files[0]) openFile(e.target.files[0]);
  });

  // Drag and drop (anywhere on the window)
  var dragDepth = 0;
  window.addEventListener("dragenter", function (e) {
    e.preventDefault(); dragDepth++; overlay.classList.add("active");
  });
  window.addEventListener("dragover", function (e) { e.preventDefault(); });
  window.addEventListener("dragleave", function (e) {
    e.preventDefault(); if (--dragDepth <= 0) { dragDepth = 0; overlay.classList.remove("active"); }
  });
  window.addEventListener("drop", function (e) {
    e.preventDefault(); dragDepth = 0; overlay.classList.remove("active");
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      openFile(e.dataTransfer.files[0]);
    }
  });

  // Paste markdown text
  window.addEventListener("paste", function (e) {
    var text = e.clipboardData && e.clipboardData.getData("text/plain");
    if (text && text.trim()) { render(text, "Pasted.md"); e.preventDefault(); }
  });

  // Sample button
  document.getElementById("sample").addEventListener("click", function () {
    render(SAMPLE_MD, "sample.md");
  });

  // Draggable divider
  var divider = document.getElementById("divider");
  var left = document.querySelector(".pane.left");
  var dragging = false;
  divider.addEventListener("mousedown", function (e) {
    dragging = true; document.body.style.cursor = "col-resize"; e.preventDefault();
  });
  window.addEventListener("mousemove", function (e) {
    if (!dragging) return;
    var rect = split.getBoundingClientRect();
    var pct = ((e.clientX - rect.left) / rect.width) * 100;
    pct = Math.max(15, Math.min(85, pct));
    left.style.flex = "0 0 " + pct + "%";
  });
  window.addEventListener("mouseup", function () {
    dragging = false; document.body.style.cursor = "";
  });

  var SAMPLE_MD = [
    "# Markdown Viewer",
    "",
    "A **fast** way to read `.md` files — rendered on the left, *raw source* on the right.",
    "",
    "## Features",
    "",
    "- Drag & drop a file",
    "- Paste Markdown with ⌘V",
    "  - Nested bullets work too",
    "- Syntax-highlighted source",
    "",
    "1. Rendered view",
    "2. Raw view",
    "",
    "> Everything runs in your browser — nothing is uploaded.",
    "",
    "```js",
    "const greet = (name) => `Hello, ${name}!`;",
    "console.log(greet('Markdown'));",
    "```",
    "",
    "| Pane | Content |",
    "|------|---------|",
    "| Left | Rendered |",
    "| Right | Source |",
    "",
    "[Back to neckarshore.ai](https://neckarshore.ai) · Ümlauts & emoji 🚀 render fine.",
    ""
  ].join("\n");
})();
