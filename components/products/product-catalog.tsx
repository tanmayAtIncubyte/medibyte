"use client";

import { useEffect, useState } from "react";

import type { Product } from "@/data/products";

type LoadState = "loading" | "loaded" | "error";

export function ProductCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/products")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then((data: Product[]) => {
        if (!cancelled) {
          setProducts(data);
          setState("loaded");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading") {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading products…
      </p>
    );
  }

  if (state === "error") {
    return (
      <p role="alert" className="text-sm text-destructive">
        We couldn&apos;t load the catalog. Please try again.
      </p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <li
          key={product.id}
          className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm"
        >
          <span className="inline-flex w-fit rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-primary">
            {product.type === "Rx" ? "Prescription" : "Over the counter"}
          </span>
          <h2 className="mt-3 font-heading text-base font-semibold text-foreground">
            {product.name}
          </h2>
          <p className="mt-2 flex-1 text-sm text-muted-foreground">
            {product.description}
          </p>
          <p className="mt-4 font-heading text-lg font-bold text-foreground">
            ${product.price.toFixed(2)}
          </p>
        </li>
      ))}
    </ul>
  );
}
