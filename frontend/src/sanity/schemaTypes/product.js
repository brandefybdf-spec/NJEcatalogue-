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
      name: "priceRanges",
      title: "Price Range(s) override",
      type: "array",
      of: [{ type: "string" }],
      options: {
        list: [
          { title: "₹50 – ₹250", value: "50-250" },
          { title: "₹300 – ₹600", value: "300-600" },
          { title: "₹750 – ₹1,500", value: "750-1500" },
          { title: "₹1,500 – ₹3,000", value: "1500-3000" },
          { title: "₹3,000 – ₹5,000", value: "3000-5000" },
          { title: "₹5,000 – ₹10,000", value: "5000-10000" },
          { title: "₹10,000 – ₹50,000", value: "10000-50000" },
        ],
      },
      description: "Leave empty to use the category's price range(s). Only set this if this specific product should appear under a different price filter than the rest of its category.",
    },
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
    {
      name: "slug",
      title: "URL slug",
      type: "slug",
      description: "Click Generate after setting the item number — this is what shows up in the product's web address.",
      options: { source: "itemNumber", maxLength: 96 },
      validation: (Rule) => Rule.required(),
    },
    { name: "createdAt", title: "Created at", type: "datetime", initialValue: () => new Date().toISOString() },
  ],
  preview: {
    select: { title: "name", subtitle: "itemNumber", media: "image" },
  },
};
