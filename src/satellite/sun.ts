// Where the sun stands, good to a fraction of a degree: enough to light
// the globe and to tell day from night at a place.

const RAD = Math.PI / 180;

/** The spot on Earth that has the sun straight overhead. */
export function subSolar(date: Date): { lat: number; lon: number } {
  const days = date.getTime() / 86400000 - 10957.5; // since noon on 1 January 2000
  const g = (357.529 + 0.98560028 * days) * RAD;
  const q = 280.459 + 0.98564736 * days;
  const l = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const e = (23.439 - 0.00000036 * days) * RAD;
  const rightAscension = Math.atan2(Math.cos(e) * Math.sin(l), Math.cos(l)) / RAD;
  const declination = Math.asin(Math.sin(e) * Math.sin(l)) / RAD;
  const siderealTime = 280.46061837 + 360.98564736629 * days;
  return { lat: declination, lon: ((((rightAscension - siderealTime) % 360) + 540) % 360) - 180 };
}

/** The sine of the sun's height over the horizon at a place: above 0 is day. */
export function sunHeight(date: Date, lat: number, lon: number): number {
  const sun = subSolar(date);
  return (
    Math.sin(lat * RAD) * Math.sin(sun.lat * RAD) +
    Math.cos(lat * RAD) * Math.cos(sun.lat * RAD) * Math.cos((lon - sun.lon) * RAD)
  );
}
