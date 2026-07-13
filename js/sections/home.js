(function (global) {
  function render(root) {
    function paint() {
      const profile = CL.profile.get();
      const names = CL.profile.displayNames();
      const greet = CL.profile.greeting();
      const label = CL.profile.coupleLabel();
      const hasKey = !!(CL.profile.getSettings().xaiApiKey || "").trim();
      const loc = CL.geo.getSavedLocation();

      const welcomeLine = CL.profile.hasNames()
        ? `${greet}, ${CL.escapeHtml(names.myName)} & ${CL.escapeHtml(names.partnerName)}`
        : `${greet} — welcome to CL`;

      root.innerHTML = `
        <section class="page home-page">
          <div class="home-hero card">
            <div class="home-emblem-wrap">
              <img src="icons/icon-192.png" alt="CL emblem" class="home-emblem" width="96" height="96" />
            </div>
            <div class="home-hero-top">
              ${CL.profile.avatarHtml("avatar-lg")}
              <div class="home-hero-text">
                <p class="home-kicker">CL · America 250</p>
                <h1 class="page-title home-title">${welcomeLine}</h1>
                <p class="page-sub" style="margin-bottom:0">
                  ${
                    profile.coupleName
                      ? CL.escapeHtml(profile.coupleName)
                      : "Food, films, trips, recipes & more"
                  }
                  ${profile.anniversary ? ` · since ${CL.escapeHtml(profile.anniversary)}` : ""}
                </p>
              </div>
            </div>
            ${
              profile.bio
                ? `<p class="home-bio">${CL.escapeHtml(profile.bio)}</p>`
                : ""
            }
            <div class="home-status chips" style="margin-top:12px">
              <span class="chip ${loc ? "active" : ""}">${loc ? "📍 Location on" : "📍 Location off"}</span>
              <span class="chip ${hasKey ? "active" : ""}">${hasKey ? "✦ Grok API ready" : "✦ Grok offline mode"}</span>
            </div>
          </div>

          ${
            !CL.profile.hasNames()
              ? `<div class="card home-setup section-block">
                  <div class="card-title">Set your names</div>
                  <p class="card-meta" style="margin-bottom:10px">Personalize the home screen — saved on this device.</p>
                  <div class="form-stack">
                    <div class="field">
                      <label for="home-my-name">My Name</label>
                      <input id="home-my-name" value="${CL.escapeHtml(profile.myName)}" placeholder="Your name" autocomplete="name" />
                    </div>
                    <div class="field">
                      <label for="home-partner-name">Partner's Name</label>
                      <input id="home-partner-name" value="${CL.escapeHtml(profile.partnerName)}" placeholder="Their name" />
                    </div>
                    <button type="button" class="btn btn-primary btn-block" id="home-save-names">Save names</button>
                  </div>
                </div>`
              : ""
          }

          <div class="section-block">
            <div class="section-label">Quick links</div>
            <div class="quick-grid">
              <a href="#food" class="quick-card">
                <span class="emoji">🍽️</span>
                <strong>Food</strong>
                <span>Find a spot</span>
              </a>
              <a href="#movies" class="quick-card">
                <span class="emoji">🎬</span>
                <strong>Movies</strong>
                <span>Watch list</span>
              </a>
              <a href="#games" class="quick-card">
                <span class="emoji">🎮</span>
                <strong>Games</strong>
                <span>Golf, darts & more</span>
              </a>
              <a href="#fun" class="quick-card">
                <span class="emoji">🎱</span>
                <strong>8-Ball</strong>
                <span>Yes or no</span>
              </a>
              <a href="#trips" class="quick-card">
                <span class="emoji">🧳</span>
                <strong>Trips</strong>
                <span>Plan away</span>
              </a>
              <a href="#books" class="quick-card">
                <span class="emoji">📚</span>
                <strong>Books</strong>
                <span>Book club</span>
              </a>
              <a href="#recipes" class="quick-card">
                <span class="emoji">🍳</span>
                <strong>Recipes</strong>
                <span>Cook together</span>
              </a>
              <a href="#boredom" class="quick-card">
                <span class="emoji">📖</span>
                <strong>Boredom</strong>
                <span>Daily short essays</span>
              </a>
              <a href="#profile" class="quick-card">
                <span class="emoji">💕</span>
                <strong>Profile</strong>
                <span>Us & settings</span>
              </a>
            </div>
          </div>

          <div class="section-block">
            <div class="section-label">Tonight with ${CL.escapeHtml(label)}</div>
            <div class="stack-sm">
              <button type="button" class="card home-action" data-go="food">
                <strong>Where should we eat?</strong>
                <p class="card-meta">Open Food · GPS + OpenStreetMap · ask Grok</p>
              </button>
              <button type="button" class="card home-action" data-go="movies">
                <strong>Movie night?</strong>
                <p class="card-meta">Check wishlist or get a recommendation</p>
              </button>
              <button type="button" class="card home-action" data-go="trips">
                <strong>Plan a trip</strong>
                <p class="card-meta">Ask Grok for stay, food, drinks & activities</p>
              </button>
              <button type="button" class="card home-action" data-go="games">
                <strong>Play a game</strong>
                <p class="card-meta">Golf, darts, spades, or gin rummy</p>
              </button>
              <button type="button" class="card home-action" data-go="fun">
                <strong>Something playful</strong>
                <p class="card-meta">Shake the Magic 8-Ball</p>
              </button>
            </div>
          </div>
        </section>
      `;

      root.querySelector("#home-save-names")?.addEventListener("click", () => {
        const myName = root.querySelector("#home-my-name").value.trim();
        const partnerName = root.querySelector("#home-partner-name").value.trim();
        CL.profile.set({ myName, partnerName });
        CL.toast("Names saved");
        paint();
        if (typeof CL.refreshHeader === "function") CL.refreshHeader();
      });

      root.querySelectorAll("[data-go]").forEach((el) => {
        el.addEventListener("click", () => {
          location.hash = el.dataset.go;
        });
      });
    }

    paint();
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.home = { render };
})(window);
