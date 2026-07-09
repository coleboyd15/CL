/* Offline trip idea banks by vibe / known cities */
(function (global) {
  const tripIdeas = {
    paris: {
      lodging: [
        "Hôtel des Grands Boulevards — design hotel, great location",
        "Le Marais boutique apartment (Airbnb) — walkable cafés",
        "Hotel Recamier (Saint-Germain) — quiet, classic"
      ],
      food: [
        "Breakfast at a corner boulangerie (fresh croissant + café crème)",
        "Dinner at a classic bistro in Saint-Germain or Oberkampf",
        "Late crêpe near Île Saint-Louis"
      ],
      drinks: [
        "Natural wine bar in the 11th",
        "Cocktail hour at Experimental Cocktail Club",
        "Sunset apéro along the Seine"
      ],
      activities: [
        "Sunrise walk along the Seine / Île de la Cité",
        "Musée d'Orsay or a smaller museum (Picasso / Rodin)",
        "Picnic in Luxembourg Gardens",
        "Evening stroll through Montmartre or Latin Quarter"
      ]
    },
    "coastal weekend": {
      lodging: ["Seaside inn with balcony", "Boutique hotel near the pier", "Ocean-view Airbnb with kitchen"],
      food: ["Harbor oyster breakfast", "Sunset taco walk", "Bakery for rainy mornings"],
      drinks: ["Beach bar spritz", "Local brewery flight", "Hotel lobby nightcap"],
      activities: ["Morning beach walk", "Bike the boardwalk", "Sunset lookout", "Rainy-day bookstore crawl"]
    },
    "city escape": {
      lodging: ["Design hotel downtown", "Quiet loft in arts district", "Central boutique hotel"],
      food: ["Tasting-menu splurge", "Late-night noodles", "Famous breakfast spot"],
      drinks: ["Rooftop cocktails", "Speakeasy reservation", "Coffee crawl"],
      activities: ["Neighborhood walking tour", "Museum afternoon", "Live music or comedy", "Park picnic"]
    },
    "mountain cabin": {
      lodging: ["A-frame cabin with fireplace", "Lodge with hot tub", "Forest cabin Airbnb"],
      food: ["Farmers market picnic", "Cozy diner breakfast", "Home-cooked cabin pasta"],
      drinks: ["Hot cocoa by the fire", "Local craft beer", "Mulled wine"],
      activities: ["Easy hike with a view", "Stargazing", "Board games night", "Scenic drive"]
    },
    tokyo: {
      lodging: ["Business hotel in Shinjuku or Shibuya", "Ryokan-style stay for one night", "Quiet Airbnb in a residential ward"],
      food: ["Ramen shop queue", "Conveyor sushi", "Depachika basements for snacks"],
      drinks: ["Standing sake bar", "Kissaten coffee", "Rooftop highball"],
      activities: ["Meiji Shrine morning", "TeamLab or museum", "Neighborhood walk (Yanaka / Shimokitazawa)", "Night crossing at Shibuya"]
    },
    default: {
      lodging: ["Charming B&B near the center", "Central boutique hotel", "Quiet Airbnb with a kitchen"],
      food: ["Local favorite breakfast spot", "Walkable dinner with good vibe", "Dessert worth the detour"],
      drinks: ["Neighborhood wine bar", "Café for afternoon slow-down", "Hotel lobby nightcap"],
      activities: ["Main sights at off-peak hours", "A long neighborhood walk", "Park or waterfront golden hour", "One flexible free half-day"]
    }
  };

  function ideasFor(dest) {
    const d = (dest || "").toLowerCase();
    if (/paris|france/.test(d)) return tripIdeas.paris;
    if (/tokyo|japan/.test(d)) return tripIdeas.tokyo;
    if (/coast|beach|sea|ocean|harbor|malibu|miami|nice|barcelona/.test(d)) return tripIdeas["coastal weekend"];
    if (/mountain|cabin|hike|forest|aspen|banff|alps/.test(d)) return tripIdeas["mountain cabin"];
    if (/city|york|downtown|metro|london|chicago|berlin/.test(d)) return tripIdeas["city escape"];
    return tripIdeas.default;
  }

  global.CL = global.CL || {};
  global.CL.data = global.CL.data || {};
  global.CL.data.tripIdeas = tripIdeas;
  global.CL.data.ideasForTrip = ideasFor;
})(window);
