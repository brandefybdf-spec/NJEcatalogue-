import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const BARS = ["#8C5A4F", "#B08575", "#6E4239", "#D4A574", "#575F66", "#111827"];

export default function AdminAnalytics() {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/analytics");
      setAnalytics(data);
    })();
  }, []);

  if (!analytics) return <div className="p-10 text-sm text-neutral-500">Loading…</div>;

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8">
        <div className="overline">Insights</div>
        <h1 className="font-admin text-2xl md:text-3xl font-semibold mt-1">Analytics</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="admin-surface rounded-lg border p-5" style={{ borderColor: "var(--admin-border)" }}>
          <div className="overline">Total products</div>
          <div className="mt-3 text-3xl font-admin font-semibold" data-testid="stat-total-products">{analytics.total_products}</div>
        </div>
        <div className="admin-surface rounded-lg border p-5" style={{ borderColor: "var(--admin-border)" }}>
          <div className="overline">Categories</div>
          <div className="mt-3 text-3xl font-admin font-semibold" data-testid="stat-total-categories">{analytics.total_categories}</div>
        </div>
        <div className="admin-surface rounded-lg border p-5" style={{ borderColor: "var(--admin-border)" }}>
          <div className="overline">Top category</div>
          <div className="mt-3 text-lg font-admin font-semibold">
            {analytics.per_category.slice().sort((a, b) => b.count - a.count)[0]?.name || "—"}
          </div>
        </div>
        <div className="admin-surface rounded-lg border p-5" style={{ borderColor: "var(--admin-border)" }}>
          <div className="overline">Price buckets</div>
          <div className="mt-3 text-lg font-admin font-semibold">{analytics.price_distribution.filter(p => p.count > 0).length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="admin-surface rounded-lg border p-6" style={{ borderColor: "var(--admin-border)" }} data-testid="chart-per-category">
          <div className="font-admin font-semibold mb-6">Products per category</div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={analytics.per_category} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F1F1" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={56} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(140,90,79,0.06)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {analytics.per_category.map((_, i) => (
                    <Cell key={i} fill={BARS[i % BARS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-surface rounded-lg border p-6" style={{ borderColor: "var(--admin-border)" }} data-testid="chart-price-distribution">
          <div className="font-admin font-semibold mb-6">Price range distribution</div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={analytics.price_distribution} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F1F1" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(140,90,79,0.06)" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#8C5A4F" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
