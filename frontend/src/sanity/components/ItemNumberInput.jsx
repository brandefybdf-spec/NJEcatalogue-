import React, { useCallback, useState } from "react";
import { Stack, Button, Text } from "@sanity/ui";
import { useClient, useFormValue, set } from "sanity";

const PREFIX = "NJE";

function slugify(text) {
  return (text || "item")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Sanity has no built-in auto-incrementing field, so this button looks up
// the highest existing item number for the product's chosen category and
// generates the next one (e.g. NJE-Silver-015). Not safe against two admins
// generating a number for the same category at the exact same instant, but
// fine for a single-admin catalogue like this one.
export function ItemNumberInput(props) {
  const { value, onChange, renderDefault } = props;
  const client = useClient({ apiVersion: "2024-01-01" });
  const categoryRef = useFormValue(["category", "_ref"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = useCallback(async () => {
    if (!categoryRef) {
      setError("Pick a category first.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const category = await client.fetch(`*[_id == $id][0]{ "slug": slug.current, name }`, {
        id: categoryRef,
      });
      const slugPart = slugify(category?.slug || category?.name);
      const prefix = `${PREFIX}-${slugPart}-`;

      const existing = await client.fetch(
        `*[_type == "product" && category._ref == $categoryRef && defined(itemNumber)].itemNumber`,
        { categoryRef }
      );

      let max = 0;
      for (const num of existing) {
        const m = /(\d+)\s*$/.exec(num || "");
        if (m) max = Math.max(max, parseInt(m[1], 10));
      }

      const next = String(max + 1).padStart(3, "0");
      onChange(set(`${prefix}${next}`));
    } catch (e) {
      setError("Couldn't generate a number — try again.");
    } finally {
      setLoading(false);
    }
  }, [categoryRef, client, onChange]);

  return (
    <Stack space={2}>
      {renderDefault(props)}
      <Button
        text={loading ? "Generating…" : value ? "Regenerate item number" : "Auto-generate item number"}
        tone="primary"
        mode="ghost"
        onClick={generate}
        disabled={loading}
      />
      {error && (
        <Text size={1} style={{ color: "#e03131" }}>
          {error}
        </Text>
      )}
    </Stack>
  );
}
