import { db } from './firebase';
import { CheckoutError } from './checkout';

export const defaultSettings = {
  serviceArea: 'Ghana', deliveryZones: [] as { id: string; name: string; fee: number; timing: string }[],
  supportEmail: '', supportPhone: '0594081604', supportHours: '', taxBasisPoints: 0,
  returnDays: 7, returnTerms: 'Contact support within the return window for an incorrect, damaged, or misdescribed item. Keep the item and packaging. Support will confirm the return and refund arrangements before you send it back.',
};

export function validateSettings(data: any) {
  const out = { ...defaultSettings, ...data };
  for (const key of ['serviceArea', 'supportEmail', 'supportPhone', 'supportHours', 'returnTerms'] as const) {
    if (typeof out[key] !== 'string' || out[key].length > (key === 'returnTerms' ? 3000 : 200)) throw new CheckoutError('Invalid service settings');
    out[key] = out[key].trim();
  }
  if (out.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.supportEmail)) throw new CheckoutError('Enter a valid support email');
  if (!Number.isInteger(out.taxBasisPoints) || out.taxBasisPoints < 0 || out.taxBasisPoints > 3000
    || !Number.isInteger(out.returnDays) || out.returnDays < 1 || out.returnDays > 90) throw new CheckoutError('Invalid tax rate or return window');
  if (!Array.isArray(out.deliveryZones) || out.deliveryZones.length > 20) throw new CheckoutError('Add up to 20 delivery areas');
  const ids = new Set<string>();
  out.deliveryZones = out.deliveryZones.map((zone: any) => {
    if (!zone || !/^[\w-]{1,60}$/.test(zone.id) || ids.has(zone.id) || typeof zone.name !== 'string' || !zone.name.trim() || zone.name.length > 120
      || typeof zone.timing !== 'string' || !zone.timing.trim() || zone.timing.length > 160 || !Number.isFinite(zone.fee) || zone.fee < 0 || zone.fee > 10000) throw new CheckoutError('Each delivery area needs a unique ID, name, fee, and delivery timing');
    ids.add(zone.id);
    return { id: zone.id, name: zone.name.trim(), fee: Math.round(zone.fee * 100) / 100, timing: zone.timing.trim() };
  });
  return Object.fromEntries(Object.keys(defaultSettings).map(key => [key, (out as any)[key]])) as typeof defaultSettings;
}

export async function settings() {
  return validateSettings((await db.doc('shop/settings').get()).data() || {});
}

export function deliveryQuote(config: typeof defaultSettings, zoneId: unknown) {
  if (!config.serviceArea || (!config.supportEmail && !config.supportPhone)) throw new CheckoutError('The pilot is being prepared. Delivery and support details must be confirmed before ordering.', 503);
  const zone = config.deliveryZones.find(z => z.id === zoneId);
  if (!zone) throw new CheckoutError('Choose an available delivery area');
  return { zone, deliveryMinor: Math.round(zone.fee * 100), taxBasisPoints: config.taxBasisPoints };
}
