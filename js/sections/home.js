(function (global) {
  function render(root) {
    function paint() {
      const profile = CL.profile.get();
      const names = CL.profile.displayNames();
      const greet = CL.profile.greeting();
      const label = CL.profile.coupleLabel();
      const day = CL.daycount ? CL.daycount.formatLong() : "";
      const pigeonUnread = CL.pigeon && typeof CL.pigeon.unreadCount === "function" ? CL.pigeon.unreadCount() : 0;

      const welcomeLine = CL.profile.hasNames()
        ? `${greet}, ${CL.escapeHtml(names.myName)} & ${CL.escapeHtml(names.partnerName)}`
        : `${greet} — welcome to CL`;

      // Only show couple nickname / anniversary — no default marketing subtitle
      let subLine = "";
      if (profile.coupleName) {
        subLine = CL.escapeHtml(profile.coupleName);
        if (profile.anniversary) {
          subLine += ` · since ${CL.escapeHtml(profile.anniversary)}`;
        }
      } else if (profile.anniversary) {
        subLine = `Since ${CL.escapeHtml(profile.anniversary)}`;
      }

      root.innerHTML = `
        <section class="page home-page">
          <div class="home-hero card">
            <div class="home-emblem-wrap">
              <img src="icons/icon-192.png" alt="CL emblem" class="home-emblem" width="96" height="96" />
            </div>
            <div class="home-hero-top">
              ${CL.profile.avatarHtml("avatar-lg")}
              <div class="home-hero-text">
                <p class="home-kicker">CL</p>
                <h1 class="page-title home-title">${welcomeLine}</h1>
                ${
                  subLine
                    ? `<p class="page-sub" style="margin-bottom:0">${subLine}</p>`
                    : ""
                }
                ${day ? `<p class="card-meta" style="margin-top:6px">${CL.escapeHtml(day)}</p>` : ""}
              </div>
            </div>
            ${
              profile.bio
                ? `<p class="home-bio">${CL.escapeHtml(profile.bio)}</p>`
                : ""
            }
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
              <a href="#cfb" class="quick-card">
                <span class="emoji">🏈</span>
                <strong>Tech vs A&amp;M</strong>
                <span>2026 win totals</span>
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
              <a href="#notes" class="quick-card">
                <span class="emoji">📝</span>
                <strong>Notes</strong>
                <span>Shared scratch pad</span>
              </a>
              <a href="#books" class="quick-card">
                <span class="emoji">📚</span>
                <strong>Books</strong>
                <span>Book club</span>
              </a>
              <a href="#timeline" class="quick-card">
                <span class="emoji">📅</span>
                <strong>Timeline</strong>
                <span>Cole, Lauren &amp; us</span>
              </a>
              <a href="#pigeon" class="quick-card">
                <span class="emoji">🕊️</span>
                <strong>Carrier Pigeon</strong>
                <span>${pigeonUnread ? pigeonUnread + " new letter" + (pigeonUnread === 1 ? "" : "s") : "Letters across the farm"}</span>
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
              <button type="button" class="card home-action" data-go="cfb">
                <strong>Tech vs A&amp;M tracker</strong>
                <p class="card-meta">2026 win totals, implied odds &amp; schedules</p>
              </button>
              <button type="button" class="card home-action" data-go="movies">
                <strong>Movie night?</strong>
                <p class="card-meta">Check wishlist or mark something watched</p>
              </button>
              <button type="button" class="card home-action" data-go="notes">
                <strong>Jot a note</strong>
                <p class="card-meta">Shared scratch paper — both of you can edit</p>
              </button>
              <button type="button" class="card home-action" data-go="games">
                <strong>Play a game</strong>
                <p class="card-meta">Golf, darts, spades, or gin rummy</p>
              </button>
              <button type="button" class="card home-action" data-go="fun">
                <strong>Something playful</strong>
                <p class="card-meta">Shake the Magic 8-Ball</p>
              </button>
              <button type="button" class="card home-action" data-go="pigeon">
                <strong>Send a pigeon</strong>
                <p class="card-meta">Write a letter on the farm scroll</p>
              </button>
              <button type="button" class="card home-action" data-go="timeline">
                <strong>Check the timeline</strong>
                <p class="card-meta">Cole, Lauren, and together — month by month</p>
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
