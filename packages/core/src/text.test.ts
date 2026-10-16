import { describe, expect, it } from 'vitest';
import { sentenceCaseSubject } from './text';

describe('sentenceCaseSubject', () => {
  it('turns Title Case into sentence case', () => {
    expect(sentenceCaseSubject('Thank You for Your Order')).toBe('Thank you for your order');
    expect(sentenceCaseSubject('Your Refund Request Update')).toBe('Your refund request update');
    expect(sentenceCaseSubject('Your Mug Is On Its Way')).toBe('Your mug is on its way');
  });

  it('keeps the shop name, product titles, brands, acronyms and "I"', () => {
    expect(sentenceCaseSubject('A Note From Juniper Clay Studio', ['Juniper Clay Studio'])).toBe('A note from Juniper Clay Studio');
    expect(sentenceCaseSubject('Your Cobalt Drip Mug Ships Today', ['Cobalt drip mug'])).toBe('Your Cobalt drip mug ships today');
    expect(sentenceCaseSubject('Your PayPal Refund Is Done')).toBe('Your PayPal refund is done');
    expect(sentenceCaseSubject('Your USPS Tracking Is Ready')).toBe('Your USPS tracking is ready');
    expect(sentenceCaseSubject("Thanks, I'll Ship Your Order Soon")).toBe("Thanks, I'll ship your order soon");
  });

  it('leaves subjects that are not Title Case alone', () => {
    expect(sentenceCaseSubject('Thank you from Juniper Clay Studio')).toBe('Thank you from Juniper Clay Studio');
    expect(sentenceCaseSubject('Thanks from Maya')).toBe('Thanks from Maya');
    expect(sentenceCaseSubject('About your refund')).toBe('About your refund');
    expect(sentenceCaseSubject('  Order Shipped  ')).toBe('Order Shipped');
  });
});
