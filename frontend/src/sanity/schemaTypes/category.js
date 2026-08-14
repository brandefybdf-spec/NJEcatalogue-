export default {
  name: "category",
  title: "Category",
  type: "document",
  fields: [
    { name: "name", title: "Name", type: "string", validation: (Rule) => Rule.required() },
    { name: "slug", title: "Slug", type: "slug", options: { source: "name" }, validation: (Rule) => Rule.required() },
    { name: "order", title: "Display order", type: "number", initialValue: 0 },
    {
      name: "priceRanges",
      title: "Price Range(s)",
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
      description: "Which price bands this category's products fall under. Used for the storefront's price filter instead of exact product prices.",
    },
  ],
  orderings: [
    { title: "Display order", name: "orderAsc", by: [{ field: "order", direction: "asc" }] },
  ],
  preview: {
    select: { title: "name" },
  },
};
