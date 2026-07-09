import React, { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatINR } from "@/lib/api";
import { X } from "lucide-react";

export default function FilterSidebar({
  categories,
  selectedCategories,
  onToggleCategory,
  minPrice,
  maxPrice,
  priceRange,
  onPriceChange,
  onReset,
}) {
  const totalActive = useMemo(
    () => selectedCategories.length + (priceRange[0] !== minPrice || priceRange[1] !== maxPrice ? 1 : 0),
    [selectedCategories, priceRange, minPrice, maxPrice]
  );

  return (
    <aside className="w-full md:w-64 shrink-0" data-testid="filter-sidebar">
      <div className="flex items-center justify-between mb-4">
        <div className="overline">Filters</div>
        {totalActive > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={onReset}
            data-testid="btn-clear-filters"
          >
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <Separator className="my-4" />

      <div>
        <div className="text-sm font-semibold mb-3" style={{ color: "var(--nje-text)" }}>
          Categories
        </div>
        <div className="space-y-2.5">
          {categories.map((c) => (
            <label
              key={c.id}
              className="flex items-center gap-3 cursor-pointer group"
              data-testid={`category-filter-${c.slug || c.id}`}
            >
              <Checkbox
                checked={selectedCategories.includes(c.id)}
                onCheckedChange={() => onToggleCategory(c.id)}
                className="data-[state=checked]:bg-[var(--nje-primary)] data-[state=checked]:border-[var(--nje-primary)]"
                data-testid={`category-checkbox-${c.slug || c.id}`}
              />
              <span className="text-sm flex-1 group-hover:opacity-80 transition-opacity" style={{ color: "var(--nje-text)" }}>
                {c.name}
              </span>
              <span className="text-xs" style={{ color: "var(--nje-muted)" }}>
                {c.product_count}
              </span>
            </label>
          ))}
        </div>
      </div>

      <Separator className="my-6" />

      <div>
        <div className="text-sm font-semibold mb-4" style={{ color: "var(--nje-text)" }}>
          Price Range
        </div>
        <div data-testid="price-range-slider" className="px-1">
          <Slider
            value={priceRange}
            min={minPrice}
            max={maxPrice}
            step={50}
            onValueChange={onPriceChange}
            minStepsBetweenThumbs={1}
          />
        </div>
        <div className="mt-4 flex items-center justify-between text-xs" style={{ color: "var(--nje-muted)" }}>
          <span data-testid="price-min-label">{formatINR(priceRange[0])}</span>
          <span data-testid="price-max-label">{formatINR(priceRange[1])}</span>
        </div>
      </div>
    </aside>
  );
}
