/* mdv-web-shared: chrome behaviour shared by web/index.html and web/compare.html.
   Light/dark mode (stored as mdv-mode) and the footer build SHA fallback.
   ES5 only, to match the codebase. */
(function () {
  var root = document.documentElement;

  // Inline Material icons (dark_mode / light_mode): offline, colour via currentColor.
  var MOON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>';
  var SUN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/></svg>';

  // Wire the light/dark button: sync it to the mode the no-FOUC head script set,
  // then flip on click. The choice persists across both pages.
  function initMode(btn) {
    if (!btn) return;
    var icon = btn.querySelector(".mode-icon");
    var label = btn.querySelector(".mode-label");
    function apply(m) {
      if (m !== "light" && m !== "dark") m = "light";
      root.setAttribute("data-mode", m);
      try { localStorage.setItem("mdv-mode", m); } catch (e) {}
      icon.innerHTML = m === "dark" ? MOON : SUN;
      label.textContent = m === "dark" ? "Dark" : "Light";
    }
    apply(root.getAttribute("data-mode") || "light");
    btn.addEventListener("click", function () {
      apply(root.getAttribute("data-mode") === "dark" ? "light" : "dark");
    });
  }

  // Footer build SHA is stamped in at DEPLOY time: Vercel seds the __COMMIT_SHA__
  // tokens (AD-42 section 6: the true build-env SHA, never the changelog's). On a
  // local or non-deployed build the tokens survive, so show "dev" and point the
  // link at the commit history instead of a bogus commit URL.
  function initFooterSha() {
    var link = document.getElementById("verSha");
    if (!link) return;
    var code = link.querySelector("code");
    var sha = code ? code.textContent.trim() : "";
    if (!/^[0-9a-f]{7,40}$/.test(sha)) {
      if (code) code.textContent = "dev";
      link.setAttribute("href", "https://github.com/neckarshore-mmps/md-viewer/commits/main");
    }
  }

  window.MdvShared = { initMode: initMode, initFooterSha: initFooterSha };
})();
