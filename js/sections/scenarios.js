/* Life scenarios of awesomeness — interactive futures from the Scenarios workbook */
(function (global) {
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const EVENT_META = {
    "Engagement": { color: "#e11d48", emoji: "💍", short: "Engagement" },
    "Married": { color: "#eab308", emoji: "🥂", short: "Married" },
    "Kid": { color: "#a78bfa", emoji: "👶", short: "Kid" },
    "Pilot training Dothan AL": { color: "#86efac", emoji: "✈️", short: "Pilot · Dothan, AL", place: "Dothan, AL" },
    "Pilot Training Albuquerque NM": { color: "#f97316", emoji: "✈️", short: "Pilot · Albuquerque, NM", place: "Albuquerque, NM" },
    "Pilot Training Tucson": { color: "#0070C0", emoji: "✈️", short: "Pilot · Tucson, AZ", place: "Tucson, AZ" },
    "Laurens world and I am living in it": { color: "#f9a8d4", emoji: "🌍", short: "Lauren's world", place: "Wherever Lauren is" }
  };

  function spanLabel(s) {
    const a = MONTHS[s.start[1]] + " " + s.start[0];
    const b = MONTHS[s.end[1]] + " " + s.end[0];
    return a === b ? a : a + " → " + b;
  }

  const SCENARIOS = [
    {
      id: "awesome",
      title: "Potentially stupid but infinitely awesome",
      tagline: "Lots of mullets",
      tone: "bold",
      kids: 4,
      lastKidYear: 2033,
      pros: "4 mullet kids · engaged when done with lease · lots of mullets · bold",
      cons: "Probably stressful at times",
      spans: [
        { label: "Pilot training Dothan AL", start: [2027, 0], end: [2027, 4] },
        { label: "Engagement", start: [2027, 5], end: [2027, 5] },
        { label: "Pilot training Dothan AL", start: [2027, 6], end: [2028, 4] },
        { label: "Married", start: [2028, 5], end: [2028, 5] },
        { label: "Pilot Training Albuquerque NM", start: [2028, 6], end: [2028, 9] },
        { label: "Pilot Training Tucson", start: [2028, 10], end: [2029, 4] },
        { label: "Kid", start: [2029, 5], end: [2029, 5] },
        { label: "Pilot Training Tucson", start: [2029, 6], end: [2029, 11] },
        { label: "Laurens world and I am living in it", start: [2030, 0], end: [2030, 10] },
        { label: "Kid", start: [2030, 11], end: [2030, 11] },
        { label: "Laurens world and I am living in it", start: [2031, 0], end: [2032, 4] },
        { label: "Kid", start: [2032, 5], end: [2032, 5] },
        { label: "Laurens world and I am living in it", start: [2032, 6], end: [2033, 10] },
        { label: "Kid", start: [2033, 11], end: [2033, 11] },
        { label: "Laurens world and I am living in it", start: [2034, 0], end: [2040, 11] }
      ]
    },
    {
      id: "practical",
      title: "Practical but definitely less awesome",
      tagline: "Medium number of mullet kids, a little more balance",
      tone: "mid",
      kids: 3,
      lastKidYear: 2033,
      pros: "Still 3 mullet kids · more married time before kids · slightly less stressful",
      cons: "Not as awesome · didn't double the replacement rate · not as bold",
      spans: [
        { label: "Pilot training Dothan AL", start: [2027, 0], end: [2028, 4] },
        { label: "Engagement", start: [2028, 5], end: [2028, 5] },
        { label: "Pilot Training Albuquerque NM", start: [2028, 6], end: [2028, 9] },
        { label: "Pilot Training Tucson", start: [2028, 10], end: [2029, 4] },
        { label: "Married", start: [2029, 5], end: [2029, 5] },
        { label: "Pilot Training Tucson", start: [2029, 6], end: [2029, 11] },
        { label: "Laurens world and I am living in it", start: [2030, 0], end: [2030, 10] },
        { label: "Kid", start: [2030, 11], end: [2030, 11] },
        { label: "Laurens world and I am living in it", start: [2031, 0], end: [2032, 4] },
        { label: "Kid", start: [2032, 5], end: [2032, 5] },
        { label: "Laurens world and I am living in it", start: [2032, 6], end: [2033, 10] },
        { label: "Kid", start: [2033, 11], end: [2033, 11] },
        { label: "Laurens world and I am living in it", start: [2034, 0], end: [2040, 11] }
      ]
    },
    {
      id: "losers",
      title: "Losers that are scared of life and awesomeness",
      tagline: "The soft path. More travel. Fewer mullets.",
      tone: "soft",
      kids: 2,
      lastKidYear: 2033,
      pros: "More established · more young travel · less stressful",
      cons: "Lamest thing of all existence · scared · soft · weak · cowardly",
      spans: [
        { label: "Pilot training Dothan AL", start: [2027, 0], end: [2028, 4] },
        { label: "Engagement", start: [2028, 5], end: [2028, 5] },
        { label: "Pilot Training Albuquerque NM", start: [2028, 6], end: [2028, 9] },
        { label: "Pilot Training Tucson", start: [2028, 10], end: [2029, 4] },
        { label: "Married", start: [2029, 5], end: [2029, 5] },
        { label: "Pilot Training Tucson", start: [2029, 6], end: [2029, 11] },
        { label: "Laurens world and I am living in it", start: [2030, 0], end: [2032, 4] },
        { label: "Kid", start: [2032, 5], end: [2032, 5] },
        { label: "Laurens world and I am living in it", start: [2032, 6], end: [2033, 10] },
        { label: "Kid", start: [2033, 11], end: [2033, 11] },
        { label: "Laurens world and I am living in it", start: [2034, 0], end: [2040, 11] }
      ]
    }
  ];

  let selectedId = null;

  function getScenario(id) {
    return SCENARIOS.find((s) => s.id === id) || null;
  }

  function milestoneLabel(label, span) {
    const meta = EVENT_META[label] || { short: label, emoji: "•", place: "" };
    if (label === "Kid") {
      return meta.emoji + " Kid born · " + spanLabel(span);
    }
    if (label === "Engagement" || label === "Married") {
      return meta.emoji + " " + meta.short + " · " + spanLabel(span);
    }
    if (meta.place) {
      return meta.emoji + " " + meta.short + " · " + spanLabel(span);
    }
    return meta.emoji + " " + meta.short + " · " + spanLabel(span);
  }

  function renderPicker(root) {
    root.innerHTML = `
      <section class="page scenarios-page">
        <h1 class="page-title">Life scenarios of awesomeness</h1>
        <p class="page-sub">Pick a future. Scroll the path. Count the mullets.</p>

        <div class="sc-legend">
          <span><i style="background:#86efac"></i> Pilot · Dothan</span>
          <span><i style="background:#f97316"></i> Pilot · ABQ</span>
          <span><i style="background:#0070C0"></i> Pilot · Tucson</span>
          <span><i style="background:#e11d48"></i> Engagement</span>
          <span><i style="background:#eab308"></i> Married</span>
          <span><i style="background:#a78bfa"></i> Kid</span>
          <span><i style="background:#f9a8d4"></i> Lauren's world</span>
        </div>

        <div class="sc-cards">
          ${SCENARIOS.map((s) => `
            <button type="button" class="sc-card tone-${s.tone}" data-id="${s.id}">
              <div class="sc-card-top">
                <strong>${CL.escapeHtml(s.title)}</strong>
                <span class="sc-kids">${s.kids} kid${s.kids === 1 ? "" : "s"}</span>
              </div>
              <p>${CL.escapeHtml(s.tagline)}</p>
              <div class="sc-card-meta">Last kid · ${s.lastKidYear}</div>
            </button>
          `).join("")}
        </div>
      </section>
    `;

    root.querySelectorAll(".sc-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedId = btn.getAttribute("data-id");
        paint(root);
      });
    });
  }

  function renderDetail(root, scenario) {
    let kidCount = 0;
    const milestones = scenario.spans.filter((s) =>
      ["Engagement", "Married", "Kid"].includes(s.label) ||
      s.label.startsWith("Pilot")
    );

    root.innerHTML = `
      <section class="page scenarios-page">
        <button type="button" class="btn btn-ghost sc-back" id="sc-back">← All scenarios</button>
        <h1 class="page-title sc-detail-title">${CL.escapeHtml(scenario.title)}</h1>
        <p class="page-sub">${CL.escapeHtml(scenario.tagline)}</p>

        <div class="sc-stats">
          <div class="sc-stat">
            <span class="sc-stat-val">${scenario.kids}</span>
            <span class="sc-stat-label">kids total</span>
          </div>
          <div class="sc-stat">
            <span class="sc-stat-val">${scenario.lastKidYear}</span>
            <span class="sc-stat-label">last kid born</span>
          </div>
        </div>

        <div class="sc-proscons">
          <div class="sc-pro"><strong>Pros</strong><p>${CL.escapeHtml(scenario.pros)}</p></div>
          <div class="sc-con"><strong>Cons</strong><p>${CL.escapeHtml(scenario.cons)}</p></div>
        </div>

        <h2 class="section-label">Timeline</h2>
        <div class="sc-timeline" role="list">
          ${scenario.spans.map((span) => {
            const meta = EVENT_META[span.label] || { color: "#94a3b8", emoji: "•", short: span.label, place: "" };
            const isKid = span.label === "Kid";
            if (isKid) kidCount += 1;
            const isBig = isKid || span.label === "Engagement" || span.label === "Married";
            return `
              <div class="sc-item ${isBig ? "is-big" : ""}" role="listitem" style="--sc-color:${meta.color}">
                <div class="sc-rail"><span class="sc-dot">${meta.emoji}</span></div>
                <div class="sc-body">
                  <div class="sc-when">${CL.escapeHtml(spanLabel(span))}</div>
                  <div class="sc-what">${CL.escapeHtml(meta.short)}</div>
                  ${meta.place ? `<div class="sc-where">${CL.escapeHtml(meta.place)}</div>` : ""}
                  ${isKid ? `<div class="sc-kid-tag">Kid #${kidCount}</div>` : ""}
                </div>
              </div>
            `;
          }).join("")}
        </div>

        <h2 class="section-label">Key moments</h2>
        <div class="sc-milestones">
          ${milestones.map((span) => {
            const meta = EVENT_META[span.label] || {};
            return `<div class="sc-ms" style="border-left-color:${meta.color || "#94a3b8"}">
              <strong>${CL.escapeHtml(milestoneLabel(span.label, span))}</strong>
            </div>`;
          }).join("")}
        </div>
      </section>
    `;

    root.querySelector("#sc-back")?.addEventListener("click", () => {
      selectedId = null;
      paint(root);
    });
  }

  function paint(root) {
    const scenario = selectedId ? getScenario(selectedId) : null;
    if (scenario) renderDetail(root, scenario);
    else renderPicker(root);
  }

  function render(root) {
    selectedId = null;
    paint(root);
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.scenarios = { render };
})(window);
