import { readFile, writeFile } from "node:fs/promises";

const root = "/home/ubuntu/yoldas_latest_copy/yoldas-simple-editable - Copy";
const regionalInputs = JSON.parse(await readFile(`${root}/data/reference_recipe_inputs.json`, "utf8"));
const everydayInputs = JSON.parse(await readFile(`${root}/data/everyday_recipe_inputs.json`, "utf8"));
const regionalExpansionInputs = JSON.parse(await readFile(`${root}/data/regional_recipe_expansion_inputs.json`, "utf8"));
const inputs = [...regionalInputs, ...everydayInputs, ...regionalExpansionInputs];
const ingredients = JSON.parse(await readFile("/home/ubuntu/yoldas_food_sources/usda_selected_ingredients.json", "utf8"));
const ingredientByKey = Object.fromEntries(ingredients.map((item) => [item.key, item]));

const nutrients = ["kcal", "protein", "carbs", "fat"];
const per100Key = {
  kcal: "kcal_per_100g",
  protein: "protein_per_100g",
  carbs: "carbs_per_100g",
  fat: "fat_per_100g",
};
const round = (value) => Math.round(value * 10) / 10;

const recipes = inputs.map((recipe) => {
  const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const ingredientSources = recipe.ingredients.map(([key, grams]) => {
    const ingredient = ingredientByKey[key];
    if (!ingredient || ingredient.kcal_per_100g === null) {
      throw new Error(`Missing verified nutrition data for ${recipe.id}:${key}`);
    }
    for (const nutrient of nutrients) {
      totals[nutrient] += (ingredient[per100Key[nutrient]] ?? 0) * grams / 100;
    }
    return {
      key,
      grams,
      usda_fdc_id: ingredient.fdc_id,
      usda_description: ingredient.description,
    };
  });

  const ingredientWeightG = recipe.ingredients.reduce((sum, [, grams]) => sum + grams, 0);
  return {
    ...recipe,
    ingredient_weight_g: ingredientWeightG,
    nutrition: Object.fromEntries(nutrients.map((nutrient) => [nutrient, round(totals[nutrient])])),
    calculation: {
      source: "USDA FoodData Central, Foundation Foods and SR Legacy",
      source_url: "https://fdc.nal.usda.gov/",
      license: "CC0 1.0 Universal",
      review_date: "2026-08-25",
      ingredient_sources: ingredientSources,
      user_disclaimer_ar: "قيمة مرجعية محسوبة لوصفة Yoldaş وحصة تقريبية؛ قد تختلف مع الزيت والإضافات والحجم الفعلي.",
      user_disclaimer_tr: "Yoldaş referans tarifine ve yaklaşık porsiyona göre hesaplanmış değerdir; yağ, ek malzemeler ve gerçek porsiyonla değişebilir.",
    },
  };
});

await writeFile(`${root}/data/reference_recipes.json`, `${JSON.stringify(recipes, null, 2)}\n`);
console.log(`Built ${recipes.length} reference recipes.`);
