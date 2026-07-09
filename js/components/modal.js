(function (global) {
  function open(opts) {
    const root = document.getElementById("modal-root");
    if (!root) return;
    close();

    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");

    backdrop.innerHTML = `
      <div class="modal-sheet">
        <div class="modal-handle" aria-hidden="true"></div>
        <div class="modal-header">
          <div>
            <h2>${CL.escapeHtml(opts.title || "")}</h2>
            ${opts.subtitle ? `<p class="card-meta">${CL.escapeHtml(opts.subtitle)}</p>` : ""}
          </div>
          <button type="button" class="icon-btn modal-close" aria-label="Close">✕</button>
        </div>
        <div class="modal-body">${opts.bodyHtml || ""}</div>
      </div>
    `;

    const onKey = (e) => {
      if (e.key === "Escape") close();
    };

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
    backdrop.querySelector(".modal-close").addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    backdrop._onKey = onKey;

    root.appendChild(backdrop);
    if (opts.onMount) opts.onMount(backdrop.querySelector(".modal-body"), backdrop);
    return backdrop;
  }

  function close() {
    const root = document.getElementById("modal-root");
    if (!root) return;
    const backdrop = root.querySelector(".modal-backdrop");
    if (backdrop && backdrop._onKey) {
      document.removeEventListener("keydown", backdrop._onKey);
    }
    root.innerHTML = "";
  }

  global.CL = global.CL || {};
  global.CL.modal = { open, close };
})(window);
