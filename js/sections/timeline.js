/* Shared live calendar (sync key: calendar)
   Blue = Cole / you, pink = Lauren, red = both.
   Views: day, week, month. Events sync via the Couple Group. */
(function (global) {
  const STORAGE = "calendar";
  const VIEW_KEY = "cl_cal_view";
  const FOCUS_KEY = "cl_cal_focus";

  const WHO_META = {
    cole: { label: "Cole", color: "#0a3161", className: "cole" },
    lauren: { label: "Lauren", color: "#d45a68", className: "lauren" },
    together: { label: "Both", color: "#c41e3a", className: "together" }
  };

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function isoDate(d) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function parseDate(s) {
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function todayIso() {
    return isoDate(new Date());
  }

  function addDays(iso, n) {
    const d = parseDate(iso) || new Date();
    d.setDate(d.getDate() + n);
    return isoDate(d);
  }

  function startOfWeek(iso) {
    const d = parseDate(iso) || new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return isoDate(d);
  }

  function startOfMonth(iso) {
    const d = parseDate(iso) || new Date();
    return isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  function daysInMonth(iso) {
    const d = parseDate(iso) || new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }

  function monthLabel(iso) {
    const d = parseDate(iso) || new Date();
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  function dayLabel(iso) {
    const d = parseDate(iso) || new Date();
    return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  }

  function shortDay(iso) {
    const d = parseDate(iso) || new Date();
    return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
  }

  function formatTime(t) {
    if (!t) return "";
    const [h, m] = String(t).split(":").map(Number);
    if (isNaN(h)) return t;
    const am = h < 12;
    const hr = h % 12 || 12;
    return hr + ":" + pad2(m || 0) + (am ? " AM" : " PM");
  }

  function whoLabel(who) {
    const names = CL.profile && CL.profile.displayNames ? CL.profile.displayNames() : null;
    if (who === "cole") return (names && names.myName) || "Cole";
    if (who === "lauren") return (names && names.partnerName) || "Lauren";
    return "Both";
  }

  function normalizeEvent(raw) {
    if (!raw || !raw.id) return null;
    const date = String(raw.date || "").slice(0, 10);
    if (!parseDate(date)) return null;
    const who = raw.who === "lauren" || raw.who === "together" ? raw.who : "cole";
    return {
      id: String(raw.id),
      title: String(raw.title || "Untitled").slice(0, 200),
      date,
      time: String(raw.time || "").slice(0, 5),
      who,
      updatedAt: Number(raw.updatedAt) || 0
    };
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object") return { events: {}, deleted: {} };
    const events = {};
    const src = raw.events;
    const list = Array.isArray(src) ? src : Object.values(src || {});
    list.forEach((ev) => {
      const n = normalizeEvent(ev);
      if (n) events[n.id] = n;
    });
    const deleted = {};
    Object.keys(raw.deleted || {}).forEach((id) => {
      deleted[id] = Number(raw.deleted[id]) || 0;
    });
    Object.keys(deleted).forEach((id) => {
      const ev = events[id];
      if (ev && (ev.updatedAt || 0) <= deleted[id]) delete events[id];
    });
    return { events, deleted };
  }

  function getState() {
    return normalizeState(CL.storage.get(STORAGE, null));
  }

  function setState(s) {
    CL.storage.set(STORAGE, s);
    return s;
  }

  function eventList(state) {
    return Object.values((state && state.events) || {});
  }

  function mergeEvent(a, b) {
    if (!a) return b;
    if (!b) return a;
    return (b.updatedAt || 0) >= (a.updatedAt || 0) ? b : a;
  }

  function merge(local, remote) {
    const L = normalizeState(local);
    const R = normalizeState(remote);
    const deleted = Object.assign({}, L.deleted, R.deleted);
    Object.keys(L.deleted || {}).forEach((id) => {
      deleted[id] = Math.max(Number(L.deleted[id]) || 0, Number(deleted[id]) || 0);
    });
    Object.keys(R.deleted || {}).forEach((id) => {
      deleted[id] = Math.max(Number(R.deleted[id]) || 0, Number(deleted[id]) || 0);
    });
    const events = {};
    eventList(L).concat(eventList(R)).forEach((ev) => {
      if (!ev || !ev.id) return;
      events[ev.id] = mergeEvent(events[ev.id], ev);
    });
    Object.keys(deleted).forEach((id) => {
      const ev = events[id];
      if (ev && (ev.updatedAt || 0) <= deleted[id]) delete events[id];
    });
    return { events, deleted };
  }

  function shouldRepush(remote, merged) {
    const R = normalizeState(remote);
    const idsR = Object.keys(R.events || {});
    const idsM = Object.keys((merged && merged.events) || {});
    if (idsM.some((id) => idsR.indexOf(id) === -1)) return true;
    if (idsR.some((id) => idsM.indexOf(id) === -1)) return true;
    return idsM.some((id) => {
      const a = merged.events[id] || {};
      const b = R.events[id] || {};
      return (a.updatedAt || 0) > (b.updatedAt || 0);
    });
  }

  function saveEvent(patch) {
    const state = getState();
    const ev = normalizeEvent(
      Object.assign({}, patch, { updatedAt: Date.now(), id: patch.id || CL.uid("cal") })
    );
    if (!ev) return null;
    state.events[ev.id] = ev;
    if (state.deleted[ev.id]) delete state.deleted[ev.id];
    setState(state);
    return ev;
  }

  function deleteEvent(id) {
    const state = getState();
    delete state.events[id];
    state.deleted[id] = Date.now();
    setState(state);
  }

  function eventsOn(state, iso) {
    return eventList(state)
      .filter((ev) => ev.date === iso)
      .sort((a, b) => {
        if (a.time && b.time) return a.time < b.time ? -1 : a.time > b.time ? 1 : 0;
        if (a.time) return -1;
        if (b.time) return 1;
        return (a.title || "").localeCompare(b.title || "");
      });
  }

  function loadView() {
    try {
      const v = sessionStorage.getItem(VIEW_KEY);
      return v === "week" || v === "day" ? v : "month";
    } catch {
      return "month";
    }
  }

  function loadFocus() {
    try {
      const f = sessionStorage.getItem(FOCUS_KEY);
      return parseDate(f) ? f : todayIso();
    } catch {
      return todayIso();
    }
  }

  function saveNav(view, focus) {
    try {
      sessionStorage.setItem(VIEW_KEY, view);
      sessionStorage.setItem(FOCUS_KEY, focus);
    } catch (_) {}
  }

  function render(root) {
    let view = loadView();
    let focus = loadFocus();

    function paint() {
      const state = getState();
      const today = todayIso();
      saveNav(view, focus);

      root.innerHTML = `
        <section class="page cal-page">
          <div class="row-between" style="align-items:flex-start;margin-bottom:10px">
            <div>
              <h1 class="page-title" style="margin:0">Calendar</h1>
              <p class="page-sub" style="margin:4px 0 0">Shared schedule · both of you see the same events</p>
            </div>
            <button type="button" class="btn btn-primary btn-sm" id="cal-add">Add</button>
          </div>

          <div class="cal-views" role="tablist">
            <button type="button" class="cal-view-btn ${view === "day" ? "is-active" : ""}" data-view="day">Day</button>
            <button type="button" class="cal-view-btn ${view === "week" ? "is-active" : ""}" data-view="week">Week</button>
            <button type="button" class="cal-view-btn ${view === "month" ? "is-active" : ""}" data-view="month">Month</button>
          </div>

          <div class="cal-nav">
            <button type="button" class="icon-btn cal-nav-btn" id="cal-prev" aria-label="Previous">‹</button>
            <button type="button" class="btn btn-secondary btn-sm" id="cal-today">Today</button>
            <div class="cal-nav-label">${CL.escapeHtml(navLabel())}</div>
            <button type="button" class="icon-btn cal-nav-btn" id="cal-next" aria-label="Next">›</button>
          </div>

          <div class="cal-legend">
            <span class="cal-chip cole">${CL.escapeHtml(whoLabel("cole"))}</span>
            <span class="cal-chip lauren">${CL.escapeHtml(whoLabel("lauren"))}</span>
            <span class="cal-chip together">Both</span>
          </div>

          <div class="cal-body">${bodyHtml(state, today)}</div>
        </section>
      `;
      bind(state);
    }

    function navLabel() {
      if (view === "day") return dayLabel(focus);
      if (view === "week") {
        const start = startOfWeek(focus);
        const end = addDays(start, 6);
        return shortDay(start) + " – " + shortDay(end);
      }
      return monthLabel(focus);
    }

    function bodyHtml(state, today) {
      if (view === "day") return dayHtml(state, focus, today);
      if (view === "week") return weekHtml(state, focus, today);
      return monthHtml(state, focus, today);
    }

    function eventChip(ev, compact) {
      const meta = WHO_META[ev.who] || WHO_META.cole;
      const time = ev.time ? formatTime(ev.time) + " " : "";
      if (compact) {
        return `<button type="button" class="cal-chip-event ${meta.className}" data-id="${CL.escapeHtml(ev.id)}" title="${CL.escapeHtml(ev.title)}">${CL.escapeHtml(time + ev.title)}</button>`;
      }
      return `
        <button type="button" class="cal-event-card ${meta.className}" data-id="${CL.escapeHtml(ev.id)}">
          <div class="cal-event-time">${ev.time ? CL.escapeHtml(formatTime(ev.time)) : "All day"}</div>
          <div class="cal-event-title">${CL.escapeHtml(ev.title)}</div>
          <div class="cal-event-who">${CL.escapeHtml(whoLabel(ev.who))}</div>
        </button>`;
    }

    function dayHtml(state, iso, today) {
      const list = eventsOn(state, iso);
      const empty = list.length
        ? ""
        : `<p class="filter-hint" style="text-align:center;margin:24px 0">Nothing scheduled. Tap Add to put something on the calendar.</p>`;
      return `
        <div class="cal-dayview">
          <div class="cal-dayview-head ${iso === today ? "is-today" : ""}">${CL.escapeHtml(dayLabel(iso))}</div>
          ${empty}
          <div class="cal-event-list">${list.map((ev) => eventChip(ev, false)).join("")}</div>
        </div>`;
    }

    function weekHtml(state, iso, today) {
      const start = startOfWeek(iso);
      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i);
        const list = eventsOn(state, d);
        days.push(`
          <div class="cal-week-day ${d === today ? "is-today" : ""}" data-date="${d}">
            <button type="button" class="cal-week-head" data-date="${d}">${CL.escapeHtml(shortDay(d))}</button>
            <div class="cal-week-events">
              ${list.length ? list.map((ev) => eventChip(ev, true)).join("") : `<span class="cal-empty">—</span>`}
            </div>
          </div>`);
      }
      return `<div class="cal-week">${days.join("")}</div>`;
    }

    function monthHtml(state, iso, today) {
      const first = startOfMonth(iso);
      const firstDate = parseDate(first);
      const lead = firstDate.getDay();
      const count = daysInMonth(iso);
      const cells = [];
      for (let i = 0; i < lead; i++) cells.push(`<div class="cal-day is-pad"></div>`);
      for (let n = 1; n <= count; n++) {
        const d = isoDate(new Date(firstDate.getFullYear(), firstDate.getMonth(), n));
        const list = eventsOn(state, d);
        const dots = list
          .slice(0, 3)
          .map((ev) => `<span class="cal-dot ${WHO_META[ev.who].className}"></span>`)
          .join("");
        const more = list.length > 3 ? `<span class="cal-more">+${list.length - 3}</span>` : "";
        cells.push(`
          <button type="button" class="cal-day ${d === today ? "is-today" : ""} ${d === focus ? "is-focus" : ""}" data-date="${d}">
            <span class="cal-day-num">${n}</span>
            <span class="cal-day-dots">${dots}${more}</span>
          </button>`);
      }
      return `
        <div class="cal-month">
          <div class="cal-dow">S</div><div class="cal-dow">M</div><div class="cal-dow">T</div>
          <div class="cal-dow">W</div><div class="cal-dow">T</div><div class="cal-dow">F</div><div class="cal-dow">S</div>
          ${cells.join("")}
        </div>`;
    }

    function bind(state) {
      root.querySelectorAll(".cal-view-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          view = btn.dataset.view;
          paint();
        });
      });
      root.querySelector("#cal-prev")?.addEventListener("click", () => {
        if (view === "day") focus = addDays(focus, -1);
        else if (view === "week") focus = addDays(focus, -7);
        else {
          const d = parseDate(focus);
          focus = isoDate(new Date(d.getFullYear(), d.getMonth() - 1, 1));
        }
        paint();
      });
      root.querySelector("#cal-next")?.addEventListener("click", () => {
        if (view === "day") focus = addDays(focus, 1);
        else if (view === "week") focus = addDays(focus, 7);
        else {
          const d = parseDate(focus);
          focus = isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 1));
        }
        paint();
      });
      root.querySelector("#cal-today")?.addEventListener("click", () => {
        focus = todayIso();
        paint();
      });
      root.querySelector("#cal-add")?.addEventListener("click", () => openForm(null, focus));
      root.querySelectorAll("[data-date]").forEach((el) => {
        el.addEventListener("click", (e) => {
          if (e.target.closest("[data-id]")) return;
          focus = el.dataset.date;
          view = "day";
          paint();
        });
      });
      root.querySelectorAll("[data-id]").forEach((el) => {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          const ev = getState().events[el.dataset.id];
          if (ev) openForm(ev);
        });
      });
    }

    function openForm(existing, defaultDate) {
      const ev = existing || { title: "", date: defaultDate || focus, time: "", who: "cole" };
      CL.modal.open({
        title: existing ? "Edit activity" : "New activity",
        subtitle: "Both of you will see this on the shared calendar",
        bodyHtml: `
          <form id="cal-form" class="stack-sm">
            <label class="field">
              <span>What</span>
              <input type="text" name="title" required maxlength="200" value="${CL.escapeHtml(ev.title || "")}" placeholder="Dinner, movie, trip…" />
            </label>
            <label class="field">
              <span>Date</span>
              <input type="date" name="date" required value="${CL.escapeHtml(ev.date || "")}" />
            </label>
            <label class="field">
              <span>Time (optional)</span>
              <input type="time" name="time" value="${CL.escapeHtml(ev.time || "")}" />
            </label>
            <label class="field">
              <span>Who</span>
              <select name="who">
                <option value="cole" ${ev.who === "cole" ? "selected" : ""}>${CL.escapeHtml(whoLabel("cole"))} · blue</option>
                <option value="lauren" ${ev.who === "lauren" ? "selected" : ""}>${CL.escapeHtml(whoLabel("lauren"))} · pink</option>
                <option value="together" ${ev.who === "together" ? "selected" : ""}>Both · red</option>
              </select>
            </label>
            <button type="submit" class="btn btn-primary btn-block">${existing ? "Save changes" : "Add to calendar"}</button>
            ${existing ? `<button type="button" class="btn btn-secondary btn-block" id="cal-del">Delete</button>` : ""}
          </form>
        `,
        onMount: (body) => {
          const form = body.querySelector("#cal-form");
          form.addEventListener("submit", (e) => {
            e.preventDefault();
            const data = new FormData(form);
            saveEvent({
              id: existing && existing.id,
              title: String(data.get("title") || "").trim(),
              date: data.get("date"),
              time: data.get("time") || "",
              who: data.get("who")
            });
            CL.modal.close();
            CL.toast(existing ? "Activity updated" : "Activity added");
            focus = data.get("date") || focus;
            paint();
          });
          body.querySelector("#cal-del")?.addEventListener("click", () => {
            if (!existing) return;
            deleteEvent(existing.id);
            CL.modal.close();
            CL.toast("Activity deleted");
            paint();
          });
        }
      });
    }

    paint();
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.timeline = { render };
  global.CL.sections.calendar = { render };
  global.CL.calendar = { merge, shouldRepush, getState, saveEvent, deleteEvent };
  global.CL.timeline = { merge, shouldRepush };
})(window);
