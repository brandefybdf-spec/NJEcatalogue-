import React from "react";
import { Studio } from "sanity";
import config from "../sanity/config";

// Sanity Studio manages its own routing/auth (a Sanity account login),
// so this is mounted outside the app's JWT-based ProtectedRoute.
//
// The Studio expects an ancestor with an explicit height (not just
// min-height, which the rest of this app's global CSS uses) to fill
// correctly. 100vh is relative to the viewport, so this works regardless
// of any parent's height, without touching site-wide CSS.
export default function SanityStudioPage() {
  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <Studio config={config} />
    </div>
  );
}
