// Carrier names → PayPal Orders v2 `shipment_carrier` (the enum has ~1,450 values; we map the common US ones and
// send anything else as OTHER + carrier_name_other). Tracking numbers come from the seller or a label photo, never invented (D-013).

const KNOWN: Array<[RegExp, 'USPS' | 'UPS' | 'FEDEX' | 'DHL']> = [
  [/\b(usps|u\.s\. postal|united states postal|postal service)\b/i, 'USPS'],
  [/\b(ups|united parcel)\b/i, 'UPS'],
  [/\b(fedex|federal express)\b/i, 'FEDEX'],
  [/\bdhl\b/i, 'DHL'],
];

export function paypalCarrier(name: string): { carrier: string; carrier_name_other?: string } {
  const hit = KNOWN.find(([re]) => re.test(name));
  if (hit) return { carrier: hit[1] };
  const other = name.trim().slice(0, 64) || 'Other';
  return { carrier: 'OTHER', carrier_name_other: other };
}

/** Tracking numbers: letters and digits only, at least one digit (spaces and dashes from labels removed), 6–40 characters. */
export function normalizeTrackingNumber(raw: string): string | null {
  const t = raw.replace(/[\s-]/g, '').toUpperCase();
  return /^(?=.*\d)[A-Z0-9]{6,40}$/.test(t) ? t : null; // real tracking numbers always contain digits
}
