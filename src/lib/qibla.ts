const KAABA_LAT = 21.4225;
const KAABA_LON = 39.8262;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
function toDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Great-circle bearing (0-360, clockwise from true north) from a point to the Kaaba. */
export function qiblaBearing(lat: number, lon: number): number {
  const latU = toRad(lat);
  const latK = toRad(KAABA_LAT);
  const dLon = toRad(KAABA_LON - lon);
  const y = Math.sin(dLon) * Math.cos(latK);
  const x = Math.cos(latU) * Math.sin(latK) - Math.sin(latU) * Math.cos(latK) * Math.cos(dLon);
  const bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}
