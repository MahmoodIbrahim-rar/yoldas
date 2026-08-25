const ingredients = [
  "rice white long grain cooked",
  "lentils cooked",
  "chickpeas cooked",
  "pasta cooked",
  "tomato sauce canned",
  "onions raw",
  "vegetable oil",
  "potatoes boiled",
  "fava beans cooked",
  "pita bread",
  "ground beef cooked",
  "chicken breast cooked",
  "egg whole cooked",
  "yogurt plain whole milk",
  "milk whole",
  "butter",
  "flour wheat all purpose",
  "eggplant cooked",
  "cheese feta",
  "walnuts",
  "sugar granulated",
  "phyllo dough",
  "bulgur cooked",
  "cucumber raw",
  "tomatoes raw",
];

const results = [];
for (const query of ingredients) {
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", "DEMO_KEY");
  url.searchParams.set("query", query);
  url.searchParams.set("dataType", "Foundation,SR Legacy");
  url.searchParams.set("pageSize", "5");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`FDC search failed for ${query}: ${response.status}`);
  const data = await response.json();
  results.push({
    query,
    options: (data.foods || []).map((food) => ({
      fdcId: food.fdcId,
      description: food.description,
      dataType: food.dataType,
      caloriesPer100g: (food.foodNutrients || []).find((n) => n.nutrientName === "Energy")?.value ?? null,
    })),
  });
}

console.log(JSON.stringify(results, null, 2));
