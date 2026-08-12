import React, { Suspense, lazy } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";

import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import CustomerLayout from "@/components/CustomerLayout";

import Catalogue from "@/pages/Catalogue";
import ProductDetail from "@/pages/ProductDetail";

// Admin panel is code-split out of the public bundle — a catalogue visitor
// never downloads it (recharts, bulk upload, forms, etc.).
const AdminLayout = lazy(() => import("@/components/AdminLayout"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminProducts = lazy(() => import("@/pages/AdminProducts"));
const AdminProductForm = lazy(() => import("@/pages/AdminProductForm"));
const AdminBulkUpload = lazy(() => import("@/pages/AdminBulkUpload"));
const AdminCategories = lazy(() => import("@/pages/AdminCategories"));
const AdminAnalytics = lazy(() => import("@/pages/AdminAnalytics"));

// Sanity Studio (new CMS-based admin, being built alongside the existing
// admin panel — not yet wired up to replace it).
const SanityStudioPage = lazy(() => import("@/pages/SanityStudioPage"));

function AdminFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center admin-bg">
      <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
    </div>
  );
}

export default function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<AdminFallback />}>
            <Routes>
              {/* Customer */}
              <Route element={<CustomerLayout />}>
                <Route path="/" element={<Catalogue />} />
                <Route path="/product/:id" element={<ProductDetail />} />
              </Route>

              {/* Admin */}
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="products" element={<AdminProducts />} />
                <Route path="products/new" element={<AdminProductForm />} />
                <Route path="products/:id/edit" element={<AdminProductForm />} />
                <Route path="bulk-upload" element={<AdminBulkUpload />} />
                <Route path="categories" element={<AdminCategories />} />
                <Route path="analytics" element={<AdminAnalytics />} />
              </Route>

              {/* New Sanity Studio admin — not yet linked from the UI, reachable directly */}
              <Route path="/admin/studio/*" element={<SanityStudioPage />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </div>
  );
}
