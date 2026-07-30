/* One-time CPA celebration — pink & green fireworks for Lauren Wax */
(function (global) {
  const SEEN_KEY = "cpaCelebrateSeen";

  function hasSeen() {
    try {
      return !!CL.storage.get(SEEN_KEY, false);
    } catch {
      return false;
    }
  }

  function markSeen() {
    try {
      CL.storage.set(SEEN_KEY, true, { skipSync: true });
    } catch (_) {}
  }

  function show(onDone) {
    if (hasSeen()) {
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
        <p class="cpa-celebrate-kicker">She did it</p>
        <h1 class="cpa-celebrate-title">Congratulations to Lauren Wax, worlds hottest CPA</h1>
        <p class="cpa-celebrate-sub">Pink &amp; green fireworks · certified legend · #1 forever</p>
        <button type="button" class="btn btn-primary btn-block cpa-celebrate-btn" id="cpa-continue">
          Let’s go!
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
      W = canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
      H = canvas.height = window.innerHeight * (window.devicePixelRatio || 1);
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
      W = window.innerWidth;
      H = window.innerHeight;
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
        x: rand(W * 0.1, W * 0.9),
        y: H + 10,
        vx: rand(-0.8, 0.8),
        vy: rand(-11, -7.5),
        color: pickColor(),
        trail: []
      });
    }

    function explode(x, y, color) {
      const n = 48 + ((Math.random() * 36) | 0);
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n + rand(-0.1, 0.1);
        const speed = rand(1.5, 6.5);
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: rand(0.012, 0.028),
          color: Math.random() < 0.35 ? pickColor() : color,
          size: rand(1.5, 3.2)
        });
      }
      // Extra glitter ring
      for (let i = 0; i < 18; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(0.5, 2.2);
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: rand(0.008, 0.02),
          color: Math.random() < 0.5 ? "#ffffff" : color,
          size: rand(1, 2)
        });
      }
    }

    let spawnTimer = 0;
    function frame() {
      if (!running) return;
      ctx.fillStyle = "rgba(20, 8, 24, 0.22)";
      ctx.fillRect(0, 0, W, H);

      spawnTimer--;
      if (spawnTimer <= 0 && rockets.length < 6) {
        spawnRocket();
        if (Math.random() < 0.55) spawnRocket();
        spawnTimer = 12 + ((Math.random() * 18) | 0);
      }

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.12;
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 8) r.trail.shift();
        r.trail.forEach((t, ti) => {
          ctx.globalAlpha = (ti + 1) / r.trail.length * 0.6;
          ctx.fillStyle = r.color;
          ctx.beginPath();
          ctx.arc(t.x, t.y, 2, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 3, 0, Math.PI * 2);
        ctx.fill();
        if (r.vy >= -1.5 || r.y < H * rand(0.15, 0.4)) {
          explode(r.x, r.y, r.color);
          rockets.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.04;
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

    function cleanup() {
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
    // Prime a dark field + first volley
    ctx.fillStyle = "#140818";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) spawnRocket();
    raf = requestAnimationFrame(frame);

    host.querySelector("#cpa-continue").addEventListener("click", cleanup);
  }

  global.CL = global.CL || {};
  global.CL.celebration = { show, hasSeen, markSeen };
})(window);
