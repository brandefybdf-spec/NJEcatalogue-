import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Package, Tags, BarChart3, LogOut, UploadCloud } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true, id: "nav-dashboard" },
  { to: "/admin/products", label: "Products", icon: Package, id: "nav-products" },
  { to: "/admin/bulk-upload", label: "Bulk Upload", icon: UploadCloud, id: "nav-bulk-upload" },
  { to: "/admin/categories", label: "Categories", icon: Tags, id: "nav-categories" },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, id: "nav-analytics" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex admin-bg font-admin">
      <aside
        className="w-60 shrink-0 hidden md:flex flex-col"
        style={{ background: "var(--admin-sidebar)", color: "var(--admin-sidebar-text)" }}
      >
        <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10 bg-white/5">
          <img src="/nje-logo.webp" alt="NJE" className="h-10 w-auto bg-white rounded-sm p-1" />
          <div>
            <div className="text-sm font-semibold tracking-tight">NJE Admin</div>
            <div className="text-[10px] uppercase tracking-[0.2em] opacity-60">Since 1951</div>
          </div>
        </div>
        <nav className="flex-1 py-4 space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `admin-nav-link flex items-center gap-3 px-6 py-2.5 text-sm ${isActive ? "active" : ""}`
              }
              data-testid={l.id}
            >
              <l.icon className="w-4 h-4" />
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="text-xs opacity-60 truncate">{user?.email}</div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-white/80 hover:text-white hover:bg-white/10 justify-start"
            onClick={async () => { await logout(); navigate("/admin/login"); }}
            data-testid="btn-logout"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-white">
          <div className="font-semibold text-sm">NJE Admin</div>
          <Button size="sm" variant="ghost" onClick={async () => { await logout(); navigate("/admin/login"); }}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
        <Outlet />
      </main>
    </div>
  );
}
