(function (global) {
  function clampRating(n, max) {
    max = max || 5;
    const v = Number(n);
    if (Number.isNaN(v) || v <= 0) return 0;
    return Math.min(max, Math.round(v * 10) / 10); // 1 decimal place
  }

  function formatRating(n) {
    const v = clampRating(n);
    if (!v) return "";
    return Number.isInteger(v) ? String(v) : v.toFixed(1);
  }

  function starFillPercent(rating, starIndex) {
    // starIndex 1..max — how full is this star (0–100)?
    const fill = Math.max(0, Math.min(1, (Number(rating) || 0) - (starIndex - 1)));
    return Math.round(fill * 100);
  }

  function starsHtml(rating, opts) {
    opts = opts || {};
    const max = opts.max || 5;
    const interactive = !!opts.interactive;
    const name = opts.name || "rating";
    const r = clampRating(rating, max);
    const showNum = opts.showNumber !== false && r > 0 && !interactive;

    let html = `<div class="stars" data-stars="${CL.escapeHtml(name)}" data-value="${r}" role="${
      interactive ? "group" : "img"
    }" aria-label="Rating ${formatRating(r) || 0} of ${max}">`;

    for (let i = 1; i <= max; i++) {
      const pct = starFillPercent(r, i);
      const cls = `star${interactive ? " interactive" : ""}`;
      if (interactive) {
        html += `<button type="button" class="${cls}" data-value="${i}" style="--star-fill:${pct}%" aria-label="${i} star${
          i > 1 ? "s" : ""
        }">★</button>`;
      } else {
        html += `<span class="${cls}" style="--star-fill:${pct}%" aria-hidden="true">★</span>`;
      }
    }

    if (showNum) {
      html += `<span class="rating-num">${CL.escapeHtml(formatRating(r))}</span>`;
    }

    if (interactive) {
      html += `<input type="number" class="rating-input" min="0" max="${max}" step="0.1" inputmode="decimal" value="${
        r ? CL.escapeHtml(formatRating(r)) : ""
      }" aria-label="Rating out of ${max}" placeholder="0–${max}" />`;
      html += `<div class="rating-hint">Tap stars for whole numbers, or type e.g. 4.5 / 3.8</div>`;
    }

    html += "</div>";
    return html;
  }

  function paintStars(el, value) {
    const max = el.querySelectorAll(".star").length || 5;
    const r = clampRating(value, max);
    el.dataset.value = String(r);
    el.querySelectorAll(".star").forEach((s, idx) => {
      const i = idx + 1;
      s.style.setProperty("--star-fill", starFillPercent(r, i) + "%");
    });
    const input = el.querySelector(".rating-input");
    if (input && document.activeElement !== input) {
      input.value = r ? formatRating(r) : "";
    }
    el.setAttribute("aria-label", "Rating " + (formatRating(r) || 0) + " of " + max);
  }

  function bindStars(root, onChange) {
    if (!root) return;
    root.querySelectorAll(".stars").forEach((el) => {
      if (!el.querySelector(".interactive") && !el.querySelector(".rating-input")) return;

      el.addEventListener("click", (e) => {
        const btn = e.target.closest(".star.interactive");
        if (!btn || !el.contains(btn)) return;
        const value = Number(btn.dataset.value);
        paintStars(el, value);
        if (onChange) onChange(value, el.dataset.stars);
      });

      const input = el.querySelector(".rating-input");
      if (input) {
        const apply = () => {
          let v = parseFloat(input.value);
          if (Number.isNaN(v)) v = 0;
          v = clampRating(v, el.querySelectorAll(".star").length || 5);
          paintStars(el, v);
          if (onChange) onChange(v, el.dataset.stars);
        };
        input.addEventListener("input", apply);
        input.addEventListener("change", apply);
      }
    });
  }

  function getStarValue(root, name) {
    const el = root.querySelector(`.stars[data-stars="${name}"]`);
    if (!el) return 0;
    if (el.dataset.value != null && el.dataset.value !== "") {
      return clampRating(el.dataset.value);
    }
    const input = el.querySelector(".rating-input");
    if (input && input.value !== "") return clampRating(input.value);
    return 0;
  }

  global.CL = global.CL || {};
  global.CL.rating = {
    starsHtml,
    bindStars,
    getStarValue,
    clampRating,
    formatRating
  };
})(window);
