import React, { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X } from "lucide-react";

export const PRICE_RANGES = [
  { id: "50-250", label: "₹50 – ₹250", min: 50, max: 250 },
  { id: "300-600", label: "₹300 – ₹600", min: 300, max: 600 },
  { id: "750-1500", label: "₹750 – ₹1,500", min: 750, max: 1500 },
  { id: "1500-3000", label: "₹1,500 – ₹3,000", min: 1500, max: 3000 },
  { id: "3000-5000", label: "₹3,000 – ₹5,000", min: 3000, max: 5000 },
  { id: "5000-10000", label: "₹5,000 – ₹10,000", min: 5000, max: 10000 },
  { id: "10000-50000", label: "₹10,000 – ₹50,000", min: 10000, max: 50000 },
];

export default function FilterSidebar({
  categories,
  selectedCategories,
  onToggleCategory,
  selectedPriceRange,
  onSelectPriceRange,
  onReset,
}) {
  const totalActive = useMemo(
    () => selectedCategories.length + (selectedPriceRange ? 1 : 0),
    [selectedCategories, selectedPriceRange]
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

      <Separator className="my-4" />

      <div>
        <div className="text-sm font-semibold mb-3" style={{ color: "var(--nje-text)" }}>
          Price Range
        </div>
        <div className="space-y-2.5">
          {PRICE_RANGES.map((r) => (
            <label
              key={r.id}
              className="flex items-center gap-3 cursor-pointer group"
              data-testid={`price-filter-${r.id}`}
            >
              <Checkbox
                checked={selectedPriceRange === r.id}
                onCheckedChange={() => onSelectPriceRange(selectedPriceRange === r.id ? null : r.id)}
                className="data-[state=checked]:bg-[var(--nje-primary)] data-[state=checked]:border-[var(--nje-primary)]"
                data-testid={`price-checkbox-${r.id}`}
              />
              <span className="text-sm flex-1 group-hover:opacity-80 transition-opacity" style={{ color: "var(--nje-text)" }}>
                {r.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
