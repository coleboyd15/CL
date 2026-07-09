(function (global) {
  const FILTERS = [
    { id: "near", label: "Nearby (<1 mi)", special: "near" },
    { id: "walk", label: "Walkable", key: "walk", min: 4 },
    { id: "quality", label: "Quality", key: "quality", min: 4 },
    { id: "vibe", label: "Great vibe", key: "vibe", min: 4 },
    { id: "afford", label: "Affordable", key: "price", max: 2 },
    { id: "dinner", label: "Dinner", type: "dinner" },
    { id: "cafe", label: "Café", type: "café" },
    { id: "dessert", label: "Dessert", type: "dessert" },
    { id: "drinks", label: "Drinks", type: "drinks" },
    { id: "wish", label: "Wishlist", special: "wishlist" },
    { id: "visited", label: "Visited", special: "visited" }
  ];

  function getState() {
    return CL.storage.get("places", {});
  }

  function savePlace(id, patch) {
    return CL.storage.update(
      "places",
      (all) => {
        all = all || {};
        all[id] = Object.assign({ visited: false, wishlist: false, rating: 0, notes: "" }, all[id] || {}, patch);
        return all;
      },
      {}
    );
  }

  function enrichedPlaces() {
    const loc = CL.geo.getSavedLocation();
    return CL.geo.placesWithDistance(CL.data.places || [], loc).map((base) => {
      const s = getState()[base.id] || {};
      return Object.assign({}, base, {
        visited: !!s.visited,
        wishlist: !!s.wishlist,
        rating: s.rating || 0,
        notes: s.notes || ""
      });
    });
  }

  function applyFilters(list, active) {
    if (!active.length) return list;
    return list.filter((p) => {
      return active.every((fid) => {
        const f = FILTERS.find((x) => x.id === fid);
        if (!f) return true;
        if (f.type) return p.type === f.type;
        if (f.special === "wishlist") return p.wishlist;
        if (f.special === "visited") return p.visited;
        if (f.special === "near") {
          return p.distanceMiles != null && p.distanceMiles <= 1;
        }
        if (f.min != null) return p[f.key] >= f.min;
        if (f.max != null) return p[f.key] <= f.max;
        return true;
      });
    });
  }

  function scoresHtml(p) {
    return `
      <div class="scores">
        ${p.distanceLabel ? `<span class="score-pill dist">📍 ${CL.escapeHtml(p.distanceLabel)}</span>` : ""}
        <span class="score-pill">Walk ${p.walk}/5</span>
        <span class="score-pill">Quality ${p.quality}/5</span>
        <span class="score-pill">Vibe ${p.vibe}/5</span>
        <span class="score-pill price">$ ${p.price}/5</span>
      </div>
    `;
  }

  function cardHtml(p) {
    return `
      <article class="card place-card" data-id="${CL.escapeHtml(p.id)}">
        <div class="card-row">
          <div class="card-body">
            <div class="card-title">
              <span class="type-badge">${CL.escapeHtml(p.type)}</span>
              ${CL.escapeHtml(p.name)}
            </div>
            <div class="card-meta">${CL.escapeHtml(p.area)} · ${CL.escapeHtml(p.cuisine)}
              ${p.distanceLabel ? ` · <strong>${CL.escapeHtml(p.distanceLabel)}</strong>` : ""}
              ${p.visited ? ' · <span class="tag">Visited</span>' : ""}
              ${p.wishlist ? ' · <span class="tag wish">Wishlist</span>' : ""}
            </div>
            <p class="review-text" style="font-style:normal">${CL.escapeHtml(p.blurb)}</p>
            ${scoresHtml(p)}
            ${p.rating ? `<div style="margin-top:8px">${CL.rating.starsHtml(p.rating)}</div>` : ""}
            ${p.notes ? `<p class="review-text">${CL.escapeHtml(p.notes)}</p>` : ""}
            <div class="card-actions">
              <button type="button" class="btn btn-secondary btn-sm btn-open">Details</button>
              <button type="button" class="btn btn-ghost btn-sm btn-quick-wish">${p.wishlist ? "♥ Saved" : "♡ Wishlist"}</button>
            </div>
          </div>
          <button type="button" class="wish-btn ${p.wishlist ? "on" : ""}" aria-label="Toggle wishlist">${p.wishlist ? "♥" : "♡"}</button>
        </div>
      </article>
    `;
  }

  function openDetail(placeId, rerender) {
    const base = enrichedPlaces().find((p) => p.id === placeId);
    if (!base) return;
    const p = base;

    CL.modal.open({
      title: p.name,
      subtitle: `${p.type} · ${p.area} · ${p.cuisine}${p.distanceLabel ? " · " + p.distanceLabel : ""}`,
      bodyHtml: `
        <p style="margin-bottom:12px">${CL.escapeHtml(p.blurb)}</p>
        ${scoresHtml(p)}
        <div class="form-stack" style="margin-top:14px">
          <div class="toggle-row">
            <span>Visited together</span>
            <label><input type="checkbox" id="f-visited" ${p.visited ? "checked" : ""} /></label>
          </div>
          <div class="toggle-row">
            <span>Wishlist</span>
            <label><input type="checkbox" id="f-wish" ${p.wishlist ? "checked" : ""} /></label>
          </div>
          <div class="field">
            <label>Your rating</label>
            ${CL.rating.starsHtml(p.rating || 0, { interactive: true, name: "placeRating" })}
          </div>
          <div class="field">
            <label>Notes</label>
            <textarea id="f-notes" placeholder="What did you love? Dishes to reorder?">${CL.escapeHtml(p.notes)}</textarea>
          </div>
          <button type="button" class="btn btn-primary btn-block" id="f-save">Save</button>
        </div>
      `,
      onMount(body) {
        CL.rating.bindStars(body);
        body.querySelector("#f-save").addEventListener("click", () => {
          const rating = CL.rating.getStarValue(body, "placeRating");
          savePlace(placeId, {
            visited: body.querySelector("#f-visited").checked,
            wishlist: body.querySelector("#f-wish").checked,
            rating,
            notes: body.querySelector("#f-notes").value.trim()
          });
          CL.toast("Saved to your places");
          CL.modal.close();
          rerender();
        });
      }
    });
  }

  function locationBannerHtml(loc, locating) {
    if (locating) {
      return `
        <div class="card location-banner">
          <div class="card-title">Finding you…</div>
          <p class="card-meta">Requesting browser location permission</p>
        </div>`;
    }
    if (loc) {
      const when = loc.updatedAt ? new Date(loc.updatedAt).toLocaleString() : "";
      return `
        <div class="card location-banner on">
          <div class="row-between">
            <div>
              <div class="card-title">📍 Using your location</div>
              <p class="card-meta">Distances are approximate · updated ${CL.escapeHtml(when)}</p>
              <p class="card-meta mono">${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}</p>
            </div>
          </div>
          <div class="card-actions">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-locate">Refresh location</button>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-clear-loc">Clear</button>
          </div>
        </div>`;
    }
    return `
      <div class="card location-banner">
        <div class="card-title">See places near you</div>
        <p class="card-meta" style="margin-bottom:10px">
          Tap to share GPS. Mock venues are placed around your real coordinates so distances feel local.
        </p>
        <button type="button" class="btn btn-primary" id="btn-locate">Use My Location</button>
      </div>`;
  }

  function render(root) {
    let active = CL.storage.get("foodFilters", []);
    let locating = false;

    async function doLocate() {
      locating = true;
      paint();
      try {
        await CL.geo.requestLocation();
        CL.toast("Location updated");
      } catch (err) {
        CL.toast(err.message || "Location failed");
      } finally {
        locating = false;
        paint();
      }
    }

    function paint() {
      const loc = CL.geo.getSavedLocation();
      let places = enrichedPlaces();

      // Sort by distance when location is on
      if (loc) {
        places = places.slice().sort((a, b) => (a.distanceMiles || 99) - (b.distanceMiles || 99));
      }

      const filtered = applyFilters(places, active);
      const names = CL.profile.displayNames();

      root.innerHTML = `
        <section class="page">
          <h1 class="page-title">Food, Drink & Dessert</h1>
          <p class="page-sub">For ${CL.escapeHtml(names.myName)} & ${CL.escapeHtml(names.partnerName)} · filters, visits & Grok</p>

          <div class="section-block" id="loc-wrap">
            ${locationBannerHtml(loc, locating)}
          </div>

          <div class="filter-bar section-block">
            <div class="section-label">Filters</div>
            <div class="chips" id="food-chips">
              ${FILTERS.map(
                (f) =>
                  `<button type="button" class="chip ${active.includes(f.id) ? "active" : ""}" data-filter="${f.id}">${f.label}</button>`
              ).join("")}
            </div>
            <p class="filter-hint">${filtered.length} place${filtered.length === 1 ? "" : "s"}${loc ? " · sorted by distance" : " · enable location for miles"}</p>
          </div>

          <div class="stack-sm" id="food-list">
            ${
              filtered.length
                ? filtered.map(cardHtml).join("")
                : `<div class="empty"><div class="emoji">🍽️</div><p>No places match these filters. Loosen them a bit.</p></div>`
            }
          </div>

          <div id="food-chat"></div>
        </section>
      `;

      root.querySelector("#btn-locate")?.addEventListener("click", doLocate);
      root.querySelector("#btn-clear-loc")?.addEventListener("click", () => {
        CL.geo.clearLocation();
        CL.toast("Location cleared");
        paint();
      });

      root.querySelectorAll("#food-chips .chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          const id = chip.dataset.filter;
          if (active.includes(id)) active = active.filter((x) => x !== id);
          else active = active.concat(id);
          CL.storage.set("foodFilters", active);
          paint();
        });
      });

      root.querySelectorAll(".place-card").forEach((card) => {
        const id = card.dataset.id;
        card.querySelector(".btn-open").addEventListener("click", () => openDetail(id, paint));
        const toggleWish = () => {
          const cur = enrichedPlaces().find((p) => p.id === id);
          savePlace(id, { wishlist: !cur.wishlist });
          CL.toast(cur.wishlist ? "Removed from wishlist" : "Added to wishlist");
          paint();
        };
        card.querySelector(".wish-btn").addEventListener("click", toggleWish);
        card.querySelector(".btn-quick-wish").addEventListener("click", toggleWish);
      });

      CL.chat.create(root.querySelector("#food-chat"), {
        context: "food",
        placeholder: "e.g. Ask us about dinner then recommend a place",
        welcome: loc
          ? "I can see your location. Tell me what you're craving — or say “interview us for dinner” and I’ll ask questions first, then recommend nearby."
          : "Tip: tap Use My Location for distances. Or say “ask us questions about dinner then recommend a place.”"
      });
    }

    paint();
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.food = { render };
})(window);
