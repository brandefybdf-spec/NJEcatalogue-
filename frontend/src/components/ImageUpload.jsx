import React, { useCallback, useRef, useState } from "react";
import { UploadCloud, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import api, { resolveImageUrl, apiErrorMessage } from "@/lib/api";

/**
 * Drag-and-drop image uploader.
 * - onUploaded(result): { path, url, content_type }
 * - single: if true, replaces existing preview
 */
export default function ImageUpload({ value, onUploaded, single = true }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState(value ? [value] : []); // list of URL strings
  const inputRef = useRef(null);

  const uploadFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const results = [];
      for (const file of files) {
        const form = new FormData();
        form.append("file", file);
        const { data } = await api.post("/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        results.push(data);
      }
      if (single) {
        const last = results[results.length - 1];
        setPreviews([last.url]);
        onUploaded && onUploaded(last);
      } else {
        setPreviews((p) => [...p, ...results.map((r) => r.url)]);
        results.forEach((r) => onUploaded && onUploaded(r));
      }
      toast.success(`${results.length} image${results.length > 1 ? "s" : ""} uploaded`);
    } catch (e) {
      toast.error(apiErrorMessage(e, "Upload failed"));
    } finally {
      setUploading(false);
    }
  }, [onUploaded, single]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith("image/"));
    uploadFiles(files);
  }, [uploadFiles]);

  const onSelect = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    uploadFiles(files);
    e.target.value = "";
  }, [uploadFiles]);

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`dropzone ${isDragging ? "active" : ""} rounded-md px-6 py-10 text-center cursor-pointer`}
        data-testid="image-dropzone"
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-neutral-600">
            <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-sm text-neutral-600">
            <UploadCloud className="w-6 h-6 text-neutral-400" />
            <div>
              <span className="font-medium text-neutral-900">Click to upload</span>{" "}
              or drag &amp; drop
            </div>
            <div className="text-xs text-neutral-500">PNG, JPG, WebP up to 10MB</div>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={!single}
          className="hidden"
          onChange={onSelect}
          data-testid="image-file-input"
        />
      </div>

      {previews.length > 0 && (
        <div className={`mt-4 grid gap-3 ${single ? "grid-cols-1" : "grid-cols-3"}`}>
          {previews.map((p, i) => (
            <div key={i} className="relative group rounded-md overflow-hidden border" style={{ aspectRatio: "4 / 5" }}>
              <img src={resolveImageUrl(p)} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPreviews(previews.filter((_, j) => j !== i)); if (single) onUploaded && onUploaded({ path: "", url: "" }); }}
                className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow"
                data-testid="remove-image-btn"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
