import Image from "next/image";

const GRADIENTS = [
  "from-orange-500 to-red-600",
  "from-slate-700 to-slate-900",
  "from-emerald-500 to-teal-700",
  "from-indigo-500 to-purple-700",
  "from-pink-500 to-rose-600",
  "from-sky-500 to-blue-700",
];

function pick(brand: string) {
  let h = 0;
  for (const ch of brand) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length] ?? GRADIENTS[0]!;
}

export default function ProductImage({
  brand,
  denomination,
  imagePath,
  alt,
}: {
  brand: string;
  denomination: string;
  imagePath: string | null;
  alt: string;
}) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (imagePath && base) {
    return (
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-alt">
        <Image
          src={`${base}/storage/v1/object/public/product-images/${imagePath}`}
          alt={alt}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
    );
  }
  // Branded placeholder until an admin uploads a product image.
  return (
    <div className={`relative flex aspect-[16/10] w-full flex-col justify-between overflow-hidden bg-gradient-to-br p-5 text-white ${pick(brand)}`} role="img" aria-label={alt}>
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" aria-hidden />
      <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/10" aria-hidden />
      <span className="relative text-xs font-semibold uppercase tracking-widest text-white/80">Gift Card</span>
      <div className="relative">
        <p className="font-display text-2xl font-bold leading-tight">{brand}</p>
        <p className="text-3xl font-bold">{denomination}</p>
      </div>
    </div>
  );
}
