import React from "react";
import { Link } from "react-router-dom";
import { resolveImageUrl, formatINR } from "@/lib/api";

export default function ProductCard({ product, index = 0 }) {
  return (
    <Link
      to={`/product/${product.id}`}
      className="group block"
      data-testid={`product-card-${product.id}`}
    >
      <div className="product-img-wrap rounded-sm" style={{ aspectRatio: "4 / 5" }}>
        {product.image_url ? (
          <img
            src={resolveImageUrl(product.image_url)}
            alt={product.name}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--nje-muted)" }}>
            No image
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="overline">{product.category_name}</div>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h3
            className="font-editorial text-lg leading-snug"
            style={{ color: "var(--nje-text)" }}
            data-testid={`product-name-${product.id}`}
          >
            {product.name}
          </h3>
          <div className="text-sm font-medium whitespace-nowrap" style={{ color: "var(--nje-text)" }}>
            {formatINR(product.price)}
          </div>
        </div>
        <div className="mt-1 font-mono-item text-xs" style={{ color: "var(--nje-muted)" }}>
          {product.item_number}
        </div>
      </div>
    </Link>
  );
}
