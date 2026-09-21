/* Two-option 8-ball picker with heavy-metal sting */
(function (global) {
  const STORAGE = "eightball";
  const FRAMES = [
    "assets/eightball/f1.jpg",
    "assets/eightball/f2.jpg",
    "assets/eightball/f3.jpg"
  ];

  function getData() {
    const d = CL.storage.get(STORAGE, { last: null, history: [] });
    if (!d || typeof d !== "object") return { last: null, history: [] };
    return {
      last: d.last || null,
      history: Array.isArray(d.history) ? d.history : []
    };
  }

  function savePick(a, b, winner) {
    const rec = {
      id: CL.uid("eb"),
      a: a,
      b: b,
      winner: winner,
      at: Date.now()
    };
    const data = getData();
    data.last = rec;
    data.history = (data.history || []).concat([rec]).slice(-40);
    CL.storage.set(STORAGE, data);
    return rec;
  }

  function render(root) {
    const last = getData().last;
    root.innerHTML = `
      <section class="page eight-page">
        <h1 class="page-title">8-Ball</h1>
        <p class="page-sub">Type two options. Shake. One survives.</p>

        <div class="eight-form">
          <div class="field">
            <label for="opt-a">Option A</label>
            <input id="opt-a" maxlength="80" placeholder="e.g. tacos" value="${CL.escapeHtml(
              (last && last.a) || ""
            )}" />
          </div>
          <div class="eight-vs">VS</div>
          <div class="field">
            <label for="opt-b">Option B</label>
            <input id="opt-b" maxlength="80" placeholder="e.g. pizza" value="${CL.escapeHtml(
              (last && last.b) || ""
            )}" />
          </div>
        </div>

        <div class="eight-stage" id="eight-stage">
          <div class="eight-options" id="eight-options" hidden>
            <div class="eight-opt" id="chip-a"></div>
            <div class="eight-opt" id="chip-b"></div>
          </div>
          <div class="eight-ball-wrap">
            <div class="eight-ball" id="eight-ball" role="button" tabindex="0" aria-label="Shake the 8-ball">
              <div class="eight-number">8</div>
              <div class="eight-window">
                <div class="eight-answer" id="eight-answer">Shake</div>
              </div>
            </div>
            <button type="button" class="btn btn-primary btn-block" id="eight-shake">Shake</button>
          </div>
          <div class="eight-result" id="eight-result" hidden>
            <p class="eight-result-kicker">The 8-ball has spoken</p>
            <p class="eight-result-pick" id="eight-result-pick"></p>
            <button type="button" class="btn btn-secondary btn-block" id="eight-replay">Shake again</button>
          </div>
        </div>
      </section>
    `;

    const ball = root.querySelector("#eight-ball");
    const answerEl = root.querySelector("#eight-answer");
    const optA = root.querySelector("#opt-a");
    const optB = root.querySelector("#opt-b");
    const chips = root.querySelector("#eight-options");
    const chipA = root.querySelector("#chip-a");
    const chipB = root.querySelector("#chip-b");
    const resultBox = root.querySelector("#eight-result");
    const resultPick = root.querySelector("#eight-result-pick");
    const shakeBtn = root.querySelector("#eight-shake");
    let busy = false;

    function runShake() {
      if (busy) return;
      const a = (optA.value || "").trim();
      const b = (optB.value || "").trim();
      if (!a || !b) {
        CL.toast("Enter two options");
        return;
      }
      if (a.toLowerCase() === b.toLowerCase()) {
        CL.toast("Make them different");
        return;
      }
      busy = true;
      shakeBtn.disabled = true;
      resultBox.hidden = true;
      chips.hidden = false;
      chipA.textContent = a;
      chipB.textContent = b;
      chipA.classList.remove("locked", "lost");
      chipB.classList.remove("locked", "lost");
      ball.classList.remove("shake", "has-answer", "shake-hard");
      answerEl.textContent = "…";
      void ball.offsetWidth;
      ball.classList.add("shake-hard");

      const winner = Math.random() < 0.5 ? a : b;
      const winChip = winner === a ? chipA : chipB;
      const loseChip = winner === a ? chipB : chipA;

      setTimeout(() => {
        ball.classList.remove("shake-hard");
        ball.classList.add("has-answer");
        answerEl.textContent = winner;
        winChip.classList.add("locked");
        loseChip.classList.add("lost");
        savePick(a, b, winner);
        playSting(winner, () => {
          resultPick.textContent = winner;
          resultBox.hidden = false;
          busy = false;
          shakeBtn.disabled = false;
        });
      }, 1100);
    }

    function playSting(winner, done) {
      const old = document.getElementById("maiden-sting");
      if (old) old.remove();
      const overlay = document.createElement("div");
      overlay.id = "maiden-sting";
      overlay.className = "maiden-overlay";
      overlay.innerHTML = `
        <div class="maiden-flash" aria-hidden="true"></div>
        <div class="maiden-frame f1" style="background-image:url('${FRAMES[0]}')"></div>
        <div class="maiden-frame f2" style="background-image:url('${FRAMES[1]}')"></div>
        <div class="maiden-frame f3" style="background-image:url('${FRAMES[2]}')"></div>
        <div class="maiden-pick" id="maiden-pick">${CL.escapeHtml(winner)}</div>
      `;
      document.body.appendChild(overlay);
      void overlay.offsetWidth;
      overlay.classList.add("beat-1");
      const timers = [];
      const steps = [
        [1200, "beat-2"],
        [2800, "beat-3"],
        [4200, "beat-slam"]
      ];
      steps.forEach(([ms, cls]) => {
        timers.push(setTimeout(() => overlay.classList.add(cls), ms));
      });
      const finish = () => {
        overlay.classList.add("beat-out");
        timers.push(
          setTimeout(() => {
            overlay.remove();
            window.removeEventListener("hashchange", onLeave);
            if (typeof done === "function") done();
          }, 400)
        );
      };
      const onLeave = () => {
        timers.forEach(clearTimeout);
        overlay.remove();
        window.removeEventListener("hashchange", onLeave);
      };
      window.addEventListener("hashchange", onLeave);
      timers.push(setTimeout(finish, 7000));
    }

    ball.addEventListener("click", runShake);
    ball.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        runShake();
      }
    });
    shakeBtn.addEventListener("click", runShake);
    root.querySelector("#eight-replay").addEventListener("click", () => {
      resultBox.hidden = true;
      chips.hidden = true;
      ball.classList.remove("has-answer");
      answerEl.textContent = "Shake";
      optA.focus();
    });
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.fun = { render };
})(window);
