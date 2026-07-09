import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function AdminLogin() {
  const { login, error, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.role === "admin") navigate("/admin");
  }, [user, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const ok = await login(email, password);
    setSubmitting(false);
    if (ok) navigate("/admin");
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left visual */}
      <div className="hidden md:flex relative items-end p-12 text-white"
           style={{ background: "var(--admin-sidebar)" }}>
        <div>
          <div className="flex items-center gap-3 mb-8">
            <img src="/nje-logo.webp" alt="NJE" className="h-14 w-auto bg-white rounded-sm p-2" />
            <div className="leading-tight">
              <div className="font-admin font-semibold">NJE Admin</div>
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-60">Since 1951</div>
            </div>
          </div>
          <div className="overline text-white/60">Administrator Access</div>
          <h1 className="font-editorial text-4xl mt-4 leading-tight">
            Curate the catalogue.<br />Handcrafted, one item at a time.
          </h1>
          <p className="mt-6 text-white/70 max-w-md">
            Sign in to manage products, categories, images, and analytics for
            Novelty Jewellery Emporium.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-8 admin-bg">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm bg-white p-8 rounded-lg border shadow-sm"
          style={{ borderColor: "var(--admin-border)" }}
          data-testid="login-form"
        >
          <h2 className="font-admin text-2xl font-semibold mb-1">Welcome back</h2>
          <p className="text-sm text-neutral-500 mb-6">Sign in to your admin console.</p>

          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nje.com"
                className="mt-1.5"
                data-testid="login-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5"
                data-testid="login-password-input"
              />
            </div>
          </div>

          {error && (
            <div className="mt-4 text-sm text-red-600" data-testid="login-error">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full mt-6 bg-neutral-900 hover:bg-neutral-800"
            disabled={submitting}
            data-testid="login-submit-btn"
          >
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in…</> : "Sign in"}
          </Button>

          <div className="mt-6 text-center text-xs text-neutral-500">
            <Link to="/" className="hover:underline" data-testid="back-to-catalogue">← Back to catalogue</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
