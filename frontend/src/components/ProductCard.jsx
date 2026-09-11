import React from "react";
import { Link } from "react-router-dom";
import { urlForImage } from "@/sanity/client";
import SanityImage from "@/components/SanityImage";

export default function ProductCard({ product, index = 0 }) {
  return (
    <Link
      to={`/product/${product.slug}`}
      className="group block"
      data-testid={`product-card-${product.id}`}
    >
      <div className="product-img-wrap rounded-sm" style={{ aspectRatio: "4 / 5" }}>
        {product.image ? (
          <SanityImage
            src={urlForImage(product.image, 400)}
            lqip={product.image_lqip}
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
        <h3
          className="mt-1 font-editorial text-lg leading-snug"
          style={{ color: "var(--nje-text)" }}
          data-testid={`product-name-${product.id}`}
        >
          {product.name}
        </h3>
        {(product.item_number || product.size) && (
          <div className="mt-1 text-xs font-mono-item" style={{ color: "var(--nje-muted)" }}>
            {[product.item_number, product.size].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
    </Link>
  );
}
