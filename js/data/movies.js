/* Seed movies for recommendations */
(function (global) {
  const catalog = [
    { id: "m1", title: "Before Sunrise", year: 1995, genres: ["romance", "drama"], vibe: "intimate walk-and-talk" },
    { id: "m2", title: "Spirited Away", year: 2001, genres: ["animation", "fantasy"], vibe: "wonder & heart" },
    { id: "m3", title: "The Grand Budapest Hotel", year: 2014, genres: ["comedy", "adventure"], vibe: "stylish & quirky" },
    { id: "m4", title: "Arrival", year: 2016, genres: ["sci-fi", "drama"], vibe: "mind-bending & tender" },
    { id: "m5", title: "Amélie", year: 2001, genres: ["romance", "comedy"], vibe: "whimsical Paris" },
    { id: "m6", title: "Paddington 2", year: 2017, genres: ["family", "comedy"], vibe: "pure joy" },
    { id: "m7", title: "Everything Everywhere All at Once", year: 2022, genres: ["sci-fi", "comedy"], vibe: "chaotic love" },
    { id: "m8", title: "Past Lives", year: 2023, genres: ["romance", "drama"], vibe: "quiet & aching" },
    { id: "m9", title: "The Secret Life of Walter Mitty", year: 2013, genres: ["adventure", "comedy"], vibe: "dreamy travel" },
    { id: "m10", title: "Coco", year: 2017, genres: ["animation", "family"], vibe: "music & family" },
    { id: "m11", title: "Her", year: 2013, genres: ["romance", "sci-fi"], vibe: "melancholy future" },
    { id: "m12", title: "Little Women", year: 2019, genres: ["drama", "romance"], vibe: "warm classic" }
  ];

  global.CL = global.CL || {};
  global.CL.data = global.CL.data || {};
  global.CL.data.movies = catalog;
})(window);
