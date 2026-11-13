import type { ContactInfo } from "@/types";
import SectionHeading from "@/components/ui/SectionHeading";
import ContactForm from "./ContactForm";

export default function ContactSection({ contact }: { contact: ContactInfo }) {
  const items = [
    { label: "Business location", value: contact.address },
    { label: "Business email", value: contact.email },
    { label: "Business phone", value: contact.phone },
  ];
  return (
    <div className="section">
      <SectionHeading eyebrow="Contact" title="Get in touch" subtitle="Questions about an order, a payment or a gift card? Send us a message." />
      <div className="grid gap-8 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-2">
          {items.map((i) => (
            <div key={i.label} className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{i.label}</p>
              <p className="mt-1 break-words font-medium">{i.value}</p>
            </div>
          ))}
        </div>
        <div className="lg:col-span-3"><ContactForm /></div>
      </div>
    </div>
  );
}
