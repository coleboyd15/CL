/* Geolocation + distance helpers */
(function (global) {
  const LOCATION_KEY = "userLocation";

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
   * Places use northKm/eastKm offsets from a virtual center (user GPS or default).
   */
  function placesWithDistance(catalog, userLoc) {
    const center = userLoc || { lat: 37.7749, lng: -122.4194 }; // SF default if none
    return (catalog || []).map((p) => {
      const north = p.northKm != null ? p.northKm : 0;
      const east = p.eastKm != null ? p.eastKm : 0;
      const coords = offsetLatLng(center.lat, center.lng, north, east);
      const miles = userLoc
        ? distanceMiles(userLoc.lat, userLoc.lng, coords.lat, coords.lng)
        : null;
      return Object.assign({}, p, {
        lat: coords.lat,
        lng: coords.lng,
        distanceMiles: miles,
        distanceLabel: userLoc ? formatDistance(miles) : null
      });
    });
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
    placesWithDistance
  };
})(window);
