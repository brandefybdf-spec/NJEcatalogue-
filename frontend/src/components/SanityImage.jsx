import React, { useEffect, useRef, useState } from "react";

// Shows Sanity's tiny built-in blurred placeholder (lqip) instantly, then
// fades in the real image once it's actually loaded — instead of a blank
// box with alt text while the CDN generates the first-ever request for
// that image size.
export default function SanityImage({ src, lqip, alt, loading }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);

  // If the browser already has this image cached, it's `complete` the
  // instant it mounts — the load event fires before onLoad is attached,
  // so it never reaches us and the image stays stuck at opacity 0.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, [src]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {lqip && (
        <img
          src={lqip}
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            filter: "blur(16px)",
            transform: "scale(1.1)",
            opacity: loaded ? 0 : 1,
            transition: "opacity 300ms ease",
          }}
        />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={loading}
        onLoad={() => setLoaded(true)}
        style={{
          position: lqip ? "absolute" : "static",
          inset: 0,
          opacity: lqip ? (loaded ? 1 : 0) : 1,
          transition: "opacity 300ms ease",
        }}
      />
    </div>
  );
}
