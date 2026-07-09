(function (global) {
  function getData() {
    return CL.storage.get("books", { read: [], current: [], wishlist: [] });
  }

  function setData(d) {
    CL.storage.set("books", d);
  }

  function bookCard(b, list) {
    return `
      <article class="card" data-id="${CL.escapeHtml(b.id)}" data-list="${list}">
        <div class="card-title">${CL.escapeHtml(b.title)}</div>
        <div class="card-meta">${CL.escapeHtml(b.author || "Unknown author")}${b.rating ? " · " : ""}${b.rating ? "" : ""}</div>
        ${b.rating ? CL.rating.starsHtml(b.rating) : `<span class="tag ${list === "wishlist" ? "wish" : list === "current" ? "" : "muted"}">${list}</span>`}
        ${b.review ? `<p class="review-text">“${CL.escapeHtml(b.review)}”</p>` : ""}
        <div class="card-actions">
          ${list === "wishlist" ? `<button type="button" class="btn btn-secondary btn-sm btn-to-current">Start reading</button>` : ""}
          ${list === "current" ? `<button type="button" class="btn btn-primary btn-sm btn-to-read">Finished</button>` : ""}
          <button type="button" class="btn btn-ghost btn-sm btn-remove">Remove</button>
        </div>
      </article>
    `;
  }

  function openForm(defaults, onSave) {
    defaults = defaults || {};
    CL.modal.open({
      title: defaults.id ? "Edit book" : "Add book",
      bodyHtml: `
        <div class="form-stack">
          <div class="field"><label>Title</label><input id="bk-title" value="${CL.escapeHtml(defaults.title || "")}" /></div>
          <div class="field"><label>Author</label><input id="bk-author" value="${CL.escapeHtml(defaults.author || "")}" /></div>
          <div class="field">
            <label>Shelf</label>
            <select id="bk-list">
              <option value="wishlist" ${defaults._list === "wishlist" ? "selected" : ""}>Wishlist</option>
              <option value="current" ${defaults._list === "current" ? "selected" : ""}>Currently reading</option>
              <option value="read" ${defaults._list === "read" || !defaults._list ? "selected" : ""}>Read</option>
            </select>
          </div>
          <div class="field" id="bk-rating-wrap">
            <label>Rating</label>
            ${CL.rating.starsHtml(defaults.rating || 0, { interactive: true, name: "bookRating" })}
          </div>
          <div class="field"><label>Review</label><textarea id="bk-review">${CL.escapeHtml(defaults.review || "")}</textarea></div>
          <button type="button" class="btn btn-primary btn-block" id="bk-save">Save</button>
        </div>
      `,
      onMount(body) {
        CL.rating.bindStars(body);
        const listEl = body.querySelector("#bk-list");
        const ratingWrap = body.querySelector("#bk-rating-wrap");
        const sync = () => {
          ratingWrap.style.display = listEl.value === "read" ? "" : "none";
        };
        listEl.addEventListener("change", sync);
        sync();
        body.querySelector("#bk-save").addEventListener("click", () => {
          const title = body.querySelector("#bk-title").value.trim();
          if (!title) {
            CL.toast("Add a title");
            return;
          }
          onSave({
            id: defaults.id || CL.uid("bk"),
            title,
            author: body.querySelector("#bk-author").value.trim(),
            list: listEl.value,
            rating: listEl.value === "read" ? CL.rating.getStarValue(body, "bookRating") : 0,
            review: body.querySelector("#bk-review").value.trim(),
            addedAt: defaults.addedAt || Date.now()
          });
          CL.modal.close();
        });
      }
    });
  }

  function render(root) {
    let tab = CL.storage.get("booksTab", "current");

    function paint() {
      const d = getData();
      root.innerHTML = `
        <section class="page">
          <div class="row-between" style="margin-bottom:4px">
            <h1 class="page-title" style="margin:0">Book Club</h1>
            <button type="button" class="btn btn-primary btn-sm" id="bk-add">+ Add</button>
          </div>
          <p class="page-sub">Read · current · wishlist + Grok recs</p>
          <div class="tabs">
            <button type="button" class="tab ${tab === "current" ? "active" : ""}" data-tab="current">Current (${(d.current || []).length})</button>
            <button type="button" class="tab ${tab === "read" ? "active" : ""}" data-tab="read">Read (${(d.read || []).length})</button>
            <button type="button" class="tab ${tab === "wishlist" ? "active" : ""}" data-tab="wishlist">Wish (${(d.wishlist || []).length})</button>
          </div>
          <div id="bk-panel"></div>
          <div id="bk-chat"></div>
        </section>
      `;

      const panel = root.querySelector("#bk-panel");
      const list = d[tab] || [];
      panel.innerHTML = list.length
        ? `<div class="stack-sm">${list.map((b) => bookCard(b, tab)).join("")}</div>`
        : `<div class="empty"><div class="emoji">📚</div><p>Nothing on this shelf yet.</p></div>`;

      root.querySelectorAll(".tab").forEach((t) => {
        t.addEventListener("click", () => {
          tab = t.dataset.tab;
          CL.storage.set("booksTab", tab);
          paint();
        });
      });

      root.querySelector("#bk-add").addEventListener("click", () => {
        openForm({ _list: tab }, (book) => {
          const data = getData();
          const entry = {
            id: book.id,
            title: book.title,
            author: book.author,
            rating: book.rating,
            review: book.review,
            addedAt: book.addedAt
          };
          data.read = (data.read || []).filter((x) => x.id !== book.id);
          data.current = (data.current || []).filter((x) => x.id !== book.id);
          data.wishlist = (data.wishlist || []).filter((x) => x.id !== book.id);
          data[book.list] = (data[book.list] || []).concat(entry);
          setData(data);
          tab = book.list;
          CL.storage.set("booksTab", tab);
          CL.toast("Book saved");
          paint();
        });
      });

      panel.querySelectorAll(".card").forEach((card) => {
        const id = card.dataset.id;
        const listName = card.dataset.list;
        card.querySelector(".btn-remove").addEventListener("click", () => {
          const data = getData();
          data[listName] = (data[listName] || []).filter((b) => b.id !== id);
          setData(data);
          CL.toast("Removed");
          paint();
        });
        card.querySelector(".btn-to-current")?.addEventListener("click", () => {
          const data = getData();
          const item = (data.wishlist || []).find((b) => b.id === id);
          if (!item) return;
          data.wishlist = data.wishlist.filter((b) => b.id !== id);
          data.current = (data.current || []).concat(item);
          setData(data);
          tab = "current";
          CL.storage.set("booksTab", tab);
          CL.toast("Now reading");
          paint();
        });
        card.querySelector(".btn-to-read")?.addEventListener("click", () => {
          const data = getData();
          const item = (data.current || []).find((b) => b.id === id);
          if (!item) return;
          openForm(Object.assign({}, item, { _list: "read" }), (book) => {
            data.current = data.current.filter((b) => b.id !== id);
            data.read = (data.read || []).concat({
              id: book.id,
              title: book.title,
              author: book.author,
              rating: book.rating,
              review: book.review,
              addedAt: book.addedAt
            });
            setData(data);
            tab = "read";
            CL.storage.set("booksTab", tab);
            CL.toast("Marked as read");
            paint();
          });
        });
      });

      CL.chat.create(root.querySelector("#bk-chat"), {
        context: "books",
        placeholder: "e.g. something short and weirdly tender",
        welcome: "Ask for book recommendations based on what you've read and rated."
      });
    }

    paint();
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.books = { render };
})(window);
