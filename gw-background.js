/* Gravitational-wave spacetime background
   - fine horizontal "spacetime" lines
   - 3-8 isolated pulsars: gravitational wells (lines bend toward them) + lighthouse beams
   - 3-8 pulsar–black-hole binaries: orbiting pair emitting spiral (quadrupole) gravitational waves
   - every source drifts randomly around the page; counts/positions are re-randomised on each page load
   - cursor acts as a moving mass that bends the lines
   Canvas: uses <canvas id="gw"> or, if absent, <canvas id="star-canvas"> (fixed, full-screen, z-index -1). */
(function () {
  "use strict";
  var cv = document.getElementById("gw") || document.getElementById("star-canvas");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- tunables ---------- */
  var CURSOR_PULL = 1;          // 1 = lines bend toward cursor (gravity); -1 = push away (like the old star field)
  var LINE_RGB = "143,180,255"; // line colour
  var WAVE_AMP = 1;             // overall gravitational-wave strength (try 0.6 – 1.6)
  var MIN_SRC = 2, MAX_SRC = 7; // random number of pulsars and of binaries
  var DRIFT = 1;                // how fast sources wander (0 = frozen, 2 = twice as fast)

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rnd(a, b + 1)); }

  var W = 0, H = 0, dpr = 1, sc = 1, spacing = 16, rows = 0, STEP = 7;
  var pulsars = [], binaries = [], nBin = 3;
  var mouse = { x: -999, y: -999, tx: -999, ty: -999, on: 0, ton: 0 };
  var lastT = 0;

  /* ---------- sources ---------- */
  function farEnough(x, y, list, d) {
    for (var i = 0; i < list.length; i++) {
      var dx = list[i].x - x, dy = list[i].y - y;
      if (dx * dx + dy * dy < d * d) return false;
    }
    return true;
  }
  function spawn(all, extra) {
    var x, y, tries = 0, d = 0.17 * Math.min(W, H);
    do {
      x = rnd(0.06, 0.94) * W; y = rnd(0.12, 0.92) * H; tries++;
    } while (tries < 80 && !farEnough(x, y, all, d * (tries < 40 ? 1 : 0.6)));
    var ang = rnd(0, 6.2832), sp = rnd(6, 18) * sc;
    var s = { x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp };
    for (var k in extra) s[k] = extra[k];
    all.push(s);
    return s;
  }
  function initSources() {
    var cap = W < 600 ? 5 : MAX_SRC;
    var nP = randInt(MIN_SRC, Math.max(MIN_SRC, cap));
    nBin = randInt(MIN_SRC, Math.max(MIN_SRC, cap));
    var all = [];
    pulsars = []; binaries = [];
    var i, s;
    for (i = 0; i < nP; i++) {
      s = spawn(all, { m: rnd(0.65, 1.0), spin: rnd(1.8, 4.2) * (Math.random() < 0.5 ? -1 : 1), ph: rnd(0, 6.28), kind: "p" });
      pulsars.push(s);
    }
    for (i = 0; i < nBin; i++) {
      s = spawn(all, { a: rnd(9, 16), Om: rnd(0.8, 1.8), amp: rnd(0.6, 1.0), ph: rnd(0, 6.28), kind: "b" });
      binaries.push(s);
    }
  }
  function drift(list, dt) {
    var maxSp = 26 * sc * DRIFT, acc = 55 * sc * DRIFT, margin = 70;
    for (var i = 0; i < list.length; i++) {
      var s = list[i];
      s.vx += rnd(-1, 1) * acc * dt; s.vy += rnd(-1, 1) * acc * dt;
      s.vx *= 1 - 0.25 * dt; s.vy *= 1 - 0.25 * dt;
      if (s.x < margin) s.vx += 45 * dt; if (s.x > W - margin) s.vx -= 45 * dt;
      if (s.y < margin + 40) s.vy += 45 * dt; if (s.y > H - margin) s.vy -= 45 * dt;
      var sp = Math.sqrt(s.vx * s.vx + s.vy * s.vy);
      if (sp > maxSp) { s.vx *= maxSp / sp; s.vy *= maxSp / sp; }
      else if (sp < 5 * sc * DRIFT) { var a = rnd(0, 6.2832); s.vx += Math.cos(a) * 6; s.vy += Math.sin(a) * 6; }
      s.x += s.vx * dt * DRIFT; s.y += s.vy * dt * DRIFT;
      s.x = Math.max(10, Math.min(W - 10, s.x)); s.y = Math.max(10, Math.min(H - 10, s.y));
    }
  }

  /* ---------- sizing & input ---------- */
  function resize() {
    var oW = W, oH = H;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sc = Math.max(0.65, Math.min(1.25, Math.min(W, H) / 800));
    spacing = Math.max(12, Math.min(20, H / 44));
    STEP = W < 600 ? 9 : 7;
    rows = Math.ceil(H / spacing) + 6;
    if (!pulsars.length) initSources();
    else if (oW && oH) {
      var all = pulsars.concat(binaries);
      for (var i = 0; i < all.length; i++) { all[i].x *= W / oW; all[i].y *= H / oH; }
    }
    if (reduce) frame(0);
  }

  window.addEventListener("pointermove", function (e) {
    mouse.tx = e.clientX; mouse.ty = e.clientY; mouse.ton = 1;
    if (mouse.on < 0.05) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    if (reduce) frame(0);
  }, { passive: true });
  document.addEventListener("pointerleave", function () { mouse.ton = 0; });
  window.addEventListener("pointerup", function (e) { if (e.pointerType === "touch") mouse.ton = 0; });
  window.addEventListener("blur", function () { mouse.ton = 0; });
  window.addEventListener("resize", resize);

  /* ---------- drawing ---------- */
  function frame(t) {
    var dt = lastT ? Math.min(0.05, Math.max(0, t - lastT)) : 0;
    lastT = t;
    if (!reduce) { drift(pulsars, dt); drift(binaries, dt); }

    ctx.clearRect(0, 0, W, H);

    mouse.x += (mouse.tx - mouse.x) * 0.16;
    mouse.y += (mouse.ty - mouse.y) * 0.16;
    mouse.on += (mouse.ton - mouse.on) * 0.08;

    var nP = pulsars.length, nB = binaries.length;
    var ampScale = Math.min(1, Math.sqrt(3 / Math.max(1, nB)));   // keep overlapping waves from becoming a mess
    var B = binaries.map(function (b) {
      var Om = b.Om * (1 + 0.12 * Math.sin(t * 0.07 + b.ph));
      return { x: b.x, y: b.y, a: b.a * sc, Om: Om, amp: b.amp * WAVE_AMP * ampScale, phi: b.Om * t + b.ph, ph: b.ph };
    });

    var sigP = 175 * sc, aP = 40 * sc;
    var sigM = 135 * sc, aM = 36 * sc * CURSOR_PULL;
    var lambda = 200 * sc, k = 6.2832 / lambda;
    var AW = 7.5 * sc;
    var r0 = 70 * sc, Rfar = 560 * sc, cull = Rfar * 1.6;
    var near = 40 * sc;

    ctx.lineWidth = 1;
    ctx.lineCap = "round"; ctx.lineJoin = "round";

    for (var j = 0; j < rows; j++) {
      var y0 = (j - 2) * spacing;
      var started = false, acc = 0, cnt = 0;
      ctx.beginPath();
      for (var x = -80; x <= W + 80; x += STEP) {
        var dx = 0, dy = 0, i;

        for (i = 0; i < nP; i++) {
          var p = pulsars[i];
          var rx = p.x - x, ry = p.y - y0;
          var r2 = rx * rx + ry * ry;
          if (r2 < 25 * sigP * sigP) {
            var r = Math.sqrt(r2) + 0.001, u = r / sigP;
            var mag = aP * p.m * u * Math.exp(1 - u);
            dx += rx / r * mag; dy += ry / r * mag;
          }
        }

        for (i = 0; i < nB; i++) {
          var b = B[i];
          var bx = x - b.x, by = y0 - b.y;
          var rb2 = bx * bx + by * by;
          if (rb2 < cull * cull) {
            var rb = Math.sqrt(rb2) + 0.001;
            var env = (1 - Math.exp(-rb / near)) / Math.sqrt(1 + rb / r0) * Math.exp(-rb / Rfar);
            var ph = k * rb - 2 * b.Om * t - 2 * Math.atan2(by, bx) + b.ph;
            var A = AW * b.amp * env * 3.2;
            dy += A * Math.cos(ph);
            dx += A * 0.45 * Math.sin(ph);
          }
        }

        if (mouse.on > 0.01) {
          var mx = mouse.x - x, my = mouse.y - y0;
          var rm2 = mx * mx + my * my;
          if (rm2 < 25 * sigM * sigM) {
            var rm = Math.sqrt(rm2) + 0.001, um = rm / sigM;
            var mg = aM * mouse.on * um * Math.exp(1 - um);
            dx += mx / rm * mg; dy += my / rm * mg;
          }
        }

        var X = x + dx, Y = y0 + dy;
        acc += Math.abs(dx) + Math.abs(dy); cnt++;
        if (!started) { ctx.moveTo(X, Y); started = true; }
        else ctx.lineTo(X, Y);

        if (cnt === 6) {
          var strength = Math.min(1, acc / cnt / 22);
          ctx.strokeStyle = "rgba(" + LINE_RGB + "," + (0.05 + 0.32 * strength).toFixed(3) + ")";
          ctx.stroke();
          ctx.beginPath(); ctx.moveTo(X, Y);
          acc = 0; cnt = 0;
        }
      }
      if (cnt > 0) { ctx.strokeStyle = "rgba(" + LINE_RGB + ",0.07)"; ctx.stroke(); }
    }

    /* ---------- the objects ---------- */
    var q, s;
    for (q = 0; q < nP; q++) {
      s = pulsars[q];
      var ang = s.spin * t + s.ph;
      for (var side = 0; side < 2; side++) {
        var a2 = ang + side * Math.PI, L = 120 * sc * (0.7 + 0.3 * s.m);
        var gx = s.x + Math.cos(a2) * L, gy = s.y + Math.sin(a2) * L;
        var g = ctx.createLinearGradient(s.x, s.y, gx, gy);
        g.addColorStop(0, "rgba(190,215,255,0.55)");
        g.addColorStop(1, "rgba(190,215,255,0)");
        ctx.strokeStyle = g; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(gx, gy); ctx.stroke();
      }
      glowDot(s.x, s.y, 3.0 * sc, "200,225,255", 15 * sc);
    }
    for (q = 0; q < nB; q++) {
      s = B[q];
      var cx = Math.cos(s.phi), cy = Math.sin(s.phi);
      var m1 = 0.35, m2 = 0.65;
      var pxs = s.x + cx * s.a * m2 * 1.6, pys = s.y + cy * s.a * m2 * 1.6;
      var bhx = s.x - cx * s.a * m1 * 1.6, bhy = s.y - cy * s.a * m1 * 1.6;
      ctx.strokeStyle = "rgba(143,180,255,0.14)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.a * 0.8, 0, 6.2832); ctx.stroke();
      var rbh = 6.2 * sc;
      ctx.save();
      ctx.shadowColor = "rgba(255,170,90,0.85)"; ctx.shadowBlur = 12;
      ctx.strokeStyle = "rgba(255,185,120,0.9)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(bhx, bhy, rbh + 1.5, 0, 6.2832); ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#02040a";
      ctx.beginPath(); ctx.arc(bhx, bhy, rbh, 0, 6.2832); ctx.fill();
      glowDot(pxs, pys, 2.5 * sc, "200,225,255", 11 * sc);
    }
    ctx.lineWidth = 1;
  }

  function glowDot(x, y, r, rgb, glow) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, glow);
    g.addColorStop(0, "rgba(" + rgb + ",0.55)");
    g.addColorStop(1, "rgba(" + rgb + ",0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, glow, 0, 6.2832); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  }

  /* adaptive quality: if drawing takes too long (slow device, 8+8 sources), coarsen the line sampling */
  var cost = 8, nFrames = 0;
  function loop(ms) {
    var t0 = performance.now();
    frame(ms / 1000);
    cost = cost * 0.94 + (performance.now() - t0) * 0.06;
    if (++nFrames % 45 === 0 && cost > 13 && STEP < 13) STEP++;
    requestAnimationFrame(loop);
  }

  resize();
  if (reduce) frame(0); else requestAnimationFrame(loop);
})();
