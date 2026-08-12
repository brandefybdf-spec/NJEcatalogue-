import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { NJE_WHATSAPP_NUMBER, formatPhoneDisplay } from "@/lib/contact";

export default function CustomerLayout() {
  const location = useLocation();
  return (
    <div className="min-h-screen" style={{ background: "var(--nje-bg)" }}>
      <header
        className="sticky top-0 z-30 border-b"
        style={{ background: "rgba(250,250,250,0.85)", backdropFilter: "blur(14px)", borderColor: "var(--nje-border)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-10 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 min-w-0" data-testid="nav-home-link">
            <img
              src="/nje-logo.webp"
              alt="NJE — Novelty Jewellery Emporium"
              className="h-10 sm:h-12 md:h-14 w-auto shrink-0"
            />
            <div className="hidden sm:block leading-tight border-l pl-3" style={{ borderColor: "var(--nje-border)" }}>
              <div className="font-editorial text-sm italic" style={{ color: "var(--nje-primary)" }}>
                Since 1951
              </div>
              <div className="overline text-[10px]">Aatmaram Satish Kumar Gilat Wale</div>
            </div>
          </Link>
          <nav className="flex items-center gap-4 sm:gap-8 shrink-0">
            <Link to="/" className="text-sm font-medium hover:opacity-70 transition-opacity"
                  style={{ color: location.pathname === "/" ? "var(--nje-primary)" : "var(--nje-text)" }}
                  data-testid="nav-catalogue">
              Catalogue
            </Link>
            <Link to="/admin" className="text-sm font-medium hover:opacity-70 transition-opacity"
                  style={{ color: "var(--nje-muted)" }}
                  data-testid="nav-admin-link">
              Admin
            </Link>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="mt-24 border-t" style={{ borderColor: "var(--nje-border)" }}>
        <div className="max-w-7xl mx-auto px-6 sm:px-10 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src="/nje-logo.webp" alt="NJE" className="h-14 w-auto" />
            <div>
              <div className="font-editorial text-lg leading-tight" style={{ color: "var(--nje-text)" }}>
                Novelty Jewellery Emporium
              </div>
              <div className="text-xs mt-0.5" style={{ color: "var(--nje-muted)" }}>
                Aatmaram Satish Kumar Gilat Wale · Since 1951
              </div>
              <div className="text-sm mt-2" style={{ color: "var(--nje-muted)" }}>
                Silver-plated ornaments, gilat handcrafts &amp; junk jewellery.
              </div>
            </div>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1">
            <a
              href={`tel:+${NJE_WHATSAPP_NUMBER}`}
              className="text-sm font-medium hover:opacity-70 transition-opacity"
              style={{ color: "var(--nje-text)" }}
              data-testid="footer-phone"
            >
              {formatPhoneDisplay(NJE_WHATSAPP_NUMBER)}
            </a>
            <div className="text-xs" style={{ color: "var(--nje-muted)" }}>
              © {new Date().getFullYear()} NJE. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
