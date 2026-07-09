(function (global) {
  const opeds = [
    { id: "o1", title: "Why Slow Dates Still Matter", source: "The Soft Dispatch", url: "https://example.com/slow-dates", tags: ["relationships", "culture"] },
    { id: "o2", title: "Cities Designed for Walking Hearts", source: "Urban Bloom", url: "https://example.com/walkable", tags: ["cities", "lifestyle"] },
    { id: "o3", title: "The Case for Reading Out Loud Again", source: "Page & Quiet", url: "https://example.com/read-aloud", tags: ["books", "culture"] },
    { id: "o4", title: "Screens Off, Stars On", source: "Night Field", url: "https://example.com/stars", tags: ["tech", "wellbeing"] },
    { id: "o5", title: "What Restaurants Get Wrong About Romance", source: "Table Talk", url: "https://example.com/romance-dining", tags: ["food", "relationships"] },
    { id: "o6", title: "Travel Without a Bucket List", source: "Elsewhere", url: "https://example.com/no-bucket", tags: ["travel", "mindfulness"] }
  ];
  global.CL = global.CL || {};
  global.CL.data = global.CL.data || {};
  global.CL.data.opeds = opeds;
})(window);
