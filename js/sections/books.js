(function (global) {
  function getData() {
    return CL.storage.get("books", { read: [], current: [], wishlist: [] });
  }

  function setData(d) {
    CL.storage.set("books", d);
  }

  function num(v, fallback) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function todayISO() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function addDaysISO(iso, days) {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return "";
    d.setDate(d.getDate() + days);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function planOf(b) {
    const pages = Math.max(0, Math.round(num(b && b.pages, 0)));
    const chapters = Math.max(0, Math.round(num(b && b.chapters, 0)));
    const weeks = Math.max(0, num(b && b.weeks, 0));
    let startDate = (b && b.startDate) || "";
    if (!startDate && b && b.addedAt) {
      try {
        startDate = new Date(b.addedAt).toISOString().slice(0, 10);
      } catch (_) {
        startDate = "";
      }
    }
    const meChapter = Math.max(0, Math.round(num(b && b.meChapter, 0)));
    const partnerChapter = Math.max(0, Math.round(num(b && b.partnerChapter, 0)));
    return { pages, chapters, weeks, startDate, meChapter, partnerChapter };
  }

  function hasPlan(plan) {
    return plan.pages > 0 && plan.chapters > 0 && plan.weeks > 0;
  }

  function expectedPace(plan) {
    if (!hasPlan(plan)) return null;
    const start = plan.startDate ? new Date(plan.startDate + "T00:00:00") : null;
    if (!start || isNaN(start.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const elapsed = Math.max(0, Math.round((today - start) / 86400000));
    const totalDays = plan.weeks * 7;
    if (totalDays <= 0) return null;
    const raw = plan.chapters * (elapsed / totalDays);
    const chapter = Math.max(0, Math.min(plan.chapters, Math.round(raw)));
    return {
      chapter,
      elapsed,
      totalDays,
      ended: elapsed >= totalDays,
      pct: plan.chapters ? (chapter / plan.chapters) * 100 : 0
    };
  }

  function paceDeltaCopy(name, current, expected) {
    const diff = current - expected;
    if (diff === 0) return CL.escapeHtml(name) + " is on pace";
    if (diff > 0) {
      return CL.escapeHtml(name) + " is " + diff + " chapter" + (diff === 1 ? "" : "s") + " ahead of pace";
    }
    const behind = Math.abs(diff);
    return CL.escapeHtml(name) + " is " + behind + " chapter" + (behind === 1 ? "" : "s") + " behind pace";
  }

  function baseBook(book, extra) {
    extra = extra || {};
    const plan = planOf(Object.assign({}, book, extra));
    return {
      id: book.id,
      title: book.title,
      author: book.author,
      rating: book.rating,
      review: book.review,
      addedAt: book.addedAt,
      pages: plan.pages,
      chapters: plan.chapters,
      weeks: plan.weeks,
      startDate: extra.startDate != null ? extra.startDate : plan.startDate,
      meChapter: Math.min(plan.meChapter, plan.chapters || plan.meChapter),
      partnerChapter: Math.min(plan.partnerChapter, plan.chapters || plan.partnerChapter)
    };
  }

  function planSummaryHtml(plan) {
    if (!hasPlan(plan)) {
      return `<p class="card-meta bk-plan-missing">Set a reading plan — pages, chapters, and weeks — to get a weekly pace.</p>`;
    }
    const chWeek = Math.round((plan.chapters / plan.weeks) * 10) / 10;
    const pgWeek = Math.round(plan.pages / plan.weeks);
    const pgDay = Math.round((plan.pages / (plan.weeks * 7)) * 10) / 10;
    const finish = addDaysISO(plan.startDate || todayISO(), Math.round(plan.weeks * 7));
    return `
      <div class="bk-plan-stats">
        <div class="bk-stat"><b>${chWeek}</b><span>chapters / week</span></div>
        <div class="bk-stat"><b>${pgWeek}</b><span>pages / week</span></div>
        <div class="bk-stat"><b>${pgDay}</b><span>pages / day</span></div>
      </div>
      <p class="card-meta">
        To finish in ${plan.weeks} week${plan.weeks === 1 ? "" : "s"}, read ${chWeek} chapter${chWeek === 1 ? "" : "s"} / week
        (about ${pgWeek} pages / week)${finish ? " · target " + formatDate(finish) : ""}.
      </p>
    `;
  }

  function sliderBlockHtml(b, plan) {
    const names = CL.profile.displayNames();
    if (!plan.chapters) {
      return `<p class="card-meta">Add a chapter count to unlock the progress sliders.</p>`;
    }
    const mePct = Math.round((plan.meChapter / plan.chapters) * 100);
    const partnerPct = Math.round((plan.partnerChapter / plan.chapters) * 100);
    const pace = expectedPace(plan);
    const pacePct = pace ? pace.pct : 0;
    const paceCopy = pace
      ? pace.ended
        ? "Plan ended — finish the book."
        : "Pace: chapter " + pace.chapter + " of " + plan.chapters + " by today"
      : "";
    return `
      <div class="bk-progress">
        ${
          pace
            ? `<div class="bk-pace-track" aria-hidden="true">
                <div class="bk-pace-pin" style="left:${pacePct}%" title="${CL.escapeHtml(paceCopy)}"></div>
              </div>
              <p class="bk-pace-copy">${CL.escapeHtml(paceCopy)}</p>`
            : ""
        }
        <div class="bk-reader me">
          <div class="bk-reader-top">
            <strong>${CL.escapeHtml(names.myName)}</strong>
            <span class="bk-pct me">${mePct}%</span>
          </div>
          <input type="range" class="bk-slider me" data-field="meChapter" data-id="${CL.escapeHtml(b.id)}"
            min="0" max="${plan.chapters}" step="1" value="${plan.meChapter}" />
          <p class="card-meta bk-slide-copy" data-copy="me">Chapter ${plan.meChapter} of ${plan.chapters}</p>
        </div>
        <div class="bk-reader partner">
          <div class="bk-reader-top">
            <strong>${CL.escapeHtml(names.partnerName)}</strong>
            <span class="bk-pct partner">${partnerPct}%</span>
          </div>
          <input type="range" class="bk-slider partner" data-field="partnerChapter" data-id="${CL.escapeHtml(b.id)}"
            min="0" max="${plan.chapters}" step="1" value="${plan.partnerChapter}" />
          <p class="card-meta bk-slide-copy" data-copy="partner">Chapter ${plan.partnerChapter} of ${plan.chapters}</p>
        </div>
        ${
          pace
            ? `<p class="card-meta bk-pace-delta">${paceDeltaCopy(names.myName, plan.meChapter, pace.chapter)}</p>
               <p class="card-meta bk-pace-delta">${paceDeltaCopy(names.partnerName, plan.partnerChapter, pace.chapter)}</p>`
            : ""
        }
      </div>
    `;
  }

  function bookCard(b, list) {
    const plan = planOf(b);
    return `
      <article class="card bk-card" data-id="${CL.escapeHtml(b.id)}" data-list="${list}">
        <div class="card-title">${CL.escapeHtml(b.title)}</div>
        <div class="card-meta">${CL.escapeHtml(b.author || "Unknown author")}${b.rating ? " · " : ""}</div>
        ${b.rating ? CL.rating.starsHtml(b.rating) : `<span class="tag ${list === "wishlist" ? "wish" : list === "current" ? "" : "muted"}">${list}</span>`}
        ${b.review ? `<p class="review-text">“${CL.escapeHtml(b.review)}”</p>` : ""}
        ${list === "current" ? planSummaryHtml(plan) + sliderBlockHtml(b, plan) : ""}
        <div class="card-actions">
          ${list === "wishlist" ? `<button type="button" class="btn btn-secondary btn-sm btn-to-current">Start reading</button>` : ""}
          ${list === "current" ? `<button type="button" class="btn btn-secondary btn-sm btn-edit-plan">Edit plan</button>` : ""}
          ${list === "current" ? `<button type="button" class="btn btn-primary btn-sm btn-to-read">Finished</button>` : ""}
          ${list !== "current" ? `<button type="button" class="btn btn-ghost btn-sm btn-edit">Edit</button>` : ""}
          <button type="button" class="btn btn-ghost btn-sm btn-remove">Remove</button>
        </div>
      </article>
    `;
  }

  function openForm(defaults, onSave) {
    defaults = defaults || {};
    const plan = planOf(defaults);
    const list = defaults._list || "read";
    CL.modal.open({
      title: defaults.id ? "Edit book" : "Add book",
      bodyHtml: `
        <div class="form-stack">
          <div class="field"><label>Title</label><input id="bk-title" value="${CL.escapeHtml(defaults.title || "")}" /></div>
          <div class="field"><label>Author</label><input id="bk-author" value="${CL.escapeHtml(defaults.author || "")}" /></div>
          <div class="field">
            <label>Shelf</label>
            <select id="bk-list">
              <option value="wishlist" ${list === "wishlist" ? "selected" : ""}>Wishlist</option>
              <option value="current" ${list === "current" ? "selected" : ""}>Currently reading</option>
              <option value="read" ${list === "read" || !list ? "selected" : ""}>Read</option>
            </select>
          </div>
          <div id="bk-plan-fields" class="form-stack" style="${list === "current" ? "" : "display:none"}">
            <div class="field"><label>Total pages</label><input id="bk-pages" type="number" min="1" inputmode="numeric" value="${plan.pages || ""}" /></div>
            <div class="field"><label>Total chapters</label><input id="bk-chapters" type="number" min="1" inputmode="numeric" value="${plan.chapters || ""}" /></div>
            <div class="field"><label>Weeks to finish</label><input id="bk-weeks" type="number" min="0.5" step="0.5" inputmode="decimal" value="${plan.weeks || ""}" /></div>
            <div class="field"><label>Start date</label><input id="bk-start" type="date" value="${CL.escapeHtml(plan.startDate || todayISO())}" /></div>
          </div>
          <div class="field" id="bk-rating-wrap">
            <label>Rating</label>
            ${CL.rating.starsHtml(defaults.rating || 0, { interactive: true, name: "bookRating" })}
          </div>
          <div class="field"><label>Review</label><textarea id="bk-review">${CL.escapeHtml(defaults.review || "")}</textarea></div>
          <button type="button" class="btn btn-primary btn-block" id="bk-save">Save</button>
        </div>
      `,
      onMount(body) {
        CL.rating.bindStars(body);
        const listEl = body.querySelector("#bk-list");
        const ratingWrap = body.querySelector("#bk-rating-wrap");
        const planWrap = body.querySelector("#bk-plan-fields");
        const sync = () => {
          ratingWrap.style.display = listEl.value === "read" ? "" : "none";
          planWrap.style.display = listEl.value === "current" ? "" : "none";
        };
        listEl.addEventListener("change", sync);
        sync();
        body.querySelector("#bk-save").addEventListener("click", () => {
          const title = body.querySelector("#bk-title").value.trim();
          if (!title) {
            CL.toast("Add a title");
            return;
          }
          const nextList = listEl.value;
          onSave(
            Object.assign({}, baseBook(defaults, {
              pages: body.querySelector("#bk-pages").value,
              chapters: body.querySelector("#bk-chapters").value,
              weeks: body.querySelector("#bk-weeks").value,
              startDate: body.querySelector("#bk-start").value
            }), {
              id: defaults.id || CL.uid("bk"),
              title,
              author: body.querySelector("#bk-author").value.trim(),
              list: nextList,
              rating: nextList === "read" ? CL.rating.getStarValue(body, "bookRating") : defaults.rating || 0,
              review: body.querySelector("#bk-review").value.trim(),
              addedAt: defaults.addedAt || Date.now(),
              startDate: body.querySelector("#bk-start").value || defaults.startDate || (nextList === "current" ? todayISO() : "")
            })
          );
          CL.modal.close();
        });
      }
    });
  }

  function upsertBook(book) {
    const data = getData();
    const entry = baseBook(book, { startDate: book.startDate });
    entry.startDate = book.startDate || entry.startDate;
    data.read = (data.read || []).filter((x) => x.id !== book.id);
    data.current = (data.current || []).filter((x) => x.id !== book.id);
    data.wishlist = (data.wishlist || []).filter((x) => x.id !== book.id);
    data[book.list] = (data[book.list] || []).concat(entry);
    setData(data);
    return book.list;
  }

  function patchCurrent(id, patch) {
    const data = getData();
    data.current = (data.current || []).map((b) => (b.id === id ? Object.assign({}, b, patch) : b));
    setData(data);
  }

  const sliderTimers = {};

  function bindSliders(root) {
    root.querySelectorAll(".bk-slider").forEach((slider) => {
      const wrap = slider.closest(".bk-reader");
      const card = slider.closest(".bk-card");
      slider.addEventListener("input", () => {
        const max = Number(slider.max) || 1;
        const val = Number(slider.value) || 0;
        const pctEl = wrap.querySelector(".bk-pct");
        const copyEl = wrap.querySelector(".bk-slide-copy");
        if (pctEl) pctEl.textContent = Math.round((val / max) * 100) + "%";
        if (copyEl) copyEl.textContent = "Chapter " + val + " of " + max;
        const id = slider.dataset.id;
        const field = slider.dataset.field;
        clearTimeout(sliderTimers[id + field]);
        sliderTimers[id + field] = setTimeout(() => {
          patchCurrent(id, { [field]: val });
        }, 180);
      });
      slider.addEventListener("change", () => {
        const id = slider.dataset.id;
        const field = slider.dataset.field;
        const value = Number(slider.value) || 0;
        clearTimeout(sliderTimers[id + field]);
        patchCurrent(id, { [field]: value });
        if (!card) return;
        const b = (getData().current || []).find((x) => x.id === id);
        if (!b) return;
        const plan = planOf(b);
        const pace = expectedPace(plan);
        if (!pace) return;
        const names = CL.profile.displayNames();
        const notes = card.querySelectorAll(".bk-pace-delta");
        if (notes[0]) notes[0].innerHTML = paceDeltaCopy(names.myName, plan.meChapter, pace.chapter);
        if (notes[1]) notes[1].innerHTML = paceDeltaCopy(names.partnerName, plan.partnerChapter, pace.chapter);
      });
    });
  }

  function render(root) {
    let tab = CL.storage.get("booksTab", "current");

    function paint() {
      const d = getData();
      root.innerHTML = `
        <section class="page">
          <div class="row-between" style="margin-bottom:4px">
            <h1 class="page-title" style="margin:0">Book Club</h1>
            <button type="button" class="btn btn-primary btn-sm" id="bk-add">+ Add</button>
          </div>
          <p class="page-sub">Plan the current read · slide chapters · see the pace marker</p>
          <div class="tabs">
            <button type="button" class="tab ${tab === "current" ? "active" : ""}" data-tab="current">Current (${(d.current || []).length})</button>
            <button type="button" class="tab ${tab === "read" ? "active" : ""}" data-tab="read">Read (${(d.read || []).length})</button>
            <button type="button" class="tab ${tab === "wishlist" ? "active" : ""}" data-tab="wishlist">Wish (${(d.wishlist || []).length})</button>
          </div>
          <div id="bk-panel"></div>
        </section>
      `;

      const panel = root.querySelector("#bk-panel");
      const list = d[tab] || [];
      panel.innerHTML = list.length
        ? `<div class="stack-sm">${list.map((b) => bookCard(b, tab)).join("")}</div>`
        : `<div class="empty"><div class="emoji">📚</div><p>Nothing on this shelf yet.</p></div>`;

      root.querySelectorAll(".tab").forEach((t) => {
        t.addEventListener("click", () => {
          tab = t.dataset.tab;
          CL.storage.set("booksTab", tab);
          paint();
        });
      });

      root.querySelector("#bk-add").addEventListener("click", () => {
        openForm({ _list: tab }, (book) => {
          tab = upsertBook(book);
          CL.storage.set("booksTab", tab);
          CL.toast("Book saved");
          paint();
        });
      });

      bindSliders(panel);

      panel.querySelectorAll(".card").forEach((card) => {
        const id = card.dataset.id;
        const listName = card.dataset.list;
        card.querySelector(".btn-remove")?.addEventListener("click", () => {
          const data = getData();
          data[listName] = (data[listName] || []).filter((b) => b.id !== id);
          setData(data);
          CL.toast("Removed");
          paint();
        });
        card.querySelector(".btn-edit")?.addEventListener("click", () => {
          const data = getData();
          const item = (data[listName] || []).find((b) => b.id === id);
          if (!item) return;
          openForm(Object.assign({}, item, { _list: listName }), (book) => {
            tab = upsertBook(book);
            CL.storage.set("booksTab", tab);
            CL.toast("Book saved");
            paint();
          });
        });
        card.querySelector(".btn-edit-plan")?.addEventListener("click", () => {
          const data = getData();
          const item = (data.current || []).find((b) => b.id === id);
          if (!item) return;
          openForm(Object.assign({}, item, { _list: "current" }), (book) => {
            tab = upsertBook(book);
            CL.storage.set("booksTab", tab);
            CL.toast("Plan saved");
            paint();
          });
        });
        card.querySelector(".btn-to-current")?.addEventListener("click", () => {
          const data = getData();
          const item = (data.wishlist || []).find((b) => b.id === id);
          if (!item) return;
          openForm(Object.assign({}, item, { _list: "current" }), (book) => {
            tab = upsertBook(book);
            CL.storage.set("booksTab", tab);
            CL.toast("Now reading");
            paint();
          });
        });
        card.querySelector(".btn-to-read")?.addEventListener("click", () => {
          const data = getData();
          const item = (data.current || []).find((b) => b.id === id);
          if (!item) return;
          openForm(Object.assign({}, item, { _list: "read" }), (book) => {
            tab = upsertBook(book);
            CL.storage.set("booksTab", tab);
            CL.toast("Marked as read");
            paint();
          });
        });
      });
    }

    paint();
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.books = { render };
})(window);
