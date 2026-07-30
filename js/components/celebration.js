/* Full-screen CPA celebration — auto-starts on load, blocks app until Continue.
   Designed for mobile home-screen / PWA: fixed overlay, no scroll underlay. */
(function (global) {
  var active = false;
  var closed = false;
  var fwHandle = null;
  var doneCallbacks = [];

  function lockBody() {
    var scrollY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.classList.add("cpa-celebrate-active");
    document.body.classList.add("cpa-celebrate-active");
    document.body.style.top = "-" + scrollY + "px";
    document.body.dataset.cpaScrollY = String(scrollY);

    var app = document.getElementById("app");
    if (app) {
      app.setAttribute("aria-hidden", "true");
      app.setAttribute("inert", "");
    }
  }

  function unlockBody() {
    var scrollY = Number(document.body.dataset.cpaScrollY || 0);
    document.documentElement.classList.remove("cpa-celebrate-active");
    document.body.classList.remove("cpa-celebrate-active");
    document.body.style.top = "";
    delete document.body.dataset.cpaScrollY;
    try {
      window.scrollTo(0, scrollY);
    } catch (e) {}

    var app = document.getElementById("app");
    if (app) {
      app.removeAttribute("aria-hidden");
      app.removeAttribute("inert");
    }
  }

  function viewportSize() {
    var vv = window.visualViewport;
    var w = Math.max(
      window.innerWidth || 0,
      document.documentElement.clientWidth || 0,
      vv && vv.width ? vv.width : 0
    );
    var h = Math.max(
      window.innerHeight || 0,
      document.documentElement.clientHeight || 0,
      vv && vv.height ? vv.height : 0
    );
    // iOS home-screen sometimes reports 0 briefly
    if (!w) w = screen.width || 390;
    if (!h) h = screen.height || 844;
    return { w: w, h: h };
  }

  function startFireworks(canvas) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return { stop: function () {} };

    var W = 0;
    var H = 0;
    var raf = 0;
    var running = true;
    var rockets = [];
    var particles = [];
    var PINKS = ["#ff4da6", "#ff69b4", "#ff1493", "#ff9ec8", "#f48fb1", "#ec407a", "#ff80ab"];
    var GREENS = ["#00c853", "#69f0ae", "#1de9b6", "#00e676", "#76ff03", "#a5d6a7", "#b9f6ca"];

    function resize() {
      var size = viewportSize();
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(size.w * dpr);
      canvas.height = Math.floor(size.h * dpr);
      canvas.style.width = size.w + "px";
      canvas.style.height = size.h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      W = size.w;
      H = size.h;
      // Keep host sized to real viewport (iOS PWA)
      var host = document.getElementById("cpa-celebrate");
      if (host) {
        host.style.width = size.w + "px";
        host.style.height = size.h + "px";
      }
    }

    function rand(a, b) {
      return a + Math.random() * (b - a);
    }

    function pickColor() {
      var pool = Math.random() < 0.5 ? PINKS : GREENS;
      return pool[(Math.random() * pool.length) | 0];
    }

    function spawnRocket() {
      rockets.push({
        x: rand(W * 0.08, W * 0.92),
        y: H + 12,
        vx: rand(-1, 1),
        vy: rand(-13, -8.5),
        color: pickColor(),
        trail: []
      });
    }

    function explode(x, y, color) {
      var n = 56 + ((Math.random() * 40) | 0);
      var i, angle, speed;
      for (i = 0; i < n; i++) {
        angle = (Math.PI * 2 * i) / n + rand(-0.12, 0.12);
        speed = rand(1.8, 7.2);
        particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: rand(0.012, 0.028),
          color: Math.random() < 0.4 ? pickColor() : color,
          size: rand(1.8, 3.6)
        });
      }
      for (i = 0; i < 22; i++) {
        angle = rand(0, Math.PI * 2);
        speed = rand(0.4, 2.5);
        particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: rand(0.008, 0.02),
          color: Math.random() < 0.5 ? "#ffffff" : color,
          size: rand(1, 2.2)
        });
      }
    }

    var spawnTimer = 0;
    function frame() {
      if (!running) return;
      ctx.fillStyle = "rgba(20, 8, 24, 0.18)";
      ctx.fillRect(0, 0, W, H);

      spawnTimer--;
      if (spawnTimer <= 0 && rockets.length < 8) {
        spawnRocket();
        if (Math.random() < 0.65) spawnRocket();
        spawnTimer = 8 + ((Math.random() * 14) | 0);
      }

      var i, r, p, ti, t;
      for (i = rockets.length - 1; i >= 0; i--) {
        r = rockets[i];
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.13;
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 10) r.trail.shift();
        for (ti = 0; ti < r.trail.length; ti++) {
          t = r.trail[ti];
          ctx.globalAlpha = ((ti + 1) / r.trail.length) * 0.7;
          ctx.fillStyle = r.color;
          ctx.beginPath();
          ctx.arc(t.x, t.y, 2.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 3.4, 0, Math.PI * 2);
        ctx.fill();
        if (r.vy >= -1 || r.y < H * 0.26) {
          explode(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      }

      for (i = particles.length - 1; i >= 0; i--) {
        p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.045;
        p.vx *= 0.99;
        p.life -= p.decay;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }

    function onResize() {
      resize();
    }

    resize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onResize);
    }

    ctx.fillStyle = "#140818";
    ctx.fillRect(0, 0, W, H);
    for (var k = 0; k < 6; k++) spawnRocket();
    raf = requestAnimationFrame(frame);

    return {
      stop: function () {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("orientationchange", onResize);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener("resize", onResize);
        }
      }
    };
  }

  function finish() {
    if (closed) return;
    closed = true;
    active = false;
    if (fwHandle && fwHandle.stop) fwHandle.stop();
    fwHandle = null;

    var host = document.getElementById("cpa-celebrate");
    if (host && host.parentNode) host.parentNode.removeChild(host);

    unlockBody();

    global.__CL_celebratePending = false;
    global.__CL_celebrateDone = true;

    var cbs = doneCallbacks.slice();
    doneCallbacks = [];
    for (var i = 0; i < cbs.length; i++) {
      try {
        cbs[i]();
      } catch (e) {}
    }
    try {
      window.dispatchEvent(new CustomEvent("cl-celebrate-done"));
    } catch (e2) {}
  }

  /**
   * Ensure full-screen celebration is running. Safe to call multiple times.
   * onDone runs when user presses Continue (or immediately if already dismissed).
   */
  function show(onDone) {
    if (typeof onDone === "function") {
      if (global.__CL_celebrateDone || closed) {
        onDone();
        return;
      }
      doneCallbacks.push(onDone);
    }

    if (active) return;
    active = true;
    closed = false;
    global.__CL_celebratePending = true;
    global.__CL_celebrateDone = false;

    lockBody();

    var host = document.getElementById("cpa-celebrate");
    if (!host) {
      host = document.createElement("div");
      host.id = "cpa-celebrate";
      host.className = "cpa-celebrate";
      host.setAttribute("role", "dialog");
      host.setAttribute("aria-modal", "true");
      host.setAttribute("aria-labelledby", "cpa-celebrate-title");
      host.innerHTML =
        '<canvas class="cpa-fw-canvas" aria-hidden="true"></canvas>' +
        '<div class="cpa-celebrate-inner">' +
        '<div class="cpa-celebrate-badge" aria-hidden="true">🎉 💚 💖 🎉</div>' +
        '<h1 class="cpa-celebrate-title" id="cpa-celebrate-title">' +
        "Congratulations to Lauren Wax, worlds hottest CPA" +
        "</h1>" +
        '<button type="button" class="btn btn-primary btn-block cpa-celebrate-btn" id="cpa-continue">' +
        "Continue" +
        "</button>" +
        "</div>";
      document.body.appendChild(host);
    } else {
      host.hidden = false;
      host.style.display = "flex";
      host.className = "cpa-celebrate";
      // Always re-parent to body end so it paints above everything
      document.body.appendChild(host);
    }

    var canvas = host.querySelector(".cpa-fw-canvas");
    if (fwHandle && fwHandle.stop) fwHandle.stop();
    fwHandle = canvas ? startFireworks(canvas) : { stop: function () {} };

    var btn = host.querySelector("#cpa-continue");
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = "1";
      btn.addEventListener(
        "click",
        function (e) {
          e.preventDefault();
          e.stopPropagation();
          finish();
        },
        false
      );
      // iOS sometimes needs touchend for reliability on home-screen web apps
      btn.addEventListener(
        "touchend",
        function (e) {
          e.preventDefault();
          e.stopPropagation();
          finish();
        },
        { passive: false }
      );
      try {
        btn.focus({ preventScroll: true });
      } catch (e3) {}
    }

    // Block background scroll gestures on the overlay
    host.addEventListener(
      "touchmove",
      function (e) {
        e.preventDefault();
      },
      { passive: false }
    );
    host.addEventListener(
      "wheel",
      function (e) {
        e.preventDefault();
      },
      { passive: false }
    );
  }

  function whenDone(cb) {
    if (typeof cb !== "function") return;
    if (global.__CL_celebrateDone || closed) {
      cb();
      return;
    }
    doneCallbacks.push(cb);
    // Ensure show is running
    show();
  }

  function shouldShow() {
    return !global.__CL_celebrateDone && !closed;
  }

  function hasSeen() {
    return !!global.__CL_celebrateDone;
  }

  global.CL = global.CL || {};
  global.CL.celebration = {
    show: show,
    whenDone: whenDone,
    hasSeen: hasSeen,
    shouldShow: shouldShow,
    isActive: function () {
      return active && !closed;
    }
  };

  // Bridge for app boot
  global.CLCelebrateDone = whenDone;
  global.__CL_celebratePending = true;
  global.__CL_celebrateDone = false;

  // AUTO-START immediately — do not wait for app.js / routing
  function autoStart() {
    show();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoStart);
  } else {
    autoStart();
  }
})(window);
