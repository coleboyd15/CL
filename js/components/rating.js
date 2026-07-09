(function (global) {
  function starsHtml(rating, opts) {
    opts = opts || {};
    const max = opts.max || 5;
    const interactive = !!opts.interactive;
    const name = opts.name || "rating";
    let html = `<div class="stars" data-stars="${CL.escapeHtml(name)}" role="${interactive ? "radiogroup" : "img"}" aria-label="Rating ${rating} of ${max}">`;
    for (let i = 1; i <= max; i++) {
      const filled = i <= rating ? "filled" : "";
      const cls = `star ${filled}${interactive ? " interactive" : ""}`;
      if (interactive) {
        html += `<button type="button" class="${cls}" data-value="${i}" aria-label="${i} star${i > 1 ? "s" : ""}">★</button>`;
      } else {
        html += `<span class="${cls}" aria-hidden="true">★</span>`;
      }
    }
    html += "</div>";
    return html;
  }

  function bindStars(root, onChange) {
    if (!root) return;
    root.querySelectorAll(".stars").forEach((el) => {
      if (!el.querySelector(".interactive")) return;
      el.addEventListener("click", (e) => {
        const btn = e.target.closest(".star");
        if (!btn) return;
        const value = Number(btn.dataset.value);
        el.querySelectorAll(".star").forEach((s) => {
          s.classList.toggle("filled", Number(s.dataset.value) <= value);
        });
        el.dataset.value = String(value);
        if (onChange) onChange(value, el.dataset.stars);
      });
    });
  }

  function getStarValue(root, name) {
    const el = root.querySelector(`.stars[data-stars="${name}"]`);
    if (!el) return 0;
    if (el.dataset.value) return Number(el.dataset.value);
    return el.querySelectorAll(".star.filled").length;
  }

  global.CL = global.CL || {};
  global.CL.rating = { starsHtml, bindStars, getStarValue };
})(window);
