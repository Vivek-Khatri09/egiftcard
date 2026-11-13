import SectionHeading from "@/components/ui/SectionHeading";
import { SITE_NAME } from "@/lib/site";

// Placeholder copy. Replace with real business information when it is available.
const VALUES = [
  { title: "Reliable delivery", text: "Codes are released only after your payment has been independently verified." },
  { title: "Fair local pricing", text: "All prices are shown in NPR, with no hidden currency conversion at checkout." },
  { title: "Clear policies", text: "Our refund, delivery, terms and privacy policies are easy to find and written in plain language." },
];

export default function AboutSection() {
  return (
    <div className="section">
      <SectionHeading eyebrow="About Me" title={`About ${SITE_NAME}`} />
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="space-y-4 text-ink-soft">
          <p>
            <strong className="text-ink">[Introduction placeholder]</strong> Introduce yourself or your business here: who you are, where you are based and why you started selling digital gift cards.
          </p>
          <p>
            <strong className="text-ink">[Business background placeholder]</strong> Add your story, how long you have been operating and what you focus on. Only include facts you can back up.
          </p>
          <p>
            {SITE_NAME} offers digital gift cards for popular brands. You choose a denomination, pay with eSewa, Khalti or bank transfer, and your code is delivered to your email and saved in your account once the payment is confirmed.
          </p>
          <div className="rounded-card bg-brand-50 p-5">
            <p className="font-semibold text-ink">Our mission</p>
            <p className="mt-1">[Mission placeholder] Make buying digital gift cards simple, safe and transparent for customers in Nepal.</p>
          </div>
        </div>
        <div className="space-y-4">
          <p className="font-display text-xl font-semibold">Why customers can trust us</p>
          {VALUES.map((v) => (
            <div key={v.title} className="card p-5">
              <p className="font-semibold">{v.title}</p>
              <p className="mt-1 text-sm text-ink-soft">{v.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
