import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api, { apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageUpload from "@/components/ImageUpload";
import { toast } from "sonner";
import { ArrowLeft, Plus } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "", description: "", price: "", category_id: "", image_url: "", image_path: null,
  });
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/categories");
      setCategories(data);
      if (isEdit) {
        try {
          const { data: p } = await api.get(`/products/${id}`);
          setForm({
            name: p.name, description: p.description, price: p.price,
            category_id: p.category_id, image_url: p.image_url, image_path: p.image_path,
          });
        } catch (e) { toast.error("Product not found"); }
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const createCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCat(true);
    try {
      const { data } = await api.post("/categories", { name: newCategoryName.trim() });
      setCategories((cs) => [...cs, data]);
      setForm((f) => ({ ...f, category_id: data.id }));
      setNewCategoryName("");
      setNewCategoryOpen(false);
      toast.success("Category created");
    } catch (e) { toast.error(apiErrorMessage(e)); }
    setCreatingCat(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.category_id || form.price === "") {
      toast.error("Please fill name, price and category.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        category_id: form.category_id,
        image_url: form.image_url || "",
        image_path: form.image_path || null,
      };
      if (isEdit) {
        await api.patch(`/products/${id}`, payload);
        toast.success("Product updated");
      } else {
        await api.post("/products", payload);
        toast.success("Product created");
      }
      navigate("/admin/products");
    } catch (e) { toast.error(apiErrorMessage(e)); }
    setSaving(false);
  };

  if (loading) return <div className="p-10 text-sm text-neutral-500">Loading…</div>;

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      <Link to="/admin/products" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900" data-testid="back-to-products">
        <ArrowLeft className="w-4 h-4" /> Back to products
      </Link>
      <h1 className="font-admin text-2xl md:text-3xl font-semibold mt-3 mb-8">
        {isEdit ? "Edit product" : "New product"}
      </h1>

      <form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-8" data-testid="product-form">
        <div className="space-y-5">
          <div>
            <Label htmlFor="name">Product name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1.5"
              required
              data-testid="input-name"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={5}
              className="mt-1.5"
              data-testid="input-description"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Price (₹)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="1"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
                className="mt-1.5"
                data-testid="input-price"
              />
            </div>
            <div>
              <Label>Category</Label>
              <div className="flex gap-2 mt-1.5">
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={newCategoryOpen} onOpenChange={setNewCategoryOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="icon" data-testid="btn-new-category">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create new category</DialogTitle>
                    </DialogHeader>
                    <div className="py-2">
                      <Label htmlFor="new-cat-name">Name</Label>
                      <Input
                        id="new-cat-name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="mt-1.5"
                        placeholder="e.g. Anklets"
                        data-testid="input-new-category"
                      />
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setNewCategoryOpen(false)}>Cancel</Button>
                      <Button type="button" onClick={createCategory} disabled={creatingCat} className="bg-neutral-900 hover:bg-neutral-800" data-testid="submit-new-category">
                        Create
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>

        <div>
          <Label className="block mb-1.5">Product image</Label>
          <ImageUpload
            value={form.image_url}
            onUploaded={(r) => setForm((f) => ({ ...f, image_url: r.url, image_path: r.path }))}
          />
          {isEdit && (
            <div className="mt-2 text-xs text-neutral-500">Uploading a new image will replace the current one.</div>
          )}
        </div>

        <div className="md:col-span-2 flex items-center gap-3 mt-4">
          <Button type="submit" disabled={saving} className="bg-neutral-900 hover:bg-neutral-800" data-testid="btn-save-product">
            {saving ? "Saving…" : (isEdit ? "Save changes" : "Create product")}
          </Button>
          <Link to="/admin/products">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
