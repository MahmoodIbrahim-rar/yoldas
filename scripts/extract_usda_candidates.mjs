import { readFile } from "node:fs/promises";

const searches = [
  "rice cooked", "lentils mature seeds cooked", "chickpeas cooked", "pasta cooked",
  "tomato sauce canned", "onions raw", "oil vegetable", "potatoes boiled",
  "beans fava cooked", "bread pita", "beef ground cooked", "chicken breast roasted",
  "egg whole cooked", "yogurt plain whole milk", "milk whole", "butter",
  "flour wheat all purpose", "eggplant cooked", "cheese feta", "walnuts",
  "sugar granulated", "phyllo dough", "bulgur cooked", "cucumber raw", "tomatoes raw",
];

function loadFoods(path, root) {
  return readFile(path, "utf8").then((raw) => JSON.parse(raw)[root]);
}

function nutrientAmount(food, name) {
  const nutrient = (food.foodNutrients || []).find((entry) => {
    if (entry.nutrient?.name !== name) return false;
    return name !== "Energy" || entry.nutrient?.unitName === "kcal";
  });
  return nutrient?.amount ?? null;
}

const [foundation, legacy] = await Promise.all([
  loadFoods("/home/ubuntu/yoldas_food_sources/foundation/FoodData_Central_foundation_food_json_2026-04-30.json", "FoundationFoods"),
  loadFoods("/home/ubuntu/yoldas_food_sources/sr_legacy/FoodData_Central_sr_legacy_food_json_2018-04.json", "SRLegacyFoods"),
]);

const foods = [...foundation, ...legacy];
const result = searches.map((query) => {
  const words = query.toLowerCase().split(/\s+/);
  const options = foods
    .filter((food) => food?.description && words.every((word) => food.description.toLowerCase().includes(word)))
    .slice(0, 8)
    .map((food) => ({
      fdc_id: food.fdcId,
      description: food.description,
      calories_per_100g: nutrientAmount(food, "Energy"),
      protein_per_100g: nutrientAmount(food, "Protein"),
      carbs_per_100g: nutrientAmount(food, "Carbohydrate, by difference"),
      fat_per_100g: nutrientAmount(food, "Total lipid (fat)"),
    }));
  return { query, options };
});

console.log(JSON.stringify(result, null, 2));
