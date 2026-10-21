/* Interactive constellation starfield
   Stars drift slowly, nearby stars are joined by faint lines, and the cursor pushes stars away.
   Canvas: uses <canvas id="star-canvas"> (or <canvas id="gw">): fixed, full-screen, z-index -1.
   Defaults reproduce the original look; change the numbers below to taste. */
(function () {
  "use strict";
  var canvas = document.getElementById("star-canvas") || document.getElementById("gw");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- tunables ---------- */
  var STAR_AREA     = 9000;   // screen area (px²) per star: SMALLER = MORE stars (5000 dense, 15000 sparse)
  var MAX_STARS     = 400;    // safety cap for very large screens
  var STAR_SPEED    = 1;      // drift speed multiplier (0 = frozen, 2 = twice as fast)
  var MIN_SIZE      = 0.5;    // star radius range (px)
  var MAX_SIZE      = 2.0;
  var STAR_OPACITY  = 0.8;    // 0 – 1
  var LINK_DISTANCE = 141;    // stars closer than this (px) are joined by a line; 0 = no lines
  var LINK_OPACITY  = 0.2;    // brightest a connecting line gets (0 – 1)
  var MOUSE_RADIUS  = 150;    // cursor influence radius (px)
  var MOUSE_FORCE   = 2;      // >0 pushes stars away, <0 pulls them in, 0 = ignore cursor
  var COLOR         = "255,255,255";  // r,g,b  (e.g. "143,180,255" for a blue tint)
  var TWINKLE       = false;  // true = stars gently fade in and out

  var W = 0, H = 0, dpr = 1, stars = [];
  var mouse = { x: null, y: null };

  function Star(x, y, dx, dy, size) {
    this.x = x; this.y = y; this.dx = dx; this.dy = dy; this.size = size;
    this.tw = Math.random() * 6.2832; this.tws = 0.5 + Math.random() * 1.2;
  }

  function init() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = [];
    var n = Math.min(MAX_STARS, Math.round((W * H) / STAR_AREA));
    for (var i = 0; i < n; i++) {
      var size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);
      stars.push(new Star(
        Math.random() * W, Math.random() * H,
        (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, size));
    }
    if (reduce) draw(0);
  }

  window.addEventListener("pointermove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; });
  document.addEventListener("pointerleave", function () { mouse.x = null; mouse.y = null; });
  window.addEventListener("blur", function () { mouse.x = null; mouse.y = null; });
  window.addEventListener("resize", init);

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    var i, s;

    for (i = 0; i < stars.length; i++) {
      s = stars[i];
      if (!reduce) {
        if (s.x > W || s.x < 0) s.dx = -s.dx;
        if (s.y > H || s.y < 0) s.dy = -s.dy;

        if (MOUSE_FORCE !== 0 && mouse.x !== null) {
          var mx = mouse.x - s.x, my = mouse.y - s.y;
          var d = Math.sqrt(mx * mx + my * my);
          if (d < MOUSE_RADIUS && d > 0.001) {
            var force = (MOUSE_RADIUS - d) / MOUSE_RADIUS;
            s.x -= (mx / d) * force * MOUSE_FORCE;
            s.y -= (my / d) * force * MOUSE_FORCE;
          }
        }
        s.x += s.dx * STAR_SPEED;
        s.y += s.dy * STAR_SPEED;
      }
      var a = STAR_OPACITY * (TWINKLE ? 0.65 + 0.35 * Math.sin(t * 0.001 * s.tws + s.tw) : 1);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, 6.2832);
      ctx.fillStyle = "rgba(" + COLOR + "," + a.toFixed(3) + ")";
      ctx.fill();
    }

    if (LINK_DISTANCE > 0) {
      var L2 = LINK_DISTANCE * LINK_DISTANCE;
      ctx.lineWidth = 1;
      for (var a1 = 0; a1 < stars.length; a1++) {
        for (var b1 = a1 + 1; b1 < stars.length; b1++) {
          var dx = stars[a1].x - stars[b1].x, dy = stars[a1].y - stars[b1].y;
          var d2 = dx * dx + dy * dy;
          if (d2 < L2) {
            ctx.strokeStyle = "rgba(" + COLOR + "," + (LINK_OPACITY * (1 - d2 / L2)).toFixed(3) + ")";
            ctx.beginPath();
            ctx.moveTo(stars[a1].x, stars[a1].y);
            ctx.lineTo(stars[b1].x, stars[b1].y);
            ctx.stroke();
          }
        }
      }
    }
  }

  function loop(t) { draw(t); requestAnimationFrame(loop); }

  init();
  if (!reduce) requestAnimationFrame(loop);
})();
