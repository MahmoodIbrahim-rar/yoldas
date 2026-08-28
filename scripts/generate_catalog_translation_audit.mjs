import { readFile, writeFile } from "node:fs/promises";

const recipesUrl = new URL("../data/reference_recipes.json", import.meta.url);
const outputUrl = new URL("../data/catalog_translation_audit.md", import.meta.url);
const recipes = JSON.parse(await readFile(recipesUrl, "utf8"));
const cell = (value) => String(value || "").replaceAll("|", "\\|").replaceAll("\n", " ").trim();

const lines = [
  "# تدقيق أسماء ووصف كتالوج الطعام: التركية والإنجليزية",
  "",
  `يحتوي هذا السجل على **${recipes.length}** عنصرًا من الملف الذي تقرأه واجهة Yoldaş فعليًا: \`data/reference_recipes.json\`. كل صف يعرض الاسم والوصف الظاهرين للمستخدم بالتركية والإنجليزية حتى يمكن مراجعة أي كلمة أو تحسينها لاحقًا بسهولة.`,
  "",
  "> قاعدة الترجمة: يظهر اسم بسيط وطبيعي للمستخدم، ثم يوضح السطر تحته المكونات أو حجم الحصة. تُحتفظ بتهجئات الأكلات المحلية في كلمات البحث الداخلية عند الحاجة، لا كعنوان وحيد ظاهر للمستخدم.",
  "",
  "| # | المعرّف | الاسم التركي | الوصف التركي | الاسم الإنجليزي | الوصف الإنجليزي |",
  "|---:|---|---|---|---|---|",
  ...recipes.map((recipe, index) => `| ${index + 1} | \`${cell(recipe.id)}\` | ${cell(recipe.name_tr)} | ${cell(recipe.serving_tr)} | ${cell(recipe.name_en)} | ${cell(recipe.serving_en)} |`),
  "",
  "## ملاحظات المراجعة",
  "",
  "الأسماء التي كانت تظهر بالنقل الصوتي وحده في الأطباق المصرية أو التركية الشائعة استبدلت بعناوين تصف الطبق مباشرة. من أمثلتها: Bakla وFava beans للفول، وMısır falafeli وEgyptian falafel للطعمية، وRice, lentils and pasta للكشري. لا يغير هذا التدقيق القيم الغذائية أو المكونات أو كلمات البحث.",
  "",
];

await writeFile(outputUrl, `${lines.join("\n")}\n`, "utf8");
