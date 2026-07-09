/* Geolocation + distance helpers + OpenStreetMap nearby places */
(function (global) {
  const LOCATION_KEY = "userLocation";
  const NEARBY_CACHE_KEY = "nearbyPlacesCache_v2";
  const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
  const CACHE_RADIUS_DEG = 0.012; // ~0.8 mi — reuse cache if still nearby
  /** Default search ring ~3.7 mi; sparse areas expand further. */
  const DEFAULT_RADIUS_M = 6000;
  const EXPANDED_RADIUS_M = 12000; // ~7.5 mi when few results
  const MIN_PLACES_BEFORE_EXPAND = 12;
  const MAX_PLACES = 60;
  const OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter"
  ];
  const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

  function getSavedLocation() {
    return CL.storage.get(LOCATION_KEY, null);
  }

  function setSavedLocation(loc) {
    CL.storage.set(LOCATION_KEY, loc);
    return loc;
  }

  function clearLocation() {
    CL.storage.remove(LOCATION_KEY);
  }

  /** Haversine distance in miles */
  function distanceMiles(lat1, lon1, lat2, lon2) {
    const R = 3958.8;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Offset a point by north/east kilometers (approx).
   * Used to place mock venues relative to the user's real GPS.
   */
  function offsetLatLng(lat, lng, northKm, eastKm) {
    const dLat = northKm / 111.32;
    const dLng = eastKm / (111.32 * Math.cos((lat * Math.PI) / 180) || 1);
    return { lat: lat + dLat, lng: lng + dLng };
  }

  function formatDistance(miles) {
    if (miles == null || Number.isNaN(miles)) return "";
    if (miles < 0.1) return "< 0.1 mi";
    if (miles < 10) return miles.toFixed(1) + " mi";
    return Math.round(miles) + " mi";
  }

  function requestLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported on this device."));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            updatedAt: Date.now()
          };
          setSavedLocation(loc);
          resolve(loc);
        },
        (err) => {
          let msg = "Could not get your location.";
          if (err.code === 1) msg = "Location permission denied. Enable it in browser settings.";
          if (err.code === 2) msg = "Location unavailable. Try again outdoors or check GPS.";
          if (err.code === 3) msg = "Location request timed out. Try again.";
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    });
  }

  /**
   * Enrich catalog places with absolute coords + distance from user.
   * Absolute lat/lng (OSM) are used as-is; mock venues use northKm/eastKm offsets.
   */
  /**
   * Walk score from distance: nearby strolls score high; farther spots stay listed
   * with worse scores so “Walkable” filters drop them without hiding the place.
   * 5 ≤0.3mi · 4 ≤0.6 · 3 ≤1.0 · 2 ≤2.0 · 1 beyond (drive / rideshare)
   */
  function walkScoreFromMiles(miles) {
    if (miles == null || Number.isNaN(miles)) return 3;
    if (miles <= 0.3) return 5;
    if (miles <= 0.6) return 4;
    if (miles <= 1.0) return 3;
    if (miles <= 2.0) return 2;
    return 1;
  }

  function placesWithDistance(catalog, userLoc) {
    const center = userLoc || { lat: 37.7749, lng: -122.4194 }; // SF default if none
    return (catalog || []).map((p) => {
      let coords;
      if (p.northKm != null || p.eastKm != null) {
        coords = offsetLatLng(center.lat, center.lng, p.northKm || 0, p.eastKm || 0);
      } else if (p.lat != null && p.lng != null) {
        coords = { lat: p.lat, lng: p.lng };
      } else {
        coords = { lat: center.lat, lng: center.lng };
      }
      const miles = userLoc
        ? distanceMiles(userLoc.lat, userLoc.lng, coords.lat, coords.lng)
        : null;
      // Prefer live distance for walk when GPS is on; keep catalog walk if offline
      const walk = userLoc && miles != null ? walkScoreFromMiles(miles) : p.walk;
      return Object.assign({}, p, {
        lat: coords.lat,
        lng: coords.lng,
        distanceMiles: miles,
        distanceLabel: userLoc ? formatDistance(miles) : null,
        walk: walk != null ? walk : p.walk
      });
    });
  }

  function clampScore(n) {
    return Math.max(1, Math.min(5, Math.round(n)));
  }

  function typeFromOsm(tags) {
    const a = (tags.amenity || "").toLowerCase();
    const shop = (tags.shop || "").toLowerCase();
    if (a === "cafe" || shop === "coffee") return "café";
    if (a === "bar" || a === "pub" || a === "biergarten") return "drinks";
    if (
      a === "ice_cream" ||
      shop === "bakery" ||
      shop === "pastry" ||
      shop === "chocolate" ||
      shop === "confectionery"
    ) {
      return "dessert";
    }
    if (a === "fast_food") return "dinner";
    return "dinner";
  }

  function cuisineLabel(tags) {
    if (tags.cuisine) {
      return tags.cuisine
        .split(";")
        .map((c) => c.trim().replace(/_/g, " "))
        .filter(Boolean)
        .slice(0, 2)
        .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
        .join(" / ");
    }
    const a = (tags.amenity || "").toLowerCase();
    const shop = (tags.shop || "").toLowerCase();
    if (a === "cafe" || shop === "coffee") return "Café";
    if (a === "bar") return "Cocktails / bar";
    if (a === "pub") return "Pub";
    if (a === "ice_cream") return "Ice cream";
    if (shop === "bakery" || shop === "pastry") return "Bakery";
    if (a === "fast_food") return "Quick bites";
    if (a === "restaurant") return "Restaurant";
    return "Food & drink";
  }

  function scoresFromOsm(tags, miles) {
    let walk = walkScoreFromMiles(miles);

    let price = 3;
    const a = (tags.amenity || "").toLowerCase();
    const cuisine = (tags.cuisine || "").toLowerCase();
    if (a === "fast_food" || a === "ice_cream" || tags.shop === "bakery") price = 1;
    else if (a === "cafe" || a === "pub") price = 2;
    else if (/fine_dining|steak|seafood|sushi|french|omakase/.test(cuisine)) price = 4;
    else if (tags["stars"] === "4" || tags["stars"] === "5") price = 5;
    if (tags["price:range"] === "budget" || tags.price_range === "budget") price = 1;
    if (tags["price:range"] === "expensive" || tags.price_range === "expensive") price = 4;

    let quality = 3;
    if (tags.cuisine) quality += 1;
    if (tags.website || tags["contact:website"] || tags.phone || tags["contact:phone"]) quality += 1;
    if (tags.opening_hours) quality += 0.5;
    if (tags.stars) quality = Math.max(quality, 2 + Number(tags.stars) || 3);
    if (a === "fast_food") quality = Math.min(quality, 3);

    let vibe = 3;
    if (tags.outdoor_seating === "yes") vibe += 1;
    if (a === "bar" || a === "pub" || a === "cafe") vibe += 1;
    if (/italian|french|japanese|thai|mexican|korean|vietnamese|mediterranean|tapas|wine/.test(cuisine)) {
      vibe += 0.5;
    }
    if (tags.cuisine && tags.cuisine.split(";").length > 1) vibe += 0.5;
    if (tags.wheelchair === "yes") vibe += 0.25;

    return {
      walk: clampScore(walk),
      quality: clampScore(quality),
      vibe: clampScore(vibe),
      price: clampScore(price)
    };
  }

  function blurbFromOsm(tags, type, area) {
    const bits = [];
    const cuisine = cuisineLabel(tags);
    if (type === "café") bits.push("Coffee, light bites, good for a slow catch-up.");
    else if (type === "drinks") bits.push("Drinks-forward spot for a night out or nightcap.");
    else if (type === "dessert") bits.push("Sweet stop — share something after dinner.");
    else if (tags.amenity === "fast_food") bits.push("Casual and quick when you want low-effort eats.");
    else bits.push(`${cuisine} near ${area || "you"} — solid local pick from OpenStreetMap.`);

    if (tags.outdoor_seating === "yes") bits.push("Outdoor seating.");
    if (tags.opening_hours) bits.push("Hours listed on the map.");
    return bits.join(" ");
  }

  function elementCoords(el) {
    if (el.type === "node" && el.lat != null && el.lon != null) {
      return { lat: el.lat, lng: el.lon };
    }
    if (el.center && el.center.lat != null) {
      return { lat: el.center.lat, lng: el.center.lon };
    }
    if (el.lat != null && el.lon != null) {
      return { lat: el.lat, lng: el.lon };
    }
    return null;
  }

  function osmToPlace(el, userLoc, areaName) {
    const tags = el.tags || {};
    const name = (tags.name || tags.brand || "").trim();
    if (!name) return null;
    const coords = elementCoords(el);
    if (!coords) return null;

    const miles = userLoc
      ? distanceMiles(userLoc.lat, userLoc.lng, coords.lat, coords.lng)
      : null;
    const type = typeFromOsm(tags);
    const scores = scoresFromOsm(tags, miles);
    const area =
      tags["addr:neighbourhood"] ||
      tags["addr:suburb"] ||
      tags["addr:city"] ||
      tags["addr:district"] ||
      areaName ||
      "Nearby";

    const mapsUrl = `https://www.openstreetmap.org/${el.type}/${el.id}`;
    const id = "osm_" + el.type + "_" + el.id;

    return {
      id,
      name,
      type,
      area,
      cuisine: cuisineLabel(tags),
      blurb: blurbFromOsm(tags, type, area),
      walk: scores.walk,
      quality: scores.quality,
      vibe: scores.vibe,
      price: scores.price,
      lat: coords.lat,
      lng: coords.lng,
      source: "osm",
      osmId: el.id,
      mapsUrl,
      website: tags.website || tags["contact:website"] || "",
      phone: tags.phone || tags["contact:phone"] || ""
    };
  }

  function getNearbyCache(userLoc) {
    const cache = CL.storage.get(NEARBY_CACHE_KEY, null);
    if (!cache || !cache.places || !cache.lat || !userLoc) return null;
    if (Date.now() - (cache.at || 0) > CACHE_TTL_MS) return null;
    if (
      Math.abs(cache.lat - userLoc.lat) > CACHE_RADIUS_DEG ||
      Math.abs(cache.lng - userLoc.lng) > CACHE_RADIUS_DEG
    ) {
      return null;
    }
    return cache;
  }

  function setNearbyCache(userLoc, places, meta) {
    CL.storage.set(NEARBY_CACHE_KEY, {
      lat: userLoc.lat,
      lng: userLoc.lng,
      at: Date.now(),
      places,
      area: (meta && meta.area) || "",
      source: (meta && meta.source) || "osm",
      radiusM: (meta && meta.radiusM) || DEFAULT_RADIUS_M
    });
  }

  async function reverseGeocode(lat, lng) {
    try {
      const url =
        NOMINATIM_URL +
        `?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&format=json&zoom=14`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" }
      });
      if (!res.ok) return "";
      const data = await res.json();
      const a = data.address || {};
      return (
        a.neighbourhood ||
        a.suburb ||
        a.quarter ||
        a.city_district ||
        a.town ||
        a.city ||
        a.village ||
        a.hamlet ||
        data.name ||
        ""
      );
    } catch {
      return "";
    }
  }

  async function queryOverpass(lat, lng, radiusM) {
    const query = `
[out:json][timeout:25];
(
  node["amenity"~"^(restaurant|cafe|bar|pub|fast_food|ice_cream|biergarten|food_court)$"](around:${radiusM},${lat},${lng});
  way["amenity"~"^(restaurant|cafe|bar|pub|fast_food|ice_cream|biergarten|food_court)$"](around:${radiusM},${lat},${lng});
  node["shop"~"^(bakery|pastry|chocolate|coffee|confectionery)$"](around:${radiusM},${lat},${lng});
  way["shop"~"^(bakery|pastry|chocolate|coffee|confectionery)$"](around:${radiusM},${lat},${lng});
);
out center 100;
`.trim();

    let lastErr;
    for (const endpoint of OVERPASS_URLS) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: "data=" + encodeURIComponent(query)
        });
        if (!res.ok) throw new Error("Overpass " + res.status);
        const data = await res.json();
        return data.elements || [];
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("Could not reach OpenStreetMap");
  }

  /**
   * Fetch real nearby food/drink places from OpenStreetMap (Overpass).
   * Caches in localStorage. Falls back to offset mock catalog on failure.
   */
  function normalizeOsmPlaces(elements, userLoc, areaName) {
    const seen = new Set();
    let places = [];
    for (const el of elements) {
      const place = osmToPlace(el, userLoc, areaName);
      if (!place) continue;
      const key = place.name.toLowerCase() + "|" + place.lat.toFixed(4) + "|" + place.lng.toFixed(4);
      if (seen.has(key)) continue;
      seen.add(key);
      places.push(place);
    }

    places.sort((a, b) => {
      const da = distanceMiles(userLoc.lat, userLoc.lng, a.lat, a.lng);
      const db = distanceMiles(userLoc.lat, userLoc.lng, b.lat, b.lng);
      return da - db;
    });
    places = places.slice(0, MAX_PLACES);

    // Distance-based walk scores: far venues stay listed with low walk scores
    return places.map((p) => {
      const miles = distanceMiles(userLoc.lat, userLoc.lng, p.lat, p.lng);
      return Object.assign({}, p, { walk: walkScoreFromMiles(miles) });
    });
  }

  async function fetchNearbyPlaces(userLoc, options) {
    options = options || {};
    const radiusM = options.radiusM || DEFAULT_RADIUS_M;
    const force = !!options.force;

    if (!userLoc || userLoc.lat == null || userLoc.lng == null) {
      return {
        places: placesWithDistance(CL.data.fallbackPlaces || CL.data.places || [], null),
        source: "mock",
        area: ""
      };
    }

    if (!force) {
      const cached = getNearbyCache(userLoc);
      if (cached) {
        // Recompute walk scores from current distance in case you moved slightly
        const places = placesWithDistance(cached.places, userLoc).map((p) =>
          Object.assign({}, p, { walk: walkScoreFromMiles(p.distanceMiles) })
        );
        return {
          places,
          source: cached.source || "cache",
          area: cached.area || "",
          fromCache: true,
          radiusM: cached.radiusM || radiusM
        };
      }
    }

    try {
      const [elements, areaName] = await Promise.all([
        queryOverpass(userLoc.lat, userLoc.lng, radiusM),
        reverseGeocode(userLoc.lat, userLoc.lng)
      ]);

      let places = normalizeOsmPlaces(elements, userLoc, areaName);
      let usedRadius = radiusM;

      // Sparse area? widen the ring so something still shows (with worse walk scores)
      if (places.length < MIN_PLACES_BEFORE_EXPAND && !options.radiusM) {
        try {
          const wider = await queryOverpass(userLoc.lat, userLoc.lng, EXPANDED_RADIUS_M);
          const expanded = normalizeOsmPlaces(wider, userLoc, areaName);
          if (expanded.length > places.length) {
            places = expanded;
            usedRadius = EXPANDED_RADIUS_M;
          }
        } catch (expandErr) {
          console.warn("Expanded radius lookup failed:", expandErr);
        }
      }

      if (!places.length) {
        // Sparse map data — realistic mocks anchored to GPS
        const mock = placesWithDistance(CL.data.fallbackPlaces || CL.data.places || [], userLoc);
        setNearbyCache(userLoc, mock.map(stripRuntime), {
          area: areaName,
          source: "mock-local"
        });
        return {
          places: mock,
          source: "mock-local",
          area: areaName,
          note: "Few mapped venues here — showing realistic nearby placeholders."
        };
      }

      setNearbyCache(userLoc, places, {
        area: areaName,
        source: "osm",
        radiusM: usedRadius
      });
      const enriched = placesWithDistance(places, userLoc).map((p) =>
        Object.assign({}, p, { walk: walkScoreFromMiles(p.distanceMiles) })
      );
      return {
        places: enriched,
        source: "osm",
        area: areaName,
        radiusM: usedRadius,
        note:
          usedRadius > DEFAULT_RADIUS_M
            ? "Few walkable spots nearby — expanded search; farther places score lower on Walk."
            : ""
      };
    } catch (err) {
      console.warn("Nearby places fetch failed:", err);
      const mock = placesWithDistance(CL.data.fallbackPlaces || CL.data.places || [], userLoc);
      return {
        places: mock,
        source: "mock-fallback",
        area: "",
        error: err.message || "Map lookup failed",
        note: "Couldn’t reach OpenStreetMap — using local sample places around you."
      };
    }
  }

  function stripRuntime(p) {
    const copy = Object.assign({}, p);
    delete copy.distanceMiles;
    delete copy.distanceLabel;
    return copy;
  }

  /** Active catalog for Food + Grok: live OSM when loaded, else fallback. */
  function getActivePlaces() {
    if (CL.data.livePlaces && CL.data.livePlaces.length) return CL.data.livePlaces;
    return CL.data.fallbackPlaces || CL.data.places || [];
  }

  function setLivePlaces(list) {
    CL.data.livePlaces = list || [];
    // Keep CL.data.places in sync so chat / older callers see the live catalog
    CL.data.places = CL.data.livePlaces.length
      ? CL.data.livePlaces
      : CL.data.fallbackPlaces || [];
  }

  global.CL = global.CL || {};
  global.CL.geo = {
    getSavedLocation,
    setSavedLocation,
    clearLocation,
    distanceMiles,
    offsetLatLng,
    formatDistance,
    requestLocation,
    placesWithDistance,
    walkScoreFromMiles,
    fetchNearbyPlaces,
    reverseGeocode,
    getActivePlaces,
    setLivePlaces,
    getNearbyCache
  };
})(window);
