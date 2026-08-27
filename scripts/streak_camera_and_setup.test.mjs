import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const read = (relativePath) => readFile(resolve(root, relativePath), "utf8");

test("friends setup creates the reciprocal streak counter used by social-service", async () => {
  const [sql, service] = await Promise.all([
    read("supabase/friends-recovery-setup.sql"),
    read("supabase/functions/social-service/index.ts"),
  ]);
  assert.match(sql, /create table if not exists public\.friend_streaks/i);
  assert.match(sql, /friendship_id uuid primary key references public\.friendships/i);
  assert.match(sql, /friend_streaks_participant_only/i);
  assert.match(service, /from\("friend_streaks"\)/);
});

test("snap form offers camera capture and a photo-library fallback", async () => {
  const [html, css] = await Promise.all([read("index.html"), read("style.css")]);
  assert.match(html, /id="snap-camera-button"/);
  assert.match(html, /id="snap-file-button"/);
  assert.match(html, /id="snap-camera"[^>]*capture="environment"/);
  assert.match(html, /id="snap-file"[^>]*accept="image\/\*"/);
  assert.match(html, /id="snap-file-name"/);
  assert.match(css, /\.snap-photo-actions/);
  assert.match(css, /\.snap-file-input/);
});

test("snap upload compresses local camera images and keeps specific error paths", async () => {
  const app = await read("app.js");
  assert.match(app, /async function prepareSnapFile/);
  assert.match(app, /createImageBitmap/);
  assert.match(app, /2 \* 1024 \* 1024/);
  assert.match(app, /function snapErrorText/);
  assert.match(app, /row-level security\|permission denied/);
  assert.match(app, /\["snap-camera", "snap-file"\]/);
  assert.match(app, /setSelectedSnapFile\(null\)/);
  assert.match(app, /snapWaitingForFriend/);
  assert.match(app, /snapStreakCompleted/);
});
