export interface ProductImage {
  id: number;
  url: string;
  position: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
}

export interface Seller {
  id: string;
  name: string;
  shop_name: string | null;
  avatar_url: string | null;
}

export type ProductStatus = 'draft' | 'active' | 'hidden';

export interface Product {
  id: number;
  seller_id: string;
  category_id: number | null;
  name: string;
  brand: string | null;
  sku: string;
  price: number;
  old_price: number | null;
  stock: number;
  description: string;
  specs: Record<string, string>;
  status: ProductStatus;
  rating_avg: number;
  reviews_count: number;
  created_at: string;
  images: ProductImage[];
  category: Category | null;
  seller: Seller | null;
}