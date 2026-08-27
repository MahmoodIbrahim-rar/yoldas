import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("../supabase/functions/social-service/index.ts", import.meta.url), "utf8");

test("social service limits private movement challenges to five friends and five fixed templates", () => {
  assert.match(source, /const MAX_CHALLENGE_PARTICIPANTS = 5/);
  assert.match(source, /pushups.*squats.*plank.*walk.*chair_stands/);
  assert.match(source, /participantIds\.length < 2 \|\| participantIds\.length > MAX_CHALLENGE_PARTICIPANTS/);
  assert.match(source, /\[3, 7\]\.includes\(durationDays\)/);
  assert.match(source, /CHALLENGE_CREATE_LIMIT/);
});

test("social service keeps challenge progress compact and awards levels once", () => {
  assert.match(source, /claim_friend_challenge_day/);
  assert.match(source, /award_friend_challenge_win/);
  assert.match(source, /myCompletedMask/);
  assert.match(source, /function challengeLevel\(wins: number\)/);
  assert.match(source, /if \(wins >= 80\) return 8/);
  assert.match(source, /rewardedNow/);
});

test("only accepted friends can join and every participant must accept before activation", () => {
  assert.match(source, /CHALLENGE_FRIEND_REQUIRED/);
  assert.match(source, /members\.every\(\(member\) => Boolean\(member\.accepted_at\)\)/);
  assert.match(source, /status: "active"/);
  assert.match(source, /mode === "cancel_challenge"/);
});
