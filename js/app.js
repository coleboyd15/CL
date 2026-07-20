/* CL app shell + hash router */
(function () {
  const PRIMARY = new Set(["home", "cfb", "movies", "games", "more"]);

  const ROUTES = {
    home: { title: "Home", nav: "home", render: () => CL.sections.home.render },
    cfb: { title: "Tech vs A&M", nav: "cfb", render: () => CL.sections.cfb.render },
    football: { title: "Tech vs A&M", nav: "cfb", render: () => CL.sections.cfb.render },
    movies: { title: "Movies", nav: "movies", render: () => CL.sections.movies.render },
    games: { title: "Games", nav: "games", render: () => CL.sections.games.render },
    fun: { title: "8-Ball", nav: "more", render: () => CL.sections.fun.render },
    more: { title: "More", nav: "more", render: () => renderMore },
    notes: { title: "Notes", nav: "more", render: () => CL.sections.notes.render },
    books: { title: "Books", nav: "more", render: () => CL.sections.books.render },
    recipes: { title: "Recipes", nav: "more", render: () => CL.sections.recipes.render },
    profile: { title: "Profile", nav: "more", render: () => CL.sections.profile.render },
    settings: { title: "Profile", nav: "more", render: () => CL.sections.profile.render }
  };

  function currentRoute() {
    const hash = (location.hash || "#home").replace(/^#/, "").split("?")[0].toLowerCase();
    // Legacy routes
    if (hash === "food" || hash === "news") return "cfb";
    return ROUTES[hash] ? hash : "home";
  }

  function setActiveNav(routeKey) {
    const navKey = ROUTES[routeKey]?.nav || "home";
    document.querySelectorAll(".nav-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.route === navKey);
    });
  }

  function refreshHeader() {
    const mark = document.getElementById("header-avatar");
    if (mark) {
      const p = CL.profile.get();
      if (p.avatar) {
        mark.innerHTML = `<img src="${p.avatar}" alt="" class="header-avatar-img" />`;
        mark.classList.add("has-photo");
      } else {
        mark.innerHTML = `<img src="icons/icon-96.png" alt="" class="header-avatar-img" />`;
        mark.classList.add("has-photo");
      }
    }
    const dayEl = document.getElementById("header-daycount");
    if (dayEl && CL.daycount) {
      const info = CL.daycount.getDayCount();
      dayEl.textContent = CL.daycount.formatCompact(info);
      dayEl.title = CL.daycount.formatLong(info);
      dayEl.setAttribute("aria-label", CL.daycount.formatLong(info));
    }
  }

  CL.refreshHeader = refreshHeader;

  function renderMore(root) {
    root.innerHTML = `
      <section class="page">
        <h1 class="page-title">More</h1>
        <p class="page-sub">Everything else for ${CL.escapeHtml(CL.profile.coupleLabel())}</p>
        <div class="more-grid">
          <button type="button" class="more-card" data-go="profile">
            <span class="emoji">💕</span>
            <strong>Profile & Settings</strong>
            <p>Names, couple group, Grok API</p>
            <span class="badge">Open</span>
          </button>
          <button type="button" class="more-card" data-go="cfb">
            <span class="emoji">🏈</span>
            <strong>Tech vs A&amp;M</strong>
            <p>2026 win totals · who wins more</p>
            <span class="badge">Open</span>
          </button>
          <button type="button" class="more-card" data-go="notes">
            <span class="emoji">📝</span>
            <strong>Notes</strong>
            <p>Shared scratch paper · rich text</p>
            <span class="badge">Open</span>
          </button>
          <button type="button" class="more-card" data-go="books">
            <span class="emoji">📚</span>
            <strong>Book Club</strong>
            <p>Shelves, reviews & recs</p>
            <span class="badge">Open</span>
          </button>
          <button type="button" class="more-card" data-go="recipes">
            <span class="emoji">🍳</span>
            <strong>Recipe Generator</strong>
            <p>Meal + drink by cuisine</p>
            <span class="badge">Open</span>
          </button>
          <button type="button" class="more-card" data-go="games">
            <span class="emoji">🎮</span>
            <strong>Games</strong>
            <p>Golf, darts, spades, gin</p>
            <span class="badge">Open</span>
          </button>
          <button type="button" class="more-card" data-go="fun">
            <span class="emoji">🎱</span>
            <strong>8-Ball</strong>
            <p>Classic magic answers</p>
            <span class="badge">Open</span>
          </button>
        </div>
        <div class="card" style="margin-top:16px">
          <div class="card-title">About CL</div>
          <p class="card-meta" style="margin-top:6px">
            Your private couple app. Data lives on this device and can sync via a Couple Group
            (Firebase). Set names under Profile, track Tech vs A&amp;M win totals, and add an xAI key for live Grok.
          </p>
        </div>
      </section>
    `;

    root.querySelectorAll("[data-go]").forEach((btn) => {
      btn.addEventListener("click", () => {
        location.hash = btn.dataset.go;
      });
    });
  }

  function route() {
    const key = currentRoute();
    const def = ROUTES[key];
    const main = document.getElementById("main");
    if (!main || !def) return;

    // Normalize legacy hashes
    const rawHash = (location.hash || "").replace(/^#/, "").split("?")[0].toLowerCase();
    if (rawHash === "food" || rawHash === "news") {
      location.replace("#cfb");
      return;
    }

    document.title = `CL · ${def.title}`;
    setActiveNav(key);
    refreshHeader();
    main.innerHTML = "";
    main.classList.remove("page-enter");
    void main.offsetWidth;
    main.classList.add("page-enter");
    window.scrollTo({ top: 0, behavior: "smooth" });

    const renderFn = def.render();
    if (typeof renderFn === "function") renderFn(main);
  }

  function init() {
    if (!location.hash || location.hash === "#") {
      location.replace("#home");
    }

    window.addEventListener("hashchange", route);
    document.getElementById("btn-home")?.addEventListener("click", () => {
      location.hash = "#home";
    });

    document.querySelectorAll(".nav-item").forEach((el) => {
      el.addEventListener("click", () => {
        sessionStorage.setItem("cl_seen_home", "1");
      });
    });

    refreshHeader();
    route();

    // Prefetch today's CFB briefing in background
    if (CL.cfb && typeof CL.cfb.getDailyEdition === "function") {
      CL.cfb.getDailyEdition({ force: false }).catch(() => {});
    }

    let syncRefreshTimer = null;
    window.addEventListener("cl-sync-update", (e) => {
      const k = e.detail && e.detail.key;
      if (!k) return;
      clearTimeout(syncRefreshTimer);
      syncRefreshTimer = setTimeout(() => {
        const ae = document.activeElement;
        const tag = (ae && ae.tagName) || "";
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (ae && ae.isContentEditable) return;
        route();
      }, 400);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
