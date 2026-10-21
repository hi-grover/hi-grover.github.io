/* Picks which animated background to show and loads it.
   Place it LAST in <body>, after <canvas id="star-canvas"> (or <canvas id="gw">).
   Needs gw-background.js and starfield-background.js in the same folder as this file. */
(function () {
  "use strict";

  /* "alternate" = a different background each new visit (gw, stars, gw, stars, ...)
     "random"    = coin flip on each new visit
     "gw"        = always gravitational waves
     "stars"     = always starfield                                                   */
  var MODE = "alternate";

  var FILES = { gw: "gw-background.js", stars: "starfield-background.js" };

  function isReload() {
    try {
      var nav = performance.getEntriesByType("navigation")[0];
      return !!nav && nav.type === "reload";
    } catch (e) { return false; }
  }

  var pick;
  if (MODE === "gw" || MODE === "stars") {
    pick = MODE;
  } else {
    try {
      /* The choice is remembered for the whole visit (so clicking between pages keeps the same
         background) and renewed on a new visit, i.e. new tab/window, or a page refresh. */
      pick = sessionStorage.getItem("bgChoice");
      if (!pick || !FILES[pick] || isReload()) {
        if (MODE === "random") {
          pick = Math.random() < 0.5 ? "gw" : "stars";
        } else {
          pick = localStorage.getItem("bgLast") === "gw" ? "stars" : "gw";
          localStorage.setItem("bgLast", pick);
        }
        sessionStorage.setItem("bgChoice", pick);
      }
    } catch (e) {
      pick = Math.random() < 0.5 ? "gw" : "stars";   // storage blocked: fall back to random
    }
  }

  var base = document.currentScript ? document.currentScript.src : location.href;
  var s = document.createElement("script");
  s.src = new URL(FILES[pick], base).href;
  document.body.appendChild(s);
})();
