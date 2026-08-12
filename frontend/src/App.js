import React, { Suspense, lazy } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";

import { AuthProvider } from "@/contexts/AuthContext";
import CustomerLayout from "@/components/CustomerLayout";

import Catalogue from "@/pages/Catalogue";
import ProductDetail from "@/pages/ProductDetail";

// Sanity Studio is the current admin — code-split out of the public bundle,
// a catalogue visitor never downloads it.
const SanityStudioPage = lazy(() => import("@/pages/SanityStudioPage"));

// The old MongoDB/FastAPI-backed admin pages (AdminDashboard, AdminProducts,
// etc.) still exist and still work, but they no longer manage the live
// catalogue — the public site reads from Sanity now. Routing to them was
// removed so nobody edits data there by mistake; the files are left in
// place as a reference/fallback rather than deleted.

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
                <Route path="/product/:slug" element={<ProductDetail />} />
              </Route>

              {/* Admin — Sanity Studio */}
              <Route path="/admin/studio/*" element={<SanityStudioPage />} />
              <Route path="/admin/*" element={<Navigate to="/admin/studio" replace />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </div>
  );
}
