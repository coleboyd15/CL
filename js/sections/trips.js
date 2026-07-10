(function (global) {
  function getTrips() {
    return CL.storage.get("trips", []);
  }

  function setTrips(list) {
    CL.storage.set("trips", list);
  }

  function listBlock(title, items) {
    const arr = items || [];
    if (!arr.length) return "";
    return `
      <div class="section-label" style="margin-top:10px">${CL.escapeHtml(title)}</div>
      <ul class="trip-list">${arr.map((x) => `<li>${CL.escapeHtml(x)}</li>`).join("")}</ul>
    `;
  }

  function tripCard(t) {
    return `
      <article class="card" data-id="${CL.escapeHtml(t.id)}">
        <div class="card-title">${CL.escapeHtml(t.destination)}</div>
        <div class="card-meta">${CL.escapeHtml(t.dates || "Dates TBD")}${t.source ? ` · ${CL.escapeHtml(t.source)}` : ""}</div>
        ${t.notes ? `<p class="review-text" style="font-style:normal">${CL.escapeHtml(t.notes)}</p>` : ""}
        ${listBlock("Stay", t.lodging)}
        ${listBlock("Eat", t.food)}
        ${listBlock("Drink", t.drinks)}
        ${listBlock("Do", t.activities)}
        ${
          t.grokPlan
            ? `<details class="trip-details"><summary>Full Grok plan</summary><pre class="trip-pre">${CL.escapeHtml(t.grokPlan)}</pre></details>`
            : ""
        }
        <div class="card-actions">
          <button type="button" class="btn btn-ghost btn-sm btn-del">Remove</button>
        </div>
      </article>
    `;
  }

  function parseLines(text) {
    return String(text || "")
      .split(/\n|•|;/)
      .map((s) => s.replace(/^[-*\d.)\s]+/, "").trim())
      .filter(Boolean);
  }

  function offlinePlan(prompt) {
    const names = CL.profile.displayNames();
    // Extract destination-ish phrase
    let dest = prompt.replace(/plan\s+(a\s+)?/i, "").replace(/weekend\s+in\s+/i, "").replace(/for us/i, "").trim();
    if (!dest || dest.length < 2) dest = "your destination";
    const ideas = (CL.data.ideasForTrip || (() => CL.data.tripIdeas.default))(dest);
    return {
      destination: dest.replace(/^(a |an |the )/i, "").replace(/\s+for us\.?$/i, "") || dest,
      lodging: ideas.lodging || [],
      food: ideas.food || [],
      drinks: ideas.drinks || [],
      activities: ideas.activities || [],
      summary:
        `Weekend plan for ${names.myName} & ${names.partnerName} — ${dest}\n\n` +
        `STAY\n${(ideas.lodging || []).map((x) => "• " + x).join("\n")}\n\n` +
        `EAT\n${(ideas.food || []).map((x) => "• " + x).join("\n")}\n\n` +
        `DRINK\n${(ideas.drinks || []).map((x) => "• " + x).join("\n")}\n\n` +
        `DO\n${(ideas.activities || []).map((x) => "• " + x).join("\n")}\n\n` +
        `(Offline plan — add an xAI key in Profile for richer live Grok itineraries.)`
    };
  }

  function openManualForm(onSave) {
    CL.modal.open({
      title: "New trip",
      subtitle: "Or use Ask Grok below for a full plan",
      bodyHtml: `
        <div class="form-stack">
          <div class="field"><label>Destination</label><input id="t-dest" placeholder="e.g. Paris" /></div>
          <div class="field"><label>Dates</label><input id="t-dates" placeholder="e.g. Apr 12–14" /></div>
          <div class="field"><label>Notes</label><textarea id="t-notes" placeholder="Vibe, budget, must-dos…"></textarea></div>
          <button type="button" class="btn btn-primary btn-block" id="t-save">Save with starter ideas</button>
        </div>
      `,
      onMount(body) {
        body.querySelector("#t-save").addEventListener("click", () => {
          const destination = body.querySelector("#t-dest").value.trim();
          if (!destination) {
            CL.toast("Add a destination");
            return;
          }
          const ideas = (CL.data.ideasForTrip || (() => CL.data.tripIdeas.default))(destination);
          onSave({
            id: CL.uid("trip"),
            destination,
            dates: body.querySelector("#t-dates").value.trim(),
            notes: body.querySelector("#t-notes").value.trim(),
            lodging: ideas.lodging || [],
            food: ideas.food || [],
            drinks: ideas.drinks || [],
            activities: ideas.activities || [],
            source: "starter ideas",
            createdAt: Date.now()
          });
          CL.modal.close();
        });
      }
    });
  }

  function openSaveGrokPlan(planText, draft) {
    CL.modal.open({
      title: "Save trip from plan",
      bodyHtml: `
        <div class="form-stack">
          <div class="field"><label>Destination</label><input id="tg-dest" value="${CL.escapeHtml(draft.destination || "")}" /></div>
          <div class="field"><label>Dates</label><input id="tg-dates" value="${CL.escapeHtml(draft.dates || "")}" placeholder="e.g. next weekend" /></div>
          <div class="field"><label>Notes</label><textarea id="tg-notes" placeholder="Optional">${CL.escapeHtml(draft.notes || "")}</textarea></div>
          <p class="card-meta">Lists below are pre-filled from the plan — edit anytime after saving.</p>
          <button type="button" class="btn btn-primary btn-block" id="tg-save">Save trip</button>
        </div>
      `,
      onMount(body) {
        body.querySelector("#tg-save").addEventListener("click", () => {
          const destination = body.querySelector("#tg-dest").value.trim();
          if (!destination) {
            CL.toast("Add a destination");
            return;
          }
          const trip = {
            id: CL.uid("trip"),
            destination,
            dates: body.querySelector("#tg-dates").value.trim(),
            notes: body.querySelector("#tg-notes").value.trim(),
            lodging: draft.lodging || [],
            food: draft.food || [],
            drinks: draft.drinks || [],
            activities: draft.activities || [],
            grokPlan: planText,
            source: draft.source || "Grok",
            createdAt: Date.now()
          };
          setTrips([trip].concat(getTrips()));
          CL.modal.close();
          CL.toast("Trip saved");
          if (typeof draft.onSaved === "function") draft.onSaved();
        });
      }
    });
  }

  function extractSections(text) {
    const lower = text.toLowerCase();
    function section(keys) {
      for (const key of keys) {
        const re = new RegExp("(?:^|\\n)\\s*(?:#+\\s*)?(?:" + key + ")\\s*[:\\-]?\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:#+\\s*)?(?:stay|lodging|hotel|eat|food|restaurants|drink|bars|nightlife|do|activities|see|day\\s*1|tips)\\b|$)", "i");
        const m = text.match(re);
        if (m) return parseLines(m[1]).slice(0, 8);
      }
      return [];
    }
    return {
      lodging: section(["stay", "lodging", "hotels?", "where to stay", "accommodation"]),
      food: section(["eat", "food", "restaurants?", "dining", "meals?"]),
      drinks: section(["drink", "drinks", "bars?", "nightlife", "cocktails?"]),
      activities: section(["do", "activities", "see", "things to do", "experiences?"])
    };
  }

  function render(root) {
    let lastPlanText = "";
    let lastDraft = null;

    function paint() {
      const trips = getTrips();
      const names = CL.profile.displayNames();

      root.innerHTML = `
        <section class="page">
          <div class="row-between" style="margin-bottom:4px">
            <h1 class="page-title" style="margin:0">Trips</h1>
            <button type="button" class="btn btn-secondary btn-sm" id="trip-add">+ Manual</button>
          </div>
          <p class="page-sub">Stay · eat · drink · do — plan with Grok</p>

          <div class="card section-block plan-prompt-card">
            <div class="section-label">Natural language plan</div>
            <div class="field">
              <label class="sr-only" for="trip-nl">Trip request</label>
              <textarea id="trip-nl" rows="2" placeholder='e.g. Plan a weekend in Paris for us'></textarea>
            </div>
            <button type="button" class="btn btn-primary btn-block" id="trip-nl-go">Plan with Grok</button>
            <div id="trip-nl-result" class="trip-nl-result" hidden></div>
          </div>

          <div id="trip-chat"></div>

          <div class="section-block" style="margin-top:18px">
            <div class="section-label">Saved trips (${trips.length})</div>
            <div class="stack-sm" id="trip-list">
              ${
                trips.length
                  ? trips.map(tripCard).join("")
                  : `<div class="empty"><div class="emoji">🧳</div><p>No trips yet. Try “Plan a weekend in Paris for us”.</p></div>`
              }
            </div>
          </div>
        </section>
      `;

      const resultEl = root.querySelector("#trip-nl-result");

      async function runPlan(prompt) {
        if (!prompt.trim()) {
          CL.toast("Describe the trip first");
          return;
        }
        resultEl.hidden = false;
        resultEl.innerHTML = `<p class="card-meta">Planning for ${CL.escapeHtml(names.myName)} & ${CL.escapeHtml(names.partnerName)}…</p>`;

        const settings = CL.profile.getSettings();
        const key = (settings.xaiApiKey || "").trim();
        const useApi = key && settings.useGrokApi !== false;

        let planText = "";
        let draft;

        if (useApi) {
          try {
            const system =
              CL.chat.buildSystemPrompt("trips", {}) +
              "\n\nRespond with a clear couple weekend itinerary. Use markdown-ish sections exactly titled: STAY, EAT, DRINK, DO. Under each, 2–4 specific bullets (named hotels/areas, restaurants, bars, activities). Be concrete and romantic but practical.";
            const res = await fetch("https://api.x.ai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + key
              },
              body: JSON.stringify({
                model: CL.profile.getGrokModel(),
                messages: [
                  { role: "system", content: system },
                  { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1200
              })
            });
            if (!res.ok) throw new Error("API " + res.status);
            const data = await res.json();
            planText = data.choices?.[0]?.message?.content?.trim() || "";
            if (!planText) throw new Error("Empty plan");
            const sections = extractSections(planText);
            const destMatch = prompt.match(/(?:in|to)\s+([A-Za-z][A-Za-z\s-]{1,40}?)(?:\s+for\b|$)/i);
            draft = {
              destination: (destMatch && destMatch[1].trim()) || "Trip",
              lodging: sections.lodging,
              food: sections.food,
              drinks: sections.drinks,
              activities: sections.activities,
              source: "Grok live",
              notes: ""
            };
            // If sections empty, still save full text
            if (!draft.lodging.length && !draft.food.length) {
              const offline = offlinePlan(prompt);
              draft.lodging = offline.lodging;
              draft.food = offline.food;
              draft.drinks = offline.drinks;
              draft.activities = offline.activities;
              draft.destination = offline.destination;
            }
          } catch (err) {
            const offline = offlinePlan(prompt);
            planText = offline.summary + "\n\n(Live Grok unavailable: " + err.message + ")";
            draft = Object.assign({ source: "offline", notes: "" }, offline);
          }
        } else {
          const offline = offlinePlan(prompt);
          planText = offline.summary;
          draft = Object.assign({ source: "offline", notes: "" }, offline);
        }

        lastPlanText = planText;
        lastDraft = draft;

        resultEl.innerHTML = `
          <div class="section-label" style="margin-top:8px">Suggested plan</div>
          <pre class="trip-pre">${CL.escapeHtml(planText)}</pre>
          <button type="button" class="btn btn-primary btn-sm" id="trip-save-plan" style="margin-top:10px">Save as trip</button>
        `;
        resultEl.querySelector("#trip-save-plan").addEventListener("click", () => {
          openSaveGrokPlan(lastPlanText, Object.assign({}, lastDraft, { onSaved: paint }));
        });
      }

      root.querySelector("#trip-nl-go").addEventListener("click", () => {
        runPlan(root.querySelector("#trip-nl").value);
      });

      root.querySelector("#trip-add").addEventListener("click", () => {
        openManualForm((trip) => {
          setTrips([trip].concat(getTrips()));
          CL.toast("Trip saved");
          paint();
        });
      });

      root.querySelectorAll(".btn-del").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.closest("[data-id]").dataset.id;
          setTrips(getTrips().filter((t) => t.id !== id));
          CL.toast("Trip removed");
          paint();
        });
      });

      CL.chat.create(root.querySelector("#trip-chat"), {
        context: "trips",
        startOpen: false,
        placeholder: 'e.g. Plan a cozy 3-day Rome trip under $…',
        welcome:
          "I'm your trip planner. Try: “Plan a weekend in Paris for us” — I'll suggest places to stay, eat, drink, and things to do. With a live API key you get richer, destination-specific picks."
      });
    }

    paint();
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.trips = { render };
})(window);
