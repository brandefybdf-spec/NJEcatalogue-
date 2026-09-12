import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { urlForImage } from "@/sanity/client";
import { getProduct, getRelatedProducts } from "@/sanity/queries";
import { NJE_WHATSAPP_NUMBER } from "@/lib/contact";
import SanityImage from "@/components/SanityImage";
import ProductCard from "@/components/ProductCard";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProductDetail() {
  const { slug } = useParams();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [enquiry, setEnquiry] = useState({ name: "", location: "", pcs: "" });

  const enquiryValid =
    enquiry.name.trim() && enquiry.location.trim() && enquiry.pcs.trim();

  const handleEnquirySubmit = (e) => {
    e.preventDefault();
    if (!enquiryValid || !product) return;

    const imageUrl = product.image ? urlForImage(product.image, 1200) : null;
    const message = [
      `Hi NJE, I'd like to enquire about ${product.item_number} — ${product.name}.`,
      "",
      `Name: ${enquiry.name.trim()}`,
      `State/Country: ${enquiry.location.trim()}`,
      `Pcs required: ${enquiry.pcs.trim()}`,
      "",
      `Product link: ${window.location.href}`,
      ...(imageUrl ? [`Image: ${imageUrl}`] : []),
      "",
      "Note: Not for retail sale — wholesale and sample pcs orders only. Minimum order value ₹10,000.",
    ].join("\n");

    window.open(
      `https://wa.me/${NJE_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setEnquiryOpen(false);
    setEnquiry({ name: "", location: "", pcs: "" });
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await getProduct(slug);
        if (!data) {
          setNotFound(true);
          return;
        }
        setProduct(data);
        setRelated(await getRelatedProducts(data.category_id, data.id));
      } catch (e) {
        setNotFound(true);
      }
    })();
  }, [slug]);

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center" data-testid="product-not-found">
        <div className="overline mb-4">404</div>
        <h1 className="font-editorial text-3xl">This piece is no longer in the catalogue.</h1>
        <Link to="/" className="inline-block mt-6">
          <Button className="btn-nje">Back to catalogue</Button>
        </Link>
      </div>
    );
  }

  if (!product) {
    return <div className="max-w-7xl mx-auto px-6 py-24 text-sm" style={{ color: "var(--nje-muted)" }}>Loading…</div>;
  }

  return (
    <article className="max-w-7xl mx-auto px-6 sm:px-10 py-10" data-testid="product-detail">
      <Link to="/" className="inline-flex items-center gap-2 text-sm hover:opacity-70" style={{ color: "var(--nje-muted)" }} data-testid="back-link">
        <ArrowLeft className="w-4 h-4" /> Back to catalogue
      </Link>

      <div className="mt-8 grid md:grid-cols-2 gap-12">
        <div className="product-img-wrap rounded-sm w-full max-w-sm mx-auto md:max-w-none md:mx-0" style={{ aspectRatio: "4 / 5" }}>
          {product.image && (
            <SanityImage src={urlForImage(product.image, 800)} lqip={product.image_lqip} alt={product.name} />
          )}
        </div>
        <div className="pt-4">
          <div className="overline" data-testid="detail-category">{product.category_name}</div>
          <h1
            className="font-editorial text-4xl md:text-5xl mt-3 leading-tight tracking-tight"
            style={{ color: "var(--nje-text)" }}
            data-testid="detail-name"
          >
            {product.name}
          </h1>
          <div className="mt-4 font-mono-item text-sm" style={{ color: "var(--nje-muted)" }} data-testid="detail-item-number">
            {product.item_number}
          </div>
          <div className="mt-8 max-w-lg text-base leading-relaxed" style={{ color: "var(--nje-muted)" }} data-testid="detail-description">
            {product.description || "A distinctive piece from the NJE atelier."}
          </div>

          <div className="flex flex-wrap gap-3 mt-8">
            <button
              type="button"
              onClick={() => setEnquiryOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-white transition-transform hover:-translate-y-0.5 hover:shadow-lg"
              style={{ background: "#25D366" }}
              data-testid="btn-whatsapp-enquire"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Us
            </button>
          </div>
          <p className="mt-3 text-xs max-w-md" style={{ color: "var(--nje-muted)" }}>
            Not for retail sale — wholesale and sample pcs orders only. Minimum order value ₹10,000.
          </p>

          <Dialog open={enquiryOpen} onOpenChange={setEnquiryOpen}>
            <DialogContent data-testid="whatsapp-enquiry-dialog">
              <DialogHeader>
                <DialogTitle>Enquire about {product.name}</DialogTitle>
                <DialogDescription>
                  Please share a few details before we connect on WhatsApp.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEnquirySubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="enquiry-name">Name</Label>
                  <Input
                    id="enquiry-name"
                    data-testid="enquiry-name"
                    value={enquiry.name}
                    onChange={(e) => setEnquiry((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Your name"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="enquiry-location">State/Country</Label>
                  <Input
                    id="enquiry-location"
                    data-testid="enquiry-location"
                    value={enquiry.location}
                    onChange={(e) => setEnquiry((f) => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. Maharashtra, India"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="enquiry-pcs">Pcs required</Label>
                  <Input
                    id="enquiry-pcs"
                    data-testid="enquiry-pcs"
                    value={enquiry.pcs}
                    onChange={(e) => setEnquiry((f) => ({ ...f, pcs: e.target.value }))}
                    placeholder="e.g. 50"
                    required
                  />
                </div>
                <p className="text-xs" style={{ color: "var(--nje-muted)" }}>
                  Not for retail sale — wholesale and sample pcs orders only. Minimum order value ₹10,000.
                </p>
                <Button
                  type="submit"
                  disabled={!enquiryValid}
                  className="w-full text-white"
                  style={{ background: "#25D366" }}
                  data-testid="btn-whatsapp-submit"
                >
                  <MessageCircle className="w-4 h-4" />
                  Continue on WhatsApp
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 gap-6 border-t pt-8" style={{ borderColor: "var(--nje-border)" }}>
            <div>
              <div className="overline mb-1">Category</div>
              <div className="text-sm">{product.category_name}</div>
            </div>
            <div>
              <div className="overline mb-1">SKU</div>
              <div className="text-sm font-mono-item">{product.item_number}</div>
            </div>
            {product.size && (
              <div>
                <div className="overline mb-1">Size</div>
                <div className="text-sm">{product.size}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-20 border-t pt-12" style={{ borderColor: "var(--nje-border)" }}>
          <h2 className="font-editorial text-2xl mb-6" style={{ color: "var(--nje-text)" }}>
            You might also like
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 sm:gap-x-6 gap-y-8">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
