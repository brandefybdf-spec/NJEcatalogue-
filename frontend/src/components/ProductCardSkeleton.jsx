import React from "react";

export default function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="product-img-wrap rounded-sm" style={{ aspectRatio: "4 / 5", background: "var(--nje-surface)" }} />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-1/3 rounded" style={{ background: "var(--nje-surface)" }} />
        <div className="h-4 w-2/3 rounded" style={{ background: "var(--nje-surface)" }} />
      </div>
    </div>
  );
}
