(function () {
  "use strict";

  /* ============================================================
     HERO SPLINE BACKGROUND — scroll fade + full teardown
     The live Spline scene stays running and fully interactive
     while the hero is on screen (mouse hover still drives its own
     animation). Once the hero scrolls out of view we don't just
     fade it visually — we remove the <spline-viewer> from the DOM
     entirely, which stops its WebGL render loop from consuming
     GPU/CPU for the rest of the page. It's recreated if the user
     scrolls back up to the hero.
     ============================================================ */

  var heroSplineBg = document.getElementById("heroSplineBg");
  if (!heroSplineBg) return;

  var heroEl = document.getElementById("top");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var viewerEl = heroSplineBg.querySelector("spline-viewer");
  var viewerTemplate = viewerEl ? viewerEl.cloneNode(true) : null;
  var viewerMounted = !!viewerEl;

  function mountViewer() {
    if (viewerMounted || !viewerTemplate) return;
    var fresh = viewerTemplate.cloneNode(true);
    heroSplineBg.insertBefore(fresh, heroSplineBg.firstChild);
    viewerMounted = true;
  }

  function unmountViewer() {
    if (!viewerMounted) return;
    var current = heroSplineBg.querySelector("spline-viewer");
    if (current) current.remove();
    viewerMounted = false;
  }

  // Fully stop rendering once the hero is well out of view.
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            mountViewer();
          } else {
            unmountViewer();
          }
        });
      },
      { root: null, rootMargin: "200px 0px", threshold: 0 }
    );
    if (heroEl) observer.observe(heroEl);
  }

  var ticking = false;
  function update() {
    ticking = false;
    var heroHeight = heroEl ? heroEl.offsetHeight : window.innerHeight;
    var progress = Math.min(1, Math.max(0, window.scrollY / (heroHeight * 0.8)));
    heroSplineBg.style.opacity = (1 - progress).toFixed(3);
    // once fully faded, stop it from intercepting mouse events entirely
    heroSplineBg.style.pointerEvents = progress >= 1 ? "none" : "";
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  if (reducedMotion) {
    update();
    return;
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  update();

  /* ============================================================
     CUSTOM CURSOR GLOW — zero-lag, tracks the real cursor directly
     Independent of the Spline scene's own baked-in follow light
     (which has an unadjustable delay). This one is positioned every
     frame from the actual mouse coordinates, so it sits right under
     the cursor with no perceptible offset.
     ============================================================ */
  var glow = document.getElementById("heroCursorGlow");
  if (glow && heroEl) {
    var glowTarget = { x: 0, y: 0 };
    var glowTicking = false;
    var glowActive = false;

    function positionGlow() {
      glowTicking = false;
      glow.style.transform =
        "translate3d(" + glowTarget.x + "px," + glowTarget.y + "px,0)";
    }

    function onHeroMouseMove(e) {
      var rect = heroEl.getBoundingClientRect();
      glowTarget.x = e.clientX - rect.left;
      glowTarget.y = e.clientY - rect.top;
      if (!glowActive) {
        glowActive = true;
        glow.classList.add("is-active");
      }
      if (!glowTicking) {
        glowTicking = true;
        requestAnimationFrame(positionGlow);
      }
    }

    function onHeroMouseLeave() {
      glowActive = false;
      glow.classList.remove("is-active");
    }

    if (!reducedMotion) {
      heroEl.addEventListener("mousemove", onHeroMouseMove, { passive: true });
      heroEl.addEventListener("mouseleave", onHeroMouseLeave, { passive: true });
    }
  }

  /* ============================================================
     ROUGH.JS HAND-SKETCHED CURSOR RING
     Uses the rough.js library (loaded via CDN) to draw a genuinely
     wobbly, hand-drawn circle around the cursor glow — redrawn every
     ~150ms with fresh randomized roughness so it reads as sketched
     motion rather than a static shape. Position tracks the same
     coordinates as the glow, updated every frame via rAF (cheap CSS
     transform); only the shape itself regenerates on an interval.
     ============================================================ */
  var sketchEl = document.getElementById("heroCursorSketch");
  if (sketchEl && heroEl && typeof window.rough !== "undefined" && !reducedMotion) {
    var svgNS = "http://www.w3.org/2000/svg";
    var sketchSvg = document.createElementNS(svgNS, "svg");
    sketchSvg.setAttribute("width", "170");
    sketchSvg.setAttribute("height", "170");
    sketchSvg.setAttribute("viewBox", "0 0 170 170");
    sketchEl.appendChild(sketchSvg);
    var rc = window.rough.svg(sketchSvg);

    function redrawSketchRing() {
      while (sketchSvg.firstChild) sketchSvg.removeChild(sketchSvg.firstChild);
      var node = rc.circle(85, 85, 118, {
        stroke: "#ff5cc8",
        strokeWidth: 2,
        roughness: 2.4,
        bowing: 2.5,
        seed: Math.floor(Math.random() * 1000),
      });
      sketchSvg.appendChild(node);
    }

    var sketchTarget = { x: 0, y: 0 };
    var sketchTicking = false;
    var sketchInterval = null;

    function positionSketch() {
      sketchTicking = false;
      sketchEl.style.transform =
        "translate3d(" + sketchTarget.x + "px," + sketchTarget.y + "px,0)";
    }

    function onSketchMouseMove(e) {
      var rect = heroEl.getBoundingClientRect();
      sketchTarget.x = e.clientX - rect.left;
      sketchTarget.y = e.clientY - rect.top;
      if (!sketchInterval) {
        sketchEl.classList.add("is-active");
        redrawSketchRing();
        sketchInterval = setInterval(redrawSketchRing, 150);
      }
      if (!sketchTicking) {
        sketchTicking = true;
        requestAnimationFrame(positionSketch);
      }
    }

    function onSketchMouseLeave() {
      sketchEl.classList.remove("is-active");
      if (sketchInterval) {
        clearInterval(sketchInterval);
        sketchInterval = null;
      }
    }

    heroEl.addEventListener("mousemove", onSketchMouseMove, { passive: true });
    heroEl.addEventListener("mouseleave", onSketchMouseLeave, { passive: true });
  }
})();
