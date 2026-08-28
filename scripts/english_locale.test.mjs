import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("English is a complete third locale for the UI, plans, Miri, and food catalog", async () => {
  const [html, app, edge, recipes] = await Promise.all([
    read("index.html"),
    read("app.js"),
    read("supabase/functions/health-assistant/index.ts"),
    read("data/reference_recipes.json").then(JSON.parse),
  ]);
  assert.match(html, /data-language-name="English">English/);
  assert.match(html, /class="language-menu" data-language-menu/);
  assert.match(app, /const SUPPORTED_LOCALES = \["ar", "tr", "en"\]/);
  assert.match(app, /document\.documentElement\.dir = currentLocale === "ar" \? "rtl" : "ltr"/);
  assert.match(app, /UI_TEXT\.en = \{/);
  assert.match(app, /EXTRA_UI_TEXT[\s\S]*en: \{/);
  assert.match(app, /PLAN_QUESTIONS_EN/);
  assert.match(app, /currentLocale === "en" \? PLAN_QUESTIONS_EN/);
  assert.match(edge, /type Locale = "ar" \| "tr" \| "en"/);
  assert.match(edge, /locale === "en"/);
  assert.match(edge, /natural English/);
  assert.match(app, /recipe\[`name_\$\{currentLocale\}`\]/);
  assert.match(app, /INGREDIENT_LABELS_EN/);
  assert.ok(recipes.every((recipe) => recipe.name_en && recipe.serving_en), "Every recipe has English food and serving text");
  assert.ok(recipes.some((recipe) => recipe.name_en === "Rice, lentils and pasta" && recipe.serving_en.includes("chickpeas")), "Koshari uses a natural English name and a clear ingredient description");
  assert.ok(recipes.some((recipe) => recipe.name_en === "Chicken shawarma wrap"), "Chicken shawarma uses a natural English food name");
  assert.ok(recipes.some((recipe) => recipe.name_en === "Potato Chips" && recipe.serving_en.includes("Small pack")), "Potato chips have natural English copy");
  assert.ok(recipes.some((recipe) => recipe.name_en === "Milk Chocolate" && recipe.serving_en.includes("squares")), "Chocolate has natural English copy");
  assert.ok(recipes.some((recipe) => recipe.name_en === "Glazed Doughnut" && recipe.serving_en.includes("doughnut")), "Doughnut has natural English copy");
  assert.match(app, /potato_chips_salted: "Salted potato chips"/);
  assert.match(app, /milk_chocolate: "Milk chocolate"/);
});
