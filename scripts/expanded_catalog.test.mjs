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

test("catalog pagination and smart search remain local, balanced, and free of automatic AI calls", async () => {
  const [recipes, html, app] = await Promise.all([read("data/reference_recipes.json").then(JSON.parse), read("index.html"), read("app.js")]);
  assert.ok(recipes.filter((recipe) => recipe.country === "EG").length >= 10);
  assert.ok(recipes.filter((recipe) => recipe.country === "TR").length >= 10);
  assert.ok(recipes.filter((recipe) => ["DAILY", "DAY"].includes(recipe.country)).length >= 10);
  assert.match(html, /id="food-catalog-pagination"/);
  assert.match(html, /id="food-page-prev"/);
  assert.match(html, /id="food-page-next"/);
  assert.match(html, /id="food-catalog-suggestions"/);
  assert.match(app, /const CATALOG_PAGE_SIZE = 10/);
  assert.match(app, /function catalogCountry/);
  assert.match(app, /function recipeSearchFields/);
  assert.match(app, /recipe\.calculation\?\.ingredient_sources/);
  assert.match(app, /function editDistance/);
  assert.match(app, /function scoreRecipeSearch/);
  assert.match(app, /const defaultGroups = \[/);
  assert.match(app, /\.slice\(catalogPage \* CATALOG_PAGE_SIZE, \(catalogPage \+ 1\) \* CATALOG_PAGE_SIZE\)/);
  assert.match(app, /renderCatalogSuggestions\(suggestionThreshold \? query : ""/);
  const catalogLogic = app.slice(app.indexOf("function recipeSearchFields"), app.indexOf("// ============== وضع الجيم"));
  assert.doesNotMatch(catalogLogic, /functions\.invoke|sendChatMessage|assistantFunction/);
  assert.match(catalogLogic, /data-ask-miri-recipe/);
  assert.match(catalogLogic, /currentUser && profileGenderComplete/);
  const askMiriLogic = catalogLogic.slice(catalogLogic.indexOf("function askMiriAboutRecipe"), catalogLogic.indexOf("function renderCatalogPagination"));
  assert.match(askMiriLogic, /requireRegisteredAccount\(\)/);
  assert.match(askMiriLogic, /input\.value = catalogText\("catalogMiriPrompt"/);
  assert.doesNotMatch(askMiriLogic, /sendChatMessage|functions\.invoke/);
});

test("catalog controls are translated and collapse to a single comfortable column on phones", async () => {
  const [app, css] = await Promise.all([read("app.js"), read("style.css")]);
  for (const key of ["catalogPrevious", "catalogNext", "catalogPageStatus", "catalogSimilarTitle", "catalogAskMiri", "catalogMiriPrompt"]) {
    const occurrences = app.match(new RegExp(`${key}:`, "g")) || [];
    assert.equal(occurrences.length, 3, `${key} has Arabic, Turkish, and English text`);
  }
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*\.food-catalog-group > div \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /\.food-catalog-pagination \{ gap: 8px; \}/);
});

test("food guide remains in its established user location while visitors can still browse it", async () => {
  const [html, app] = await Promise.all([read("index.html"), read("app.js")]);
  assert.doesNotMatch(html, /data-open-food-guide/);
  assert.match(html, /id="open-food-catalog"/);
  const placement = app.slice(app.indexOf("function placeFoodGuideForCurrentView"), app.indexOf("function showDashboard"));
  assert.match(placement, /hasRegisteredAccount\(\)/);
  assert.match(placement, /\$\("gym-mode"\)\?\.insertAdjacentElement\("beforebegin", guide\)/);
  assert.match(placement, /\$\("faq"\)\?\.insertAdjacentElement\("afterend", guide\)/);
  const guideAction = app.slice(app.indexOf("function openFoodGuide"), app.indexOf("function placeFoodGuideForCurrentView"));
  assert.match(guideAction, /switchScreen\("today"\)/);
});
