/** States and Union Territories, as India Code names them where it matters. */
export const states = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  // Union Territories
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
] as const;
export type StateName = (typeof states)[number];

/** Common spellings and big cities → state. Used to read a location from free text. */
export const placeToState: Record<string, StateName> = {
  "new delhi": "Delhi", delhi: "Delhi", ncr: "Delhi",
  mumbai: "Maharashtra", bombay: "Maharashtra", pune: "Maharashtra", thane: "Maharashtra",
  "navi mumbai": "Maharashtra", nagpur: "Maharashtra", nashik: "Maharashtra",
  bengaluru: "Karnataka", bangalore: "Karnataka", mysuru: "Karnataka", mysore: "Karnataka",
  chennai: "Tamil Nadu", madras: "Tamil Nadu", coimbatore: "Tamil Nadu", madurai: "Tamil Nadu",
  hyderabad: "Telangana", secunderabad: "Telangana",
  kolkata: "West Bengal", calcutta: "West Bengal",
  ahmedabad: "Gujarat", surat: "Gujarat", vadodara: "Gujarat",
  gurugram: "Haryana", gurgaon: "Haryana", faridabad: "Haryana",
  noida: "Uttar Pradesh", "greater noida": "Uttar Pradesh", ghaziabad: "Uttar Pradesh", lucknow: "Uttar Pradesh",
  jaipur: "Rajasthan", kochi: "Kerala", cochin: "Kerala", thiruvananthapuram: "Kerala",
  indore: "Madhya Pradesh", bhopal: "Madhya Pradesh", patna: "Bihar", bhubaneswar: "Odisha",
  visakhapatnam: "Andhra Pradesh", vizag: "Andhra Pradesh", vijayawada: "Andhra Pradesh",
  chandigarh: "Chandigarh", goa: "Goa", panaji: "Goa", guwahati: "Assam", ranchi: "Jharkhand",
  dehradun: "Uttarakhand", shimla: "Himachal Pradesh", srinagar: "Jammu and Kashmir", jammu: "Jammu and Kashmir",
};

export function normaliseState(s: string | null | undefined): StateName | null {
  if (!s) return null;
  const t = s.trim().toLowerCase();
  return states.find((x) => x.toLowerCase() === t) ?? placeToState[t] ?? null;
}
