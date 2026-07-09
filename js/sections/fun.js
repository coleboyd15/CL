(function (global) {
  const ANSWERS = [
    "It is certain",
    "Without a doubt",
    "Yes — definitely",
    "You may rely on it",
    "As I see it, yes",
    "Most likely",
    "Outlook good",
    "Yes",
    "Signs point to yes",
    "Reply hazy, try again",
    "Ask again later",
    "Better not tell you now",
    "Cannot predict now",
    "Concentrate and ask again",
    "Don't count on it",
    "My reply is no",
    "My sources say no",
    "Outlook not so good",
    "Very doubtful",
    "Absolutely not… or maybe?"
  ];

  function render(root) {
    root.innerHTML = `
      <section class="page">
        <h1 class="page-title">8-Ball</h1>
        <p class="page-sub">Ask a yes/no question, then shake</p>

        <div class="eight-ball-wrap">
          <div class="eight-ball" id="eight-ball" role="button" tabindex="0" aria-label="Shake the magic 8-ball">
            <div class="eight-number">8</div>
            <div class="eight-window">
              <div class="eight-answer" id="eight-answer">Tap to ask</div>
            </div>
          </div>
          <p class="card-meta" style="text-align:center">Think of a yes/no question, then tap the ball.</p>
          <button type="button" class="btn btn-primary" id="eight-shake">Shake it</button>
        </div>
      </section>
    `;

    const ball = root.querySelector("#eight-ball");
    const answerEl = root.querySelector("#eight-answer");
    const shake = () => {
      ball.classList.remove("shake", "has-answer");
      answerEl.textContent = "…";
      void ball.offsetWidth;
      ball.classList.add("shake");
      setTimeout(() => {
        answerEl.textContent = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
        ball.classList.add("has-answer");
        ball.classList.remove("shake");
      }, 550);
    };
    ball.addEventListener("click", shake);
    ball.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        shake();
      }
    });
    root.querySelector("#eight-shake").addEventListener("click", shake);
  }

  global.CL = global.CL || {};
  global.CL.sections = global.CL.sections || {};
  global.CL.sections.fun = { render };
})(window);
