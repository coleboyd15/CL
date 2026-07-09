/* Mock food / drink / dessert venues — offsets in km from user GPS */
(function (global) {
  const places = [
    {
      id: "p1",
      name: "Rose & Rye",
      type: "dinner",
      area: "Downtown",
      cuisine: "New American",
      blurb: "Candlelit booths, seasonal plates, great date energy.",
      walk: 4, quality: 5, vibe: 5, price: 3,
      northKm: 0.4, eastKm: 0.2
    },
    {
      id: "p2",
      name: "Mint Leaf Café",
      type: "café",
      area: "Arts District",
      cuisine: "Café",
      blurb: "Matcha lattes, soft playlists, sunny window seats.",
      walk: 5, quality: 4, vibe: 5, price: 2,
      northKm: 0.15, eastKm: -0.25
    },
    {
      id: "p3",
      name: "Cloud Nine Desserts",
      type: "dessert",
      area: "Midtown",
      cuisine: "Patisserie",
      blurb: "Cloud cakes, lavender soft-serve, shareable flights.",
      walk: 3, quality: 5, vibe: 4, price: 2,
      northKm: 1.1, eastKm: 0.6
    },
    {
      id: "p4",
      name: "The Quiet Pour",
      type: "drinks",
      area: "Harbor",
      cuisine: "Cocktails",
      blurb: "Low-lit cocktail bar with herb-forward drinks.",
      walk: 2, quality: 5, vibe: 5, price: 3,
      northKm: -0.8, eastKm: 1.4
    },
    {
      id: "p5",
      name: "Noodle House 88",
      type: "dinner",
      area: "Eastside",
      cuisine: "Ramen / Asian",
      blurb: "Rich broths, spicy options, always buzzing.",
      walk: 4, quality: 4, vibe: 4, price: 2,
      northKm: 0.3, eastKm: 1.8
    },
    {
      id: "p6",
      name: "Sunrise Taco Cart",
      type: "dinner",
      area: "Park Loop",
      cuisine: "Mexican",
      blurb: "Street tacos, horchata, picnic-table vibes.",
      walk: 5, quality: 4, vibe: 4, price: 1,
      northKm: -0.2, eastKm: -0.15
    },
    {
      id: "p7",
      name: "Green Bowl Co.",
      type: "café",
      area: "University",
      cuisine: "Healthy",
      blurb: "Build-your-own bowls, cold-pressed juices.",
      walk: 5, quality: 3, vibe: 3, price: 2,
      northKm: 2.0, eastKm: -0.5
    },
    {
      id: "p8",
      name: "Velvet Scoop",
      type: "dessert",
      area: "Downtown",
      cuisine: "Ice cream",
      blurb: "Small-batch ice cream with rotating weird flavors.",
      walk: 4, quality: 4, vibe: 4, price: 1,
      northKm: 0.55, eastKm: 0.1
    },
    {
      id: "p9",
      name: "Ember & Oak",
      type: "dinner",
      area: "West Hills",
      cuisine: "Steakhouse",
      blurb: "Wood-fired steaks, wine list, special-night energy.",
      walk: 1, quality: 5, vibe: 4, price: 5,
      northKm: 0.9, eastKm: -3.2
    },
    {
      id: "p10",
      name: "Bubble & Brew",
      type: "drinks",
      area: "Arts District",
      cuisine: "Tea / coffee",
      blurb: "Boba, espresso, board games in the back.",
      walk: 5, quality: 3, vibe: 5, price: 1,
      northKm: 0.05, eastKm: -0.4
    },
    {
      id: "p11",
      name: "Harbor Oyster Bar",
      type: "dinner",
      area: "Harbor",
      cuisine: "Seafood",
      blurb: "Fresh oysters, crisp whites, water views.",
      walk: 2, quality: 5, vibe: 4, price: 4,
      northKm: -1.2, eastKm: 2.0
    },
    {
      id: "p12",
      name: "Petit Macaron",
      type: "dessert",
      area: "Old Town",
      cuisine: "French sweets",
      blurb: "Macarons, croissants, pastel everything.",
      walk: 3, quality: 4, vibe: 5, price: 2,
      northKm: 1.6, eastKm: 0.3
    },
    {
      id: "p13",
      name: "Spice Route",
      type: "dinner",
      area: "Midtown",
      cuisine: "Indian",
      blurb: "Thalis, garlic naan, cozy booth seating.",
      walk: 3, quality: 5, vibe: 4, price: 2,
      northKm: 1.0, eastKm: 0.9
    },
    {
      id: "p14",
      name: "Nightcap Lounge",
      type: "drinks",
      area: "Downtown",
      cuisine: "Wine bar",
      blurb: "Natural wines, cheese boards, late hours.",
      walk: 4, quality: 4, vibe: 5, price: 3,
      northKm: 0.7, eastKm: -0.1
    },
    {
      id: "p15",
      name: "Parkside Picnic Kitchen",
      type: "café",
      area: "Park Loop",
      cuisine: "Sandwiches",
      blurb: "Grab-and-go sandwiches for a walk-and-eat date.",
      walk: 5, quality: 3, vibe: 4, price: 1,
      northKm: -0.35, eastKm: -0.05
    }
  ];

  global.CL = global.CL || {};
  global.CL.data = global.CL.data || {};
  global.CL.data.places = places;
})(window);
