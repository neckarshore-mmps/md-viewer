/* mdv-split-view — shared divider/tab controller for both build targets.
   Self-initializes on load by DOM query. Desktop: drag the divider to resize.
   (Edge-collapse, double-click reset, keyboard a11y and mobile tabs are layered
   on in later tasks.) ES5-only to match the codebase. */
(function () {
  var split = document.querySelector(".split");
  var divider = document.getElementById("divider");
  var left = document.querySelector(".pane.left");
  if (!split || !divider || !left) return;

  var pct = 50;
  function render(p) {
    p = Math.max(15, Math.min(85, p));       // baseline clamp (Task 2 removes it)
    pct = p;
    left.style.flex = "0 0 " + p + "%";
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

  render(50);
})();
