(function (global) {
  function getSaved() {
    return CL.storage.get("recipes", []);
  }

  function setSaved(list) {
    CL.storage.set("recipes", list);
  }

  function nationalities() {
    const set = new Set((CL.data.recipes || []).map((r) => r.nationality));
    return ["Any", ...[...set].sort()];
  }

  function pick(nat) {
    let pool = CL.data.recipes || [];
    if (nat && nat !== "Any") pool = pool.filter((r) => r.nationality === nat);
    if (!pool.length) pool = CL.data.recipes || [];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function listHtml(items) {
    return `<ul class="recipe-list">${(items || []).map((i) => `<li>${CL.escapeHtml(i)}</li>`).join("")}</ul>`;
  }

  function stepsHtml(steps) {
    return `<ol class="recipe-steps">${(steps || []).map((s) => `<li>${CL.escapeHtml(s)}</li>`).join("")}</ol>`;
  }

  function recipeDetailHtml(r, opts) {
    opts = opts || {};
    return `
      <article class="card recipe-feature" data-id="${CL.escapeHtml(r.id || "")}">
        <div class="section-label">${CL.escapeHtml(r.nationality || "Custom")} · ${CL.escapeHtml(r.time || "")}${r.servings ? " · serves " + CL.escapeHtml(r.servings) : ""}</div>
        <div class="card-title recipe-meal-title">🍽 ${CL.escapeHtml(r.meal)}</div>
        <div class="card-title recipe-drink-title">🥤 ${CL.escapeHtml(r.drink)}</div>

        <div class="recipe-block">
          <div class="section-label">Meal ingredients</div>
          ${listHtml(r.mealIngredients)}
          <div class="section-label">Meal instructions</div>
          ${stepsHtml(r.mealSteps)}
          ${
            r.mealLink
              ? `<a class="btn btn-secondary btn-sm" href="${CL.escapeHtml(r.mealLink)}" target="_blank" rel="noopener">Meal reference ↗</a>`
              : ""
          }
        </div>

        <div class="recipe-block">
          <div class="section-label">Drink ingredients</div>
          ${listHtml(r.drinkIngredients)}
          <div class="section-label">Drink instructions</div>
          ${stepsHtml(r.drinkSteps)}
          ${
            r.drinkLink
              ? `<a class="btn btn-secondary btn-sm" href="${CL.escapeHtml(r.drinkLink)}" target="_blank" rel="noopener">Drink reference ↗</a>`
              : ""
          }
        </div>

        ${
          opts.showActions !== false
            ? `<div class="card-actions" style="margin-top:12px">
                <button type="button" class="btn btn-primary btn-sm" id="rc-new">New recipe</button>
                <button type="button" class="btn btn-secondary btn-sm" id="rc-save">Save favorite</button>
              </div>`
            : ""
        }
      </article>
    `;
  }

  function render(root) {
    let current = pick("Any");
    let nat = "Any";

    function paint() {
      const saved = getSaved();
      root.innerHTML = `
        <section class="page">
          <h1 class="page-title">Recipes</h1>
          <p class="page-sub">Full ingredients & steps · meal + drink · Grok custom requests</p>

          <div class="field" style="margin-bottom:12px">
            <label for="rc-nat">Cuisine</label>
            <select id="rc-nat">
              ${nationalities()
                .map((n) => `<option value="${CL.escapeHtml(n)}" ${n === nat ? "selected" : ""}>${CL.escapeHtml(n)}</option>`)
                .join("")}
            </select>
          </div>

          ${recipeDetailHtml(current)}

          <div id="rc-chat"></div>

          <div class="section-block" style="margin-top:20px">
            <div class="section-label">Saved favorites (${saved.length})</div>
            <div class="stack-sm">
              ${
                saved.length
                  ? saved
                      .map(
                        (r) => `
                <article class="card" data-id="${CL.escapeHtml(r.id)}">
                  <div class="card-meta">${CL.escapeHtml(r.nationality || "")}${r.time ? " · " + CL.escapeHtml(r.time) : ""}</div>
                  <div class="card-title" style="font-size:0.95rem">${CL.escapeHtml(r.meal)}</div>
                  <div class="card-meta">${CL.escapeHtml(r.drink)}</div>
                  <div class="card-actions">
                    <button type="button" class="btn btn-secondary btn-sm btn-view">View</button>
                    <button type="button" class="btn btn-ghost btn-sm btn-del">Remove</button>
                  </div>
                </article>`
                      )
                      .join("")
                  : `<p class="card-meta">No favorites yet. Save a generated recipe or one from Grok.</p>`
              }
            </div>
          </div>
        </section>
      `;

      root.querySelector("#rc-nat").addEventListener("change", (e) => {
        nat = e.target.value;
        current = pick(nat);
        paint();
      });

      root.querySelector("#rc-new")?.addEventListener("click", () => {
        current = pick(nat);
        paint();
      });

      root.querySelector("#rc-save")?.addEventListener("click", () => {
        const list = getSaved();
        if (list.some((r) => r.meal === current.meal && r.drink === current.drink)) {
          CL.toast("Already saved");
          return;
        }
        setSaved(
          [
            {
              id: CL.uid("rc"),
              nationality: current.nationality,
              meal: current.meal,
              drink: current.drink,
              time: current.time,
              servings: current.servings,
              mealIngredients: current.mealIngredients,
              mealSteps: current.mealSteps,
              drinkIngredients: current.drinkIngredients,
              drinkSteps: current.drinkSteps,
              mealLink: current.mealLink,
              drinkLink: current.drinkLink
            }
          ].concat(list)
        );
        CL.toast("Saved favorite");
        paint();
      });

      root.querySelectorAll(".btn-del").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.closest("[data-id]").dataset.id;
          setSaved(getSaved().filter((r) => r.id !== id));
          CL.toast("Removed");
          paint();
        });
      });

      root.querySelectorAll(".btn-view").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.closest("[data-id]").dataset.id;
          const r = getSaved().find((x) => x.id === id);
          if (!r) return;
          CL.modal.open({
            title: r.meal,
            subtitle: r.drink,
            bodyHtml: recipeDetailHtml(r, { showActions: false })
          });
        });
      });

      CL.chat.create(root.querySelector("#rc-chat"), {
        context: "recipes",
        placeholder: 'e.g. Give me an Italian dinner recipe and matching cocktail',
        welcome:
          "Ask for a custom meal + drink: cuisine, dietary needs, time limit, vibe. I'll give full ingredients and steps. Live Grok (API key in Profile) is best for original recipes."
      });
    }

    paint();
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.recipes = { render };
})(window);
