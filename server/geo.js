// Haversine distance between two lat/lng points, in metres.
export function distanceMeters(a, b) {
  if (
    a == null ||
    b == null ||
    a.lat == null ||
    a.lng == null ||
    b.lat == null ||
    b.lng == null
  ) {
    return Infinity;
  }
  const R = 6371000; // earth radius, metres
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Coarse geohash-style bucket key (analysis Q7: geo-partitioning).
// We snap coordinates to a grid so proximity scans only compare nearby buckets.
export function bucketKey(lat, lng, precision = 3) {
  if (lat == null || lng == null) return 'none';
  const f = 10 ** precision;
  return `${Math.round(lat * f)}:${Math.round(lng * f)}`;
}

// Return the 9 buckets (self + 8 neighbours) around a coordinate.
export function neighborBuckets(lat, lng, precision = 3) {
  if (lat == null || lng == null) return [];
  const f = 10 ** precision;
  const step = 1 / f;
  const keys = [];
  for (let dLat = -1; dLat <= 1; dLat++) {
    for (let dLng = -1; dLng <= 1; dLng++) {
      keys.push(bucketKey(lat + dLat * step, lng + dLng * step, precision));
    }
  }
  return keys;
}
