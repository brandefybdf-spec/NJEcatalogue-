import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./schemaTypes";

const projectId = process.env.REACT_APP_SANITY_PROJECT_ID;
const dataset = process.env.REACT_APP_SANITY_DATASET || "production";

export default defineConfig({
  name: "nje-catalogue-studio",
  title: "NJE Catalogue Admin",
  projectId,
  dataset,
  basePath: "/admin/studio",
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
});
