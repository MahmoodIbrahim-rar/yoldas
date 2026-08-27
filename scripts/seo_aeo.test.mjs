import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("the landing page has unique Arabic SEO metadata and a canonical URL", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || "";
  const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1] || "";

  assert.equal(title, "Yoldaş | خطة أكل وتمارين ومتابعة صحية يومية");
  assert.ok(Array.from(title).length <= 60);
  assert.ok(Array.from(description).length >= 150 && Array.from(description).length <= 160);
  assert.match(html, /<link rel="canonical" href="https:\/\/yoldas-beta\.vercel\.app\/" \/>/);
  assert.match(html, /<meta name="robots" content="index,follow,max-image-preview:large" \/>/);
});

test("visible FAQ content matches valid FAQPage JSON-LD", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("app.js", root), "utf8"),
  ]);
  const schema = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/)?.[1];

  assert.ok(schema, "FAQ JSON-LD must exist");
  const data = JSON.parse(schema);
  assert.equal(data["@type"], "FAQPage");
  assert.equal(data.mainEntity.length, 10);
  assert.equal((html.match(/class="faq-item"/g) || []).length, 10);
  assert.match(html, /كيف أحسب احتياجي من السعرات؟/);
  assert.match(html, /كم بروتين أحتاج يوميًا؟/);
  assert.match(html, /هل يمكنني أكل كشري أو شاورما وأنا أخس؟/);
  assert.doesNotMatch(html, /<summary data-i18n="faqQuestion1">ما هو Yoldaş؟/);
  assert.match(html, /data-i18n="faqQuestion1"/);
  assert.match(html, /data-i18n="faqQuestion10"/);
  assert.match(app, /faqQuestion1:/);
  assert.match(app, /faqQuestion10:/);
});

test("robots and sitemap expose only the selected canonical deployment", async () => {
  const [robots, sitemap] = await Promise.all([
    readFile(new URL("robots.txt", root), "utf8"),
    readFile(new URL("sitemap.xml", root), "utf8"),
  ]);

  assert.match(robots, /^User-agent: \*\nAllow: \/\n/m);
  assert.match(robots, /Sitemap: https:\/\/yoldas-beta\.vercel\.app\/sitemap\.xml/);
  assert.match(sitemap, /<loc>https:\/\/yoldas-beta\.vercel\.app\/<\/loc>/);
  assert.doesNotMatch(sitemap, /github\.io/);
});
