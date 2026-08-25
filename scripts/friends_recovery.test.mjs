import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("friends and streak snaps are private, capped, and expire", async () => {
  const [sql, service, app, html] = await Promise.all([
    read("supabase/friends-recovery-setup.sql"),
    read("supabase/functions/social-service/index.ts"),
    read("app.js"),
    read("index.html"),
  ]);
  assert.match(sql, /friendships/);
  assert.match(sql, /friend_blocks/);
  assert.match(sql, /streak_snaps/);
  assert.match(sql, /snap_reactions/);
  assert.match(sql, /reaction in \('fire', 'clap', 'heart'\)/);
  assert.match(sql, /expires_at.*24 hours/s);
  assert.match(sql, /file_size_limit.*2097152/s);
  assert.match(sql, /allowed_mime_types.*image\/jpeg.*image\/webp/s);
  assert.match(sql, /unique \(sender_user_id, recipient_user_id, sent_day\)/);
  assert.match(sql, /friend_discovery/);
  assert.doesNotMatch(sql, /for select to authenticated[\s\S]*yoldas-streak-snaps/);
  assert.match(service, /MAX_FRIENDS = 20/);
  assert.match(service, /mode === "cleanup_expired"/);
  assert.match(service, /createSignedUrl/);
  assert.match(service, /isAcceptedFriend/);
  assert.match(service, /isBlocked/);
  assert.match(service, /SNAP_DAILY_LIMIT/);
  assert.match(service, /mode === "set_snap_reaction"/);
  assert.match(service, /snap\.recipient_user_id !== userId/);
  assert.match(service, /snap_reactions/);
  assert.match(app, /file\.size > 2 \* 1024 \* 1024/);
  assert.match(app, /image\/jpeg", "image\/webp/);
  assert.match(app, /data-snap-reaction/);
  assert.match(app, /reactionFire/);
  assert.match(app, /social-service/);
  assert.match(html, /id="friend-search-form"/);
  assert.match(html, /id="snap-form"/);
});

test("password recovery uses a private email while username login remains", async () => {
  const [account, app, html] = await Promise.all([
    read("supabase/functions/account-auth/index.ts"),
    read("app.js"),
    read("index.html"),
  ]);
  assert.match(account, /mode === "request_reset"/);
  assert.match(account, /resetPasswordForEmail/);
  assert.doesNotMatch(account, /bodibrahim-rar\.github\.io/);
  assert.match(account, /redirectTo\.startsWith\("https:\/\/"\)/);
  assert.match(account, /mode === "update_recovery"/);
  assert.match(account, /recovery_email/);
  assert.match(account, /email_confirm: true/);
  assert.match(app, /mode: "request_reset"/);
  assert.match(app, /mode: "update_recovery"/);
  assert.match(app, /PASSWORD_RECOVERY/);
  assert.match(app, /auth\.updateUser\(\{ password \}\)/);
  assert.match(html, /id="account-recovery-email"/);
  assert.match(html, /id="forgot-password"/);
  assert.match(html, /id="recovery-email-save"/);
  assert.match(html, /id="reset-complete-form"/);
});
