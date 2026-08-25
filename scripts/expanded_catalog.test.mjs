import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("expanded catalog keeps 60 transparent reference meals", async () => {
  const recipes = JSON.parse(await read("data/reference_recipes.json"));
  assert.equal(recipes.length, 60);
  assert.equal(recipes.filter((recipe) => recipe.country === "EG").length, 24);
  assert.equal(recipes.filter((recipe) => recipe.country === "TR").length, 24);
  assert.equal(recipes.filter((recipe) => recipe.country === "DAILY").length, 12);
  for (const recipe of recipes) {
    assert.ok(recipe.calculation?.ingredient_sources?.length, `${recipe.id} has ingredient sources`);
    assert.ok(recipe.serving_weight_g > 0, `${recipe.id} has a serving weight`);
  }
});

test("catalog UI saves selected servings with a clear result and compatibility fallback", async () => {
  const [html, app] = await Promise.all([read("index.html"), read("app.js")]);
  assert.match(html, /data-food-filter="DAILY"/);
  assert.match(html, /id="food-catalog-count"/);
  assert.match(html, /id="food-catalog-message"/);
  assert.match(app, /recipe-ingredients/);
  assert.match(app, /recipe\.calculation\.ingredient_sources\.map/);
  assert.match(app, /dailyRecipes/);
  assert.match(app, /function saveReferenceRecipe/);
  assert.match(app, /legacyBase = \{ \.\.\.baseMeal, calories, eaten_at:/);
  assert.match(app, /compatiblePayloads = \[legacyReferenceDetails, referenceDetails, legacyBase, baseMeal\]/);
  assert.match(app, /setFoodCatalogMessage\(t\("catalogSaveSuccess"\)\)/);
});
