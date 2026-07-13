/* Boredom — short daily essays / excerpts (in-app full text, no external links required) */
(function (global) {
  /**
   * Library of quick-to-read pieces. Tags drive like/dislike preferences.
   * body: array of paragraphs shown in the app.
   */
  const LIBRARY = [
    {
      id: "emerson-self",
      title: "Trust Thyself",
      author: "Ralph Waldo Emerson",
      source: "Self-Reliance (excerpt)",
      tags: ["philosophy", "essays", "america"],
      body: [
        "To believe your own thought, to believe that what is true for you in your private heart is true for all men — that is genius.",
        "Speak your latent conviction, and it shall be the universal sense; for the inmost in due time becomes the outmost, and our first thought is rendered back to us by the trumpets of the Last Judgment.",
        "A man should learn to detect and watch that gleam of light which flashes across his mind from within, more than the lustre of the firmament of bards and sages. Yet he dismisses without notice his thought, because it is his."
      ]
    },
    {
      id: "orwell-clear",
      title: "Politics and the English Language",
      author: "George Orwell",
      source: "Essay excerpt",
      tags: ["essays", "language", "politics"],
      body: [
        "Most people who bother with the matter at all would admit that the English language is in a bad way, but it is generally assumed that we cannot by conscious action do anything about it.",
        "Modern English, especially written English, is full of bad habits which spread by imitation and which can be avoided if one is willing to take the necessary trouble.",
        "If one gets rid of these habits one can think more clearly, and to think clearly is a necessary first step toward political regeneration."
      ]
    },
    {
      id: "sagan-pale",
      title: "The Pale Blue Dot",
      author: "Carl Sagan",
      source: "Pale Blue Dot (excerpt)",
      tags: ["science", "philosophy", "space"],
      body: [
        "Look again at that dot. That's here. That's home. That's us. On it everyone you love, everyone you know, everyone you ever heard of, every human being who ever was, lived out their lives.",
        "The aggregate of our joy and suffering, thousands of confident religions, ideologies, and economic doctrines, every hunter and forager, every hero and coward, every creator and destroyer of civilization… on a mote of dust suspended in a sunbeam.",
        "There is perhaps no better demonstration of the folly of human conceits than this distant image of our tiny world. To me, it underscores our responsibility to deal more kindly with one another."
      ]
    },
    {
      id: "thoreau-simplify",
      title: "Simplify, Simplify",
      author: "Henry David Thoreau",
      source: "Walden (excerpt)",
      tags: ["philosophy", "nature", "america"],
      body: [
        "Our life is frittered away by detail. An honest man has hardly need to count more than his ten fingers, or in extreme cases he may add his ten toes, and lump the rest.",
        "Simplicity, simplicity, simplicity! I say, let your affairs be as two or three, and not a hundred or a thousand; instead of a million count half a dozen, and keep your accounts on your thumb-nail.",
        "In the midst of this chopping sea of civilized life, such are the clouds and storms and quicksands and thousand-and-one items to be allowed for, that a man has to live, if he would not founder and go to the bottom and not make his port at all, by dead reckoning, and he must be a great calculator indeed who succeeds."
      ]
    },
    {
      id: "asimov-robots",
      title: "Three Laws, One Question",
      author: "Inspired by Isaac Asimov",
      source: "Sci-fi thought",
      tags: ["sci-fi", "technology", "ethics"],
      body: [
        "Imagine a machine that must never harm a human, must obey orders, and must protect its own existence — in that order.",
        "The puzzle was never the laws themselves. It was the edge cases: Whose order counts? What counts as harm? When does self-preservation become a moral claim?",
        "Every generation builds tools that outrun its metaphors. The useful habit is not fear of the tool, but clarity about the hierarchy of values we ask it to serve."
      ]
    },
    {
      id: "franklin-virtue",
      title: "Thirteen Virtues, One Week at a Time",
      author: "Benjamin Franklin",
      source: "Autobiography (paraphrase)",
      tags: ["history", "america", "habits"],
      body: [
        "Franklin kept a little book of virtues — temperance, silence, order, resolution, frugality, industry, sincerity, justice, moderation, cleanliness, tranquility, chastity, humility — and focused on one per week.",
        "He did not expect perfection. He expected attention: a daily mark when he failed, and a quiet pride when a week went clean.",
        "Self-improvement, in his method, was less a speech and more a spreadsheet of the soul."
      ]
    },
    {
      id: "woolf-room",
      title: "A Room of One’s Own",
      author: "Virginia Woolf",
      source: "Essay excerpt",
      tags: ["essays", "culture", "creativity"],
      body: [
        "A woman must have money and a room of her own if she is to write fiction — so runs the argument, spare and practical.",
        "But the room is also a metaphor: uninterrupted time, a lock that works, a mind not constantly commandeered by other people’s needs.",
        "Creativity is not only talent. It is the conditions that let talent stay long enough to finish a sentence."
      ]
    },
    {
      id: "feynman-know",
      title: "The Pleasure of Finding Things Out",
      author: "Richard Feynman",
      source: "Talk paraphrase",
      tags: ["science", "curiosity", "essays"],
      body: [
        "I can live with doubt and uncertainty and not knowing. I think it’s much more interesting to live not knowing than to have answers which might be wrong.",
        "I have approximate answers and possible beliefs and different degrees of certainty about different things, but I’m not absolutely sure of anything.",
        "The real prize of science is not a finished encyclopedia. It is the ongoing permission to say: we don’t know yet — and then to look."
      ]
    },
    {
      id: "douglass-july",
      title: "What to the Slave Is the Fourth of July?",
      author: "Frederick Douglass",
      source: "Speech excerpt (1852)",
      tags: ["history", "america", "justice"],
      body: [
        "Fellow-citizens, pardon me, allow me to ask, why am I called upon to speak here to-day? What have I, or those I represent, to do with your national independence?",
        "The rich inheritance of justice, liberty, prosperity and independence, bequeathed by your fathers, is shared by you, not by me. The sunlight that brought life and healing to you, has brought stripes and death to me.",
        "This Fourth July is yours, not mine. You may rejoice, I must mourn. America is always unfinished — its ideals argue with its history in public."
      ]
    },
    {
      id: "le-guin-carrier",
      title: "The Carrier Bag Theory of Fiction",
      author: "Ursula K. Le Guin",
      source: "Essay paraphrase",
      tags: ["sci-fi", "essays", "culture"],
      body: [
        "Maybe the first cultural device was not a spear, but a bag — something that could hold seeds, berries, a child, a story.",
        "Hero stories love the stick that kills. Daily life is full of containers that keep: baskets, books, apps, households.",
        "A good novel (and a good relationship) often looks less like a conquest and more like a well-made bag: what can we carry together without tearing?"
      ]
    },
    {
      id: "turing-imitation",
      title: "The Imitation Game",
      author: "Alan Turing",
      source: "Computing Machinery and Intelligence (paraphrase)",
      tags: ["technology", "philosophy", "history"],
      body: [
        "Instead of asking “Can machines think?”, Turing proposed a practical test: can a machine converse so well that you cannot tell it from a person?",
        "The move was sly. He shifted philosophy into experiment — and forced us to define intelligence by behavior we can observe.",
        "Seventy years later we still argue the same fence: performance versus understanding. The test endures because the question does."
      ]
    },
    {
      id: "montaigne-idle",
      title: "On Idleness",
      author: "Michel de Montaigne",
      source: "Essays (paraphrase)",
      tags: ["philosophy", "essays", "habits"],
      body: [
        "Like fallow land, the idle mind grows wild plants — fantastic, disordered thoughts — unless we give it a task.",
        "Montaigne’s cure was not constant busyness. It was deliberate attention: put the mind to work on something worthy, or it will invent its own noise.",
        "Boredom, then, is not empty. It is a field. What you plant there is the only harvest you get."
      ]
    },
    {
      id: "angelou-rise",
      title: "Still I Rise (excerpt)",
      author: "Maya Angelou",
      source: "Poem excerpt",
      tags: ["poetry", "america", "culture"],
      body: [
        "You may write me down in history with your bitter, twisted lies, you may trod me in the very dirt but still, like dust, I’ll rise.",
        "Does my sassiness upset you? Why are you beset with gloom? ’Cause I walk like I’ve got oil wells pumping in my living room.",
        "Leaving behind nights of terror and fear I rise into a daybreak that’s wondrously clear. I rise."
      ]
    },
    {
      id: "clarke-laws",
      title: "Clarke’s Third Law",
      author: "Arthur C. Clarke",
      source: "Profiles of the Future",
      tags: ["sci-fi", "technology", "essays"],
      body: [
        "Any sufficiently advanced technology is indistinguishable from magic.",
        "The line is famous because it cuts both ways: wonder at what we build, and humility about what we don’t yet understand.",
        "The useful companion rule: treat “magic” as an invitation to reverse-engineer, not as a reason to stop asking how."
      ]
    },
    {
      id: "king-letter",
      title: "Letter from Birmingham Jail (excerpt)",
      author: "Martin Luther King Jr.",
      source: "1963",
      tags: ["history", "america", "justice"],
      body: [
        "Injustice anywhere is a threat to justice everywhere. We are caught in an inescapable network of mutuality, tied in a single garment of destiny.",
        "Whatever affects one directly, affects all indirectly.",
        "The time is always ripe to do right. Wait means never for those who have already waited too long."
      ]
    },
    {
      id: "calvino-cities",
      title: "Invisible Cities (mood)",
      author: "Italo Calvino",
      source: "Inspired sketch",
      tags: ["literature", "travel", "essays"],
      body: [
        "Marco Polo describes cities that may not exist: cities of memory, desire, signs, trade, the dead.",
        "Kublai Khan listens, knowing each city is also Venice — and also the city in the listener’s head.",
        "Travel writing at its best does the same for couples: not a checklist of sights, but a shared map of how a place rearranged you."
      ]
    },
    {
      id: "hypatia-stars",
      title: "Look Up",
      author: "CL · original",
      source: "Science & wonder",
      tags: ["science", "philosophy", "curiosity"],
      body: [
        "The same physics that drops a coffee cup holds the moon in its slow path. That sentence should never stop being strange.",
        "You do not need a telescope to practice cosmology. You need five minutes of night and the decision not to check your phone.",
        "Wonder is a renewable resource. Boredom is often just wonder without a window."
      ]
    },
    {
      id: "jefferson-pursuit",
      title: "Life, Liberty, and the Pursuit",
      author: "Thomas Jefferson et al.",
      source: "Declaration (excerpt)",
      tags: ["history", "america", "philosophy"],
      body: [
        "We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness.",
        "That to secure these rights, Governments are instituted among Men, deriving their just powers from the consent of the governed.",
        "The document is a promise the country keeps arguing with — which is, in its own way, the work of a free people."
      ]
    },
    {
      id: "bradbury-books",
      title: "Fahrenheit 451 (spark)",
      author: "Ray Bradbury",
      source: "Novel paraphrase",
      tags: ["sci-fi", "books", "culture"],
      body: [
        "It was a pleasure to burn — until it wasn’t. Bradbury’s firemen start fires; the real heat is a society too distracted to notice what it lost.",
        "Screens can be windows or walls. The difference is whether anyone still chooses a long thought.",
        "A couple’s book club is a small act of resistance: two people, one text, no algorithm required."
      ]
    },
    {
      id: "seneca-time",
      title: "On the Shortness of Life",
      author: "Seneca",
      source: "Essay excerpt",
      tags: ["philosophy", "habits", "essays"],
      body: [
        "It is not that we have a short time to live, but that we waste a lot of it. Life is long enough if you know how to use it.",
        "We are not given a short life but we make it short, and we are not ill-supplied but wasteful of it.",
        "The part of life we really live is small. For all the rest of existence is not life, but merely time."
      ]
    }
  ];

  function dayOfYear(d) {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d - start;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /** Stable pseudo-shuffle for a given day → 5 pieces */
  function todaysPieces(date) {
    date = date || new Date();
    const seed = dayOfYear(date) + date.getFullYear() * 1000;
    const arr = LIBRARY.slice();
    // Fisher–Yates with seeded LCG
    let s = seed >>> 0;
    function rand() {
      s = (Math.imul(1664525, s) + 1013904223) >>> 0;
      return s / 4294967296;
    }
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    const pick = arr.slice(0, 5).map((piece, idx) =>
      Object.assign({}, piece, {
        published: date.toISOString().slice(0, 10),
        rotationIndex: idx
      })
    );
    return pick;
  }

  function refreshDaily() {
    const pieces = todaysPieces(new Date());
    global.CL.data.opeds = pieces;
    global.CL.data.fallbackOpeds = pieces;
    return pieces;
  }

  global.CL = global.CL || {};
  global.CL.data = global.CL.data || {};
  const today = todaysPieces(new Date());
  global.CL.data.opeds = today;
  global.CL.data.fallbackOpeds = today;
  global.CL.data.boredomLibrary = LIBRARY;
  global.CL.opedsApi = {
    fetchLiveOpeds: function () {
      const articles = refreshDaily();
      return Promise.resolve({
        articles: articles,
        source: "daily",
        note: "Five short reads for today · full text in the app"
      });
    },
    todaysPieces: todaysPieces,
    refreshDaily: refreshDaily,
    fallbackOpeds: today
  };
})(window);
