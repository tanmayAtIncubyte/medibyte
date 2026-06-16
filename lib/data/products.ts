import { products, type Product } from "@/data/products";

// How many products the home page "Featured" rail shows. Used as the cap when
// selecting flagged products and as the fallback count when none are flagged.
export const FEATURED_LIMIT = 8;

export function listProducts(): Product[] {
  return products.map((product) => ({ ...product }));
}

export function findProductById(id: string): Product | null {
  const product = products.find((candidate) => candidate.id === id);
  return product ? { ...product } : null;
}

// Deterministic featured subset for the home page rail. Prefers products with
// the explicit `featured` flag (in seed order); if fewer than one is flagged,
// falls back to the first FEATURED_LIMIT products so the rail is never empty.
// Always returns copies and never exceeds FEATURED_LIMIT.
export function listFeaturedProducts(): Product[] {
  const all = listProducts();
  const flagged = all.filter((product) => product.featured === true);
  const selection = flagged.length > 0 ? flagged : all;
  return selection.slice(0, FEATURED_LIMIT);
}
