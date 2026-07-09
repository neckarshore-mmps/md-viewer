/* md-viewer app logic — decode base64 payload, render both panes, drag divider.
   Placeholders __MD_BASE64__ and __MD_FILENAME_B64__ are replaced by bin/mdview. */
(function () {
  var MD_B64 = "__MD_BASE64__";
  var NAME_B64 = "__MD_FILENAME_B64__";
  var BASEDIR_B64 = "__MD_BASEDIR_B64__";
  var ROOT_B64 = "__MD_ROOT_B64__";

  function b64ToUtf8(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  var md = b64ToUtf8(MD_B64);
  var name = b64ToUtf8(NAME_B64);
  var baseDir = b64ToUtf8(BASEDIR_B64);
  var containRoot = b64ToUtf8(ROOT_B64);

  document.title = name;
  document.getElementById("filename").textContent = name;

  // Split leading YAML frontmatter (Obsidian/Jekyll/Hugo "Properties") off the
  // body so marked doesn't render the raw --- block as a giant heading.
  var fm = splitFrontmatter(md);

  // Left: rendered markdown (sanitized with DOMPurify to neutralize any
  // embedded scripts/handlers in untrusted .md files before injection).
  var rendered = document.getElementById("rendered");
  if (window.marked) {
    marked.setOptions({ gfm: true, breaks: false });
    var html = marked.parse(fm.body);
    if (window.DOMPurify) html = DOMPurify.sanitize(html);
    rendered.innerHTML = html;
    // Rewrite relative image/link URLs AFTER sanitize: the file lives in a temp
    // dir, so relative refs must point back at the source dir. Done post-DOMPurify
    // because DOMPurify strips file:// URIs; here we set them via setAttribute on
    // an already-sanitized tree (a file:// image src cannot execute script).
    rewriteRelativeUrls(rendered, baseDir, containRoot);
  } else {
    rendered.textContent = fm.body;
  }
  // Properties panel is built from DOM nodes (textContent only) — no HTML from
  // the file reaches innerHTML, so it stays XSS-safe without DOMPurify.
  if (fm.props && fm.props.length) {
    rendered.insertBefore(buildPropsPanel(fm.props), rendered.firstChild);
  }

  // Right: raw markdown with syntax highlighting
  var codeEl = document.getElementById("rawcode");
  codeEl.textContent = md;
  if (window.hljs) {
    try { hljs.highlightElement(codeEl); } catch (e) { /* fall back to plain text */ }
  }

  // Divider drag + mobile tabs now live in the shared src/split-view.js module.

  // ─── Relative URL rewriting (Finder tool only — needs a source dir) ────────
  // Walk the rendered tree and repoint relative <img src> / <a href> at the
  // real source directory so images and local links resolve instead of 404ing
  // against the temp dir the viewer HTML lives in.
  function rewriteRelativeUrls(container, dir, root) {
    if (!dir) return;
    var imgs = container.querySelectorAll("img[src]");
    for (var i = 0; i < imgs.length; i++) {
      imgs[i].setAttribute("src", resolveRelativeUrl(imgs[i].getAttribute("src"), dir, root));
    }
    var links = container.querySelectorAll("a[href]");
    for (var j = 0; j < links.length; j++) {
      links[j].setAttribute("href", resolveRelativeUrl(links[j].getAttribute("href"), dir, root));
    }
  }
  // Pure resolver (mirrored in test/url-resolve.test.mjs — keep in sync).
  // Leaves in-page anchors (#…), scheme URIs (http:, https:, data:, mailto:,
  // file:, …) and protocol-relative (//…) URLs untouched; turns everything else
  // into a file:// absolute URL resolved against baseDir. Any path that escapes
  // `root` (home dir / file dir) is left UNRESOLVED — an untrusted .md must not
  // turn `../../../etc/hosts` into a live file:// URL to an arbitrary local file.
  function resolveRelativeUrl(url, baseDir, root) {
    if (!url) return url;
    var u = url;
    if (u.charAt(0) === "#") return url;
    if (/^[a-zA-Z][a-zA-Z0-9+.\-]*:/.test(u)) return url;
    if (u.slice(0, 2) === "//") return url;
    // Peel off ?query / #fragment; resolve only the path, then re-append.
    var suffix = "";
    var h = u.indexOf("#");
    if (h !== -1) { suffix = u.slice(h) + suffix; u = u.slice(0, h); }
    var q = u.indexOf("?");
    if (q !== -1) { suffix = u.slice(q) + suffix; u = u.slice(0, q); }
    if (!u) return url; // was a pure ?query/#fragment — leave it alone
    var raw = u;
    try { raw = decodeURI(u); } catch (e) { raw = u; } // idempotent re-encode below
    var path = normalizePath(raw.charAt(0) === "/" ? raw : baseDir + "/" + raw);
    if (root && !isUnder(path, root)) return url; // escaped containment → leave as-is
    return "file://" + encodeURI(path) + suffix;
  }
  // True when `path` is `root` itself or a descendant of it.
  function isUnder(path, root) {
    var r = root.replace(/\/+$/, "");
    return path === r || path.indexOf(r + "/") === 0;
  }
  // Collapse "." and ".." segments of an absolute POSIX path.
  function normalizePath(p) {
    var parts = p.split("/"), out = [];
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i];
      if (seg === "" || seg === ".") continue;
      if (seg === "..") { out.pop(); continue; }
      out.push(seg);
    }
    return "/" + out.join("/");
  }

  // ─── YAML frontmatter (shared with web-app.js — keep in sync) ──────────────
  function stripQuotes(s) {
    if (s.length >= 2) {
      var a = s.charAt(0), b = s.charAt(s.length - 1);
      if ((a === '"' && b === '"') || (a === "'" && b === "'")) return s.slice(1, -1);
    }
    return s;
  }
  // Returns { props: [{key, value|null, items|null}], body } or props:null when
  // the document has no leading frontmatter block. Only a bare "---" on line 1
  // followed by a closing "---" line counts (Obsidian/Jekyll convention).
  function splitFrontmatter(md) {
    var m = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(md);
    if (!m) return { props: null, body: md };
    return { props: parseFlatYaml(m[1]), body: md.slice(m[0].length) };
  }
  // Deliberately flat: handles key:value, block lists (key: then "- item"),
  // and inline lists (key: [a, b]). Nested maps fall back to a raw string.
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
    // Block-list keys that never got an item collapse to an empty scalar.
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
})();
