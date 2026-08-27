import { readFile, writeFile } from "node:fs/promises";

const legacyPath = "/home/ubuntu/yoldas_food_sources/sr_legacy/FoodData_Central_sr_legacy_food_json_2018-04.json";
const queries = [
  "french fried", "egg, whole, cooked, fried", "potato chips", "popcorn", "milk chocolate",
  "chocolate, dark", "ice creams, vanilla", "cookies, chocolate chip", "cookies, oatmeal",
  "doughnuts", "cake, yellow", "brownies", "candies, hard", "turkish delight", "halavah",
  "crackers, saltines", "croissants", "pastry, danish", "pretzels", "peanuts, dry-roasted",
  "almonds, dry roasted", "rice cakes", "tortilla chips", "wafer, chocolate", "sesame candy",
  "marshmallows", "gelatin desserts"
];

const legacy = JSON.parse(await readFile(legacyPath, "utf8")).SRLegacyFoods;
const nutrient = (food, name) => (food.foodNutrients || []).find((entry) => entry.nutrient?.name === name && (name !== "Energy" || entry.nutrient?.unitName === "kcal"))?.amount ?? null;
const compact = (food) => ({
  fdc_id: food.fdcId,
  description: food.description,
  kcal_per_100g: nutrient(food, "Energy"),
  protein_per_100g: nutrient(food, "Protein"),
  carbs_per_100g: nutrient(food, "Carbohydrate, by difference"),
  fat_per_100g: nutrient(food, "Total lipid (fat)"),
});

const candidates = Object.fromEntries(queries.map((query) => [
  query,
  legacy.filter((food) => food.description.toLowerCase().includes(query)).map(compact).filter((food) => food.kcal_per_100g !== null).slice(0, 12),
]));

await writeFile("/tmp/yoldas_usda_snack_candidates.json", `${JSON.stringify(candidates, null, 2)}\n`);
console.log("Wrote snack candidates to /tmp/yoldas_usda_snack_candidates.json");
