import { readFile } from "node:fs/promises";

const selections = {
  cooked_white_rice: "Rice, white, long-grain, regular, enriched, cooked",
  cooked_lentils: "Lentils, mature seeds, cooked, boiled, without salt",
  cooked_chickpeas: "Chickpeas (garbanzo beans, bengal gram), mature seeds, cooked, boiled, without salt",
  cooked_pasta: "Pasta, cooked, unenriched, without added salt",
  cooked_fava_beans: "Broadbeans (fava beans), mature seeds, cooked, boiled, without salt",
  home_prepared_falafel: "Falafel, home-prepared",
  white_pita: "Bread, pita, white, unenriched",
  lean_ground_beef: "Beef, ground, 90% lean meat / 10% fat, patty, cooked, pan-broiled",
  roasted_chicken_breast: "Chicken, broilers or fryers, breast, meat only, cooked, roasted",
  cooked_egg: "Egg, whole, cooked, omelet",
  plain_yogurt: "Yogurt, plain, whole milk",
  whole_milk: "Milk, whole, 3.25% milkfat, with added vitamin D",
  cooked_potato: "Potatoes, boiled, cooked without skin, flesh, without salt",
  cooked_bulgur: "Bulgur, cooked",
  raw_onion: "Onions, raw",
  raw_tomato: "Tomatoes, red, ripe, raw, year round average",
  raw_cucumber: "Cucumber, with peel, raw",
  olive_oil: "Oil, olive, salad or cooking",
  all_purpose_flour: "Wheat flour, white, all-purpose, unenriched",
  cooked_eggplant: "Eggplant, cooked, boiled, drained, without salt",
  cooked_jute_leaves: "Jute, potherb, cooked, boiled, drained, without salt",
  cooked_okra: "Okra, cooked, boiled, drained, without salt",
  cooked_zucchini: "Squash, summer, zucchini, includes skin, cooked, boiled, drained, without salt",
  feta_cheese: "Cheese, feta",
  walnuts: "Nuts, walnuts, english",
  granulated_sugar: "Sugars, granulated",
  butter_salted: "Butter, salted",
  phyllo_dough: "Phyllo dough",
  sesame_seeds: "Seeds, sesame seeds, whole, dried",
};

const load = async (path, root) => JSON.parse(await readFile(path, "utf8"))[root];
const [foundation, legacy] = await Promise.all([
  load("/home/ubuntu/yoldas_food_sources/foundation/FoodData_Central_foundation_food_json_2026-04-30.json", "FoundationFoods"),
  load("/home/ubuntu/yoldas_food_sources/sr_legacy/FoodData_Central_sr_legacy_food_json_2018-04.json", "SRLegacyFoods"),
]);

const foods = [...foundation, ...legacy].filter(Boolean);
const nutrient = (food, name) => (food.foodNutrients || []).find((entry) => entry.nutrient?.name === name && (name !== "Energy" || entry.nutrient?.unitName === "kcal"))?.amount ?? null;

const rows = Object.entries(selections).map(([key, description]) => {
  const food = foods
    .filter((item) => item.description === description)
    .sort((a, b) => Number(nutrient(b, "Energy") !== null) - Number(nutrient(a, "Energy") !== null))[0];
  if (!food) return { key, requested_description: description, status: "missing" };
  return {
    key,
    fdc_id: food.fdcId,
    description: food.description,
    kcal_per_100g: nutrient(food, "Energy"),
    protein_per_100g: nutrient(food, "Protein"),
    carbs_per_100g: nutrient(food, "Carbohydrate, by difference"),
    fat_per_100g: nutrient(food, "Total lipid (fat)"),
  };
});

console.log(JSON.stringify(rows, null, 2));
