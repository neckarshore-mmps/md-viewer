/* mdv-split-view — shared divider/tab controller for both build targets.
   Self-initializes on load by DOM query. Desktop: drag the divider to resize.
   (Edge-collapse, double-click reset, keyboard a11y and mobile tabs are layered
   on in later tasks.) ES5-only to match the codebase. */
(function () {
  var split = document.querySelector(".split");
  var divider = document.getElementById("divider");
  var left = document.querySelector(".pane.left");
  if (!split || !divider || !left) return;

  var SNAP = 6;
  // Divider widths — must match --divider-w (6px) and .divider.edge flex-basis
  // (8px) in both layout.css and web-chrome.css.
  var DIVIDER_W = 6;
  var DIVIDER_W_EDGE = 8;
  var pct = 50;
  function render(p, noSnap) {
    p = Math.max(0, Math.min(100, p));
    if (!noSnap) { if (p < SNAP) p = 0; else if (p > 100 - SNAP) p = 100; }
    pct = p;
    var edge = p === 0 || p === 100;
    // Reserve the divider's own width from the left pane so the total never
    // exceeds 100%. Without this, p=100 sets left to 100% and the divider (its
    // 8px edge width) overflows off the right edge — invisible + ungrabbable,
    // so the collapsed pane can't be restored — while p=0 keeps it visible. The
    // proportional reserve keeps the divider inside the container at BOTH edges.
    var dw = edge ? DIVIDER_W_EDGE : DIVIDER_W;
    left.style.flex = "0 0 calc(" + p + "% - " + (p / 100 * dw) + "px)";
    divider.classList.toggle("edge", edge);
    divider.setAttribute("aria-valuenow", String(Math.round(p)));
  }

  var dragging = false;
  divider.addEventListener("pointerdown", function (e) {
    dragging = true;
    try { divider.setPointerCapture(e.pointerId); } catch (err) {}
    document.body.style.cursor = "col-resize";
    e.preventDefault();
  });
  divider.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var rect = split.getBoundingClientRect();
    render(((e.clientX - rect.left) / rect.width) * 100);
  });
  divider.addEventListener("pointerup", function (e) {
    dragging = false;
    document.body.style.cursor = "";
    try { divider.releasePointerCapture(e.pointerId); } catch (err) {}
  });

  divider.addEventListener("dblclick", function () { render(50); });

  divider.addEventListener("keydown", function (e) {
    var k = e.key;
    if (k === "ArrowLeft") render(pct - 2, true);
    else if (k === "ArrowRight") render(pct + 2, true);
    else if (k === "Home") render(0);
    else if (k === "End") render(100);
    else if (k === "Enter" || k === " ") render(50);
    else return;
    e.preventDefault();
  });

  // Mobile tabs — toggle which pane shows below the breakpoint. On desktop the
  // .viewtabs element is display:none, so these handlers simply never fire.
  var tabs = document.querySelectorAll(".viewtab");
  function showView(view) {
    split.classList.toggle("show-rendered", view === "rendered");
    split.classList.toggle("show-raw", view === "raw");
    for (var i = 0; i < tabs.length; i++) {
      var on = tabs[i].getAttribute("data-view") === view;
      tabs[i].setAttribute("aria-selected", on ? "true" : "false");
      tabs[i].setAttribute("tabindex", on ? "0" : "-1");
    }
  }
  for (var t = 0; t < tabs.length; t++) {
    tabs[t].addEventListener("click", function () { showView(this.getAttribute("data-view")); });
  }
  showView("rendered");   // default

  render(50);
})();
