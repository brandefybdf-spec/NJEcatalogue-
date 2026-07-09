import React, { useEffect, useState } from "react";
import api, { apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { GripVertical, Pencil, Trash2, Plus, Check, X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState({}); // { [id]: string }
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

  const load = async () => {
    const { data } = await api.get("/categories");
    setCategories(data);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await api.post("/categories", { name: newName.trim() });
      setNewName("");
      setCreateOpen(false);
      toast.success("Category created");
      load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    setCreating(false);
  };

  const saveRename = async (id) => {
    const name = editing[id];
    if (!name?.trim()) return;
    try {
      await api.patch(`/categories/${id}`, { name: name.trim() });
      setEditing((e) => { const c = { ...e }; delete c[id]; return c; });
      toast.success("Category renamed");
      load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/categories/${id}`);
      toast.success("Category deleted");
      load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const onDragStart = (i) => setDragIndex(i);
  const onDragOver = (e) => e.preventDefault();
  const onDrop = async (i) => {
    if (dragIndex === null || dragIndex === i) return;
    const next = [...categories];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(i, 0, moved);
    setCategories(next);
    setDragIndex(null);
    try {
      await api.post("/categories/reorder", { order: next.map((c) => c.id) });
      toast.success("Order updated");
    } catch (e) { toast.error(apiErrorMessage(e)); load(); }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="overline">Taxonomy</div>
          <h1 className="font-admin text-2xl md:text-3xl font-semibold mt-1">Categories</h1>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-neutral-900 hover:bg-neutral-800" data-testid="btn-add-category">
              <Plus className="w-4 h-4 mr-2" /> Add category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New category</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <Label htmlFor="new-name">Name</Label>
              <Input id="new-name" value={newName} onChange={(e) => setNewName(e.target.value)}
                     className="mt-1.5" placeholder="e.g. Anklets" data-testid="input-category-name" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={create} disabled={creating} className="bg-neutral-900 hover:bg-neutral-800" data-testid="submit-create-category">
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="admin-surface rounded-lg border" style={{ borderColor: "var(--admin-border)" }}>
        {categories.length === 0 ? (
          <div className="p-10 text-center text-sm text-neutral-500">No categories yet.</div>
        ) : categories.map((c, i) => (
          <div
            key={c.id}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={onDragOver}
            onDrop={() => onDrop(i)}
            className="flex items-center gap-3 p-4 border-b last:border-b-0"
            style={{ borderColor: "var(--admin-border)" }}
            data-testid={`category-row-${c.slug || c.id}`}
          >
            <GripVertical className="w-4 h-4 text-neutral-400 cursor-grab" />
            {editing[c.id] !== undefined ? (
              <>
                <Input
                  value={editing[c.id]}
                  onChange={(e) => setEditing({ ...editing, [c.id]: e.target.value })}
                  className="flex-1"
                  data-testid={`edit-input-${c.id}`}
                />
                <Button size="icon" variant="ghost" onClick={() => saveRename(c.id)} data-testid={`save-rename-${c.id}`}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setEditing((e) => { const n = { ...e }; delete n[c.id]; return n; })}>
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <div className="flex-1">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-neutral-500 font-mono-item">{c.slug} · {c.product_count} products</div>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setEditing({ ...editing, [c.id]: c.name })} data-testid={`rename-${c.id}`}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="icon" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" data-testid={`delete-cat-${c.id}`}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete &quot;{c.name}&quot;?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {c.product_count > 0
                          ? `This category has ${c.product_count} product(s). Move or delete them first.`
                          : "This action cannot be undone."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction disabled={c.product_count > 0} onClick={() => remove(c.id)} className="bg-red-600 hover:bg-red-700" data-testid={`confirm-delete-cat-${c.id}`}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="text-xs text-neutral-500 mt-3">Drag rows to reorder categories.</div>
    </div>
  );
}
