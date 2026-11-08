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

  function b64ToUtf8(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  var README = b64ToUtf8(README_B64);
  var CHANGELOG = b64ToUtf8("__CHANGELOG_B64__");
  var STYLE_GUIDE = b64ToUtf8("__STYLE_GUIDE_B64__");

  // ─── Rendering (shared pipeline: src/render.js) ─────────────
  function render(md, name) {
    filename.textContent = name || "Markdown";
    document.title = (name ? name + " — " : "") + "Markdown Viewer";
    MdvRender.renderInto(rendered, md);
    MdvRender.highlightInto(codeEl, md);
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

  // changelog (footer) — dogfooding: the release notes open in the viewer itself
  document.getElementById("changelog").addEventListener("click", function () {
    render(CHANGELOG, "CHANGELOG.md");
  });

  MdvShared.initFooterSha();

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
  var THEMES = ["minimalist", "swiss"];
  var LABELS = { minimalist: "Minimalist", swiss: "Swiss Grid" };
  var modeBtn = document.getElementById("mode");

  var menu = document.getElementById("themeMenu");
  var menuBtn = document.getElementById("themeMenuBtn");
  var menuList = document.getElementById("themeMenuList");
  var menuCurrent = menuBtn.querySelector(".theme-current");
  var opts = Array.prototype.slice.call(menuList.querySelectorAll(".theme-opt"));

  function applyTheme(t) {
    if (THEMES.indexOf(t) < 0) t = "swiss";
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("mdv-theme", t); } catch (e) {}
    menuCurrent.textContent = LABELS[t];
    opts.forEach(function (o) {
      var on = o.getAttribute("data-theme") === t;
      o.classList.toggle("active", on);
      o.setAttribute("aria-selected", on ? "true" : "false");
    });
  }
  // Sync UI to the attributes the no-FOUC head script already set.
  applyTheme(root.getAttribute("data-theme") || "swiss");
  // Light/dark: shared with the comparison view (src/web-shared.js).
  MdvShared.initMode(modeBtn);

  // Dropdown open/close + keyboard typeahead
  var typed = "";
  function openMenu() { menuList.hidden = false; menuBtn.setAttribute("aria-expanded", "true"); typed = ""; }
  function closeMenu() { menuList.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); opts.forEach(function (o) { o.classList.remove("focus"); }); }
  function isOpen() { return !menuList.hidden; }

  // Single click toggles the menu (instant). Two hidden gestures share the selector:
  // a DOUBLE click renders the Swiss Grid style guide as Markdown in the viewer; a
  // TRIPLE click opens the full HTML style-guide page (/style-guide). Disambiguated
  // via the native click-count (e.detail) with a short settle timer, so a triple never
  // first fires the double. Not linked, not searchable ("für mich, keiner soll suchen").
  var sgTimer = null;
  menuBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    isOpen() ? closeMenu() : openMenu();        // single click stays instant
    if (e.detail < 2) return;
    var clicks = e.detail;                       // 2 = double, 3+ = triple
    if (sgTimer) clearTimeout(sgTimer);
    sgTimer = setTimeout(function () {
      sgTimer = null;
      closeMenu();
      if (clicks >= 3) {
        window.location.href = "/style-guide";                 // triple → HTML page
      } else {
        applyTheme("swiss");
        render(STYLE_GUIDE, "style-guide.md");                 // double → Markdown demo
      }
    }, 260);
  });
  opts.forEach(function (o) {
    o.addEventListener("click", function () { applyTheme(o.getAttribute("data-theme")); closeMenu(); });
  });
  document.addEventListener("click", function (e) { if (isOpen() && !menu.contains(e.target)) closeMenu(); });
  document.addEventListener("keydown", function (e) {
    if (!isOpen()) return;
    if (e.key === "Escape") { closeMenu(); menuBtn.focus(); return; }
    if (e.key === "Enter") {
      var f = menuList.querySelector(".theme-opt.focus");
      if (f) { applyTheme(f.getAttribute("data-theme")); closeMenu(); }
      return;
    }
    if (/^[a-zA-Z]$/.test(e.key)) {
      typed += e.key.toLowerCase();
      var match = opts.filter(function (o) { return LABELS[o.getAttribute("data-theme")].toLowerCase().indexOf(typed) === 0; })[0]
               || opts.filter(function (o) { return LABELS[o.getAttribute("data-theme")].toLowerCase().indexOf(e.key.toLowerCase()) === 0; })[0];
      if (match) { opts.forEach(function (o) { o.classList.toggle("focus", o === match); }); }
      else { typed = ""; }
    }
  });

  // Divider drag + mobile tabs now live in the shared src/split-view.js module.

  // ─── Proportional scroll sync between the two panes ────────
  // Leader-lock: the pane the user is actively scrolling is the "leader" and
  // drives the other one-way. The follower's echoed scroll events (from setting
  // its scrollTop, and from trackpad momentum) are ignored until the leader goes
  // idle. A single `syncing` flag reset on the next animation frame was not
  // robust — under momentum the echo can arrive after the reset, so the follower
  // drove the leader back and the non-idempotent float→int round-trip made the
  // page drift/scroll by itself.
  var left = document.querySelector(".pane.left");
  var right = document.querySelector(".pane.right");
  var leader = null;      // the pane currently driving; null when idle
  var releaseTimer = null;
  var LEADER_HOLD_MS = 150;   // > one momentum-event gap, imperceptible to switch
  function syncFrom(src, dst) {
    // Ignore the follower entirely while the other pane holds the lead.
    if (leader && leader !== src) return;
    var srcMax = src.scrollHeight - src.clientHeight;
    var dstMax = dst.scrollHeight - dst.clientHeight;
    if (srcMax <= 0 || dstMax <= 0) return;
    leader = src;
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(function () { leader = null; }, LEADER_HOLD_MS);
    dst.scrollTop = (src.scrollTop / srcMax) * dstMax;
  }
  left.addEventListener("scroll", function () { syncFrom(left, right); });
  right.addEventListener("scroll", function () { syncFrom(right, left); });

  // ─── Initial document = repo README ────────────────────────
  render(README, "README.md");
})();
