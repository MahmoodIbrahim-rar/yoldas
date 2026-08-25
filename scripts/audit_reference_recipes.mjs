import { readFile } from "node:fs/promises";

const root = "/home/ubuntu/yoldas_latest_copy/yoldas-simple-editable - Copy";
const recipes = JSON.parse(await readFile(`${root}/data/reference_recipes.json`, "utf8"));
const issues = [];

for (const recipe of recipes) {
  const ratio = recipe.ingredient_weight_g / recipe.serving_weight_g;
  if (ratio < 0.82 || ratio > 1.18) issues.push({ id: recipe.id, issue: "ingredient_weight_outside_serving_range", ratio });
  if (recipe.nutrition.kcal < 120 || recipe.nutrition.kcal > 950) issues.push({ id: recipe.id, issue: "kcal_outside_reference_range", kcal: recipe.nutrition.kcal });
  if (!recipe.calculation?.ingredient_sources?.length) issues.push({ id: recipe.id, issue: "missing_provenance" });
}

console.log(JSON.stringify({
  recipe_count: recipes.length,
  egyptian_count: recipes.filter((recipe) => recipe.country === "EG").length,
  turkish_count: recipes.filter((recipe) => recipe.country === "TR").length,
  kcal_range: {
    min: Math.min(...recipes.map((recipe) => recipe.nutrition.kcal)),
    max: Math.max(...recipes.map((recipe) => recipe.nutrition.kcal)),
  },
  issues,
  summaries: recipes.map((recipe) => ({ id: recipe.id, kcal: recipe.nutrition.kcal, serving_weight_g: recipe.serving_weight_g })),
}, null, 2));
