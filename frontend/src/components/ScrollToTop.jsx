import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// React Router doesn't scroll to top on navigation by default — without
// this, clicking a product card from partway down the catalogue grid opens
// the new page still scrolled to that same position.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
