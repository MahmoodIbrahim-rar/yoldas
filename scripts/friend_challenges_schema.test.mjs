import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sql = await readFile(new URL("../supabase/friend-challenges-setup.sql", import.meta.url), "utf8");

test("friend challenges use five fixed movement templates and compact participant state", () => {
  assert.match(sql, /template_key in \('pushups', 'squats', 'plank', 'walk', 'chair_stands'\)/);
  assert.match(sql, /duration_days in \(3, 7\)/);
  assert.match(sql, /completed_days_mask integer not null default 0/);
  assert.match(sql, /completed_days_mask < 128/);
  assert.match(sql, /1 << position/);
  assert.match(sql, /challenge_wins smallint/);
  assert.match(sql, /protect_challenge_wins/);
  assert.match(sql, /app\.yoldas_challenge_award/);
  assert.match(sql, /award_friend_challenge_win/);
});

test("friend challenges stay private and only accepted participants can claim a day", () => {
  assert.match(sql, /enable row level security/);
  assert.match(sql, /actor_id uuid := auth\.uid\(\)/);
  assert.match(sql, /user_id = actor_id/);
  assert.match(sql, /accepted_at is not null/);
  assert.match(sql, /grant execute on function public\.claim_friend_challenge_day\(uuid\) to authenticated/);
});
