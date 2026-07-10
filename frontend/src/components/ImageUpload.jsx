import React, { useCallback, useRef, useState } from "react";
import { UploadCloud, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import api, { resolveImageUrl, apiErrorMessage } from "@/lib/api";

/**
 * Drag-and-drop image uploader.
 * - onUploaded(result): { path, url, content_type } — called once per file, as soon as that file finishes.
 * - onRemove(url): called when a preview is removed, so a parent tracking its own image list can stay in sync.
 * - single: if true, replaces existing preview; if false, accepts multiple files/previews.
 * - value: seed preview(s) — a single URL string, or (when single=false) an array of URL strings.
 * - compact: smaller footprint, for use inside table rows (e.g. bulk upload grid).
 * - showPreviews: set false to hide the thumbnail grid (e.g. when a parent displays uploaded images elsewhere).
 */
export default function ImageUpload({ value, onUploaded, onRemove, single = true, compact = false, showPreviews = true }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadDone, setUploadDone] = useState(0);
  const [previews, setPreviews] = useState(() => {
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
  });
  const inputRef = useRef(null);

  const uploadFiles = useCallback(async (files) => {
    if (!files || files.length === 0) return;
    setUploadTotal(files.length);
    setUploadDone(0);
    let successCount = 0;
    for (const file of files) {
      try {
        const form = new FormData();
        form.append("file", file);
        const { data } = await api.post("/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        successCount += 1;
        setPreviews((p) => (single ? [data.url] : [...p, data.url]));
        onUploaded && onUploaded(data);
      } catch (e) {
        toast.error(apiErrorMessage(e, `Upload failed: ${file.name}`));
      } finally {
        setUploadDone((d) => d + 1);
      }
    }
    setUploadTotal(0);
    setUploadDone(0);
    if (successCount > 0) {
      toast.success(`${successCount} image${successCount > 1 ? "s" : ""} uploaded`);
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

  const removeAt = (i) => {
    const removed = previews[i];
    setPreviews(previews.filter((_, j) => j !== i));
    if (single) onUploaded && onUploaded({ path: "", url: "" });
    onRemove && onRemove(removed);
  };

  const uploading = uploadTotal > 0;

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`dropzone ${isDragging ? "active" : ""} rounded-md ${compact ? "px-3 py-4" : "px-6 py-10"} text-center cursor-pointer`}
        data-testid="image-dropzone"
      >
        {uploading ? (
          <div className={`flex items-center justify-center gap-2 text-neutral-600 ${compact ? "text-xs" : "text-sm"}`}>
            <Loader2 className="w-4 h-4 animate-spin" /> Uploading {uploadDone + 1} of {uploadTotal}…
          </div>
        ) : compact ? (
          <div className="flex items-center justify-center gap-2 text-xs text-neutral-600">
            <UploadCloud className="w-4 h-4 text-neutral-400" />
            <span className="font-medium text-neutral-900">Upload</span>
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

      {showPreviews && previews.length > 0 && (
        <div className={`${compact ? "mt-2 gap-2" : "mt-4 gap-3"} grid ${single ? "grid-cols-1" : "grid-cols-3"}`}>
          {previews.map((p, i) => (
            <div key={i} className="relative group rounded-md overflow-hidden border" style={{ aspectRatio: "4 / 5" }}>
              <img src={resolveImageUrl(p)} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeAt(i); }}
                className={`absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full shadow ${compact ? "p-0.5" : "p-1"}`}
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
