import { PageContainer } from "@/components/layout/page-container";
import { ProductCatalog } from "@/components/products/product-catalog";

export default function ProductsPage() {
  return (
    <PageContainer>
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Shop products
        </h1>
        <p className="mt-2 text-muted-foreground">
          Over-the-counter essentials and prescription medicines, delivered.
        </p>
      </header>
      <ProductCatalog />
    </PageContainer>
  );
}
