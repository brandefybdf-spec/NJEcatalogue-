import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api, { apiErrorMessage, formatINR, resolveImageUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Trash2, Pencil, Search, FileDown, Loader2 } from "lucide-react";
import { API_BASE } from "@/lib/api";

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (filterCategory !== "all") params.category_id = filterCategory;
    const [p, c] = await Promise.all([
      api.get("/products", { params }),
      api.get("/categories"),
    ]);
    setProducts(p.data);
    setCategories(c.data);
    setLoading(false);
  }, [search, filterCategory]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const allChecked = products.length > 0 && products.every((p) => selected.has(p.id));
  const toggleAll = () => {
    if (allChecked) setSelected(new Set());
    else setSelected(new Set(products.map((p) => p.id)));
  };
  const toggleOne = (id) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  };

  const bulkDelete = async () => {
    try {
      const { data } = await api.post("/products/bulk-delete", { ids: Array.from(selected) });
      toast.success(`${data.deleted} product(s) deleted`);
      setSelected(new Set());
      load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const bulkMove = async (categoryId) => {
    try {
      const { data } = await api.post("/products/bulk-update-category", { ids: Array.from(selected), category_id: categoryId });
      toast.success(`${data.updated} product(s) moved`);
      setSelected(new Set());
      load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const deleteOne = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      toast.success("Product deleted");
      load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const exportPdf = async (style) => {
    if (exporting) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({ style });
      if (search) params.set("search", search);
      if (filterCategory !== "all") params.set("category_id", filterCategory);
      if (selected.size > 0) params.set("ids", Array.from(selected).join(","));
      const token = localStorage.getItem("nje_token");
      const res = await fetch(`${API_BASE}/products/export-pdf?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      a.download = `nje-${style}-${today}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`${style === "catalogue" ? "Catalogue" : "Price list"} PDF downloaded`);
    } catch (e) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 md:p-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="overline">Inventory</div>
          <h1 className="font-admin text-2xl md:text-3xl font-semibold mt-1">Products</h1>
        </div>
        <Link to="/admin/products/new">
          <Button className="bg-neutral-900 hover:bg-neutral-800" data-testid="btn-new-product">
            <Plus className="w-4 h-4 mr-2" /> New product
          </Button>
        </Link>
      </div>

      <div className="admin-surface rounded-lg border" style={{ borderColor: "var(--admin-border)" }}>        <div className="p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between border-b" style={{ borderColor: "var(--admin-border)" }}>
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <Input
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="admin-product-search"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[180px]" data-testid="admin-category-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={exporting} data-testid="btn-export-pdf">
                  {exporting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4 mr-2" />
                  )}
                  {exporting ? "Exporting…" : "Export PDF"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  {selected.size > 0
                    ? `Export ${selected.size} selected`
                    : (search || filterCategory !== "all")
                      ? "Export current filter"
                      : "Export all products"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => exportPdf("catalogue")} disabled={exporting} data-testid="export-catalogue">
                  Catalogue style
                  <span className="ml-auto text-xs text-neutral-500">with images</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportPdf("pricelist")} disabled={exporting} data-testid="export-pricelist">
                  Price list
                  <span className="ml-auto text-xs text-neutral-500">table only</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-3" data-testid="bulk-toolbar">
              <span className="text-sm text-neutral-600">{selected.size} selected</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="bulk-actions-btn">
                    Bulk actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger data-testid="bulk-move-category">Move to category</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {categories.map((c) => (
                        <DropdownMenuItem key={c.id} onClick={() => bulkMove(c.id)}>
                          {c.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="w-full text-left px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded" data-testid="bulk-delete-trigger">
                        Delete selected
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selected.size} product(s)?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={bulkDelete} className="bg-red-600 hover:bg-red-700" data-testid="confirm-bulk-delete">
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        <div className="overflow-x-auto thin-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-neutral-500 border-b" style={{ borderColor: "var(--admin-border)" }}>
                <th className="p-3 w-10">
                  <Checkbox checked={allChecked} onCheckedChange={toggleAll} data-testid="select-all-checkbox" />
                </th>
                <th className="p-3">Product</th>
                <th className="p-3">Item #</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price</th>
                <th className="p-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-neutral-500">Loading…</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-neutral-500" data-testid="empty-products">No products found.</td></tr>
              ) : products.map((p) => (
                <tr key={p.id} className="border-b hover:bg-neutral-50" style={{ borderColor: "var(--admin-border)" }} data-testid={`product-row-${p.id}`}>
                  <td className="p-3">
                    <Checkbox
                      checked={selected.has(p.id)}
                      onCheckedChange={() => toggleOne(p.id)}
                      data-testid={`row-checkbox-${p.id}`}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded overflow-hidden bg-neutral-100 shrink-0">
                        {p.image_url && <img src={resolveImageUrl(p.image_url, "thumbnail")} alt="" loading="lazy" className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-neutral-500 line-clamp-1 max-w-md">{p.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 font-mono-item text-xs">{p.item_number}</td>
                  <td className="p-3">{p.category_name}</td>
                  <td className="p-3">{formatINR(p.price)}</td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`row-actions-${p.id}`}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/admin/products/${p.id}/edit`} data-testid={`edit-${p.id}`}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="w-full text-left px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded flex items-center" data-testid={`delete-trigger-${p.id}`}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete &quot;{p.name}&quot;?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteOne(p.id)} className="bg-red-600 hover:bg-red-700" data-testid={`confirm-delete-${p.id}`}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
