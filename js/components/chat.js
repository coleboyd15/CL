/* Grok chat panel — live xAI API when key set, smart offline fallback */
(function (global) {
  const API_URL = "https://api.x.ai/v1/chat/completions";

  function create(container, options) {
    options = options || {};
    const context = options.context || "general";
    const settings = CL.profile.getSettings();
    const hasKey = !!(settings.xaiApiKey || "").trim() && settings.useGrokApi !== false;
    const modeLabel = hasKey ? "Live Grok" : "Offline mode";

    const welcome =
      options.welcome ||
      (hasKey
        ? "Hi — I'm Grok. Ask me anything; I can interview you about dinner and then recommend a place."
        : "Hi — offline Grok helper. Add an xAI API key in Profile for live chat. I can still recommend from your CL data.");

    const panel = document.createElement("div");
    panel.className = "chat-panel";
    panel.innerHTML = `
      <div class="chat-header" role="button" tabindex="0" aria-expanded="false">
        <div>
          <strong>✦ Ask Grok</strong>
          <div><span>${CL.escapeHtml(modeLabel)} · natural conversation</span></div>
        </div>
        <span class="chat-toggle">▼</span>
      </div>
      <div class="chat-body">
        <div class="chat-messages"></div>
        <form class="chat-input-row">
          <input type="text" placeholder="${CL.escapeHtml(options.placeholder || "Ask something…")}" autocomplete="off" />
          <button type="submit" class="btn btn-primary btn-sm">Send</button>
        </form>
      </div>
    `;

    const header = panel.querySelector(".chat-header");
    const messagesEl = panel.querySelector(".chat-messages");
    const form = panel.querySelector("form");
    const input = panel.querySelector("input");
    const toggle = panel.querySelector(".chat-toggle");

    /** Multi-turn history for this panel instance (API + offline continuity) */
    const history = [];

    function addMsg(text, who) {
      const div = document.createElement("div");
      div.className = `msg ${who}`;
      div.textContent = text;
      messagesEl.appendChild(div);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      return div;
    }

    addMsg(welcome, "bot");

    function setOpen(open) {
      panel.classList.toggle("open", open);
      header.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.textContent = open ? "▲" : "▼";
      if (open) input.focus();
    }

    header.addEventListener("click", () => setOpen(!panel.classList.contains("open")));
    header.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(!panel.classList.contains("open"));
      }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      addMsg(text, "user");
      history.push({ role: "user", content: text });

      const typing = addMsg("Thinking…", "bot typing");
      try {
        const reply = await respond(history, context, options);
        typing.remove();
        addMsg(reply, "bot");
        history.push({ role: "assistant", content: reply });
      } catch (err) {
        typing.remove();
        const msg = err && err.message ? err.message : "Something went wrong.";
        addMsg(msg, "bot");
      }
    });

    if (options.startOpen) setOpen(true);

    container.appendChild(panel);
    return { panel, setOpen, addMsg, history };
  }

  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function buildSystemPrompt(context, options) {
    const names = CL.profile.displayNames();
    const profile = CL.profile.get();
    const loc = CL.geo.getSavedLocation();
    const parts = [
      `You are Grok, embedded in CL — a private couple app for ${names.myName} and ${names.partnerName}.`,
      "Be warm, concise, and playful. Prefer short paragraphs. When recommending, give 1–3 concrete options with why.",
      "You can ask clarifying questions first (preferences, vibe, budget, dietary needs) before recommending — multi-turn is encouraged.",
      "Never invent that you checked live maps unless given location context below."
    ];

    if (profile.city) parts.push(`They often hang around: ${profile.city}.`);
    if (profile.bio) parts.push(`About them: ${profile.bio}`);
    if (loc) {
      parts.push(
        `User GPS roughly: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}. Prefer nearby options when relevant.`
      );
    }

    if (context === "food") {
      const raw = (CL.geo.getActivePlaces && CL.geo.getActivePlaces()) || CL.data.places || [];
      const catalog = CL.geo.placesWithDistance(raw, loc);
      const state = CL.storage.get("places", {});
      const lines = catalog.map((p) => {
        const s = state[p.id] || {};
        return `- ${p.name} | ${p.type} | ${p.cuisine} | ${p.area} | walk ${p.walk}/5 quality ${p.quality}/5 vibe ${p.vibe}/5 price ${p.price}/5 | ${p.distanceLabel || "distance unknown"} | ${p.blurb}${s.visited ? " | VISITED" : ""}${s.wishlist ? " | WISHLIST" : ""}${s.rating ? ` | rating ${s.rating}/5` : ""}${s.notes ? ` | notes: ${s.notes}` : ""}`;
      });
      const live = raw.some((p) => p.source === "osm");
      parts.push(
        live
          ? "FOOD MODE: Recommend only from this catalog of real nearby places (OpenStreetMap near their GPS). You may interview them about dinner first, then pick."
          : "FOOD MODE: Recommend only from this catalog (venues near their GPS when location is on). You may interview them about dinner first, then pick.",
        "Catalog:\n" + lines.join("\n")
      );
    }

    if (context === "movies") {
      const data = CL.storage.get("movies", { watched: [], wishlist: [] });
      const catalog = CL.data.movies || [];
      parts.push(
        "MOVIES MODE: Use their history + catalog. Interview about mood if helpful.",
        "Watched: " + JSON.stringify(data.watched || []),
        "Wishlist: " + JSON.stringify(data.wishlist || []),
        "Catalog: " + JSON.stringify(catalog)
      );
    }

    if (context === "books") {
      const data = CL.storage.get("books", { read: [], current: [], wishlist: [] });
      parts.push(
        "BOOKS MODE: Recommend based on shelves; suggest couple-friendly reads.",
        "Shelves: " + JSON.stringify(data)
      );
    }

    if (context === "trips") {
      const trips = CL.storage.get("trips", []);
      parts.push(
        "TRIPS MODE: You are a couple travel planner. For requests like “Plan a weekend in Paris for us”, produce a practical romantic itinerary.",
        "Always structure with sections titled exactly: STAY, EAT, DRINK, DO.",
        "Under STAY: 2–3 specific hotels, boutique stays, or Airbnb-style neighborhood suggestions with why.",
        "Under EAT: restaurants/cafés. Under DRINK: bars/wine/coffee. Under DO: activities.",
        "Be concrete (named places or well-known areas). Mention budget tiers when helpful.",
        "Saved trips so far: " + JSON.stringify(
          (trips || []).map((t) => ({ destination: t.destination, dates: t.dates }))
        )
      );
    }

    if (context === "recipes") {
      const catalog = CL.data.recipes || [];
      const saved = CL.storage.get("recipes", []);
      parts.push(
        "RECIPES MODE: Create complete meal + matching drink recipes for a couple.",
        "Always include: dish name, drink name, servings, time, meal ingredients (bullets), meal steps (numbered), drink ingredients, drink steps.",
        "Respect dietary constraints and cuisine requests (e.g. Italian dinner + cocktail).",
        "You may reference the in-app catalog for inspiration, but original recipes are welcome.",
        "Catalog titles: " + catalog.map((r) => r.nationality + ": " + r.meal + " + " + r.drink).join(" | "),
        "User saved favorites count: " + (saved || []).length
      );
    }

    if (typeof options.extraSystem === "string") parts.push(options.extraSystem);

    return parts.join("\n\n");
  }

  async function respond(history, context, options) {
    if (typeof options.responder === "function") {
      const custom = options.responder(history, context);
      if (custom) return custom;
    }

    const settings = CL.profile.getSettings();
    const key = (settings.xaiApiKey || "").trim();
    const useApi = key && settings.useGrokApi !== false;

    if (useApi) {
      try {
        return await callXai(key, settings.xaiModel || "grok-3-mini", history, context, options);
      } catch (err) {
        console.warn("Grok API error, falling back:", err);
        const offline = await offlineRespond(history, context);
        return (
          `(Live API failed: ${err.message}. Offline suggestion below.)\n\n` + offline
        );
      }
    }

    await delay(400 + Math.random() * 400);
    return offlineRespond(history, context);
  }

  async function callXai(apiKey, model, history, context, options) {
    const system = buildSystemPrompt(context, options);
    const messages = [{ role: "system", content: system }].concat(
      history.map((m) => ({ role: m.role, content: m.content }))
    );

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: context === "trips" || context === "recipes" ? 1400 : 900
      })
    });

    if (!res.ok) {
      let detail = res.statusText;
      try {
        const errBody = await res.json();
        detail = errBody.error?.message || errBody.message || JSON.stringify(errBody);
      } catch {
        /* ignore */
      }
      throw new Error(detail || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) throw new Error("Empty response from Grok");
    return content.trim();
  }

  function lastUserText(history) {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === "user") return history[i].content;
    }
    return "";
  }

  function offlineRespond(history, context) {
    const q = lastUserText(history).toLowerCase();
    const turn = history.filter((m) => m.role === "user").length;

    // Conversational dinner interview for food
    if (context === "food") {
      if (turn === 1 && /recommend|dinner|eat|food|where|place|hungry|date/.test(q) && !/cheap|walk|dessert|cocktail|ramen|taco|romantic|cozy/.test(q)) {
        return (
          "Love it — quick interview so I nail the pick:\n\n" +
          "1) Dinner, dessert, drinks, or café?\n" +
          "2) Walkable / nearby only, or ok to go a bit farther?\n" +
          "3) Budget vibe: $ chill, $$ nice, or $$$ special?\n" +
          "4) Any cuisine craving or hard no?\n\n" +
          "Answer in one message and I’ll recommend from your nearby list."
        );
      }
      return foodReply(q, history);
    }
    if (context === "movies") return moviesReply(q);
    if (context === "books") return booksReply(q);
    if (context === "trips") return tripsReply(q, history);
    if (context === "recipes") return recipesReply(q, history);
    return generalReply(q);
  }

  function userPlaces() {
    return CL.storage.get("places", {});
  }

  function foodReply(q, history) {
    const loc = CL.geo.getSavedLocation();
    const raw = (CL.geo.getActivePlaces && CL.geo.getActivePlaces()) || CL.data.places || [];
    const catalog = CL.geo.placesWithDistance(raw, loc);
    const state = userPlaces();
    const visitedIds = Object.keys(state).filter((id) => state[id].visited);
    const wishIds = Object.keys(state).filter((id) => state[id].wishlist);
    const histText = history.map((m) => m.content).join(" ").toLowerCase();
    const blob = (q + " " + histText).toLowerCase();

    let pool = catalog.slice();

    if (/dessert|sweet|cake|ice cream|pastry/.test(blob)) {
      pool = pool.filter((p) => p.type === "dessert");
    } else if (/drink|cocktail|bar|wine|coffee|café|cafe|boba/.test(blob)) {
      pool = pool.filter((p) => p.type === "drinks" || p.type === "café");
    } else if (/dinner|date|romantic|night|eat/.test(blob)) {
      pool = pool.filter((p) => p.type === "dinner" || p.vibe >= 4);
    }
    if (/cheap|afford|budget|inexpensive|chill budget/.test(blob)) {
      pool = pool.filter((p) => p.price <= 2);
    } else if (/special|splurge|fancy|upscale/.test(blob)) {
      pool = pool.filter((p) => p.price >= 3);
    }
    if (/walk|nearby|close|near me/.test(blob)) {
      if (loc) {
        pool = pool.filter((p) => p.distanceMiles != null && p.distanceMiles <= 1.2);
      } else {
        pool = pool.filter((p) => p.walk >= 4);
      }
    }
    if (/quiet|cozy|chill/.test(blob)) {
      pool = pool.filter((p) => p.vibe >= 4);
    }

    if (!pool.length) pool = catalog.slice();

    if (!/again|revisit|favorite visited/.test(blob)) {
      const fresh = pool.filter((p) => !visitedIds.includes(p.id));
      if (fresh.length) pool = fresh;
    }

    if (loc) {
      pool.sort((a, b) => (a.distanceMiles || 99) - (b.distanceMiles || 99) || b.quality + b.vibe - (a.quality + a.vibe));
    } else {
      pool.sort((a, b) => b.quality + b.vibe - (a.quality + a.vibe));
    }

    const picks = pool.slice(0, 3);
    const lines = picks.map((p, i) => {
      const dist = p.distanceLabel ? ` · ${p.distanceLabel}` : "";
      return `${i + 1}. ${p.name} (${p.type})${dist} — ${p.blurb} Quality ${p.quality}/5 · Vibe ${p.vibe}/5 · $ ${p.price}/5.`;
    });

    let intro = loc
      ? "Based on our chat and places near your location:"
      : "Based on our chat (enable Use My Location in Food for distances):";
    if (wishIds.length) {
      const wishNames = catalog.filter((p) => wishIds.includes(p.id)).map((p) => p.name);
      if (wishNames.length) intro = `Keeping your wishlist in mind (${wishNames.slice(0, 2).join(", ")}). Here's what fits:`;
    }

    return intro + "\n\n" + lines.join("\n\n") + "\n\nWant a different vibe? Tell me more and I’ll re-pick.";
  }

  function moviesReply(q) {
    const catalog = CL.data.movies || [];
    const data = CL.storage.get("movies", { watched: [], wishlist: [] });
    const watchedTitles = new Set((data.watched || []).map((m) => m.title.toLowerCase()));
    const liked = (data.watched || []).filter((m) => (m.rating || 0) >= 4);

    let pool = catalog.filter((m) => !watchedTitles.has(m.title.toLowerCase()));
    if (!pool.length) pool = catalog.slice();

    if (/cozy|warm|comfort|feel.?good/.test(q)) {
      pool = pool.filter((m) => /joy|warm|whimsical|family|heart/.test(m.vibe));
    } else if (/mind|sci-?fi|space|weird|trippy/.test(q)) {
      pool = pool.filter((m) => m.genres.includes("sci-fi") || /mind|chaotic|future/.test(m.vibe));
    } else if (/romance|date|love|romantic/.test(q)) {
      pool = pool.filter((m) => m.genres.includes("romance") || /intimate|aching|tender/.test(m.vibe));
    } else if (/funny|comedy|laugh/.test(q)) {
      pool = pool.filter((m) => m.genres.includes("comedy"));
    } else if (/animation|anime|cartoon/.test(q)) {
      pool = pool.filter((m) => m.genres.includes("animation"));
    }

    if (!pool.length) pool = catalog.filter((m) => !watchedTitles.has(m.title.toLowerCase()));
    if (!pool.length) pool = catalog.slice();

    pool = pool.sort(() => Math.random() - 0.5).slice(0, 3);

    let intro = "Here are a few picks:";
    if (liked.length) {
      intro = `Since you rated highly things like ${liked
        .slice(0, 2)
        .map((m) => m.title)
        .join(" & ")}, you might love:`;
    }

    const lines = pool.map(
      (m, i) => `${i + 1}. ${m.title} (${m.year}) — ${m.vibe}. Genres: ${m.genres.join(", ")}.`
    );

    return intro + "\n\n" + lines.join("\n\n") + "\n\nTell me a vibe for tighter recs.";
  }

  function booksReply() {
    const data = CL.storage.get("books", { read: [], current: [], wishlist: [] });
    const liked = (data.read || []).filter((b) => (b.rating || 0) >= 4).map((b) => b.title);
    const recs = [
      { title: "The Night Circus", why: "Lush, romantic, perfect to share chapter by chapter." },
      { title: "Project Hail Mary", why: "Science adventure with heart — great couple discussion fuel." },
      { title: "Convenience Store Woman", why: "Short, sharp, weirdly tender." },
      { title: "Piranesi", why: "Dreamlike rooms and quiet wonder." },
      { title: "Tomorrow, and Tomorrow, and Tomorrow", why: "Friendship, games, and complicated love." }
    ];
    const picks = recs.sort(() => Math.random() - 0.5).slice(0, 3);
    const intro = liked.length
      ? `You loved ${liked.slice(0, 2).join(" & ")}. Try these next:`
      : "A few couple-friendly reads to start:";
    return intro + "\n\n" + picks.map((r, i) => `${i + 1}. ${r.title} — ${r.why}`).join("\n\n");
  }

  function tripsReply(q) {
    const names = CL.profile.displayNames();
    let dest = q
      .replace(/plan\s+(a\s+)?/gi, " ")
      .replace(/weekend|trip|getaway|for us|please|in|to/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!dest || dest.length < 2) dest = "your destination";
    const ideas = (CL.data.ideasForTrip || (() => CL.data.tripIdeas.default))(q);
    const block = (title, arr) => title + "\n" + (arr || []).map((x) => "• " + x).join("\n");
    return (
      `Here's an offline starter plan for ${names.myName} & ${names.partnerName} (${dest}):\n\n` +
      block("STAY", ideas.lodging) +
      "\n\n" +
      block("EAT", ideas.food) +
      "\n\n" +
      block("DRINK", ideas.drinks) +
      "\n\n" +
      block("DO", ideas.activities) +
      "\n\nAdd an xAI API key in Profile for richer live Grok itineraries. You can also use the “Plan with Grok” box and Save as trip."
    );
  }

  function recipesReply(q) {
    const catalog = CL.data.recipes || [];
    let pool = catalog.slice();
    if (/italian/.test(q)) pool = catalog.filter((r) => r.nationality === "Italian");
    else if (/japan|sushi|miso/.test(q)) pool = catalog.filter((r) => r.nationality === "Japanese");
    else if (/mexican|taco/.test(q)) pool = catalog.filter((r) => r.nationality === "Mexican");
    else if (/thai|curry/.test(q)) pool = catalog.filter((r) => r.nationality === "Thai");
    else if (/indian|masala/.test(q)) pool = catalog.filter((r) => r.nationality === "Indian");
    else if (/french/.test(q)) pool = catalog.filter((r) => r.nationality === "French");
    else if (/greek/.test(q)) pool = catalog.filter((r) => r.nationality === "Greek");
    else if (/korean/.test(q)) pool = catalog.filter((r) => r.nationality === "Korean");
    else if (/moroccan/.test(q)) pool = catalog.filter((r) => r.nationality === "Moroccan");
    if (!pool.length) pool = catalog;
    const r = pool[Math.floor(Math.random() * pool.length)];
    if (!r) return "No recipes in catalog. Add an API key for custom Grok recipes.";

    const bullets = (arr) => (arr || []).map((x) => "• " + x).join("\n");
    const steps = (arr) => (arr || []).map((x, i) => i + 1 + ". " + x).join("\n");
    return (
      `Offline match from the CL cookbook (${r.nationality}):\n\n` +
      `MEAL: ${r.meal} (${r.time}, serves ${r.servings || "2"})\n` +
      `Ingredients:\n${bullets(r.mealIngredients)}\n` +
      `Steps:\n${steps(r.mealSteps)}\n` +
      (r.mealLink ? `Reference: ${r.mealLink}\n` : "") +
      `\nDRINK: ${r.drink}\n` +
      `Ingredients:\n${bullets(r.drinkIngredients)}\n` +
      `Steps:\n${steps(r.drinkSteps)}\n` +
      (r.drinkLink ? `Reference: ${r.drinkLink}\n` : "") +
      `\nFor fully custom recipes (any cuisine/diet), add your xAI key in Profile and ask again.`
    );
  }

  function generalReply(q) {
    if (/hello|hi |hey/.test(q)) {
      const n = CL.profile.displayNames();
      return `Hey ${n.myName} & ${n.partnerName} 👋 What are we planning — dinner, a movie, a trip, or something to cook?`;
    }
    return "Open Food, Movies, Trips, Recipes, or Books for context-aware recs — or add an xAI API key in Profile for full live Grok chats.";
  }

  global.CL = global.CL || {};
  global.CL.chat = { create, buildSystemPrompt };
})(window);
