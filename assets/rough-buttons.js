(function () {
  "use strict";

  /* ============================================================
     ROUGH BUTTON BORDERS
     Replaces the CSS box-shadow "fake sketch" border on .btn
     elements with an actual hand-drawn SVG stroke via rough.js —
     genuinely irregular, hand-inked lines instead of a static
     approximation. Redraws on resize so it stays crisp.
     ============================================================ */

  if (typeof window.rough === "undefined") return;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function styleVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name);
    return v && v.trim() ? v.trim() : fallback;
  }

  function drawRoughBorder(btn) {
    var existing = btn.querySelector(".rough-btn-svg");
    if (existing) existing.remove();

    var w = btn.offsetWidth;
    var h = btn.offsetHeight;
    if (!w || !h) return;

    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "rough-btn-svg");
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);

    var rc = window.rough.svg(svg);
    var stroke = styleVar("--border", "#2d2d2d");
    var pad = 3;

    var node = rc.rectangle(pad, pad, w - pad * 2, h - pad * 2, {
      roughness: 2.1,
      bowing: 1.4,
      stroke: stroke,
      strokeWidth: 2.4,
      fill: "none",
    });
    svg.appendChild(node);
    btn.insertBefore(svg, btn.firstChild);
  }

  function drawAll() {
    document.querySelectorAll(".btn").forEach(function (btn) {
      if (getComputedStyle(btn).display === "none") return;
      drawRoughBorder(btn);
    });
  }

  function init() {
    document.querySelectorAll(".btn").forEach(function (btn) {
      btn.classList.add("rough-btn");
    });
    drawAll();

    var resizeTimer = null;
    window.addEventListener(
      "resize",
      function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(drawAll, 150);
      },
      { passive: true }
    );

    // fonts loading late can shift button widths — redraw once settled
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(drawAll);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
