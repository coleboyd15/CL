(function (global) {
  function getSaved() {
    return CL.storage.get("recipes", []);
  }

  function setSaved(list) {
    // Syncs via Couple Group when joined (recipes is a SYNC_KEY)
    CL.storage.set("recipes", list);
  }

  function nationalities() {
    const set = new Set((CL.data.recipes || []).map((r) => r.nationality));
    set.add("Ours");
    return ["Any", ...[...set].sort()];
  }

  function pick(nat) {
    let pool = CL.data.recipes || [];
    if (nat && nat !== "Any") pool = pool.filter((r) => r.nationality === nat);
    if (!pool.length) pool = CL.data.recipes || [];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function linesToList(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter(Boolean);
  }

  function listHtml(items) {
    return `<ul class="recipe-list">${(items || []).map((i) => `<li>${CL.escapeHtml(i)}</li>`).join("")}</ul>`;
  }

  function stepsHtml(steps) {
    return `<ol class="recipe-steps">${(steps || []).map((s) => `<li>${CL.escapeHtml(s)}</li>`).join("")}</ol>`;
  }

  function recipeDetailHtml(r, opts) {
    opts = opts || {};
    const isCustom = !!r.custom;
    const cat = r.category || (r.meal && r.drink ? "both" : r.drink && !r.meal ? "drink" : "meal");
    const showMeal = cat === "meal" || cat === "both" || (r.meal && (r.mealIngredients || r.mealSteps));
    const showDrink = cat === "drink" || cat === "both" || (r.drink && (r.drinkIngredients || r.drinkSteps));

    return `
      <article class="card recipe-feature" data-id="${CL.escapeHtml(r.id || "")}">
        <div class="section-label">
          ${CL.escapeHtml(r.nationality || (isCustom ? "Ours" : "Custom"))}
          ${r.time ? " · " + CL.escapeHtml(r.time) : ""}
          ${r.servings ? " · serves " + CL.escapeHtml(String(r.servings)) : ""}
          ${isCustom ? ' · <span class="tag">Yours</span>' : ""}
          ${cat && isCustom ? " · " + CL.escapeHtml(cat) : ""}
        </div>
        ${
          showMeal && r.meal
            ? `<div class="card-title recipe-meal-title">🍽 ${CL.escapeHtml(r.meal)}</div>`
            : ""
        }
        ${
          showDrink && r.drink
            ? `<div class="card-title recipe-drink-title">🥤 ${CL.escapeHtml(r.drink)}</div>`
            : ""
        }
        ${
          !showMeal && !showDrink && (r.name || r.meal || r.drink)
            ? `<div class="card-title recipe-meal-title">${CL.escapeHtml(r.name || r.meal || r.drink)}</div>`
            : ""
        }

        ${
          showMeal
            ? `<div class="recipe-block">
          <div class="section-label">Meal ingredients</div>
          ${listHtml(r.mealIngredients)}
          <div class="section-label">Meal instructions</div>
          ${stepsHtml(r.mealSteps)}
          ${
            r.mealLink
              ? `<a class="btn btn-secondary btn-sm" href="${CL.escapeHtml(r.mealLink)}" target="_blank" rel="noopener">Meal reference ↗</a>`
              : ""
          }
        </div>`
            : ""
        }

        ${
          showDrink
            ? `<div class="recipe-block">
          <div class="section-label">Drink ingredients</div>
          ${listHtml(r.drinkIngredients)}
          <div class="section-label">Drink instructions</div>
          ${stepsHtml(r.drinkSteps)}
          ${
            r.drinkLink
              ? `<a class="btn btn-secondary btn-sm" href="${CL.escapeHtml(r.drinkLink)}" target="_blank" rel="noopener">Drink reference ↗</a>`
              : ""
          }
        </div>`
            : ""
        }

        ${r.notes ? `<p class="review-text" style="font-style:normal;margin-top:8px">${CL.escapeHtml(r.notes)}</p>` : ""}

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

  function openCustomForm(existing, onSaved) {
    const r = existing || {};
    const cat = r.category || "meal";
    const isEdit = !!r.id;

    CL.modal.open({
      title: isEdit ? "Edit recipe" : "Add my own recipe",
      subtitle: "Saved to favorites · syncs with your Couple Group",
      bodyHtml: `
        <div class="form-stack">
          <div class="field">
            <label for="cr-cat">Category</label>
            <select id="cr-cat">
              <option value="meal" ${cat === "meal" ? "selected" : ""}>Meal</option>
              <option value="drink" ${cat === "drink" ? "selected" : ""}>Drink</option>
              <option value="both" ${cat === "both" ? "selected" : ""}>Meal + drink</option>
            </select>
          </div>
          <div class="field" id="cr-meal-name-wrap">
            <label for="cr-meal">Meal name</label>
            <input id="cr-meal" value="${CL.escapeHtml(r.meal || "")}" placeholder="e.g. Garlic butter shrimp pasta" />
          </div>
          <div class="field" id="cr-drink-name-wrap">
            <label for="cr-drink">Drink name</label>
            <input id="cr-drink" value="${CL.escapeHtml(r.drink || "")}" placeholder="e.g. Homemade lemonade" />
          </div>
          <div class="field">
            <label for="cr-time">Time (optional)</label>
            <input id="cr-time" value="${CL.escapeHtml(r.time || "")}" placeholder="e.g. 35 min" />
          </div>
          <div class="field">
            <label for="cr-serv">Servings (optional)</label>
            <input id="cr-serv" value="${CL.escapeHtml(r.servings != null ? String(r.servings) : "2")}" placeholder="2" />
          </div>
          <div class="field" id="cr-meal-ing-wrap">
            <label for="cr-meal-ing">Meal ingredients <span class="card-meta">(one per line)</span></label>
            <textarea id="cr-meal-ing" rows="4" placeholder="8 oz pasta&#10;4 tbsp butter&#10;…">${CL.escapeHtml(
              (r.mealIngredients || []).join("\n")
            )}</textarea>
          </div>
          <div class="field" id="cr-meal-steps-wrap">
            <label for="cr-meal-steps">Meal instructions <span class="card-meta">(one step per line)</span></label>
            <textarea id="cr-meal-steps" rows="4" placeholder="Boil pasta…&#10;Melt butter…">${CL.escapeHtml(
              (r.mealSteps || []).join("\n")
            )}</textarea>
          </div>
          <div class="field" id="cr-drink-ing-wrap">
            <label for="cr-drink-ing">Drink ingredients <span class="card-meta">(one per line)</span></label>
            <textarea id="cr-drink-ing" rows="3" placeholder="2 lemons&#10;Sugar…">${CL.escapeHtml(
              (r.drinkIngredients || []).join("\n")
            )}</textarea>
          </div>
          <div class="field" id="cr-drink-steps-wrap">
            <label for="cr-drink-steps">Drink instructions <span class="card-meta">(one step per line)</span></label>
            <textarea id="cr-drink-steps" rows="3" placeholder="Juice lemons…">${CL.escapeHtml(
              (r.drinkSteps || []).join("\n")
            )}</textarea>
          </div>
          <div class="field">
            <label for="cr-notes">Notes (optional)</label>
            <textarea id="cr-notes" rows="2" placeholder="Doubles well, make ahead, etc.">${CL.escapeHtml(r.notes || "")}</textarea>
          </div>
          <button type="button" class="btn btn-primary btn-block" id="cr-save">${isEdit ? "Update recipe" : "Save recipe"}</button>
        </div>
      `,
      onMount(body) {
        function syncCategory() {
          const c = body.querySelector("#cr-cat").value;
          const mealOn = c === "meal" || c === "both";
          const drinkOn = c === "drink" || c === "both";
          body.querySelector("#cr-meal-name-wrap").style.display = mealOn ? "" : "none";
          body.querySelector("#cr-meal-ing-wrap").style.display = mealOn ? "" : "none";
          body.querySelector("#cr-meal-steps-wrap").style.display = mealOn ? "" : "none";
          body.querySelector("#cr-drink-name-wrap").style.display = drinkOn ? "" : "none";
          body.querySelector("#cr-drink-ing-wrap").style.display = drinkOn ? "" : "none";
          body.querySelector("#cr-drink-steps-wrap").style.display = drinkOn ? "" : "none";
        }
        body.querySelector("#cr-cat").addEventListener("change", syncCategory);
        syncCategory();

        body.querySelector("#cr-save").addEventListener("click", () => {
          const category = body.querySelector("#cr-cat").value;
          const meal = body.querySelector("#cr-meal").value.trim();
          const drink = body.querySelector("#cr-drink").value.trim();
          const mealIngredients = linesToList(body.querySelector("#cr-meal-ing").value);
          const mealSteps = linesToList(body.querySelector("#cr-meal-steps").value);
          const drinkIngredients = linesToList(body.querySelector("#cr-drink-ing").value);
          const drinkSteps = linesToList(body.querySelector("#cr-drink-steps").value);

          if (category === "meal" && !meal) {
            CL.toast("Add a meal name");
            return;
          }
          if (category === "drink" && !drink) {
            CL.toast("Add a drink name");
            return;
          }
          if (category === "both" && !meal && !drink) {
            CL.toast("Add a meal or drink name");
            return;
          }
          if (category === "meal" && !mealIngredients.length && !mealSteps.length) {
            CL.toast("Add ingredients or instructions");
            return;
          }
          if (category === "drink" && !drinkIngredients.length && !drinkSteps.length) {
            CL.toast("Add ingredients or instructions");
            return;
          }

          const entry = {
            id: r.id || CL.uid("rc"),
            custom: true,
            category,
            nationality: "Ours",
            meal: category === "drink" ? "" : meal,
            drink: category === "meal" ? "" : drink,
            time: body.querySelector("#cr-time").value.trim(),
            servings: body.querySelector("#cr-serv").value.trim() || "2",
            mealIngredients: category === "drink" ? [] : mealIngredients,
            mealSteps: category === "drink" ? [] : mealSteps,
            drinkIngredients: category === "meal" ? [] : drinkIngredients,
            drinkSteps: category === "meal" ? [] : drinkSteps,
            notes: body.querySelector("#cr-notes").value.trim(),
            updatedAt: Date.now(),
            createdAt: r.createdAt || Date.now()
          };

          const list = getSaved().slice();
          const idx = list.findIndex((x) => x.id === entry.id);
          if (idx >= 0) list[idx] = entry;
          else list.unshift(entry);
          setSaved(list);
          CL.toast(isEdit ? "Recipe updated" : "Recipe saved" + (CL.sync && CL.sync.isJoined() ? " · syncing" : ""));
          CL.modal.close();
          if (typeof onSaved === "function") onSaved(entry);
        });
      }
    });
  }

  function render(root) {
    let current = pick("Any");
    let nat = "Any";

    function paint() {
      const saved = getSaved();
      const customCount = saved.filter((r) => r.custom).length;

      root.innerHTML = `
        <section class="page">
          <h1 class="page-title">Recipes</h1>
          <p class="page-sub">Full ingredients & steps · meal + drink · your own recipes · Grok</p>

          <div class="card-actions" style="margin-bottom:12px">
            <button type="button" class="btn btn-primary" id="rc-add-own">＋ Add my own recipe</button>
          </div>

          <div class="field" style="margin-bottom:12px">
            <label for="rc-nat">Cuisine</label>
            <select id="rc-nat">
              ${nationalities()
                .map((n) => `<option value="${CL.escapeHtml(n)}" ${n === nat ? "selected" : ""}>${CL.escapeHtml(n)}</option>`)
                .join("")}
            </select>
          </div>

          ${
            nat === "Ours"
              ? `<div class="card" style="margin-bottom:12px"><p class="card-meta">Your custom recipes are under Saved favorites below. Use “Add my own recipe” to create one.</p></div>`
              : recipeDetailHtml(current)
          }

          <div id="rc-chat"></div>

          <div class="section-block" style="margin-top:20px">
            <div class="section-label">Saved favorites (${saved.length})${customCount ? ` · ${customCount} yours` : ""}</div>
            <p class="filter-hint" style="margin-bottom:8px">
              ${
                CL.sync && CL.sync.isJoined && CL.sync.isJoined()
                  ? "Synced with your Couple Group — both of you can add and edit."
                  : "Stored on this device. Join a Couple Group in Profile to share."
              }
            </p>
            <div class="stack-sm">
              ${
                saved.length
                  ? saved
                      .map(
                        (r) => `
                <article class="card" data-id="${CL.escapeHtml(r.id)}">
                  <div class="card-meta">
                    ${CL.escapeHtml(r.nationality || (r.custom ? "Ours" : ""))}
                    ${r.time ? " · " + CL.escapeHtml(r.time) : ""}
                    ${r.custom ? ' · <span class="tag">Yours</span>' : ""}
                    ${r.category ? " · " + CL.escapeHtml(r.category) : ""}
                  </div>
                  <div class="card-title" style="font-size:0.95rem">${CL.escapeHtml(r.meal || r.drink || "Recipe")}</div>
                  ${r.drink && r.meal ? `<div class="card-meta">${CL.escapeHtml(r.drink)}</div>` : ""}
                  <div class="card-actions">
                    <button type="button" class="btn btn-secondary btn-sm btn-view">View</button>
                    ${
                      r.custom
                        ? `<button type="button" class="btn btn-ghost btn-sm btn-edit">Edit</button>`
                        : ""
                    }
                    <button type="button" class="btn btn-ghost btn-sm btn-del">Remove</button>
                  </div>
                </article>`
                      )
                      .join("")
                  : `<p class="card-meta">No favorites yet. Add your own, save a generated recipe, or ask Grok.</p>`
              }
            </div>
          </div>
        </section>
      `;

      root.querySelector("#rc-add-own")?.addEventListener("click", () => {
        openCustomForm(null, () => paint());
      });

      root.querySelector("#rc-nat")?.addEventListener("change", (e) => {
        nat = e.target.value;
        if (nat !== "Ours") current = pick(nat);
        paint();
      });

      root.querySelector("#rc-new")?.addEventListener("click", () => {
        current = pick(nat === "Ours" ? "Any" : nat);
        paint();
      });

      root.querySelector("#rc-save")?.addEventListener("click", () => {
        const list = getSaved();
        if (list.some((r) => r.meal === current.meal && r.drink === current.drink && !r.custom)) {
          CL.toast("Already saved");
          return;
        }
        setSaved(
          [
            {
              id: CL.uid("rc"),
              custom: false,
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
              drinkLink: current.drinkLink,
              createdAt: Date.now()
            }
          ].concat(list)
        );
        CL.toast("Saved favorite");
        paint();
      });

      root.querySelectorAll(".btn-del").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.closest("[data-id]").dataset.id;
          if (!confirm("Remove this recipe?")) return;
          setSaved(getSaved().filter((r) => r.id !== id));
          CL.toast("Removed");
          paint();
        });
      });

      root.querySelectorAll(".btn-edit").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.closest("[data-id]").dataset.id;
          const r = getSaved().find((x) => x.id === id);
          if (!r) return;
          openCustomForm(r, () => paint());
        });
      });

      root.querySelectorAll(".btn-view").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.closest("[data-id]").dataset.id;
          const r = getSaved().find((x) => x.id === id);
          if (!r) return;
          CL.modal.open({
            title: r.meal || r.drink || "Recipe",
            subtitle: r.drink && r.meal ? r.drink : r.nationality || "",
            bodyHtml: recipeDetailHtml(r, { showActions: false })
          });
        });
      });

      CL.chat.create(root.querySelector("#rc-chat"), {
        context: "recipes",
        placeholder: "e.g. Give me an Italian dinner recipe and matching cocktail",
        welcome:
          "Ask for a custom meal + drink: cuisine, dietary needs, time limit, vibe. Or use “Add my own recipe” to save something you already cook — it syncs to your Couple Group."
      });
    }

    window.addEventListener("cl-sync-update", (e) => {
      if (e.detail && e.detail.key === "recipes") paint();
    });

    paint();
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.recipes = { render };
})(window);
