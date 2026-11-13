export const SITE_NAME = "Egiftcard";

export const NAV_ITEMS = [
  { id: "home", label: "Home" },
  { id: "products", label: "Products" },
  { id: "about", label: "About Me" },
  { id: "reviews", label: "Reviews" },
  { id: "contact", label: "Contact" },
] as const;

export const POLICY_LINKS = [
  { slug: "refund-policy", label: "Refund Policy" },
  { slug: "terms", label: "Terms & Conditions" },
  { slug: "privacy", label: "Privacy Policy" },
  { slug: "delivery-policy", label: "Gift Card Delivery Policy" },
] as const;
