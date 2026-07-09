import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({ children }) {
  const { user } = useAuth();

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center admin-bg" data-testid="auth-loading">
        <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.role !== "admin") return <Navigate to="/admin/login" replace />;
  return children;
}
