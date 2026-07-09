import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatINR, resolveImageUrl } from "@/lib/api";
import { Package, Tags, TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

function StatCard({ label, value, icon: Icon, tone = "neutral" }) {
  return (
    <div className="admin-surface rounded-lg border p-5" style={{ borderColor: "var(--admin-border)" }}>
      <div className="flex items-center justify-between">
        <div className="overline">{label}</div>
        <div className="w-8 h-8 rounded-md flex items-center justify-center"
             style={{ background: tone === "primary" ? "#111827" : "#F3F4F6", color: tone === "primary" ? "#fff" : "#111827" }}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-4 text-3xl font-admin font-semibold">{value}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [a, p] = await Promise.all([
          api.get("/analytics"),
          api.get("/products", { params: { sort: "newest", limit: 6 } }),
        ]);
        setAnalytics(a.data);
        setRecent(p.data);
      } catch (e) { /* noop */ }
    })();
  }, []);

  return (
    <div className="p-6 md:p-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="overline">Overview</div>
          <h1 className="font-admin text-2xl md:text-3xl font-semibold mt-1">Dashboard</h1>
        </div>
        <Link to="/admin/products/new">
          <Button className="bg-neutral-900 hover:bg-neutral-800" data-testid="btn-new-product-top">
            <Plus className="w-4 h-4 mr-2" /> New product
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <StatCard label="Total products" value={analytics?.total_products ?? "—"} icon={Package} tone="primary" />
        <StatCard label="Categories" value={analytics?.total_categories ?? "—"} icon={Tags} />
        <StatCard
          label="Top category"
          value={
            analytics?.per_category?.slice().sort((a, b) => b.count - a.count)[0]?.name || "—"
          }
          icon={TrendingUp}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 admin-surface rounded-lg border p-6" style={{ borderColor: "var(--admin-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="font-admin font-semibold">Recently added</div>
            <Link to="/admin/products" className="text-xs text-neutral-500 hover:text-neutral-800" data-testid="link-view-all-products">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {recent.map((p) => (
              <Link key={p.id} to={`/admin/products/${p.id}/edit`} className="block group" data-testid={`recent-product-${p.id}`}>
                <div className="product-img-wrap rounded-md" style={{ aspectRatio: "1 / 1" }}>
                  {p.image_url && <img src={resolveImageUrl(p.image_url)} alt={p.name} />}
                </div>
                <div className="mt-2 text-sm font-medium truncate">{p.name}</div>
                <div className="text-xs text-neutral-500">{formatINR(p.price)}</div>
              </Link>
            ))}
            {recent.length === 0 && (
              <div className="col-span-full text-sm text-neutral-500 py-8 text-center">No products yet.</div>
            )}
          </div>
        </div>

        <div className="admin-surface rounded-lg border p-6" style={{ borderColor: "var(--admin-border)" }}>
          <div className="font-admin font-semibold mb-4">Products by category</div>
          <div className="space-y-3">
            {(analytics?.per_category || []).map((c) => {
              const total = analytics.total_products || 1;
              const pct = Math.round((c.count / total) * 100);
              return (
                <div key={c.category_id}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{c.name}</span>
                    <span className="text-neutral-500">{c.count}</span>
                  </div>
                  <div className="h-1.5 mt-1.5 rounded-full bg-neutral-100 overflow-hidden">
                    <div className="h-full" style={{ width: `${pct}%`, background: "var(--nje-primary)" }} />
                  </div>
                </div>
              );
            })}
            {(!analytics || analytics.per_category.length === 0) && (
              <div className="text-sm text-neutral-500">No data yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
