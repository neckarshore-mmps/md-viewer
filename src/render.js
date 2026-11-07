/* mdv-render: the one Markdown pipeline of the web build targets.
   web/index.html (the viewer) and web/compare.html (the comparison view) both
   render through this module, so two converter outputs can only differ because
   the converters differ, never because the renderer did.

   Pipeline: split YAML frontmatter off, marked (gfm) -> DOMPurify.sanitize.
   The Finder tool (src/app.js) keeps its own copy of the frontmatter helpers;
   keep the two in sync. ES5 only, to match the codebase. */
(function () {
  if (window.marked) marked.setOptions({ gfm: true, breaks: false });

  function stripQuotes(s) {
    if (s.length >= 2) {
      var a = s.charAt(0), b = s.charAt(s.length - 1);
      if ((a === '"' && b === '"') || (a === "'" && b === "'")) return s.slice(1, -1);
    }
    return s;
  }

  // Split leading YAML frontmatter off so marked doesn't render the raw
  // --- block as a heading; the source pane still shows the full text.
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

  // Render Markdown into a container element: sanitized HTML plus the
  // properties panel for frontmatter. The container is fully replaced.
  function renderInto(el, md) {
    var fm = splitFrontmatter(md);
    var html = window.marked ? marked.parse(fm.body) : fm.body;
    if (window.DOMPurify) html = DOMPurify.sanitize(html);
    el.innerHTML = html;
    if (fm.props && fm.props.length) el.insertBefore(buildPropsPanel(fm.props), el.firstChild);
  }

  // Syntax-highlighted Markdown source into a <code> element.
  function highlightInto(codeEl, md) {
    if (window.hljs) codeEl.innerHTML = hljs.highlight(md, { language: "markdown" }).value;
    else codeEl.textContent = md;
  }

  window.MdvRender = {
    splitFrontmatter: splitFrontmatter,
    renderInto: renderInto,
    highlightInto: highlightInto
  };
})();
