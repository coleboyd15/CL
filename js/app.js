/* CL app shell + hash router */
(function () {
  const PRIMARY = new Set(["home", "food", "movies", "games", "more"]);

  const ROUTES = {
    home: { title: "Home", nav: "home", render: () => CL.sections.home.render },
    food: { title: "Food", nav: "food", render: () => CL.sections.food.render },
    movies: { title: "Movies", nav: "movies", render: () => CL.sections.movies.render },
    games: { title: "Games", nav: "games", render: () => CL.sections.games.render },
    fun: { title: "8-Ball", nav: "more", render: () => CL.sections.fun.render },
    more: { title: "More", nav: "more", render: () => renderMore },
    trips: { title: "Trips", nav: "more", render: () => CL.sections.trips.render },
    opeds: { title: "Boredom", nav: "more", render: () => CL.sections.opeds.render },
    boredom: { title: "Boredom", nav: "more", render: () => CL.sections.opeds.render },
    books: { title: "Books", nav: "more", render: () => CL.sections.books.render },
    recipes: { title: "Recipes", nav: "more", render: () => CL.sections.recipes.render },
    profile: { title: "Profile", nav: "more", render: () => CL.sections.profile.render },
    settings: { title: "Profile", nav: "more", render: () => CL.sections.profile.render }
  };

  function currentRoute() {
    const hash = (location.hash || "#home").replace(/^#/, "").split("?")[0].toLowerCase();
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
    if (!mark) return;
    const p = CL.profile.get();
    if (p.avatar) {
      mark.innerHTML = `<img src="${p.avatar}" alt="" class="header-avatar-img" />`;
      mark.classList.add("has-photo");
    } else {
      // Default emblem — psychedelic America 250 icon
      mark.innerHTML = `<img src="icons/icon-96.png" alt="" class="header-avatar-img" />`;
      mark.classList.add("has-photo");
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
          <button type="button" class="more-card" data-go="trips">
            <span class="emoji">🧳</span>
            <strong>Trips Planner</strong>
            <p>Destinations, lodging & food ideas</p>
            <span class="badge">Open</span>
          </button>
          <button type="button" class="more-card" data-go="boredom">
            <span class="emoji">📖</span>
            <strong>Boredom</strong>
            <p>Short daily essays · like what you love</p>
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
            (Firebase). Set names under Profile, share a group code, enable location in Food,
            and add an xAI key for live Grok.
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

    // Migrate old default
    if (location.hash === "#food" && !sessionStorage.getItem("cl_seen_home")) {
      // don't force-redirect if they bookmarked food
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

    // When partner syncs data, refresh the current screen (debounced)
    let syncRefreshTimer = null;
    window.addEventListener("cl-sync-update", (e) => {
      const k = e.detail && e.detail.key;
      if (!k) return;
      clearTimeout(syncRefreshTimer);
      syncRefreshTimer = setTimeout(() => {
        // Don't yank focus while typing in a field
        const tag = (document.activeElement && document.activeElement.tagName) || "";
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
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
