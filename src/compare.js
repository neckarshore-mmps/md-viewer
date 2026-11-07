/* mdv-compare: the comparison view. One PDF on the left, two result panes on
   the right, each with a selector over every loaded result. Results render
   through the shared pipeline (src/render.js), so two results can only differ
   because their converters differ. Nothing leaves the browser.

   Generic by design: a result's label comes from its filename
   (<doc>.<label>.md), never from a list of known tools, so a new converter is
   one more file and no code change. ES5 only, to match the codebase. */
(function () {
  var cmp = document.getElementById("cmp");
  var filename = document.getElementById("filename");
  var fileInput = document.getElementById("cmpFiles");
  var openBtn = document.getElementById("cmpOpen");
  var singleBtn = document.getElementById("cmpSingle");
  var pdfName = document.getElementById("cmpPdfName");
  var pdfBody = document.getElementById("cmpPdfBody");
  var overlay = document.getElementById("dropOverlay");
  var panes = Array.prototype.slice.call(document.querySelectorAll(".cmp-result"));

  var state = {
    pdfStem: "",
    pdfUrl: null,
    results: [],               // { label, name, kind: "markdown" | "text", text }
    slots: [-1, -1],           // result index shown in pane 0 and pane 1
    views: ["rendered", "rendered"],
    single: false
  };

  MdvShared.initMode(document.getElementById("mode"));
  MdvShared.initFooterSha();

  // ─── File classification ───────────────────────────────────
  function isPdf(f) { return /\.pdf$/i.test(f.name) || f.type === "application/pdf"; }
  function isResult(f) { return /\.(md|markdown|txt)$/i.test(f.name); }
  function stem(name) { return name.replace(/\.[^.]+$/, ""); }

  // "report.docling.md" next to "report.pdf" -> "docling". Without a matching
  // PDF stem, the last dotted segment of the stem; else the stem itself.
  function labelFor(name) {
    var s = stem(name);
    if (state.pdfStem && s.indexOf(state.pdfStem + ".") === 0 && s.length > state.pdfStem.length + 1) {
      return s.slice(state.pdfStem.length + 1);
    }
    var dot = s.lastIndexOf(".");
    return dot > 0 && dot < s.length - 1 ? s.slice(dot + 1) : s;
  }

  // Visible text, ignoring whitespace and HTML comments (a converter that found
  // no text layer typically emits only "<!-- image -->" placeholders).
  function hasText(text) {
    return text.replace(/<!--[\s\S]*?-->/g, "").replace(/\s+/g, "") !== "";
  }

  function readText(file) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () { resolve({ file: file, text: String(reader.result) }); };
      reader.onerror = function () { resolve({ file: file, text: "" }); };
      reader.readAsText(file, "utf-8");
    });
  }

  // ─── Loading ───────────────────────────────────────────────
  function setPdf(file) {
    if (state.pdfUrl) URL.revokeObjectURL(state.pdfUrl);
    var blob = file.type === "application/pdf" ? file : new Blob([file], { type: "application/pdf" });
    state.pdfUrl = URL.createObjectURL(blob);
    state.pdfStem = stem(file.name);
    state.results = [];
    state.slots = [-1, -1];
    pdfName.textContent = file.name;
    pdfName.title = file.name;
    filename.textContent = file.name;
    document.title = file.name + " · Compare";
    var frame = document.createElement("iframe");
    frame.className = "cmp-frame";
    frame.title = "PDF: " + file.name;
    frame.src = state.pdfUrl;
    pdfBody.textContent = "";
    pdfBody.appendChild(frame);
  }

  function addResult(file, text) {
    var label = labelFor(file.name);
    var kind = /\.txt$/i.test(file.name) ? "text" : "markdown";
    for (var i = 0; i < state.results.length; i++) {
      if (state.results[i].name === file.name) {   // same file again: replace it
        state.results[i] = { label: state.results[i].label, name: file.name, kind: kind, text: text };
        return;
      }
    }
    var taken = state.results.map(function (r) { return r.label; });
    var unique = label, n = 2;
    while (taken.indexOf(unique) >= 0) unique = label + " (" + n++ + ")";
    state.results.push({ label: unique, name: file.name, kind: kind, text: text });
  }

  function handleFiles(list) {
    var files = Array.prototype.slice.call(list || []);
    var pdf = files.filter(isPdf)[0];
    var results = files.filter(isResult);
    if (!pdf && !results.length) return;
    if (pdf) setPdf(pdf);                           // a new PDF starts a new set
    Promise.all(results.map(readText)).then(function (read) {
      read.forEach(function (r) { addResult(r.file, r.text); });
      var count = state.results.length;
      // Keep valid choices; fill empty panes with the first unused results.
      state.slots = state.slots.map(function (s) { return s < count ? s : -1; });
      for (var p = 0; p < 2; p++) {
        if (state.slots[p] >= 0) continue;
        for (var i = 0; i < count; i++) {
          if (state.slots.indexOf(i) < 0) { state.slots[p] = i; break; }
        }
      }
      renderAll();
    });
  }

  // ─── Rendering ─────────────────────────────────────────────
  function retargetLinks(el) {
    Array.prototype.forEach.call(el.querySelectorAll("a[href]"), function (a) {
      if (a.getAttribute("href").charAt(0) === "#") return;   // in-page anchors stay
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });
  }

  function fillSelect(sel, current) {
    sel.textContent = "";
    state.results.forEach(function (r, i) {
      var o = document.createElement("option");
      o.value = String(i);
      o.textContent = r.label;
      o.title = r.name;
      if (i === current) o.selected = true;
      sel.appendChild(o);
    });
    sel.disabled = state.results.length === 0;
  }

  function renderPane(p) {
    var pane = panes[p];
    var r = state.results[state.slots[p]];
    var view = state.views[p];
    var sel = pane.querySelector(".cmp-select");
    var kind = pane.querySelector(".cmp-kind");
    var none = pane.querySelector(".cmp-none");
    var empty = pane.querySelector(".cmp-empty");
    var art = pane.querySelector(".cmp-rendered");
    var src = pane.querySelector(".cmp-source");
    var code = src.querySelector("code");
    var body = pane.querySelector(".cmp-body");

    fillSelect(sel, state.slots[p]);
    Array.prototype.forEach.call(pane.querySelectorAll(".cmp-view"), function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-view") === view ? "true" : "false");
      b.disabled = !r;
    });
    none.hidden = !!r;
    kind.textContent = r ? (r.kind === "text" ? "plain text" : "Markdown") : "";
    sel.title = r ? r.name : "";
    if (!r) { empty.hidden = true; art.hidden = true; src.hidden = true; return; }

    var blank = !hasText(r.text);
    empty.hidden = !blank;
    art.hidden = blank || view !== "rendered";
    src.hidden = blank || view !== "source";
    if (blank) return;

    if (view === "rendered") {
      if (r.kind === "markdown") {
        MdvRender.renderInto(art, r.text);
        retargetLinks(art);
      } else {
        var pre = document.createElement("pre");
        pre.className = "cmp-plain";
        pre.textContent = r.text;
        art.textContent = "";
        art.appendChild(pre);
      }
    } else if (r.kind === "markdown") {
      MdvRender.highlightInto(code, r.text);
    } else {
      code.textContent = r.text;
    }
    body.scrollTop = 0;
  }

  function renderAll() {
    var count = state.results.length;
    singleBtn.disabled = count < 2;
    singleBtn.setAttribute("aria-pressed", state.single ? "true" : "false");
    // Empty: show the full layout. One result: PDF plus one pane by itself.
    cmp.classList.toggle("is-single", state.single || count === 1);
    renderPane(0);
    renderPane(1);
  }

  // ─── Controls ──────────────────────────────────────────────
  openBtn.addEventListener("click", function () { fileInput.click(); });
  fileInput.addEventListener("change", function (e) {
    handleFiles(e.target.files);
    fileInput.value = "";                           // same files can be chosen again
  });
  singleBtn.addEventListener("click", function () {
    state.single = !state.single;
    renderAll();
  });
  panes.forEach(function (pane, p) {
    pane.querySelector(".cmp-select").addEventListener("change", function (e) {
      state.slots[p] = Number(e.target.value);
      renderPane(p);
    });
    Array.prototype.forEach.call(pane.querySelectorAll(".cmp-view"), function (b) {
      b.addEventListener("click", function () {
        state.views[p] = b.getAttribute("data-view");
        renderPane(p);
      });
    });
  });

  // ─── Drag & drop (several files at once) ───────────────────
  var dragDepth = 0;
  window.addEventListener("dragenter", function (e) { e.preventDefault(); dragDepth++; overlay.classList.add("active"); });
  window.addEventListener("dragover", function (e) { e.preventDefault(); });
  window.addEventListener("dragleave", function (e) { e.preventDefault(); if (--dragDepth <= 0) { dragDepth = 0; overlay.classList.remove("active"); } });
  window.addEventListener("drop", function (e) {
    e.preventDefault(); dragDepth = 0; overlay.classList.remove("active");
    if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  });

  renderAll();

  // ─── Preloaded set (local "Compare" quick action) ──────────
  // `md-converter compare <pdf>` writes a local copy of this page with the PDF and its
  // results embedded as base64 in window.__MDV_COMPARE_FILES__ ([{name, b64}]). They go
  // through handleFiles like a drop would, so labels and panes behave identically.
  // The web app never sets this global; there it is a no-op.
  var preload = window.__MDV_COMPARE_FILES__;
  if (Array.isArray(preload) && preload.length) {
    try {
      handleFiles(preload.map(function (f) {
        var bin = atob(f.b64), bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        var type = /\.pdf$/i.test(f.name) ? "application/pdf" : "text/plain";
        return new File([bytes], f.name, { type: type });
      }));
    } catch (err) {
      // Damaged embedded data: say so instead of leaving an empty page (Linus' review, #54).
      var note = document.createElement("p");
      note.className = "cmp-note cmp-preload-error";
      note.textContent = "The embedded files could not be read. Run md-converter compare again.";
      pdfBody.textContent = "";
      pdfBody.appendChild(note);
    }
  }
})();
