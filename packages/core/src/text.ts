// Small text rules for model-written copy. Deterministic, so the same draft always publishes the same way.

const MINOR = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'for', 'of', 'to', 'in', 'on', 'at', 'by', 'from', 'with', 'as']);
const isAcronym = (w: string) => /^[A-Z]{2,}$/.test(w);
const isMixedCase = (w: string) => /^[A-Z]?[a-z]+[A-Z]/.test(w); // PayPal, iPhone
const isFirstPerson = (w: string) => /^I(['’](m|ll|ve|d))?$/.test(w);

/**
 * Turns a Title Case subject ("Thank You for Your Order") into sentence case ("Thank you for your order").
 * Words in `keep` (the shop name, product titles), acronyms, mixed-case brands and "I" keep their casing. A subject
 * that isn't Title Case is returned unchanged, so a lone proper noun ("Thanks from Maya") is never lowercased.
 */
export function sentenceCaseSubject(subject: string, keep: string[] = []): string {
  const kept = new Set(keep.flatMap((k) => k.split(/\s+/)).filter((w) => /^[A-Z]/.test(w)));
  const words = subject.trim().split(/\s+/);
  const fixed = (w: string) => kept.has(w.replace(/[^\p{L}'’-]/gu, '')) || isAcronym(w) || isMixedCase(w) || isFirstPerson(w);
  // Title Case leaves short function words lowercase ("Thank You for Your Order"), so judge only the other words.
  // A capitalised function word ("A Note From …") is extra evidence.
  const later = words.slice(1).filter((w) => /\p{L}/u.test(w) && !fixed(w));
  const rest = later.filter((w) => !MINOR.has(w.toLowerCase()));
  const upper = (w: string) => /^\p{Lu}/u.test(w);
  if (rest.some((w) => !upper(w)) || later.filter(upper).length < 2) return subject.trim();
  return words.map((w, i) => (i === 0 || fixed(w) ? w : w.toLowerCase())).join(' ');
}
