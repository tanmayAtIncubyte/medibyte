import { products, type Product } from "@/data/products";

export function listProducts(): Product[] {
  return products.map((product) => ({ ...product }));
}

export function findProductById(id: string): Product | null {
  const product = products.find((candidate) => candidate.id === id);
  return product ? { ...product } : null;
}
