import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { resolveImageUrl, formatINR } from "@/lib/api";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// NJE business WhatsApp number (E.164 without +)
const NJE_WHATSAPP = "919811922941";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/products/${id}`);
        setProduct(data);
      } catch (e) {
        setNotFound(true);
      }
    })();
  }, [id]);

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
        <div className="product-img-wrap rounded-sm" style={{ aspectRatio: "4 / 5" }}>
          {product.image_url && <img src={resolveImageUrl(product.image_url)} alt={product.name} />}
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
          <div className="mt-8 text-3xl font-medium" style={{ color: "var(--nje-primary)" }} data-testid="detail-price">
            {formatINR(product.price)}
          </div>
          <div className="mt-10 max-w-lg text-base leading-relaxed" style={{ color: "var(--nje-muted)" }} data-testid="detail-description">
            {product.description || "A distinctive piece from the NJE atelier."}
          </div>

          <a
            href={`https://wa.me/${NJE_WHATSAPP}?text=${encodeURIComponent(
              `Hi NJE, I'd like to enquire about ${product.item_number} — ${product.name} (${formatINR(product.price)}).\n\n${window.location.href}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-full text-sm font-medium text-white transition-transform hover:-translate-y-0.5 hover:shadow-lg"
            style={{ background: "#25D366" }}
            data-testid="btn-whatsapp-enquire"
          >
            <MessageCircle className="w-4 h-4" />
            Enquire on WhatsApp
          </a>

          <div className="mt-12 grid grid-cols-2 gap-6 border-t pt-8" style={{ borderColor: "var(--nje-border)" }}>
            <div>
              <div className="overline mb-1">Category</div>
              <div className="text-sm">{product.category_name}</div>
            </div>
            <div>
              <div className="overline mb-1">Item Number</div>
              <div className="text-sm font-mono-item">{product.item_number}</div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
