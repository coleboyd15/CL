/* Shared Cole / Lauren / Together timeline (sync key: timeline) */
(function (global) {
  const STORAGE = "timeline";
  const COL_W = 52;
  const GANTT_START = "2026-09";
  const GANTT_END_FINITE = "2029-12";

  const WHO_META = {
    cole: { label: "Cole", short: "Cole" },
    lauren: { label: "Lauren", short: "Lauren" },
    together: { label: "Together", short: "Us" }
  };

  const DEFAULT_ITEMS = [
    {
      id: "tl_cole_nomad",
      who: "cole",
      start: "2026-09",
      end: "2026-09",
      title: "Nomad"
    },
    {
      id: "tl_cole_al_init",
      who: "cole",
      start: "2026-10",
      end: "2026-11",
      title: "Alabama Initial Training"
    },
    {
      id: "tl_cole_break",
      who: "cole",
      start: "2026-12",
      end: "2027-01",
      title: "Break"
    },
    {
      id: "tl_cole_bell",
      who: "cole",
      start: "2027-02",
      end: "2027-11",
      title: "Bell 505 and Huey Alabama"
    },
    {
      id: "tl_cole_hh60",
      who: "cole",
      start: "2027-12",
      end: "2028-04",
      title: "HH60 New Mexico"
    },
    {
      id: "tl_lauren_dallas",
      who: "lauren",
      start: "2026-09",
      end: "2027-06",
      title: "Dallas Lease"
    },
    {
      id: "tl_lauren_ld",
      who: "lauren",
      start: "2027-07",
      end: "2028-04",
      title: "Keep doing long distance or move to Deloitte other office or remote"
    },
    {
      id: "tl_tog_tucson",
      who: "together",
      start: "2028-05",
      end: "2029-05",
      title: "Tucson together"
    },
    {
      id: "tl_tog_endless",
      who: "together",
      start: "2029-06",
      end: "",
      open: true,
      title:
        "Endless possibilities of an awesome life of mullet kids and grok houses and whoofing and travel and flower boot stores and book club and tacos and new hobbies and card games and friends trips and living to 150 and podcasts and potentially fighting AI robots or becoming unemployed by them or traversing outer space or really whatever we want"
    },
    {
      id: "tl_tog_death",
      who: "together",
      start: "2176-01",
      end: "2176-01",
      marker: true,
      title: "Death"
    }
  ];

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function ymKey(y, m) {
    return y + "-" + pad2(m);
  }

  function parseYM(s) {
    const p = String(s || "").split("-").map(Number);
    if (p.length < 2 || !p[0] || !p[1]) return null;
    return { y: p[0], m: p[1] };
  }

  function ymAdd(key, n) {
    const p = parseYM(key);
    if (!p) return key;
    const idx = p.y * 12 + (p.m - 1) + n;
    const y = Math.floor(idx / 12);
    const m = ((idx % 12) + 12) % 12;
    return ymKey(y, m + 1);
  }

  function currentYM(now) {
    now = now || new Date();
    return ymKey(now.getFullYear(), now.getMonth() + 1);
  }

  function monthLabel(key, compact) {
    const p = parseYM(key);
    if (!p) return key;
    const d = new Date(p.y, p.m - 1, 1);
    if (compact) {
      return d.toLocaleDateString(undefined, { month: "short" }) + " " + String(p.y).slice(2);
    }
    return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  }

  function rangeLabel(item) {
    if (item.marker) return monthLabel(item.start);
    if (item.open || !item.end) return monthLabel(item.start) + " → onward";
    if (item.start === item.end) return monthLabel(item.start);
    return monthLabel(item.start) + " – " + monthLabel(item.end);
  }

  function normalizeItem(raw) {
    if (!raw || !raw.id) return null;
    const who = raw.who === "lauren" || raw.who === "together" ? raw.who : "cole";
    const start = String(raw.start || "").slice(0, 7);
    if (!parseYM(start)) return null;
    const open = !!raw.open || !raw.end;
    const marker = !!raw.marker;
    return {
      id: String(raw.id),
      who,
      start,
      end: marker || !open ? String(raw.end || start).slice(0, 7) : "",
      open: marker ? false : open,
      marker,
      title: String(raw.title || "").slice(0, 800),
      updatedAt: Number(raw.updatedAt) || 0
    };
  }

  function seedItems() {
    const now = Date.now();
    const items = {};
    DEFAULT_ITEMS.forEach((d) => {
      const it = normalizeItem(Object.assign({}, d, { updatedAt: now }));
      if (it) items[it.id] = it;
    });
    return items;
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object") {
      return { items: seedItems(), deleted: {} };
    }
    const items = {};
    const src = raw.items;
    const list = Array.isArray(src) ? src : Object.values(src || {});
    list.forEach((it) => {
      const n = normalizeItem(it);
      if (n) items[n.id] = n;
    });
    const deleted = {};
    Object.keys(raw.deleted || {}).forEach((id) => {
      deleted[id] = Number(raw.deleted[id]) || 0;
    });
    if (!Object.keys(items).length && !Object.keys(deleted).length) {
      return { items: seedItems(), deleted: {} };
    }
    Object.keys(deleted).forEach((id) => {
      const it = items[id];
      if (it && (it.updatedAt || 0) <= deleted[id]) delete items[id];
    });
    return { items, deleted };
  }

  function getState() {
    const raw = CL.storage.get(STORAGE, null);
    const state = normalizeState(raw);
    if (raw == null) setState(state);
    return state;
  }

  function setState(s) {
    CL.storage.set(STORAGE, s);
    return s;
  }

  function itemList(state) {
    return Object.values((state && state.items) || {});
  }

  function covers(item, ym) {
    if (!item || !ym) return false;
    if (item.marker) return item.start === ym;
    if (ym < item.start) return false;
    if (item.open || !item.end) return ym >= item.start;
    return ym >= item.start && ym <= item.end;
  }

  function mergeItem(a, b) {
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
    const items = {};
    itemList(L).concat(itemList(R)).forEach((it) => {
      if (!it || !it.id) return;
      items[it.id] = mergeItem(items[it.id], it);
    });
    Object.keys(deleted).forEach((id) => {
      const it = items[id];
      if (it && (it.updatedAt || 0) <= deleted[id]) delete items[id];
    });
    return { items, deleted };
  }

  function shouldRepush(remote, merged) {
    const R = normalizeState(remote);
    const idsR = Object.keys(R.items || {});
    const idsM = Object.keys((merged && merged.items) || {});
    if (idsM.some((id) => idsR.indexOf(id) === -1)) return true;
    if (idsR.some((id) => idsM.indexOf(id) === -1)) return true;
    return idsM.some((id) => {
      const a = merged.items[id] || {};
      const b = R.items[id] || {};
      return (a.updatedAt || 0) > (b.updatedAt || 0);
    });
  }

  function ganttMonths(state) {
    const months = [];
    let k = GANTT_START;
    while (k <= GANTT_END_FINITE) {
      months.push(k);
      k = ymAdd(k, 1);
    }
    months.push("_onward");
    const hasDeath = itemList(state).some((it) => it.marker && /death/i.test(it.title));
    if (hasDeath) months.push("_death");
    else {
      const markers = itemList(state).filter((it) => it.marker);
      if (markers.length) months.push("_death");
    }
    return months;
  }

  function blockSpan(item, months) {
    if (item.marker) {
      const i = months.indexOf("_death");
      if (i < 0) return null;
      return { startI: i, endI: i };
    }
    let startI = months.indexOf(item.start);
    if (startI < 0) {
      if (item.start < months[0]) startI = 0;
      else if (item.open) startI = months.indexOf("_onward");
      else return null;
    }
    if (startI < 0) return null;
    let endI;
    if (item.open) {
      const onward = months.indexOf("_onward");
      endI = onward >= 0 ? onward : months.length - 1;
    } else {
      endI = months.indexOf(item.end);
      if (endI < 0) {
        endI = item.end > GANTT_END_FINITE ? months.indexOf("_onward") : startI;
      }
    }
    if (endI < 0) endI = startI;
    if (endI < startI) endI = startI;
    return { startI, endI };
  }

  function saveItem(patch) {
    const state = getState();
    const item = normalizeItem(
      Object.assign({}, patch, { updatedAt: Date.now(), id: patch.id || CL.uid("tl") })
    );
    if (!item) return null;
    state.items[item.id] = item;
    if (state.deleted[item.id]) delete state.deleted[item.id];
    setState(state);
    return item;
  }

  function deleteItem(id) {
    const state = getState();
    delete state.items[id];
    state.deleted[id] = Date.now();
    setState(state);
  }

  function monthsBetweenKeys(a, b) {
    const pa = parseYM(a);
    const pb = parseYM(b);
    if (!pa || !pb) return 0;
    return (pb.y - pa.y) * 12 + (pb.m - pa.m);
  }

  function detailMonths(state) {
    const items = itemList(state).filter((it) => !it.marker);
    let max = GANTT_END_FINITE;
    items.forEach((it) => {
      if (it.end && it.end > max && it.end < "2100-01") max = it.end;
    });
    const out = [];
    let k = GANTT_START;
    const last = max < "2029-06" ? "2029-05" : max > "2030-12" ? "2030-12" : max;
    while (k <= last) {
      out.push(k);
      k = ymAdd(k, 1);
    }
    return out;
  }

  function render(root) {
    let editing = false;

    function paint() {
      const state = getState();
      const nowYM = currentYM();
      const months = ganttMonths(state);
      const items = itemList(state).sort((a, b) => {
        if (a.start !== b.start) return a.start < b.start ? -1 : 1;
        if (!!a.marker !== !!b.marker) return a.marker ? 1 : -1;
        return (a.title || "").localeCompare(b.title || "");
      });

      root.innerHTML = `
        <section class="page tl-page ${editing ? "is-editing" : ""}">
          <div class="row-between" style="align-items:flex-start;margin-bottom:10px">
            <div>
              <h1 class="page-title" style="margin:0">Timeline</h1>
              <p class="page-sub" style="margin:4px 0 0">Cole, Lauren, and together</p>
            </div>
            <div class="card-actions" style="margin:0">
              <button type="button" class="btn btn-sm ${editing ? "btn-primary" : "btn-secondary"}" id="tl-edit">${
                editing ? "Done" : "Edit"
              }</button>
            </div>
          </div>

          <div class="tl-legend">
            <span class="tl-chip cole">Cole</span>
            <span class="tl-chip lauren">Lauren</span>
            <span class="tl-chip together">Together</span>
          </div>

          ${ganttHtml(state, items, months, nowYM)}

          ${editing ? `<button type="button" class="btn btn-primary btn-block" id="tl-add" style="margin:12px 0">Add a block</button>` : ""}

          <div class="section-label" style="margin-top:16px">Month by month</div>
          <div class="tl-months-list">
            ${detailHtml(state, nowYM)}
          </div>
        </section>
      `;
      bind(state);
      scrollGanttToNow(nowYM, months);
    }

    function ganttHtml(state, items, months, nowYM) {
      const lanes = ["cole", "lauren", "together"];
      const width = months.length * COL_W;
      const head = months
        .map((m) => {
          if (m === "_onward") {
            return `<div class="tl-col-h" style="width:${COL_W}px">Onward</div>`;
          }
          if (m === "_death") {
            return `<div class="tl-col-h tl-col-death" style="width:${COL_W}px">Death</div>`;
          }
          return `<div class="tl-col-h ${m === nowYM ? "is-now" : ""}" style="width:${COL_W}px">${CL.escapeHtml(
            monthLabel(m, true)
          )}</div>`;
        })
        .join("");

      const laneRows = lanes
        .map((who) => {
          const blocks = items
            .filter((it) => it.who === who)
            .map((it) => {
              const span = blockSpan(it, months);
              if (!span) return "";
              const left = span.startI * COL_W + 2;
              const w = (span.endI - span.startI + 1) * COL_W - 4;
              return `<button type="button" class="tl-block ${who} ${it.marker ? "is-marker" : ""}" data-id="${CL.escapeHtml(
                it.id
              )}" style="left:${left}px;width:${w}px" title="${CL.escapeHtml(it.title)}">${CL.escapeHtml(
                it.title
              )}</button>`;
            })
            .join("");
          return `
            <div class="tl-lane">
              <div class="tl-lane-name ${who}">${WHO_META[who].short}</div>
              <div class="tl-lane-track" style="width:${width}px">${blocks}</div>
            </div>`;
        })
        .join("");

      return `
        <div class="tl-gantt" id="tl-gantt">
          <div class="tl-gantt-head">
            <div class="tl-lane-name tl-corner"></div>
            <div class="tl-head-track" style="width:${width}px">${head}</div>
          </div>
          ${laneRows}
        </div>
        <p class="filter-hint">Swipe sideways on the chart · current month is highlighted</p>
      `;
    }

    function detailHtml(state, nowYM) {
      const items = itemList(state);
      const months = detailMonths(state);
      const openItems = items.filter((it) => it.open && !it.marker);
      const markers = items.filter((it) => it.marker);

      const monthCards = months
        .map((ym) => {
          const here = items.filter((it) => !it.marker && covers(it, ym));
          const tog = here.filter((it) => it.who === "together");
          const cole = here.filter((it) => it.who === "cole");
          const lauren = here.filter((it) => it.who === "lauren");
          const isNow = ym === nowYM;
          let body;
          if (tog.length) {
            body = `<div class="tl-pair single">${tog.map((it) => detailChip(it)).join("")}</div>`;
          } else {
            body = `<div class="tl-pair">
              <div>${cole.length ? cole.map((it) => detailChip(it)).join("") : `<div class="tl-empty">Cole —</div>`}</div>
              <div>${lauren.length ? lauren.map((it) => detailChip(it)).join("") : `<div class="tl-empty">Lauren —</div>`}</div>
            </div>`;
          }
          return `
            <article class="tl-month-card ${isNow ? "is-now" : ""}" data-ym="${ym}">
              <div class="tl-month-head">
                <strong>${CL.escapeHtml(monthLabel(ym))}</strong>
                ${isNow ? `<span class="tl-now-badge">Now</span>` : ""}
              </div>
              ${body}
            </article>`;
        })
        .join("");

      const onward = openItems
        .map((it) => {
          return `
            <article class="tl-month-card together-card">
              <div class="tl-month-head">
                <strong>${CL.escapeHtml(monthLabel(it.start))} onward</strong>
              </div>
              ${detailChip(it)}
            </article>`;
        })
        .join("");

      const death = markers
        .map((it) => {
          return `
            <article class="tl-month-card marker-card">
              <div class="tl-month-head">
                <strong>Far future</strong>
              </div>
              ${detailChip(it)}
            </article>`;
        })
        .join("");

      return monthCards + onward + death;
    }

    function detailChip(it) {
      const editBtn = editing
        ? `<button type="button" class="tl-mini" data-id="${CL.escapeHtml(it.id)}" aria-label="Edit">Edit</button>`
        : "";
      return `
        <div class="tl-chip-card ${it.who} ${it.marker ? "is-marker" : ""}">
          <div class="tl-chip-who">${WHO_META[it.who].label}</div>
          <div class="tl-chip-title">${CL.escapeHtml(it.title)}</div>
          <div class="tl-chip-dates">${CL.escapeHtml(rangeLabel(it))}</div>
          ${editBtn}
        </div>`;
    }

    function scrollGanttToNow(nowYM, months) {
      const scroller = root.querySelector("#tl-gantt");
      if (!scroller) return;
      let idx = months.indexOf(nowYM);
      if (idx < 0) {
        if (nowYM < GANTT_START) idx = 0;
        else idx = months.indexOf(GANTT_END_FINITE);
      }
      if (idx < 0) idx = 0;
      const left = Math.max(0, 64 + idx * COL_W - scroller.clientWidth / 2);
      scroller.scrollLeft = left;
    }

    function bind(state) {
      root.querySelector("#tl-edit")?.addEventListener("click", () => {
        editing = !editing;
        paint();
      });
      root.querySelector("#tl-add")?.addEventListener("click", () => openEditor(null));
      if (editing) {
        root.querySelectorAll("[data-id]").forEach((el) => {
          el.addEventListener("click", (e) => {
            e.preventDefault();
            const id = el.dataset.id;
            if (id) openEditor(id);
          });
        });
      }
    }

    function openEditor(id) {
      const state = getState();
      const item = id ? state.items[id] : null;
      const who = item ? item.who : "cole";
      CL.modal.open({
        title: item ? "Edit block" : "New block",
        subtitle: "Shared with the couple group",
        bodyHtml: `
          <div class="form-stack">
            <div class="field">
              <label for="tl-who">Who</label>
              <select id="tl-who">
                <option value="cole" ${who === "cole" ? "selected" : ""}>Cole</option>
                <option value="lauren" ${who === "lauren" ? "selected" : ""}>Lauren</option>
                <option value="together" ${who === "together" ? "selected" : ""}>Together</option>
              </select>
            </div>
            <div class="field">
              <label for="tl-title">Description</label>
              <textarea id="tl-title" rows="4">${CL.escapeHtml(item ? item.title : "")}</textarea>
            </div>
            <div class="field">
              <label for="tl-start">Start</label>
              <input id="tl-start" type="month" value="${CL.escapeHtml(item ? item.start : currentYM())}" />
            </div>
            <div class="field">
              <label for="tl-end">End</label>
              <input id="tl-end" type="month" value="${CL.escapeHtml(
                item && item.end ? item.end : item ? item.start : currentYM()
              )}" ${item && item.open ? "disabled" : ""} />
            </div>
            <label class="tl-check">
              <input type="checkbox" id="tl-open" ${item && item.open ? "checked" : ""} />
              Ongoing (no end date)
            </label>
            <label class="tl-check">
              <input type="checkbox" id="tl-marker" ${item && item.marker ? "checked" : ""} />
              Far-future marker (single point)
            </label>
            <button type="button" class="btn btn-primary btn-block" id="tl-save">Save</button>
            ${
              item
                ? `<button type="button" class="btn btn-secondary btn-block" id="tl-del">Delete</button>`
                : ""
            }
          </div>
        `,
        onMount: (body) => {
          const openEl = body.querySelector("#tl-open");
          const endEl = body.querySelector("#tl-end");
          const markerEl = body.querySelector("#tl-marker");
          const syncDis = () => {
            endEl.disabled = !!(openEl.checked || markerEl.checked);
          };
          openEl.addEventListener("change", syncDis);
          markerEl.addEventListener("change", syncDis);
          body.querySelector("#tl-save")?.addEventListener("click", () => {
            const title = (body.querySelector("#tl-title").value || "").trim();
            const start = body.querySelector("#tl-start").value;
            const end = body.querySelector("#tl-end").value;
            const whoVal = body.querySelector("#tl-who").value;
            const isOpen = openEl.checked;
            const isMarker = markerEl.checked;
            if (!title) {
              CL.toast("Add a description");
              return;
            }
            if (!start) {
              CL.toast("Pick a start month");
              return;
            }
            if (!isOpen && !isMarker && end && end < start) {
              CL.toast("End cannot be before start");
              return;
            }
            saveItem({
              id: item ? item.id : CL.uid("tl"),
              who: whoVal,
              start,
              end: isOpen && !isMarker ? "" : isMarker ? start : end || start,
              open: isOpen && !isMarker,
              marker: isMarker,
              title
            });
            CL.modal.close();
            CL.toast("Timeline saved");
            editing = true;
            paint();
          });
          body.querySelector("#tl-del")?.addEventListener("click", () => {
            if (!item) return;
            deleteItem(item.id);
            CL.modal.close();
            CL.toast("Deleted");
            editing = true;
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
  global.CL.timeline = {
    getState,
    setState,
    merge,
    shouldRepush
  };
})(window);
