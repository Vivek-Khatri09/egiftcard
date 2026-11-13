export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Product {
  id: string;
  category_id: string | null;
  brand: string;
  name: string;
  slug: string;
  description: string | null;
  denomination_label: string;
  selling_price_npr: number;
  image_path: string | null;
  is_featured: boolean;
  created_at: string;
  stock_count: number;
  stock_status: StockStatus;
  sold_count: number;
}

export interface PublicReview {
  id: string;
  rating: number;
  body: string;
  created_at: string;
  display_name: string;
  product_name: string | null;
}

export interface ContactInfo {
  address: string;
  email: string;
  phone: string;
}
