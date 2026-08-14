import React, { useEffect, useMemo, useState } from "react";
import { urlForImage } from "@/sanity/client";
import { getCategories, getProducts, getProductsByItemNumbers } from "@/sanity/queries";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import SanityImage from "@/components/SanityImage";
import FilterSidebar from "@/components/FilterSidebar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Search } from "lucide-react";
import { NJE_WHATSAPP_NUMBER } from "@/lib/contact";

// Hand-picked products for the homepage hero collage.
const HERO_ITEM_NUMBERS = ["NJE-Enamel-Gilat-001", "NJE-Necklaces-006", "NJE-Silver-013", "NJE-Silver-009"];

// Gilat Handcrafts products are shown, but always pushed to the end of the
// grid regardless of the chosen sort — a display preference, not a filter.
const PUSH_DOWN_CATEGORY = "Gilat Handcrafts";

function pushDownCategory(products) {
  const rest = products.filter((p) => p.category_name !== PUSH_DOWN_CATEGORY);
  const pushed = products.filter((p) => p.category_name === PUSH_DOWN_CATEGORY);
  return [...rest, ...pushed];
}

export default function Catalogue() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [heroProducts, setHeroProducts] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedPriceRange, setSelectedPriceRange] = useState(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);

  // Load categories + hero products once
  useEffect(() => {
    (async () => {
      try {
        setCategories(await getCategories());
      } catch (e) { /* noop */ }
    })();
    (async () => {
      try {
        setHeroProducts(await getProductsByItemNumbers(HERO_ITEM_NUMBERS));
      } catch (e) { /* noop */ }
    })();
  }, []);

  // Debounced product fetch on filter/search change
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await getProducts({
          categoryIds: selectedCategories,
          priceRangeId: selectedPriceRange,
          search,
          sort,
        });
        setProducts(pushDownCategory(data));
      } catch (e) { /* noop */ }
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [selectedCategories, selectedPriceRange, search, sort]);

  const toggleCategory = (id) =>
    setSelectedCategories((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const reset = () => {
    setSelectedCategories([]);
    setSelectedPriceRange(null);
    setSearch("");
  };

  const filters = (
    <FilterSidebar
      categories={categories}
      selectedCategories={selectedCategories}
      onToggleCategory={toggleCategory}
      selectedPriceRange={selectedPriceRange}
      onSelectPriceRange={setSelectedPriceRange}
      onReset={reset}
    />
  );

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ background: "var(--nje-surface)" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-16 md:pt-10 md:pb-24 grid md:grid-cols-2 gap-12 items-center md:items-start">
          <div>
            <div className="overline">Est. Handcrafted in India</div>
            <h1
              className="font-editorial mt-4 text-4xl sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight"
              style={{ color: "var(--nje-text)" }}
            >
              Silver-plated ornaments,<br />
              <em className="not-italic" style={{ color: "var(--nje-primary)" }}>gilat</em> handcrafts
              &amp; junk jewellery.
            </h1>
            <p className="mt-6 max-w-md text-base" style={{ color: "var(--nje-muted)" }}>
              Every piece from NJE is hand-picked and thoughtfully finished.
              Explore the full catalogue below.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <a
                href="#catalogue-grid"
                className="hero-cta inline-flex items-center px-6 py-3 text-sm font-medium border transition-colors"
                data-testid="btn-browse-products"
              >
                Browse Products
              </a>
              <a
                href={`https://wa.me/${NJE_WHATSAPP_NUMBER}?text=${encodeURIComponent(
                  "Hi NJE, I'd like to enquire about your catalogue."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hero-cta hero-cta-green inline-flex items-center px-6 py-3 text-sm font-medium border transition-colors"
                data-testid="btn-whatsapp-us"
              >
                WhatsApp Us
              </a>
            </div>
          </div>
          <div className="relative w-full md:max-w-sm md:ml-auto">
            <div className="grid grid-cols-2 gap-4">
              {heroProducts.map((p) => (
                <div key={p.id} className="product-img-wrap rounded-sm" style={{ aspectRatio: "3 / 4" }}>
                  {p.image && <SanityImage src={urlForImage(p.image, 400)} lqip={p.image_lqip} alt="" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <section className="max-w-7xl mx-auto px-6 sm:px-10 pt-10 pb-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="pl-9 bg-white"
              data-testid="search-input"
            />
          </div>
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="md:hidden" data-testid="btn-open-filters">
                  <SlidersHorizontal className="w-4 h-4 mr-2" /> Categories & Prices
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetTitle className="mb-4">Categories & Prices</SheetTitle>
                {filters}
              </SheetContent>
            </Sheet>
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-[120px] md:w-[180px] bg-white" data-testid="sort-select">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest" data-testid="sort-newest">Newest</SelectItem>
                <SelectItem value="name_asc" data-testid="sort-name-asc">Name: A → Z</SelectItem>
                <SelectItem value="name_desc" data-testid="sort-name-desc">Name: Z → A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section id="catalogue-grid" className="max-w-7xl mx-auto px-6 sm:px-10 pb-24">
        <div className="grid md:grid-cols-[16rem_1fr] gap-10 mt-6">
          <div className="hidden md:block">
            {filters}
          </div>
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm" style={{ color: "var(--nje-muted)" }} data-testid="results-count">
                {loading ? "Loading…" : `${products.length} product${products.length !== 1 ? "s" : ""}`}
              </div>
            </div>
            {loading && products.length === 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 sm:gap-x-6 gap-y-8 sm:gap-y-12">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="py-24 text-center text-sm" style={{ color: "var(--nje-muted)" }} data-testid="empty-state">
                No products match your filters.
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 sm:gap-x-6 gap-y-8 sm:gap-y-12" data-testid="product-grid">
                {products.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
