import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (name) => readFile(new URL(name, root), "utf8");

test("Friend challenges offer exactly five movement templates and a 2–5 friend flow", async () => {
  const html = await read("index.html");
  for (const value of ["pushups", "squats", "plank", "walk", "chair_stands"]) {
    assert.match(html, new RegExp(`value="${value}"`));
  }
  assert.match(html, /data-i18n="challengeDescription"/);
  assert.match(html, /id="challenge-friends"/);
  assert.match(html, /id="challenge-level-card"/);
});

test("Challenge rendering caps extra invitees at four and uses compact daily completion", async () => {
  const js = await read("app.js");
  assert.match(js, /selected\.length > 4/);
  assert.match(js, /create_challenge/);
  assert.match(js, /complete_challenge_day/);
  assert.match(js, /myCompletedMask/);
  assert.match(js, /challengeLevel8/);
  assert.match(js, /عدد المشاركين من 2 إلى 5/);
  assert.match(js, /2 to 5 participants in total/);
  assert.match(js, /toplam katılımcı sayısı 2–5 olur/);
});

test("Eight streak reward levels use lightweight CSS themes", async () => {
  const css = await read("style.css");
  for (let level = 0; level <= 8; level += 1) {
    assert.match(css, new RegExp(`\\.challenge-level-${level}`));
  }
  assert.doesNotMatch(css, /url\([^)]*challenge-level/i);
});

test("Arabic dynamic planning questions use clear Modern Standard Arabic", async () => {
  const js = await read("app.js");
  assert.match(js, /كم يبلغ عمرك؟/);
  assert.match(js, /ما طولك بالسنتيمتر؟/);
  assert.match(js, /ما وزنك الحالي بالكيلوغرام؟/);
  assert.doesNotMatch(js, /عندك كام سنة؟/);
  assert.doesNotMatch(js, /بتعرف تعمل كام ضغطة/);
});
