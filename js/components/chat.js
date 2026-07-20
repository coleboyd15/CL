/* Grok chat panel — live xAI API when key set, smart offline fallback */
(function (global) {
  const API_URL = "https://api.x.ai/v1/chat/completions";

  function create(container, options) {
    options = options || {};
    const context = options.context || "general";
    const settings = CL.profile.getSettings();
    const hasKey = !!(settings.xaiApiKey || "").trim() && settings.useGrokApi !== false;
    const model = CL.profile.getGrokModel ? CL.profile.getGrokModel() : "grok-4.5";
    const modeLabel = hasKey ? "Live · " + model : "Offline mode";

    const welcome =
      options.welcome ||
      (hasKey
        ? "Hi — live Grok is on. I’ll think through your request and personalize for you two. Ask anything."
        : "Hi — offline helper. Add an xAI API key in Profile for live Grok (default grok-4.5). I can still use your CL data.");

    const panel = document.createElement("div");
    panel.className = "chat-panel";
    panel.innerHTML = `
      <div class="chat-header" role="button" tabindex="0" aria-expanded="false">
        <div>
          <strong>✦ Ask Grok</strong>
          <div><span>${CL.escapeHtml(modeLabel)}</span></div>
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

      const typing = addMsg(hasKey ? "Thinking step-by-step…" : "Thinking…", "bot typing");
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
    const model = CL.profile.getGrokModel ? CL.profile.getGrokModel() : "grok-4.5";

    const parts = [
      `You are Grok (${model}), the intelligent assistant inside CL — a private couple lifestyle app for ${names.myName} and ${names.partnerName}.`,
      [
        "CORE BEHAVIOR:",
        "- You are LIVE and knowledgeable. Give thoughtful, specific answers — never generic filler or vague chit-chat.",
        "- Think step-by-step privately, then answer clearly. For complex asks, briefly show your reasoning (2–4 short bullets) then the recommendation.",
        "- Personalize using their names, city, bio, saved lists, and chat history in this thread.",
        "- Prefer concrete names, titles, dishes, and next steps over abstract advice.",
        "- When recommending, give 1–3 ranked options with why each fits THIS couple.",
        "- Ask clarifying questions only when needed; otherwise decide and deliver.",
        "- Warm, witty, and practical — not corporate or robotic.",
        "- Multi-turn: remember earlier answers in this conversation."
      ].join("\n")
    ];

    const about = [];
    about.push(`Couple: ${names.myName} & ${names.partnerName}` + (profile.coupleName ? ` (“${profile.coupleName}”)` : ""));
    if (profile.city) about.push(`Home / hangouts: ${profile.city}`);
    if (profile.anniversary) about.push(`Together since: ${profile.anniversary}`);
    if (profile.bio) about.push(`About them: ${profile.bio}`);
    if (CL.daycount) {
      about.push("Day counter: " + CL.daycount.formatLong());
    }
    if (CL.sync && CL.sync.isJoined && CL.sync.isJoined()) {
      const g = CL.sync.getGroup();
      about.push(`Shared couple group active${g && g.code ? " (" + g.code + ")" : ""} — data may be shared.`);
    }
    parts.push("COUPLE CONTEXT:\n" + about.join("\n"));

    if (context === "movies") {
      const data = CL.storage.get("movies", { watched: [], wishlist: [] });
      const catalog = CL.data.movies || [];
      parts.push(
        [
          "MOVIES MODE: Personalize picks from their history + catalog. Consider mood, length, and couple-watch vibes.",
          "Watched: " + JSON.stringify(data.watched || []),
          "Wishlist: " + JSON.stringify(data.wishlist || []),
          "Catalog: " + JSON.stringify(catalog)
        ].join("\n")
      );
    }

    if (context === "books") {
      const data = CL.storage.get("books", { read: [], current: [], wishlist: [] });
      parts.push(
        [
          "BOOKS MODE: Recommend couple-friendly or complementary reads using their shelves.",
          "Shelves: " + JSON.stringify(data)
        ].join("\n")
      );
    }

    if (context === "recipes") {
      const catalog = CL.data.recipes || [];
      const saved = CL.storage.get("recipes", []);
      const customNames = (saved || [])
        .filter((r) => r.custom)
        .map((r) => r.meal || r.drink || r.name)
        .slice(0, 20);
      parts.push(
        [
          "RECIPES MODE: Create complete, cookable recipes for a couple (scaled servings).",
          "Always include: dish name, matching drink (unless they ask meal-only or drink-only), servings, time, meal ingredients, numbered meal steps, drink ingredients, drink steps.",
          "Respect dietary constraints, skill level, and time limits. Original recipes welcome.",
          "Catalog inspiration: " +
            catalog.map((r) => r.nationality + ": " + r.meal + " + " + r.drink).join(" | "),
          "Their saved/custom recipes: " +
            JSON.stringify(
              (saved || []).slice(0, 15).map((r) => ({
                meal: r.meal,
                drink: r.drink,
                custom: !!r.custom,
                category: r.category
              }))
            ),
          customNames.length ? "Custom titles: " + customNames.join(", ") : ""
        ].join("\n")
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
        return await callXai(key, CL.profile.getGrokModel(), history, context, options);
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
    // Keep last ~20 turns so long chats stay coherent without blowing context
    const trimmed = history.length > 24 ? history.slice(-24) : history;
    const messages = [{ role: "system", content: system }].concat(
      trimmed.map((m) => ({ role: m.role, content: m.content }))
    );

    const maxTokens = context === "recipes" ? 2200 : 1200;

    const body = {
      model: model,
      messages: messages,
      temperature: 0.65,
      max_tokens: maxTokens
    };

    // Reasoning-capable models: ask for a bit more deliberate thought when supported
    if (/grok-4\.5|reasoning|grok-4\.20/i.test(model)) {
      body.temperature = 0.6;
    }

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      let detail = res.statusText;
      try {
        const errBody = await res.json();
        detail = errBody.error?.message || errBody.message || JSON.stringify(errBody);
      } catch {
        /* ignore */
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error("API key rejected — check your xAI key in Profile.");
      }
      if (res.status === 404 || /model/i.test(String(detail))) {
        throw new Error(
          `Model “${model}” failed (${detail}). Try another model in Profile → Grok model.`
        );
      }
      throw new Error(detail || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const choice = data.choices && data.choices[0];
    const content =
      (choice && choice.message && choice.message.content) ||
      (choice && choice.text) ||
      "";
    if (!String(content).trim()) throw new Error("Empty response from Grok");
    return String(content).trim();
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

    if (context === "movies") return moviesReply(q);
    if (context === "books") return booksReply(q);
    if (context === "recipes") return recipesReply(q, history);
    return generalReply(q);
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
      return `Hey ${n.myName} & ${n.partnerName} 👋 What are we planning — dinner, a movie, notes, or something to cook?`;
    }
    return "Open Movies, Recipes, or Books for context-aware recs — or add an xAI API key in Profile for full live Grok chats.";
  }

  global.CL = global.CL || {};
  global.CL.chat = { create, buildSystemPrompt };
})(window);
