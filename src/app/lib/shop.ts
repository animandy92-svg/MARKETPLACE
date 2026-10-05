import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

export type ShopSettings = {
  serviceArea: string; deliveryZones: { id: string; name: string; fee: number; timing: string }[];
  supportPhone: string; supportEmail: string; supportHours: string; taxBasisPoints: number;
  returnDays: number; returnTerms: string;
};
export const defaultShop: ShopSettings = {
  serviceArea: 'Ghana', deliveryZones: [], supportPhone: '0594081604', supportEmail: '', supportHours: '', taxBasisPoints: 0,
  returnDays: 7, returnTerms: 'Contact support within the return window for an incorrect, damaged, or misdescribed item. Keep the item and packaging. Support will confirm the return and refund arrangements before you send it back.',
};
export const communityUrl = 'https://chat.whatsapp.com/CG8lsJOYGZHLoDQR5pH1Zx';
export function useShop() {
  const [shop, setShop] = useState(defaultShop);
  useEffect(() => onSnapshot(doc(db, 'shop', 'settings'), snapshot => setShop({ ...defaultShop, ...snapshot.data() }), () => {}), []);
  return shop;
}
export function phoneLink(phone: string) { return 'tel:' + phone.replace(/[^+\d]/g, ''); }
export function whatsappLink(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return 'https://wa.me/' + (digits.startsWith('0') ? '233' + digits.slice(1) : digits);
}
