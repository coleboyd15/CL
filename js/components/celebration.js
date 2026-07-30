/* Full-screen CPA celebration modal — first screen on app open.
   Covers the viewport completely; main app is hidden until Continue. */
(function (global) {
  let active = false;
  let closed = false;

  function lockBody() {
    const scrollY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.classList.add("cpa-celebrate-active");
    document.body.classList.add("cpa-celebrate-active");
    document.body.style.top = "-" + scrollY + "px";
    document.body.dataset.cpaScrollY = String(scrollY);

    const app = document.getElementById("app");
    if (app) {
      app.setAttribute("aria-hidden", "true");
      app.setAttribute("inert", "");
    }
  }

  function unlockBody() {
    const scrollY = Number(document.body.dataset.cpaScrollY || 0);
    document.documentElement.classList.remove("cpa-celebrate-active");
    document.body.classList.remove("cpa-celebrate-active");
    document.body.style.top = "";
    delete document.body.dataset.cpaScrollY;
    try {
      window.scrollTo(0, scrollY);
    } catch (_) {}

    const app = document.getElementById("app");
    if (app) {
      app.removeAttribute("aria-hidden");
      app.removeAttribute("inert");
    }
  }

  function startFireworks(canvas) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return { stop: function () {} };

    let W = 0;
    let H = 0;
    let raf = 0;
    let running = true;
    const rockets = [];
    const particles = [];
    const PINKS = ["#ff4da6", "#ff69b4", "#ff1493", "#ff9ec8", "#f48fb1", "#ec407a", "#ff80ab"];
    const GREENS = ["#00c853", "#69f0ae", "#1de9b6", "#00e676", "#76ff03", "#a5d6a7", "#b9f6ca"];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = Math.max(window.innerWidth, document.documentElement.clientWidth || 0);
      const cssH = Math.max(window.innerHeight, document.documentElement.clientHeight || 0);
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
        y: H + 12,
        vx: rand(-1, 1),
        vy: rand(-13, -8.5),
        color: pickColor(),
        trail: []
      });
    }

    function explode(x, y, color) {
      const n = 56 + ((Math.random() * 40) | 0);
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n + rand(-0.12, 0.12);
        const speed = rand(1.8, 7.2);
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: rand(0.012, 0.028),
          color: Math.random() < 0.4 ? pickColor() : color,
          size: rand(1.8, 3.6)
        });
      }
      for (let i = 0; i < 22; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(0.4, 2.5);
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
      ctx.fillStyle = "rgba(20, 8, 24, 0.18)";
      ctx.fillRect(0, 0, W, H);

      spawnTimer--;
      if (spawnTimer <= 0 && rockets.length < 8) {
        spawnRocket();
        if (Math.random() < 0.65) spawnRocket();
        spawnTimer = 8 + ((Math.random() * 14) | 0);
      }

      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.13;
        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 10) r.trail.shift();
        r.trail.forEach((t, ti) => {
          ctx.globalAlpha = ((ti + 1) / r.trail.length) * 0.7;
          ctx.fillStyle = r.color;
          ctx.beginPath();
          ctx.arc(t.x, t.y, 2.4, 0, Math.PI * 2);
          ctx.fill();
        });
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

    resize();
    window.addEventListener("resize", resize);
    ctx.fillStyle = "#140818";
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) spawnRocket();
    raf = requestAnimationFrame(frame);

    return {
      stop: function () {
        running = false;
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
      }
    };
  }

  /**
   * Activate the full-screen celebration (uses markup in index.html when present).
   * Main app stays hidden until Continue.
   */
  function show(onDone) {
    if (active) return;
    active = true;
    closed = false;

    lockBody();

    let host = document.getElementById("cpa-celebrate");
    if (!host) {
      host = document.createElement("div");
      host.id = "cpa-celebrate";
      host.className = "cpa-celebrate";
      host.setAttribute("role", "dialog");
      host.setAttribute("aria-modal", "true");
      host.setAttribute("aria-labelledby", "cpa-celebrate-title");
      host.innerHTML = `
        <canvas class="cpa-fw-canvas" aria-hidden="true"></canvas>
        <div class="cpa-celebrate-inner">
          <div class="cpa-celebrate-badge" aria-hidden="true">🎉 💚 💖 🎉</div>
          <h1 class="cpa-celebrate-title" id="cpa-celebrate-title">
            Congratulations to Lauren Wax, worlds hottest CPA
          </h1>
          <button type="button" class="btn btn-primary btn-block cpa-celebrate-btn" id="cpa-continue">
            Continue
          </button>
        </div>
      `;
      document.body.appendChild(host);
    } else {
      host.hidden = false;
      host.style.display = "";
      host.classList.add("cpa-celebrate");
      // Ensure it is a direct child of body (above everything)
      if (host.parentNode !== document.body) {
        document.body.appendChild(host);
      } else {
        document.body.appendChild(host); // move to end for top paint order
      }
    }

    const canvas = host.querySelector(".cpa-fw-canvas");
    const fw = canvas ? startFireworks(canvas) : { stop: function () {} };

    function cleanup() {
      if (closed) return;
      closed = true;
      fw.stop();
      if (host && host.parentNode) host.parentNode.removeChild(host);
      unlockBody();
      active = false;
      if (typeof onDone === "function") onDone();
    }

    const btn = host.querySelector("#cpa-continue");
    if (btn) {
      try {
        btn.focus({ preventScroll: true });
      } catch (_) {}
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        cleanup();
      });
    }

    host.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        if (btn) btn.focus();
      }
    });

    host.addEventListener(
      "touchmove",
      (e) => {
        if (!e.target.closest(".cpa-celebrate-inner")) e.preventDefault();
      },
      { passive: false }
    );
  }

  function shouldShow() {
    return true;
  }

  function hasSeen() {
    return false;
  }

  global.CL = global.CL || {};
  global.CL.celebration = { show, hasSeen, shouldShow, isActive: () => active };
})(window);
