import { readFile, writeFile } from "node:fs/promises";

const root = process.cwd();
const current = JSON.parse(await readFile(`${root}/data/reference_recipes.json`, "utf8"));
const extras = JSON.parse(await readFile(`${root}/data/popular_recipe_expansion_inputs.json`, "utf8"));
const ingredients = JSON.parse(await readFile("/home/ubuntu/yoldas_food_sources/usda_selected_ingredients.json", "utf8"));
const ingredientByKey = Object.fromEntries(ingredients.map((item) => [item.key, item]));
const nutrients = [["kcal", "kcal_per_100g"], ["protein", "protein_per_100g"], ["carbs", "carbs_per_100g"], ["fat", "fat_per_100g"]];
const round = (value) => Math.round(value * 10) / 10;
const englishNames = {
  "eg-koshari":"Koshari","eg-ful-medames":"Ful Medames","eg-taameya":"Taameya (Egyptian Falafel)","eg-lentil-soup":"Egyptian Lentil Soup","eg-molokhia-rice":"Molokhia with Rice","eg-mahshi":"Stuffed Zucchini (Mahshi)","eg-macarona-bechamel":"Egyptian Béchamel Pasta","eg-chicken-shawarma":"Chicken Shawarma Wrap","eg-rice-pudding":"Egyptian Rice Pudding","eg-fatta-beef":"Beef Fatta","eg-chicken-kabsa":"Chicken Kabsa","eg-okra-beef":"Okra and Beef with Rice",
  "tr-menemen":"Menemen","tr-mercimek-corbasi":"Turkish Lentil Soup","tr-doner-durum":"Döner Dürüm","tr-chicken-sis-pilav":"Chicken Shish with Rice","tr-kofte-bulgur":"Turkish Köfte with Bulgur","tr-lahmacun":"Lahmacun","tr-pide":"Minced Meat Pide","tr-pilav":"Turkish Rice Pilaf","tr-simit":"Simit","tr-imam-bayildi":"Imam Bayildi","tr-borek":"Cheese Börek","tr-baklava":"Baklava",
  "daily-egg-pita":"Eggs and Pita","daily-chicken-rice":"Chicken and Rice","daily-pasta-tomato":"Tomato Pasta","daily-lentil-rice":"Lentils and Rice","daily-beef-potato":"Beef and Potatoes","daily-bulgur-chicken":"Bulgur and Chicken","daily-yogurt-pita":"Yogurt, Pita and Vegetables","daily-falafel-plate":"Falafel Plate","daily-eggplant-pita":"Eggplant and Pita","daily-chickpea-salad":"Hearty Chickpea Salad","daily-fava-sandwich":"Ful Medames Sandwich","daily-omelet-potato":"Eggs and Potatoes",
  "eg-macarona-salsa":"Egyptian Tomato Pasta","eg-shakshuka":"Shakshuka","eg-moussaka":"Egyptian Eggplant Moussaka","eg-potato-tomato":"Potatoes in Tomato Sauce","eg-zucchini-tomato-rice":"Zucchini in Tomato Sauce with Rice","eg-bamia-chicken-rice":"Chicken Okra with Rice","eg-ful-salad":"Ful Medames Salad","eg-taameya-sandwich":"Taameya Sandwich","eg-egg-ful-breakfast":"Egg and Ful Breakfast","eg-chicken-rice-tomato":"Chicken and Rice with Tomato Sauce","eg-beef-rice-tomato":"Beef and Rice with Tomato Sauce",
  "tr-ezogelin":"Ezogelin Soup","tr-bulgur-pilav":"Tomato Bulgur Pilaf","tr-nohut-pilav":"Chickpea Rice Pilaf","tr-sebzeli-bulgur":"Vegetable Bulgur Pilaf","tr-patlican-musakka":"Turkish Eggplant Moussaka","tr-turlu":"Turkish Vegetable Stew","tr-mucver":"Zucchini Fritters (Mücver)","tr-sigara-borek":"Cheese Cigars (Sigara Börek)","tr-coban-salata":"Shepherd's Salad","tr-sahanda-yumurta":"Turkish Fried Eggs with Cheese","tr-yogurtlu-nohut":"Chickpeas with Yogurt","tr-patatesli-borek":"Potato Börek"
};
const cleanArabicName = (name) => name.replace(/\s+Yoldaş\s+المرجعي(?:ة)?/g, "").trim();
const cleanTurkishName = (name) => name.replace(/^Yoldaş\s+referans\s+/i, "").trim();
const normalizeExisting = (recipe) => ({
  ...recipe,
  name_ar: cleanArabicName(recipe.name_ar),
  name_tr: cleanTurkishName(recipe.name_tr),
  name_en: englishNames[recipe.id] || recipe.name_en || cleanArabicName(recipe.name_ar),
  serving_en: recipe.serving_en || `Approx. ${recipe.serving_weight_g} g serving`,
  search_terms: [...new Set([...(recipe.search_terms || []), englishNames[recipe.id] || recipe.name_en].filter(Boolean))],
  calculation: {
    ...recipe.calculation,
    user_disclaimer_ar: "قيمة تقريبية لحصة مرجعية ومكونات محددة؛ قد تختلف مع الزيت والإضافات وحجم الوجبة الفعلي.",
    user_disclaimer_tr: "Bu değer belirli malzemeler ve referans porsiyon içindir; yağ, ek malzeme ve gerçek porsiyon boyutuna göre değişebilir.",
    user_disclaimer_en: "This is an approximate value for a reference serving and specified ingredients. Oil, extras, and your actual portion can change it."
  }
});
const buildExtra = (recipe) => {
  const totals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const ingredient_sources = recipe.ingredients.map(([key, grams]) => {
    const ingredient = ingredientByKey[key];
    if (!ingredient) throw new Error(`Missing verified ingredient source: ${recipe.id}:${key}`);
    for (const [nutrient, sourceKey] of nutrients) totals[nutrient] += (ingredient[sourceKey] ?? 0) * grams / 100;
    return { key, grams, usda_fdc_id: ingredient.fdc_id, usda_description: ingredient.description };
  });
  return {
    ...recipe,
    ingredient_weight_g: recipe.ingredients.reduce((sum, [, grams]) => sum + grams, 0),
    nutrition: Object.fromEntries(nutrients.map(([nutrient]) => [nutrient, round(totals[nutrient])])),
    calculation: {
      source: "USDA FoodData Central, Foundation Foods and SR Legacy",
      source_url: "https://fdc.nal.usda.gov/",
      license: "CC0 1.0 Universal",
      review_date: "2026-08-27",
      ingredient_sources,
      user_disclaimer_ar: "قيمة تقريبية لحصة مرجعية ومكونات محددة؛ قد تختلف مع الزيت والإضافات وحجم الوجبة الفعلي.",
      user_disclaimer_tr: "Bu değer belirli malzemeler ve referans porsiyon içindir; yağ, ek malzeme ve gerçek porsiyon boyutuna göre değişebilir.",
      user_disclaimer_en: "This is an approximate value for a reference serving and specified ingredients. Oil, extras, and your actual portion can change it."
    }
  };
};
const deduped = [...new Map(current.map((recipe) => [recipe.id, normalizeExisting(recipe)])).values()];
const extraIds = new Set(extras.map((recipe) => recipe.id));
const catalog = [...deduped.filter((recipe) => !extraIds.has(recipe.id)), ...extras.map(buildExtra)];
await writeFile(`${root}/data/reference_recipes.json`, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Wrote ${catalog.length} recipes with Arabic, Turkish, and English names.`);
