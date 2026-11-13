import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { POLICY_LINKS } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

const CONTENT: Record<string, string[]> = {
  "refund-policy": [
    "All sales of digital gift cards are final. Once a code has been delivered to you, we do not offer refunds or exchanges, because a delivered code cannot be returned.",
    "This policy does not limit any rights you have under applicable consumer protection law.",
    "If a code you received is invalid, already used, or was not delivered, contact us as soon as possible with your order number. We will investigate and, where the problem is confirmed, replace the code or otherwise resolve it.",
    "If your payment was taken but your order could not be fulfilled, contact us so we can resolve it.",
  ],
  terms: [
    "By creating an account and purchasing from this store you agree to these terms.",
    "You must create an account before purchasing. You are responsible for keeping your login details private.",
    "Prices are shown in Nepalese Rupees (NPR) and may change without notice. The price shown at checkout applies to your order.",
    "Gift cards are issued by their respective brands. Each brand's own terms and regional restrictions apply once you redeem a code.",
    "We may cancel orders or restrict accounts in cases of suspected fraud or misuse.",
  ],
  privacy: [
    "We collect the information you give us when you register, order or contact us: your name, email address, phone number, and order and payment details.",
    "We use it to process orders, deliver gift card codes, provide support and prevent fraud. We do not sell your personal information.",
    "Payments are processed by eSewa, Khalti or your bank. We do not store card or wallet credentials.",
    "You can ask us to correct or delete your account information by contacting us.",
  ],
  "delivery-policy": [
    "Gift card codes are delivered only after your payment has been independently verified.",
    "eSewa and Khalti payments are verified automatically with the provider. Bank transfers are verified by our team, so they take longer.",
    "Once verified, your codes are emailed to you and saved in your account under your order history.",
    "If an email does not arrive, check your spam folder and your account order history. You can also contact us.",
  ],
};

export function generateStaticParams() {
  return POLICY_LINKS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: POLICY_LINKS.find((p) => p.slug === slug)?.label ?? "Policy" };
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params;
  const link = POLICY_LINKS.find((p) => p.slug === slug);
  const paragraphs = CONTENT[slug];
  if (!link || !paragraphs) notFound();

  return (
    <div className="section max-w-3xl">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">{link.label}</h1>
      <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Draft wording. Have this reviewed by a qualified professional and add your business details before launch.
      </p>
      <div className="mt-6 space-y-4 text-ink-soft">
        {paragraphs.map((t) => <p key={t}>{t}</p>)}
      </div>
    </div>
  );
}
