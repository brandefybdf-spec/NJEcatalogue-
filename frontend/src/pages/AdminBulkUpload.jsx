import React, { useEffect, useState } from "react";
import api, { apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import ImageUpload from "@/components/ImageUpload";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, CheckCircle2, XCircle, Circle } from "lucide-react";

const NEW_CATEGORY = "__new__";

function makeRow(images = []) {
  return {
    clientId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "",
    description: "",
    price: "",
    category_id: "",
    images,
    status: "idle", // idle | uploading | success | error
    error: "",
  };
}

const STATUS_META = {
  idle: { icon: Circle, label: "Pending", className: "text-neutral-400" },
  uploading: { icon: Loader2, label: "Uploading…", className: "text-neutral-600" },
  success: { icon: CheckCircle2, label: "Added", className: "text-green-600" },
  error: { icon: XCircle, label: "Failed", className: "text-red-600" },
};

export default function AdminBulkUpload() {
  const [categories, setCategories] = useState([]);
  const [rows, setRows] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState(null); // { success, failed, total }

  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryRowId, setNewCategoryRowId] = useState(null);
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/categories");
      setCategories(data);
    })();
  }, []);

  const updateRow = (clientId, patch) => {
    setRows((rs) => rs.map((r) => (r.clientId === clientId ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows((rs) => [...rs, makeRow()]);
  const removeRow = (clientId) => setRows((rs) => rs.filter((r) => r.clientId !== clientId));

  // Top uploader: one new row per image, in the order they finish uploading.
  const addRowFromImage = (uploaded) => {
    setRows((rs) => [...rs, makeRow([{ url: uploaded.url, path: uploaded.path }])]);
  };

  const addImageToRow = (clientId, uploaded) => {
    setRows((rs) => rs.map((r) => (
      r.clientId === clientId ? { ...r, images: [...r.images, { url: uploaded.url, path: uploaded.path }] } : r
    )));
  };
  const removeImageFromRow = (clientId, url) => {
    setRows((rs) => rs.map((r) => (
      r.clientId === clientId ? { ...r, images: r.images.filter((im) => im.url !== url) } : r
    )));
  };

  const openNewCategory = (rowId) => {
    setNewCategoryRowId(rowId);
    setNewCategoryName("");
    setNewCategoryOpen(true);
  };

  const createCategoryForRow = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
    try {
      const { data } = await api.post("/categories", { name: newCategoryName.trim() });
      setCategories((cs) => [...cs, data]);
      if (newCategoryRowId) updateRow(newCategoryRowId, { category_id: data.id });
      setNewCategoryName("");
      setNewCategoryOpen(false);
      setNewCategoryRowId(null);
      toast.success("Category created");
    } catch (e) { toast.error(apiErrorMessage(e)); }
    setCreatingCategory(false);
  };

  const uploadAll = async () => {
    const candidates = rows.filter((r) => r.name.trim() || r.description.trim() || r.price !== "" || r.category_id || r.images.length > 0);
    if (candidates.length === 0) {
      toast.error("Fill in at least one row first.");
      return;
    }
    setSubmitting(true);
    setSummary(null);

    let successCount = 0;
    let failedCount = 0;

    for (const row of candidates) {
      if (!row.name.trim() || row.price === "" || !row.category_id) {
        updateRow(row.clientId, { status: "error", error: "Missing required fields (name, price, category)." });
        failedCount += 1;
        continue;
      }
      updateRow(row.clientId, { status: "uploading", error: "" });
      try {
        const payload = {
          name: row.name.trim(),
          description: row.description || "",
          price: parseFloat(row.price),
          category_id: row.category_id,
          image_url: row.images[0]?.url || "",
          image_path: row.images[0]?.path || null,
          images: row.images.map((im) => ({ url: im.url, path: im.path || null })),
        };
        await api.post("/products", payload);
        updateRow(row.clientId, { status: "success", error: "" });
        successCount += 1;
      } catch (e) {
        updateRow(row.clientId, { status: "error", error: apiErrorMessage(e) });
        failedCount += 1;
      }
    }

    setSubmitting(false);
    setSummary({ success: successCount, failed: failedCount, total: candidates.length });
    if (failedCount === 0) {
      toast.success(`${successCount} of ${candidates.length} products added successfully.`);
    } else {
      toast.error(`${successCount} of ${candidates.length} products added successfully, ${failedCount} failed — see below.`);
    }
  };

  return (
    <div className="p-6 md:p-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="overline">Inventory</div>
          <h1 className="font-admin text-2xl md:text-3xl font-semibold mt-1">Bulk Upload</h1>
        </div>
        <Button
          onClick={uploadAll}
          disabled={submitting}
          className="bg-neutral-900 hover:bg-neutral-800"
          data-testid="btn-upload-all"
        >
          {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Upload All
        </Button>
      </div>

      <div className="admin-surface rounded-lg border p-6 mb-6" style={{ borderColor: "var(--admin-border)" }}>
        <Label className="block mb-1.5 font-medium">Upload product photos</Label>
        <div className="text-xs text-neutral-500 mb-3">
          Select or drop multiple images — a row is created for each one automatically, in order.
        </div>
        <ImageUpload single={false} showPreviews={false} onUploaded={addRowFromImage} />
      </div>

      {summary && (
        <div
          className={`mb-4 rounded-md border px-4 py-3 text-sm ${summary.failed > 0 ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}
          data-testid="bulk-upload-summary"
        >
          {summary.success} of {summary.total} products added successfully
          {summary.failed > 0 ? `, ${summary.failed} failed — see below.` : "."}
        </div>
      )}

      <div className="admin-surface rounded-lg border" style={{ borderColor: "var(--admin-border)" }}>
        {rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-neutral-500" data-testid="bulk-empty-state">
            Upload photos above, or add a row manually, to get started.
          </div>
        ) : (
          <div className="overflow-x-auto thin-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-neutral-500 border-b" style={{ borderColor: "var(--admin-border)" }}>
                  <th className="p-3 min-w-[160px]">Images</th>
                  <th className="p-3 min-w-[180px]">Name</th>
                  <th className="p-3 min-w-[220px]">Description</th>
                  <th className="p-3 w-28">Price (₹)</th>
                  <th className="p-3 min-w-[160px]">Category</th>
                  <th className="p-3 w-28">Status</th>
                  <th className="p-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const meta = STATUS_META[row.status];
                  const StatusIcon = meta.icon;
                  return (
                    <tr key={row.clientId} className="border-b align-top" style={{ borderColor: "var(--admin-border)" }} data-testid={`bulk-row-${row.clientId}`}>
                      <td className="p-3 min-w-[160px]">
                        <ImageUpload
                          compact
                          single={false}
                          value={row.images.map((im) => im.url)}
                          onUploaded={(r) => addImageToRow(row.clientId, r)}
                          onRemove={(url) => removeImageFromRow(row.clientId, url)}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={row.name}
                          onChange={(e) => updateRow(row.clientId, { name: e.target.value })}
                          placeholder="Product name"
                          disabled={submitting}
                          data-testid={`bulk-input-name-${row.clientId}`}
                        />
                      </td>
                      <td className="p-3">
                        <Textarea
                          value={row.description}
                          onChange={(e) => updateRow(row.clientId, { description: e.target.value })}
                          placeholder="Description"
                          rows={2}
                          disabled={submitting}
                          data-testid={`bulk-input-description-${row.clientId}`}
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={row.price}
                          onChange={(e) => updateRow(row.clientId, { price: e.target.value })}
                          placeholder="0"
                          disabled={submitting}
                          data-testid={`bulk-input-price-${row.clientId}`}
                        />
                      </td>
                      <td className="p-3">
                        <Select
                          value={row.category_id}
                          onValueChange={(v) => (v === NEW_CATEGORY ? openNewCategory(row.clientId) : updateRow(row.clientId, { category_id: v }))}
                          disabled={submitting}
                        >
                          <SelectTrigger data-testid={`bulk-select-category-${row.clientId}`}>
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                            <SelectSeparator />
                            <SelectItem value={NEW_CATEGORY} data-testid={`bulk-new-category-${row.clientId}`}>
                              <span className="flex items-center gap-1.5 text-neutral-900 font-medium">
                                <Plus className="w-3.5 h-3.5" /> New category
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <div className={`flex items-center gap-1.5 text-xs ${meta.className}`} data-testid={`bulk-status-${row.clientId}`}>
                          <StatusIcon className={`w-4 h-4 shrink-0 ${row.status === "uploading" ? "animate-spin" : ""}`} />
                          {meta.label}
                        </div>
                        {row.status === "error" && row.error && (
                          <div className="mt-1 text-xs text-red-600 max-w-[160px]">{row.error}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-neutral-500 hover:text-red-600"
                          onClick={() => removeRow(row.clientId)}
                          disabled={submitting}
                          data-testid={`bulk-remove-row-${row.clientId}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-4 border-t" style={{ borderColor: "var(--admin-border)" }}>
          <Button type="button" variant="outline" onClick={addRow} disabled={submitting} data-testid="btn-add-row">
            <Plus className="w-4 h-4 mr-2" /> Add row
          </Button>
        </div>
      </div>

      <Dialog open={newCategoryOpen} onOpenChange={(open) => { setNewCategoryOpen(open); if (!open) setNewCategoryRowId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new category</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="bulk-new-cat-name">Name</Label>
            <Input
              id="bulk-new-cat-name"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="mt-1.5"
              placeholder="e.g. Anklets"
              data-testid="bulk-input-new-category-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCategoryOpen(false)}>Cancel</Button>
            <Button
              onClick={createCategoryForRow}
              disabled={creatingCategory}
              className="bg-neutral-900 hover:bg-neutral-800"
              data-testid="bulk-submit-new-category"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
