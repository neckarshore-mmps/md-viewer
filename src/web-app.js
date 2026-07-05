/* md-viewer web app — theme system, README default, open/paste/drop, responsive.
   Placeholder __README_B64__ is replaced with the repo README at build time. */
(function () {
  var README_B64 = "__README_B64__";

  var split = document.getElementById("split");
  var rendered = document.getElementById("rendered");
  var codeEl = document.getElementById("rawcode");
  var filename = document.getElementById("filename");
  var overlay = document.getElementById("dropOverlay");
  var fileInput = document.getElementById("file");
  var root = document.documentElement;

  if (window.marked) marked.setOptions({ gfm: true, breaks: false });

  function b64ToUtf8(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  var README = b64ToUtf8(README_B64);

  // ─── Rendering ─────────────────────────────────────────────
  function render(md, name) {
    filename.textContent = name || "Markdown";
    document.title = (name ? name + " — " : "") + "Markdown Viewer";
    var html = window.marked ? marked.parse(md) : md;
    if (window.DOMPurify) html = DOMPurify.sanitize(html);
    rendered.innerHTML = html;
    if (window.hljs) {
      codeEl.innerHTML = hljs.highlight(md, { language: "markdown" }).value;
    } else {
      codeEl.textContent = md;
    }
    split.scrollTop = 0;
  }

  function openFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () { render(String(reader.result), file.name); };
    reader.readAsText(file, "utf-8");
  }

  // ─── Open dialog (Downloads default + remembered folder) ────
  async function openViaDialog() {
    if (window.showOpenFilePicker) {
      try {
        var handles = await window.showOpenFilePicker({
          id: "md-viewer", startIn: "downloads", multiple: false,
          types: [{ description: "Markdown", accept: {
            "text/markdown": [".md", ".markdown", ".mdown", ".mkd", ".mdx"],
            "text/plain": [".txt"]
          } }]
        });
        openFile(await handles[0].getFile());
      } catch (err) {
        if (err && err.name !== "AbortError") fileInput.click();
      }
    } else {
      fileInput.click();
    }
  }
  document.getElementById("open").addEventListener("click", openViaDialog);
  fileInput.addEventListener("change", function (e) {
    if (e.target.files && e.target.files[0]) openFile(e.target.files[0]);
  });

  // readme.md button + default document
  document.getElementById("readme").addEventListener("click", function () {
    render(README, "README.md");
  });

  // ─── Drag & drop ───────────────────────────────────────────
  var dragDepth = 0;
  window.addEventListener("dragenter", function (e) { e.preventDefault(); dragDepth++; overlay.classList.add("active"); });
  window.addEventListener("dragover", function (e) { e.preventDefault(); });
  window.addEventListener("dragleave", function (e) { e.preventDefault(); if (--dragDepth <= 0) { dragDepth = 0; overlay.classList.remove("active"); } });
  window.addEventListener("drop", function (e) {
    e.preventDefault(); dragDepth = 0; overlay.classList.remove("active");
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) openFile(e.dataTransfer.files[0]);
  });

  // ─── Paste ─────────────────────────────────────────────────
  window.addEventListener("paste", function (e) {
    var text = e.clipboardData && e.clipboardData.getData("text/plain");
    if (text && text.trim()) { render(text, "Pasted.md"); e.preventDefault(); }
  });

  // ─── Theme + light/dark ────────────────────────────────────
  var THEMES = ["minimalist", "swiss", "brutalist"];
  var swatches = Array.prototype.slice.call(document.querySelectorAll(".tsw"));
  var modeBtn = document.getElementById("mode");
  var modeIcon = modeBtn.querySelector(".mode-icon");
  var modeLabel = modeBtn.querySelector(".mode-label");

  function applyTheme(t) {
    if (THEMES.indexOf(t) < 0) t = "swiss";
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("mdv-theme", t); } catch (e) {}
    swatches.forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-theme") === t); });
  }
  function applyMode(m) {
    if (m !== "light" && m !== "dark") m = "light";
    root.setAttribute("data-mode", m);
    try { localStorage.setItem("mdv-mode", m); } catch (e) {}
    modeIcon.textContent = m === "dark" ? "☾" : "☀";
    modeLabel.textContent = m === "dark" ? "Dark" : "Light";
  }
  // Sync UI to the attributes the no-FOUC head script already set.
  applyTheme(root.getAttribute("data-theme") || "swiss");
  applyMode(root.getAttribute("data-mode") || "light");

  swatches.forEach(function (b) {
    b.addEventListener("click", function () { applyTheme(b.getAttribute("data-theme")); });
  });
  modeBtn.addEventListener("click", function () {
    applyMode(root.getAttribute("data-mode") === "dark" ? "light" : "dark");
  });

  // ─── Draggable divider (axis-aware: horizontal desktop, vertical mobile) ──
  var divider = document.getElementById("divider");
  var left = document.querySelector(".pane.left");
  var mq = window.matchMedia("(max-width: 640px)");
  var dragging = false;

  divider.addEventListener("pointerdown", function (e) {
    dragging = true; divider.setPointerCapture(e.pointerId);
    document.body.style.cursor = mq.matches ? "row-resize" : "col-resize";
    e.preventDefault();
  });
  divider.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var rect = split.getBoundingClientRect();
    var pct = mq.matches
      ? ((e.clientY - rect.top) / rect.height) * 100
      : ((e.clientX - rect.left) / rect.width) * 100;
    pct = Math.max(15, Math.min(85, pct));
    left.style.flex = "0 0 " + pct + "%";
  });
  divider.addEventListener("pointerup", function (e) {
    dragging = false; document.body.style.cursor = "";
    try { divider.releasePointerCapture(e.pointerId); } catch (err) {}
  });

  // ─── Initial document = repo README ────────────────────────
  render(README, "README.md");
})();
