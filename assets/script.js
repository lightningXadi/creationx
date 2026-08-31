(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasAnime = typeof window.anime !== "undefined";

  /* ============================================================
     SCROLL REVEALS + SKETCH-DRAW-IN
     Uses anime.js when available for nicer easing + real SVG
     line-drawing; falls back to plain CSS transitions if the
     CDN script didn't load, so the site still works offline.
     ============================================================ */

  var revealEls = document.querySelectorAll(".reveal");

  // measure every sketch-path's real length so stroke-dasharray is exact
  document.querySelectorAll(".sketch-path").forEach(function (path) {
    try {
      var len = path.getTotalLength();
      path.style.setProperty("--len", len);
    } catch (e) { /* ignore non-path elements */ }
  });

  function revealEl(el, index) {
    var paths = el.querySelectorAll(".sketch-path");

    if (reducedMotion) {
      el.classList.add("in");
      paths.forEach(function (p) { p.style.strokeDashoffset = 0; });
      return;
    }

    if (hasAnime) {
      el.style.transition = "none";
      anime({
        targets: el,
        opacity: [0, 1],
        translateY: [28, 0],
        duration: 650,
        delay: (index % 4) * 70,
        easing: "easeOutCubic",
      });
      if (paths.length) {
        paths.forEach(function (p) { p.style.transition = "none"; });
        anime({
          targets: paths,
          strokeDashoffset: [anime.setDashoffset, 0],
          duration: 1100,
          delay: anime.stagger(120, { start: 150 }),
          easing: "easeInOutSine",
        });
      }
    } else {
      el.style.transitionDelay = (index % 4) * 0.06 + "s";
      el.classList.add("in");
    }
  }

  // hero doodles draw in immediately on load (not scroll-gated)
  (function drawHeroDoodles() {
    var heroPaths = document.querySelectorAll(".hero-doodle-layer .sketch-path");
    if (!heroPaths.length) return;
    if (reducedMotion) {
      heroPaths.forEach(function (p) { p.style.strokeDashoffset = 0; });
      return;
    }
    if (hasAnime) {
      heroPaths.forEach(function (p) { p.style.transition = "none"; });
      anime({
        targets: heroPaths,
        strokeDashoffset: [anime.setDashoffset, 0],
        duration: 1400,
        delay: anime.stagger(200, { start: 300 }),
        easing: "easeInOutSine",
      });
    } else {
      heroPaths.forEach(function (p) { p.classList.add("in"); });
    }
  })();

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var idx = Array.prototype.indexOf.call(revealEls, entry.target);
            revealEl(entry.target, idx);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el, i) { revealEl(el, i); });
  }

  /* ============================================================
     PARALLAX SCRIBBLES — continuous scroll-driven motion.
     Kept as direct scroll->transform mapping (anime.js is for
     tweens, not scroll-scrubbing, so plain rAF is the right tool).
     ============================================================ */

  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll(".parallax-el"));

  if (parallaxEls.length && !reducedMotion) {
    var pTicking = false;
    var onParallaxScroll = function () {
      if (pTicking) return;
      pTicking = true;
      requestAnimationFrame(function () {
        pTicking = false;
        var y = window.scrollY;
        parallaxEls.forEach(function (el) {
          var speed = parseFloat(el.getAttribute("data-speed")) || 0.1;
          var offset = y * speed;
          var rotate = (y * speed * 0.02).toFixed(2);
          var centered = el.getAttribute("data-centered") === "true";
          el.style.transform =
            (centered ? "translate(-50%,-50%) " : "") +
            "translateY(" + (-offset).toFixed(2) + "px) rotate(" + rotate + "deg)";
        });
      });
    };
    window.addEventListener("scroll", onParallaxScroll, { passive: true });
    onParallaxScroll();
  }

  /* ============================================================
     HOVER-ALIVE — cards, chips, buttons and headings nudge
     toward the cursor, then spring back with anime.js on
     mouse-out (a much nicer, bouncier settle than a CSS ease).
     ============================================================ */

  function addTilt(el, opts) {
    opts = opts || {};
    var maxDeg = opts.maxDeg != null ? opts.maxDeg : 5;
    var maxShift = opts.maxShift != null ? opts.maxShift : 5;
    var scale = opts.scale != null ? opts.scale : 1.015;

    el.addEventListener("mousemove", function (e) {
      if (hasAnime) anime.remove(el);
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transition = "transform 0.06s linear";
      el.style.transform =
        "translate(" + (px * maxShift).toFixed(2) + "px," + (py * maxShift).toFixed(2) + "px) " +
        "rotate(" + (px * maxDeg).toFixed(2) + "deg) scale(" + scale + ")";
    });

    el.addEventListener("mouseleave", function () {
      if (hasAnime) {
        el.style.transition = "none";
        anime({
          targets: el,
          translateX: 0,
          translateY: 0,
          rotate: 0,
          scale: 1,
          duration: 700,
          easing: "spring(1, 80, 10, 0)",
        });
      } else {
        el.style.transition = "transform 0.4s cubic-bezier(.34,1.56,.64,1)";
        el.style.transform = "";
      }
    });
  }

  if (!reducedMotion) {
    var tiltTargets = document.querySelectorAll(
      ".project-card, .skill-chip, .hack-note, .about-card, .btn, .nav-tag, .eyebrow-tag"
    );
    tiltTargets.forEach(function (el) {
      addTilt(el, { maxDeg: 4, maxShift: 4, scale: 1.02 });
    });
  }

  /* ============================================================
     NAV — subtle fade once past the hero
     ============================================================ */

  var nav = document.querySelector(".site-nav");
  function updateNav() {
    var heroDone = window.scrollY > window.innerHeight * 0.35;
    nav.style.opacity = heroDone ? "1" : "0.9";
  }
  window.addEventListener("scroll", updateNav, { passive: true });
  updateNav();
})();
