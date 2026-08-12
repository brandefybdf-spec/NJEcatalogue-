import { ItemNumberInput } from "../components/ItemNumberInput";

export default {
  name: "product",
  title: "Product",
  type: "document",
  fields: [
    { name: "name", title: "Name", type: "string", validation: (Rule) => Rule.required() },
    { name: "description", title: "Description", type: "text" },
    { name: "price", title: "Price (INR)", type: "number", validation: (Rule) => Rule.required().min(0) },
    {
      name: "category",
      title: "Category",
      type: "reference",
      to: [{ type: "category" }],
      validation: (Rule) => Rule.required(),
    },
    {
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    },
    {
      name: "itemNumber",
      title: "Item number",
      type: "string",
      description:
        "Pick a category first, then click Auto-generate — it looks at existing item numbers in that category and picks the next one.",
      validation: (Rule) => Rule.required(),
      components: { input: ItemNumberInput },
    },
    { name: "createdAt", title: "Created at", type: "datetime", initialValue: () => new Date().toISOString() },
  ],
  preview: {
    select: { title: "name", subtitle: "itemNumber", media: "image" },
  },
};
