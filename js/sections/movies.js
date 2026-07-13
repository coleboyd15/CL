(function (global) {
  const SORT_KEY = "moviesSort";

  function getData() {
    return CL.storage.get("movies", { watched: [], wishlist: [] });
  }

  function setData(data) {
    CL.storage.set("movies", data);
  }

  function yearWatchedOf(m) {
    if (m.watchedYear != null && !Number.isNaN(Number(m.watchedYear))) {
      return Number(m.watchedYear);
    }
    if (m.addedAt) {
      const y = new Date(m.addedAt).getFullYear();
      if (!Number.isNaN(y)) return y;
    }
    return 0;
  }

  function sortMovies(list, sortBy) {
    const arr = (list || []).slice();
    if (sortBy === "title") {
      arr.sort((a, b) =>
        String(a.title || "").localeCompare(String(b.title || ""), undefined, { sensitivity: "base" })
      );
    } else if (sortBy === "year") {
      // Year watched — newest first
      arr.sort((a, b) => {
        const dy = yearWatchedOf(b) - yearWatchedOf(a);
        if (dy) return dy;
        return (b.addedAt || 0) - (a.addedAt || 0);
      });
    } else {
      // ranking — highest rating first, then recency
      arr.sort((a, b) => {
        const dr = (Number(b.rating) || 0) - (Number(a.rating) || 0);
        if (dr) return dr;
        return (b.addedAt || 0) - (a.addedAt || 0);
      });
    }
    return arr;
  }

  function movieCard(m, mode) {
    const yw = yearWatchedOf(m);
    const ratingHtml =
      m.rating != null && Number(m.rating) > 0
        ? CL.rating.starsHtml(m.rating)
        : mode === "wish"
          ? '<span class="tag wish">Wishlist</span>'
          : "";
    return `
      <article class="card" data-id="${CL.escapeHtml(m.id)}" data-mode="${mode}">
        <div class="row-between">
          <div>
            <div class="card-title">${CL.escapeHtml(m.title)}${
              m.year ? ` <span class="card-meta">(${CL.escapeHtml(String(m.year))})</span>` : ""
            }</div>
            ${
              mode === "watched" && yw
                ? `<div class="card-meta">Watched ${CL.escapeHtml(String(yw))}</div>`
                : ""
            }
            ${ratingHtml}
          </div>
        </div>
        ${m.review ? `<p class="review-text">“${CL.escapeHtml(m.review)}”</p>` : ""}
        <div class="card-actions">
          ${
            mode === "wish"
              ? `<button type="button" class="btn btn-primary btn-sm btn-to-watched">Mark watched</button>
                 <button type="button" class="btn btn-ghost btn-sm btn-remove">Remove</button>`
              : `<button type="button" class="btn btn-secondary btn-sm btn-edit">Edit</button>
                 <button type="button" class="btn btn-ghost btn-sm btn-remove">Remove</button>`
          }
        </div>
      </article>
    `;
  }

  function catalogCard(m) {
    return `
      <article class="card" data-catalog="${CL.escapeHtml(m.id)}">
        <div class="card-title">${CL.escapeHtml(m.title)} <span class="card-meta">(${m.year})</span></div>
        <div class="card-meta">${m.genres.join(" · ")} · ${CL.escapeHtml(m.vibe)}</div>
        <div class="card-actions">
          <button type="button" class="btn btn-secondary btn-sm btn-add-wish">+ Wishlist</button>
          <button type="button" class="btn btn-primary btn-sm btn-add-watched">+ Watched</button>
        </div>
      </article>
    `;
  }

  function sortBarHtml(sortBy, tab) {
    if (tab === "recs") return "";
    return `
      <div class="movies-sort-bar">
        <label for="mv-sort">Sort</label>
        <select id="mv-sort">
          ${
            tab === "watched"
              ? `
            <option value="rating" ${sortBy === "rating" ? "selected" : ""}>Ranking (highest first)</option>
            <option value="title" ${sortBy === "title" ? "selected" : ""}>Title (A–Z)</option>
            <option value="year" ${sortBy === "year" ? "selected" : ""}>Year watched</option>
          `
              : `
            <option value="title" ${sortBy === "title" || sortBy === "rating" ? "selected" : ""}>Title (A–Z)</option>
            <option value="year" ${sortBy === "year" ? "selected" : ""}>Year added</option>
          `
          }
        </select>
      </div>
    `;
  }

  function openMovieForm(existing, onSave) {
    const isEdit = !!existing;
    const defaultWatchedYear =
      existing?.watchedYear ||
      (existing?.addedAt ? new Date(existing.addedAt).getFullYear() : new Date().getFullYear());

    CL.modal.open({
      title: isEdit ? "Edit movie" : "Add movie",
      subtitle: "Ratings can use decimals (4.5, 3.8). Syncs with Couple Group.",
      bodyHtml: `
        <div class="form-stack">
          <div class="field">
            <label>Title</label>
            <input id="mv-title" value="${CL.escapeHtml(existing?.title || "")}" placeholder="Movie title" required />
          </div>
          <div class="field">
            <label>Release year (optional)</label>
            <input id="mv-year" type="number" inputmode="numeric" value="${CL.escapeHtml(
              existing?.year ? String(existing.year) : ""
            )}" placeholder="e.g. 2023" />
          </div>
          <div class="field">
            <label>List</label>
            <select id="mv-list">
              <option value="watched" ${!existing || existing._list !== "wishlist" ? "selected" : ""}>Watched</option>
              <option value="wishlist" ${existing?._list === "wishlist" ? "selected" : ""}>Wishlist</option>
            </select>
          </div>
          <div class="field" id="mv-watched-year-wrap">
            <label>Year watched</label>
            <input id="mv-watched-year" type="number" inputmode="numeric" min="1900" max="2100" value="${CL.escapeHtml(
              String(defaultWatchedYear || "")
            )}" placeholder="${new Date().getFullYear()}" />
          </div>
          <div class="field" id="mv-rating-wrap">
            <label>Rating</label>
            ${CL.rating.starsHtml(existing?.rating || 0, { interactive: true, name: "movieRating" })}
          </div>
          <div class="field">
            <label>Review / notes</label>
            <textarea id="mv-review" placeholder="What did you think?">${CL.escapeHtml(existing?.review || "")}</textarea>
          </div>
          <button type="button" class="btn btn-primary btn-block" id="mv-save">Save</button>
        </div>
      `,
      onMount(body) {
        CL.rating.bindStars(body);
        const listEl = body.querySelector("#mv-list");
        const ratingWrap = body.querySelector("#mv-rating-wrap");
        const watchedYearWrap = body.querySelector("#mv-watched-year-wrap");
        const sync = () => {
          const watched = listEl.value === "watched";
          ratingWrap.style.display = watched ? "" : "none";
          watchedYearWrap.style.display = watched ? "" : "none";
        };
        listEl.addEventListener("change", sync);
        sync();

        body.querySelector("#mv-save").addEventListener("click", () => {
          const title = body.querySelector("#mv-title").value.trim();
          if (!title) {
            CL.toast("Add a title");
            return;
          }
          const yearRaw = body.querySelector("#mv-year").value.trim();
          const year = yearRaw ? Number(yearRaw) : null;
          const list = listEl.value;
          const rating = list === "watched" ? CL.rating.getStarValue(body, "movieRating") : 0;
          const review = body.querySelector("#mv-review").value.trim();
          const wyRaw = body.querySelector("#mv-watched-year").value.trim();
          let watchedYear = wyRaw ? Number(wyRaw) : null;
          if (list === "watched" && (!watchedYear || Number.isNaN(watchedYear))) {
            watchedYear = new Date().getFullYear();
          }
          onSave({
            id: existing?.id || CL.uid("mv"),
            title,
            year: year && !Number.isNaN(year) ? year : null,
            watchedYear: list === "watched" ? watchedYear : null,
            rating,
            review,
            list,
            addedAt: existing?.addedAt || Date.now()
          });
          CL.modal.close();
        });
      }
    });
  }

  function moviePayload(movie, extras) {
    extras = extras || {};
    return {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      watchedYear: movie.watchedYear != null ? movie.watchedYear : extras.watchedYear,
      rating: movie.rating,
      review: movie.review,
      addedAt: extras.addedAt != null ? extras.addedAt : movie.addedAt
    };
  }

  function render(root) {
    let tab = CL.storage.get("moviesTab", "watched");
    let sortBy = CL.storage.get(SORT_KEY, "rating");

    function paint() {
      const data = getData();
      const watched = data.watched || [];
      const wishlist = data.wishlist || [];
      const catalog = CL.data.movies || [];
      const known = new Set([...watched, ...wishlist].map((m) => m.title.toLowerCase()));
      const suggest = catalog.filter((m) => !known.has(m.title.toLowerCase()));

      // Wishlist default sort title if rating sort selected
      const effectiveSort =
        tab === "wishlist" && sortBy === "rating" ? "title" : sortBy;

      root.innerHTML = `
        <section class="page">
          <div class="row-between" style="margin-bottom:4px">
            <h1 class="page-title" style="margin:0">Movies</h1>
            <button type="button" class="btn btn-primary btn-sm" id="mv-add">+ Add</button>
          </div>
          <p class="page-sub">Watched, wishlist, ratings &amp; Grok recs</p>

          <div class="tabs" role="tablist">
            <button type="button" class="tab ${tab === "watched" ? "active" : ""}" data-tab="watched">Watched (${watched.length})</button>
            <button type="button" class="tab ${tab === "wishlist" ? "active" : ""}" data-tab="wishlist">Wishlist (${wishlist.length})</button>
            <button type="button" class="tab ${tab === "recs" ? "active" : ""}" data-tab="recs">Recs</button>
          </div>

          <div id="mv-panel"></div>
          <div id="mv-chat"></div>
        </section>
      `;

      const panel = root.querySelector("#mv-panel");

      if (tab === "watched") {
        const sorted = sortMovies(watched, effectiveSort);
        panel.innerHTML = watched.length
          ? `${sortBarHtml(effectiveSort, tab)}<div class="stack-sm">${sorted
              .map((m) => movieCard(m, "watched"))
              .join("")}</div>`
          : `<div class="empty"><div class="emoji">🎬</div><p>No watched movies yet. Add your first date-night film.</p>
             <button type="button" class="btn btn-primary btn-sm" id="mv-add-empty">+ Add movie</button></div>`;
      } else if (tab === "wishlist") {
        const sorted = sortMovies(wishlist, effectiveSort === "rating" ? "title" : effectiveSort);
        panel.innerHTML = wishlist.length
          ? `${sortBarHtml(effectiveSort === "rating" ? "title" : effectiveSort, tab)}<div class="stack-sm">${sorted
              .map((m) => movieCard(m, "wish"))
              .join("")}</div>`
          : `<div class="empty"><div class="emoji">✨</div><p>Wishlist is empty. Save something for next weekend.</p></div>`;
      } else {
        panel.innerHTML = `
          <p class="card-meta" style="margin-bottom:10px">From our seed catalog — add to wishlist or mark watched.</p>
          <div class="stack-sm">${
            suggest.map(catalogCard).join("") ||
            '<div class="empty"><p>You\'ve added everything in the starter list!</p></div>'
          }</div>
        `;
      }

      root.querySelectorAll(".tab").forEach((t) => {
        t.addEventListener("click", () => {
          tab = t.dataset.tab;
          CL.storage.set("moviesTab", tab);
          paint();
        });
      });

      panel.querySelector("#mv-sort")?.addEventListener("change", (e) => {
        sortBy = e.target.value;
        CL.storage.set(SORT_KEY, sortBy);
        paint();
      });

      const addBtn = root.querySelector("#mv-add");
      const addEmpty = root.querySelector("#mv-add-empty");
      const openAdd = () =>
        openMovieForm(null, (movie) => {
          const d = getData();
          if (movie.list === "wishlist") {
            d.wishlist = (d.wishlist || []).concat({
              id: movie.id,
              title: movie.title,
              year: movie.year,
              review: movie.review,
              addedAt: movie.addedAt
            });
          } else {
            d.watched = (d.watched || []).concat(moviePayload(movie));
          }
          setData(d);
          tab = movie.list === "wishlist" ? "wishlist" : "watched";
          CL.storage.set("moviesTab", tab);
          CL.toast("Movie saved");
          paint();
        });
      if (addBtn) addBtn.addEventListener("click", openAdd);
      if (addEmpty) addEmpty.addEventListener("click", openAdd);

      panel.querySelectorAll(".card[data-id]").forEach((card) => {
        const id = card.dataset.id;
        const mode = card.dataset.mode;
        const d = getData();

        card.querySelector(".btn-remove")?.addEventListener("click", () => {
          if (mode === "wish") d.wishlist = d.wishlist.filter((m) => m.id !== id);
          else d.watched = d.watched.filter((m) => m.id !== id);
          setData(d);
          CL.toast("Removed");
          paint();
        });

        card.querySelector(".btn-to-watched")?.addEventListener("click", () => {
          const item = d.wishlist.find((m) => m.id === id);
          if (!item) return;
          d.wishlist = d.wishlist.filter((m) => m.id !== id);
          openMovieForm(
            Object.assign({}, item, { _list: "watched", rating: 0 }),
            (movie) => {
              d.watched = (d.watched || []).concat(
                moviePayload(movie, { addedAt: Date.now() })
              );
              setData(d);
              tab = "watched";
              CL.storage.set("moviesTab", tab);
              CL.toast("Moved to watched");
              paint();
            }
          );
        });

        card.querySelector(".btn-edit")?.addEventListener("click", () => {
          const item = d.watched.find((m) => m.id === id);
          if (!item) return;
          openMovieForm(Object.assign({}, item, { _list: "watched" }), (movie) => {
            d.watched = d.watched.map((m) =>
              m.id === id ? moviePayload(movie, { addedAt: m.addedAt }) : m
            );
            setData(d);
            CL.toast("Updated");
            paint();
          });
        });
      });

      panel.querySelectorAll(".card[data-catalog]").forEach((card) => {
        const cid = card.dataset.catalog;
        const item = catalog.find((m) => m.id === cid);
        if (!item) return;

        card.querySelector(".btn-add-wish").addEventListener("click", () => {
          const d = getData();
          d.wishlist = (d.wishlist || []).concat({
            id: CL.uid("mv"),
            title: item.title,
            year: item.year,
            review: "",
            addedAt: Date.now()
          });
          setData(d);
          CL.toast("Added to wishlist");
          paint();
        });

        card.querySelector(".btn-add-watched").addEventListener("click", () => {
          openMovieForm(
            { title: item.title, year: item.year, _list: "watched", rating: 0, review: "" },
            (movie) => {
              const d = getData();
              d.watched = (d.watched || []).concat(moviePayload(movie));
              setData(d);
              tab = "watched";
              CL.storage.set("moviesTab", tab);
              CL.toast("Added to watched");
              paint();
            }
          );
        });
      });

      CL.chat.create(root.querySelector("#mv-chat"), {
        context: "movies",
        placeholder: "e.g. cozy romance after a long week",
        welcome:
          "Ask for movie ideas based on what you've watched and rated (decimals welcome). Try: “something feel-good” or “mind-bending sci-fi”."
      });
    }

    paint();
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.movies = { render };
})(window);
