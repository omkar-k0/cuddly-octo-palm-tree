/**
 * Deterministic signals that back up the classifier. If either the model or
 * these rules flag a criminal matter or an urgent deadline, we escalate.
 */

const CRIMINAL = [
  /\bfir\b/i,
  /\bpolice\b/i,
  /\barrest(ed)?\b/i,
  /\bbail\b/i,
  /\bcharge[\s-]?sheet\b/i,
  /\bcriminal\b/i,
  /\bipc\b/i,
  /\bbns\b/i,
  /bharatiya nyaya sanhita/i,
  /\bcrpc\b/i,
  /\bbnss\b/i,
  /\bjail\b/i,
  /\bcustody\b/i,
  /\bprison\b/i,
  /\bmagistrate\b/i,
  /\bcheque\b.*\bbounce|\bbounced?\b.*\bcheque\b|section\s*138\b/i,
  /\bassault(ed)?\b/i,
  /\bthreaten(ed|ing)?\b.*\b(kill|harm|attack)\b/i,
  /\bstalk(ing|ed)?\b/i,
  /\bextort(ion|ed)?\b/i,
  /\bfraud\b|\bscam(med)?\b|\bcyber\s?crime\b/i,
  /\bhack(ed|er|ing)\b/i,
  /\b(touched|touching|groped|groping) (me|her|my)\b|\bmolest(ed|ation|ing)?\b/i,
  /\brape|sexual assault|outrag(e|ing) (her|my) modesty\b/i,
  // Self-help eviction and forcible dispossession: the police may be involved.
  /\b(changed|broke) the locks?\b|\blocked (me|us) out\b|\bput (my|our) (things|belongings|stuff|luggage) outside\b|\bthrew (my|our) (things|belongings|stuff)\b/i,
  /\b(cut|cutting) off (the |my |our )?(water|electricity|power)\b/i,
];

export function looksCriminal(text: string): boolean {
  return CRIMINAL.some((r) => r.test(text));
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  a: 1, an: 1,
};

/**
 * Days until a deadline mentioned in the text, or null. Catches "today",
 * "tomorrow", "in 3 days", "within two days", "5 days left", "next week",
 * "this week". Calendar dates are left to the classifier, which gets today's date.
 */
export function deadlineDaysFromText(text: string): number | null {
  const t = text.toLowerCase();
  const found: number[] = [];
  if (/\b(today|tonight|by end of (the )?day|eod)\b/.test(t)) found.push(0);
  if (/\btomorrow\b/.test(t)) found.push(1);
  if (/\bday after tomorrow\b/.test(t)) found.push(2);
  if (/\bthis week\b/.test(t)) found.push(5);
  if (/\bnext week\b/.test(t)) found.push(7);
  const re =
    /\b(?:in|within|only|just|next|by|after)?\s*(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+(day|days|week|weeks)\b(?:\s+(?:left|remaining|to go|time))?/g;
  for (const m of t.matchAll(re)) {
    const raw = m[1];
    const n = /^\d+$/.test(raw) ? Number(raw) : WORD_NUMBERS[raw];
    if (n === undefined) continue;
    const end = m.index! + m[0].length;
    // "3 days ago", "15 days' wages", "30 days of salary" are not deadlines.
    if (/^\s*(ago|back|before now|'|’|of (wages|salary|pay))/.test(t.slice(end, end + 16))) continue;
    // Only count it as a deadline if a deadline cue is near it.
    const window = t.slice(Math.max(0, m.index! - 60), m.index! + m[0].length + 60);
    if (!/\b(deadline|due|last date|within|by|left|remaining|notice|reply|respond|hearing|vacate|expire|expires|before|must|have to|asked)\b/.test(window)) continue;
    found.push(m[2].startsWith("week") ? n * 7 : n);
  }
  return found.length ? Math.min(...found) : null;
}
