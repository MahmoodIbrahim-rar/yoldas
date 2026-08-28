import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("reference recipe catalog stays valid JSON with complete labels", async () => {
  const [raw, audit] = await Promise.all([
    readFile(new URL("../data/reference_recipes.json", import.meta.url), "utf8"),
    readFile(new URL("../data/catalog_translation_audit.md", import.meta.url), "utf8"),
  ]);
  const recipes = JSON.parse(raw);
  assert.equal(recipes.length, 100);
  for (const recipe of recipes) {
    assert.ok(recipe.name_ar?.trim());
    assert.ok(recipe.name_tr?.trim());
    assert.ok(recipe.name_en?.trim());
    assert.ok(recipe.serving_tr?.trim());
    assert.ok(recipe.serving_en?.trim());
  }
  const visibleTransliterations = new Set([
    "Ful Medames", "Taameya (Egyptian Falafel)", "Koshari", "Molokhia with Rice",
    "Beef Fatta", "Chicken Kabsa", "Döner Dürüm", "Lahmacun", "Simit",
    "Imam Bayildi", "Cheese Börek", "Baklava", "Shakshuka", "Taameya Sandwich",
  ]);
  assert.ok(recipes.every((recipe) => !visibleTransliterations.has(recipe.name_en)), "Visible English names avoid untranslated dish-name transliteration");
  assert.equal((audit.match(/^\| [0-9]+ \|/gm) || []).length, recipes.length, "Translation audit documents every recipe");
  for (const recipe of recipes) {
    assert.match(audit, new RegExp(`\\\`${recipe.id}\\\``));
    assert.match(audit, new RegExp(recipe.name_tr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(audit, new RegExp(recipe.name_en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
