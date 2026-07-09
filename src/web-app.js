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
  var CHANGELOG = b64ToUtf8("__CHANGELOG_B64__");

  // ─── Rendering ─────────────────────────────────────────────
  function render(md, name) {
    filename.textContent = name || "Markdown";
    document.title = (name ? name + " — " : "") + "Markdown Viewer";
    // Split leading YAML frontmatter off so marked doesn't render the raw
    // --- block as a heading; the raw pane still shows the full source.
    var fm = splitFrontmatter(md);
    var html = window.marked ? marked.parse(fm.body) : fm.body;
    if (window.DOMPurify) html = DOMPurify.sanitize(html);
    rendered.innerHTML = html;
    if (fm.props && fm.props.length) {
      rendered.insertBefore(buildPropsPanel(fm.props), rendered.firstChild);
    }
    if (window.hljs) {
      codeEl.innerHTML = hljs.highlight(md, { language: "markdown" }).value;
    } else {
      codeEl.textContent = md;
    }
    split.scrollTop = 0;
  }

  // ─── YAML frontmatter (shared with app.js — keep in sync) ──────────────────
  function stripQuotes(s) {
    if (s.length >= 2) {
      var a = s.charAt(0), b = s.charAt(s.length - 1);
      if ((a === '"' && b === '"') || (a === "'" && b === "'")) return s.slice(1, -1);
    }
    return s;
  }
  function splitFrontmatter(md) {
    var m = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(md);
    if (!m) return { props: null, body: md };
    return { props: parseFlatYaml(m[1]), body: md.slice(m[0].length) };
  }
  function parseFlatYaml(src) {
    var lines = src.split(/\r?\n/), out = [], cur = null;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line.trim()) continue;
      var li = /^[ \t]*-[ \t]+(.*)$/.exec(line);
      if (li && cur && cur.items) { cur.items.push(stripQuotes(li[1].trim())); continue; }
      var kv = /^([^:\s][^:]*):[ \t]*(.*)$/.exec(line);
      if (!kv) continue;
      var key = kv[1].trim(), val = kv[2].trim();
      if (val === "") { cur = { key: key, value: null, items: [] }; out.push(cur); continue; }
      cur = null;
      var inline = /^\[(.*)\]$/.exec(val);
      if (inline) {
        out.push({ key: key, value: null, items: inline[1].split(",").map(function (s) { return stripQuotes(s.trim()); }).filter(Boolean) });
      } else {
        out.push({ key: key, value: stripQuotes(val), items: null });
      }
    }
    out.forEach(function (e) { if (e.items && e.items.length === 0) { e.items = null; e.value = ""; } });
    return out;
  }
  function buildPropsPanel(entries) {
    var panel = document.createElement("div");
    panel.className = "mdv-properties";
    var ci = 0; // running chip index -> deterministic colour variant (0..5)
    entries.forEach(function (e) {
      var row = document.createElement("div"); row.className = "mdv-prop";
      var k = document.createElement("span"); k.className = "mdv-prop-key"; k.textContent = e.key;
      var v = document.createElement("span"); v.className = "mdv-prop-val";
      if (e.items) {
        e.items.forEach(function (it) {
          var chip = document.createElement("span");
          chip.className = "mdv-prop-chip mdv-chip-" + (ci++ % 6);
          chip.textContent = it; v.appendChild(chip);
        });
      } else {
        v.textContent = e.value;
        if (e.value === "") v.classList.add("mdv-prop-empty");
      }
      row.appendChild(k); row.appendChild(v); panel.appendChild(row);
    });
    return panel;
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
  var modeIcon = modeBtn.querySelector(".mode-icon");
  var modeLabel = modeBtn.querySelector(".mode-label");

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

  // Light/dark toggle — flip the current mode on click.
  modeBtn.addEventListener("click", function () {
    applyMode(root.getAttribute("data-mode") === "dark" ? "light" : "dark");
  });

  // Dropdown open/close + keyboard typeahead
  var typed = "";
  function openMenu() { menuList.hidden = false; menuBtn.setAttribute("aria-expanded", "true"); typed = ""; }
  function closeMenu() { menuList.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); opts.forEach(function (o) { o.classList.remove("focus"); }); }
  function isOpen() { return !menuList.hidden; }

  menuBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    isOpen() ? closeMenu() : openMenu();
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
  var left = document.querySelector(".pane.left");
  var right = document.querySelector(".pane.right");
  var syncing = false;
  function syncFrom(src, dst) {
    if (syncing) return;
    var srcMax = src.scrollHeight - src.clientHeight;
    var dstMax = dst.scrollHeight - dst.clientHeight;
    if (srcMax <= 0 || dstMax <= 0) return;
    syncing = true;
    dst.scrollTop = (src.scrollTop / srcMax) * dstMax;
    requestAnimationFrame(function () { syncing = false; });
  }
  left.addEventListener("scroll", function () { syncFrom(left, right); });
  right.addEventListener("scroll", function () { syncFrom(right, left); });

  // ─── Initial document = repo README ────────────────────────
  render(README, "README.md");
})();
