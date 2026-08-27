import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("expanded catalog keeps 100 transparent reference meals with natural English names", async () => {
  const recipes = JSON.parse(await read("data/reference_recipes.json"));
  assert.equal(recipes.length, 100);
  assert.ok(recipes.filter((recipe) => recipe.country === "EG").length >= 29);
  assert.ok(recipes.filter((recipe) => recipe.country === "TR").length >= 29);
  assert.ok(recipes.filter((recipe) => ["DAILY", "DAY"].includes(recipe.country)).length >= 41);
  for (const id of ["daily-french-fries", "daily-fried-eggs", "daily-potato-chips", "daily-milk-chocolate", "daily-glazed-doughnut", "daily-tahini-halva"]) {
    assert.ok(recipes.some((recipe) => recipe.id === id), `${id} is present`);
  }
  for (const recipe of recipes) {
    assert.ok(recipe.calculation?.ingredient_sources?.length, `${recipe.id} has ingredient sources`);
    assert.ok(recipe.serving_weight_g > 0, `${recipe.id} has a serving weight`);
    assert.ok(recipe.name_en && recipe.serving_en, `${recipe.id} has natural English display copy`);
    assert.doesNotMatch(recipe.name_ar, /Yoldaş\s+المرجعي/);
    assert.doesNotMatch(recipe.name_tr, /^Yoldaş\s+referans/i);
  }
});

test("catalog UI saves selected servings with a clear result and compatibility fallback", async () => {
  const [html, app] = await Promise.all([read("index.html"), read("app.js")]);
  assert.match(html, /data-food-filter="DAILY"/);
  assert.match(html, /id="food-catalog-count"/);
  assert.match(html, /id="food-catalog-message"/);
  assert.match(app, /recipe-ingredients/);
  assert.match(app, /recipe\.calculation\.ingredient_sources\.map/);
  assert.match(app, /recipe\.name_en/);
  assert.match(app, /INGREDIENT_LABELS_EN/);
  assert.match(app, /dailyRecipes/);
  assert.match(app, /function saveReferenceRecipe/);
  assert.match(app, /legacyBase = \{ \.\.\.baseMeal, calories, eaten_at:/);
  assert.match(app, /compatiblePayloads = \[legacyReferenceDetails, referenceDetails, legacyBase, baseMeal\]/);
  assert.match(app, /setFoodCatalogMessage\(t\("catalogSaveSuccess"\)\)/);
});
