/* Daily CPA celebration — pink & green fireworks for Lauren Wax */
(function (global) {
  const DAY_KEY = "cpaCelebrateDay";
  const SESSION_KEY = "cl_cpa_celebrate_session";

  function todayKey() {
    const d = new Date();
    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  /**
   * Show on every new app open (browser session), and at least once per calendar day.
   * sessionStorage → again after tab/app is fully closed and reopened.
   * localStorage day key → also forces once per day even if session lingered overnight.
   */
  function shouldShow() {
    try {
      const day = todayKey();
      const lastDay = CL.storage.get(DAY_KEY, "");
      if (lastDay !== day) return true;
      // Same day: still show once per fresh session (app reopen)
      if (!sessionStorage.getItem(SESSION_KEY)) return true;
      return false;
    } catch {
      return true;
    }
  }

  function hasSeen() {
    return !shouldShow();
  }

  function markSeen() {
    try {
      CL.storage.set(DAY_KEY, todayKey(), { skipSync: true });
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch (_) {}
  }

  function show(onDone) {
    if (!shouldShow()) {
      if (typeof onDone === "function") onDone();
      return;
    }

    // Avoid stacking if called twice
    if (document.querySelector(".cpa-celebrate")) {
      if (typeof onDone === "function") onDone();
      return;
    }

    const host = document.createElement("div");
    host.className = "cpa-celebrate";
    host.setAttribute("role", "dialog");
    host.setAttribute("aria-modal", "true");
    host.setAttribute("aria-label", "Congratulations to Lauren Wax");
    host.innerHTML = `
      <canvas class="cpa-fw-canvas" aria-hidden="true"></canvas>
      <div class="cpa-celebrate-inner">
        <div class="cpa-celebrate-badge" aria-hidden="true">🎉 💚 💖 🎉</div>
        <h1 class="cpa-celebrate-title">Congratulations to Lauren Wax, worlds hottest CPA</h1>
        <button type="button" class="btn btn-primary btn-block cpa-celebrate-btn" id="cpa-continue">
          Continue
        </button>
      </div>
    `;
    document.body.appendChild(host);
    document.body.classList.add("cpa-celebrate-lock");

    const canvas = host.querySelector(".cpa-fw-canvas");
    const ctx = canvas.getContext("2d");
    let W = 0;
    let H = 0;
    let raf = 0;
    let running = true;
    const rockets = [];
    const particles = [];
    const PINKS = ["#ff4da6", "#ff69b4", "#ff1493", "#ff9ec8", "#f48fb1", "#ec407a"];
    const GREENS = ["#00c853", "#69f0ae", "#1de9b6", "#00e676", "#76ff03", "#a5d6a7"];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      W = cssW;
      H = cssH;
    }

    function rand(a, b) {
      return a + Math.random() * (b - a);
    }

    function pickColor() {
      const pool = Math.random() < 0.5 ? PINKS : GREENS;
      return pool[(Math.random() * pool.length) | 0];
    }

    function spawnRocket() {
      rockets.push({
        x: rand(W * 0.08, W * 0.92),
        y: H + 10,
        vx: rand(-0.9, 0.9),
        vy: rand(-12, -8),
        color: pickColor(),
        trail: []
      });
    }

    function explode(x, y, color) {
      const n = 52 + ((Math.random() * 40) | 0);
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n + rand(-0.12, 0.12);
        const speed = rand(1.6, 7);
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: rand(0.012, 0.028),
          color: Math.random() < 0.35 ? pickColor() : color,
          size: rand(1.6, 3.4)
        });
      }
      for (let i = 0; i < 20; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(0.5, 2.4);
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: rand(0.008, 0.02),
          color: Math.random() < 0.5 ? "#ffffff" : color,
          size: rand(1, 2.2)
        });
      }
    }

    let spawnTimer = 0;
    function frame() {
      if (!running) return;
      ctx.fillStyle = "rgba(20, 8, 24, 0.2)";
      ctx.fillRect(0, 0, W, H);

      spawnTimer--;
      if (spawnTimer <= 0 && rockets.length < 7) {
        spawnRocket();
        if (Math.random() < 0.6) spawnRocket();
        spawnTimer = 10 + ((Math.random() * 16) | 0);
      }

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.13;
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 10) r.trail.shift();
        r.trail.forEach((t, ti) => {
          ctx.globalAlpha = ((ti + 1) / r.trail.length) * 0.65;
          ctx.fillStyle = r.color;
          ctx.beginPath();
          ctx.arc(t.x, t.y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 3.2, 0, Math.PI * 2);
        ctx.fill();
        if (r.vy >= -1.2 || r.y < H * 0.28) {
          explode(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
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

    let closed = false;
    function cleanup() {
      if (closed) return;
      closed = true;
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.body.classList.remove("cpa-celebrate-lock");
      if (host.parentNode) host.parentNode.removeChild(host);
      markSeen();
      if (typeof onDone === "function") onDone();
    }

    resize();
    window.addEventListener("resize", resize);
    ctx.fillStyle = "#140818";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 5; i++) spawnRocket();
    raf = requestAnimationFrame(frame);

    const btn = host.querySelector("#cpa-continue");
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      cleanup();
    });
  }

  global.CL = global.CL || {};
  global.CL.celebration = { show, hasSeen, shouldShow, markSeen };
})(window);
