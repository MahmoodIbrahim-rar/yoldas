import { readFile, writeFile } from "node:fs/promises";

const catalog = JSON.parse(await readFile(new URL("../data/reference_recipes.json", import.meta.url), "utf8"));
const publicEntries = catalog.map((recipe) => ({
  id: recipe.id,
  country: recipe.country,
  name_ar: recipe.name_ar,
  name_tr: recipe.name_tr,
  name_en: recipe.name_en,
  search_terms: recipe.search_terms,
  serving_ar: recipe.serving_ar,
  serving_tr: recipe.serving_tr,
  serving_en: recipe.serving_en,
  serving_weight_g: recipe.serving_weight_g,
  nutrition: recipe.nutrition,
  source: recipe.calculation.source,
  source_url: recipe.calculation.source_url,
  review_date: recipe.calculation.review_date,
}));

const output = `// Generated from data/reference_recipes.json. Do not hand-edit.\nexport const REFERENCE_RECIPES = ${JSON.stringify(publicEntries, null, 2)} as const;\n`;
await writeFile(new URL("../supabase/functions/health-assistant/reference-recipes.ts", import.meta.url), output);
console.log(`Exported ${publicEntries.length} reference recipes to the Edge Function.`);
