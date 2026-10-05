import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Truck, PackageCheck, ArrowUpRight } from 'lucide-react';
import { useShop, phoneLink, whatsappLink, communityUrl } from '../lib/shop';
import { formatCurrency } from '../utils/formatCurrency';

export function HelpPage() {
  const shop = useShop();
  return <div className="container mx-auto px-4 py-12 max-w-5xl space-y-10">
    <div><p className="eyebrow">Here when you need us</p><h1 className="display-title mt-3">A little help.<br /><span className="text-primary">A lot of care.</span></h1>
      <p className="text-muted-foreground mt-5 max-w-xl">Questions about an item, a delivery, or a return? Talk to a real person. Include your order number when you get in touch.</p></div>
    <section className="grid sm:grid-cols-2 gap-4">
      {shop.supportPhone && <a className="help-card" href={phoneLink(shop.supportPhone)}><Phone className="text-primary" /><div><h2 className="font-bold">Call us</h2><p>{shop.supportPhone}</p></div><ArrowUpRight className="ml-auto" /></a>}
      {shop.supportPhone && <a className="help-card" href={whatsappLink(shop.supportPhone)} target="_blank" rel="noreferrer"><Phone className="text-primary" /><div><h2 className="font-bold">Message on WhatsApp</h2><p className="text-sm text-muted-foreground">Product and order questions</p></div><ArrowUpRight className="ml-auto" /></a>}
      {shop.supportEmail && <a className="help-card" href={'mailto:' + shop.supportEmail}><Mail className="text-primary" /><div><h2 className="font-bold">Email support</h2><p>{shop.supportEmail}</p></div></a>}
    </section>
    {shop.supportHours && <p className="text-sm text-muted-foreground">Support hours: {shop.supportHours}</p>}
    <a href={communityUrl} target="_blank" rel="noreferrer" className="help-card"><div><h2 className="font-bold">Join our WhatsApp community</h2><p className="text-sm text-muted-foreground mt-1">Marketplace updates and conversations. For an order problem, contact support directly above.</p></div><ArrowUpRight className="ml-auto shrink-0" /></a>
    <section id="delivery" className="policy-panel scroll-mt-28"><Truck className="text-primary mb-3" /><h2 className="text-2xl font-bold">Delivery in {shop.serviceArea || 'Ghana'}</h2>
      {shop.deliveryZones.length ? <><p className="mt-3 text-muted-foreground">Select your delivery area at checkout. The full charge is shown before payment. An address outside these areas needs confirmation from support before ordering.</p>
        <div className="mt-5 space-y-3">{shop.deliveryZones.map(zone => <div className="flex flex-wrap gap-3 justify-between rounded-xl bg-muted p-4" key={zone.id}><span className="font-semibold flex gap-2"><MapPin className="w-4" />{zone.name}</span><span>{zone.timing}</span><span className="font-bold">{formatCurrency(zone.fee)}</span></div>)}</div></>
        : <p className="mt-3 text-muted-foreground">Our Ghana pilot is being prepared. Contact us to check your location. Delivery areas, charges, and timing will be published here before online checkout opens.</p>}
      <p className="text-sm mt-5">Track order updates in <Link className="text-primary underline" to="/dashboard/orders">your account</Link>. Contact support if an order is delayed or arrives with a problem.</p>
    </section>
    <section id="returns" className="policy-panel scroll-mt-28"><PackageCheck className="text-primary mb-3" /><h2 className="text-2xl font-bold">Returns & refunds</h2>
      <p className="mt-3 font-semibold">Request help within {shop.returnDays} days of delivery.</p><p className="mt-3 text-muted-foreground whitespace-pre-line">{shop.returnTerms}</p>
      <p className="mt-4 text-muted-foreground">A refund request is reviewed by support. Approved refunds go back through the original payment provider. Your order shows when a refund is pending and when the provider confirms it. Processing time depends on the payment provider.</p>
    </section>
  </div>;
}
