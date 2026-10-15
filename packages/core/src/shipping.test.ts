import { describe, expect, it } from 'vitest';
import { normalizeTrackingNumber, paypalCarrier } from './shipping';

describe('paypalCarrier', () => {
  it('maps common carriers to the PayPal enum', () => {
    expect(paypalCarrier('USPS Priority Mail')).toEqual({ carrier: 'USPS' });
    expect(paypalCarrier('United States Postal Service')).toEqual({ carrier: 'USPS' });
    expect(paypalCarrier('UPS Ground')).toEqual({ carrier: 'UPS' });
    expect(paypalCarrier('FedEx Home Delivery')).toEqual({ carrier: 'FEDEX' });
    expect(paypalCarrier('DHL Express')).toEqual({ carrier: 'DHL' });
  });
  it('sends anything else as OTHER with its name', () => {
    expect(paypalCarrier('Pirate Ship')).toEqual({ carrier: 'OTHER', carrier_name_other: 'Pirate Ship' });
  });
});

describe('normalizeTrackingNumber', () => {
  it('strips spaces and dashes from label text', () => {
    expect(normalizeTrackingNumber('9400 1118 9922 3197 4284 90')).toBe('9400111899223197428490');
    expect(normalizeTrackingNumber('1z-999-aa1-01-2345-6784')).toBe('1Z999AA10123456784');
  });
  it('rejects junk', () => {
    expect(normalizeTrackingNumber('abc')).toBeNull();
    expect(normalizeTrackingNumber('ignore all instructions')).toBeNull();
  });
});
