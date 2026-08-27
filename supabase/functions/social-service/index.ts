import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_FRIENDS = 20;
const SNAP_BUCKET = "yoldas-streak-snaps";

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
function fail(code: string, status = 400) { return reply({ ok: false, code }, status); }
function isoNow() { return new Date().toISOString(); }
function utcDayNow() { return new Date().toISOString().slice(0, 10); }
function previousUtcDay(day: string) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
function visibleStreakCount(streak: { streak_count?: number; last_completed_day?: string | null } | undefined, today: string) {
  if (!streak?.last_completed_day) return 0;
  return [today, previousUtcDay(today)].includes(streak.last_completed_day) ? Number(streak.streak_count || 0) : 0;
}

async function cleanupExpiredSnaps(admin: ReturnType<typeof createClient>) {
  const { data: expired, error } = await admin
    .from("streak_snaps")
    .select("id, storage_path")
    .lt("expires_at", isoNow())
    .limit(500);
  if (error || !expired?.length) return;
  const paths = expired.map((item) => item.storage_path);
  const ids = expired.map((item) => item.id);
  const { error: storageError } = await admin.storage.from(SNAP_BUCKET).remove(paths);
  if (storageError) return;
  await admin.from("streak_snaps").delete().in("id", ids);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return fail("METHOD_NOT_ALLOWED", 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE) return fail("SERVER_CONFIGURATION", 500);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return fail("INVALID_REQUEST"); }
  const mode = String(body.mode || "");
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return fail("AUTH_REQUIRED", 401);
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return fail("AUTH_REQUIRED", 401);
  const userId = authData.user.id;
  await cleanupExpiredSnaps(admin);

  const targetId = () => String(body.userId || "").trim();
  const isBlocked = async (otherId: string) => {
    const { count } = await admin.from("friend_blocks").select("id", { count: "exact", head: true })
      .or(`and(blocker_user_id.eq.${userId},blocked_user_id.eq.${otherId}),and(blocker_user_id.eq.${otherId},blocked_user_id.eq.${userId})`);
    return Boolean(count);
  };
  const relation = async (otherId: string) => {
    const { data } = await admin.from("friendships").select("id, requester_user_id, addressee_user_id, status")
      .or(`and(requester_user_id.eq.${userId},addressee_user_id.eq.${otherId}),and(requester_user_id.eq.${otherId},addressee_user_id.eq.${userId})`)
      .maybeSingle();
    return data;
  };
  const isAcceptedFriend = async (otherId: string) => Boolean((await relation(otherId))?.status === "accepted");

  if (mode === "search_user") {
    const username = String(body.username || "").trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(username)) return fail("INVALID_USERNAME");
    const { data: profile } = await admin.from("profiles").select("id, username, alias, friend_discovery")
      .eq("username", username).maybeSingle();
    if (!profile || profile.id === userId || !profile.friend_discovery || await isBlocked(profile.id)) return reply({ ok: true, data: { user: null } });
    const current = await relation(profile.id);
    return reply({ ok: true, data: { user: { id: profile.id, friendshipId: current?.id || null, username: profile.username, alias: profile.alias || profile.username, relation: current?.status || "none", direction: current?.requester_user_id === userId ? "sent" : "received" } } });
  }

  if (mode === "list_friends") {
    const { data: rows, error } = await admin.from("friendships").select("id, requester_user_id, addressee_user_id, status, created_at")
      .or(`requester_user_id.eq.${userId},addressee_user_id.eq.${userId}`).order("created_at", { ascending: false });
    if (error) return fail("FRIENDS_READ_FAILED", 500);
    const otherIds = (rows || []).map((row) => row.requester_user_id === userId ? row.addressee_user_id : row.requester_user_id);
    const { data: profiles } = otherIds.length ? await admin.from("profiles").select("id, username, alias").in("id", otherIds) : { data: [] };
    const acceptedIds = (rows || []).filter((row) => row.status === "accepted").map((row) => row.id);
    const { data: streakRows, error: streakError } = acceptedIds.length
      ? await admin.from("friend_streaks").select("friendship_id, streak_count, last_completed_day").in("friendship_id", acceptedIds)
      : { data: [], error: null };
    const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));
    const streakByFriendship = new Map((streakRows || []).map((streak) => [streak.friendship_id, streak]));
    const today = utcDayNow();
    const friends = (rows || []).map((row) => {
      const otherId = row.requester_user_id === userId ? row.addressee_user_id : row.requester_user_id;
      const profile = byId.get(otherId);
      const streakCount = row.status === "accepted" ? visibleStreakCount(streakByFriendship.get(row.id), today) : 0;
      return { id: row.id, userId: otherId, username: profile?.username || "", alias: profile?.alias || profile?.username || "", status: row.status, direction: row.requester_user_id === userId ? "sent" : "received", streakCount };
    }).filter((friend) => friend.username);
    return reply({ ok: true, data: { friends, streakSetupRequired: Boolean(streakError) } });
  }

  if (mode === "send_request") {
    const otherId = targetId();
    if (!otherId || otherId === userId || await isBlocked(otherId)) return fail("REQUEST_NOT_ALLOWED", 403);
    const { data: profile } = await admin.from("profiles").select("id, friend_discovery").eq("id", otherId).maybeSingle();
    if (!profile?.friend_discovery) return fail("REQUEST_NOT_ALLOWED", 403);
    const existing = await relation(otherId);
    if (existing) return reply({ ok: true, data: { status: existing.status, existing: true } });
    const { error } = await admin.from("friendships").insert({ requester_user_id: userId, addressee_user_id: otherId });
    if (error) return fail("REQUEST_SEND_FAILED", 500);
    return reply({ ok: true, data: { status: "pending" } });
  }

  if (mode === "respond_request") {
    const friendshipId = String(body.friendshipId || "").trim();
    const accept = Boolean(body.accept);
    const { data: request } = await admin.from("friendships").select("id, requester_user_id, addressee_user_id, status")
      .eq("id", friendshipId).eq("addressee_user_id", userId).maybeSingle();
    if (!request || request.status !== "pending") return fail("REQUEST_NOT_FOUND", 404);
    if (accept) {
      const { count: mine } = await admin.from("friendships").select("id", { count: "exact", head: true }).eq("status", "accepted")
        .or(`requester_user_id.eq.${userId},addressee_user_id.eq.${userId}`);
      const { count: theirs } = await admin.from("friendships").select("id", { count: "exact", head: true }).eq("status", "accepted")
        .or(`requester_user_id.eq.${request.requester_user_id},addressee_user_id.eq.${request.requester_user_id}`);
      if ((mine || 0) >= MAX_FRIENDS || (theirs || 0) >= MAX_FRIENDS) return fail("FRIEND_LIMIT", 409);
    }
    const { error } = await admin.from("friendships").update({ status: accept ? "accepted" : "declined", updated_at: isoNow() }).eq("id", friendshipId);
    if (error) return fail("REQUEST_RESPOND_FAILED", 500);
    return reply({ ok: true, data: { status: accept ? "accepted" : "declined" } });
  }

  if (mode === "remove_friend" || mode === "block_user") {
    const otherId = targetId();
    if (!otherId || otherId === userId) return fail("INVALID_TARGET");
    if (mode === "block_user") {
      const { error: blockError } = await admin.from("friend_blocks").upsert({ blocker_user_id: userId, blocked_user_id: otherId }, { onConflict: "blocker_user_id,blocked_user_id" });
      if (blockError) return fail("BLOCK_FAILED", 500);
    }
    const { error } = await admin.from("friendships").delete()
      .or(`and(requester_user_id.eq.${userId},addressee_user_id.eq.${otherId}),and(requester_user_id.eq.${otherId},addressee_user_id.eq.${userId})`);
    if (error) return fail("RELATION_REMOVE_FAILED", 500);
    return reply({ ok: true });
  }

  if (mode === "report_user") {
    const otherId = targetId();
    const reason = String(body.reason || "").trim().slice(0, 400);
    if (!otherId || !reason || !(await isAcceptedFriend(otherId))) return fail("REPORT_NOT_ALLOWED", 403);
    const { error } = await admin.from("friend_reports").insert({ reporter_user_id: userId, reported_user_id: otherId, streak_snap_id: String(body.snapId || "") || null, reason });
    if (error) return fail("REPORT_FAILED", 500);
    return reply({ ok: true });
  }

  if (mode === "register_snap") {
    const otherId = targetId();
    const storagePath = String(body.storagePath || "").trim();
    const caption = String(body.caption || "").trim().slice(0, 140) || null;
    if (!otherId || !(await isAcceptedFriend(otherId)) || await isBlocked(otherId)) return fail("SNAP_NOT_ALLOWED", 403);
    if (!storagePath.startsWith(`${userId}/`)) return fail("INVALID_SNAP_PATH", 403);
    const { error } = await admin.from("streak_snaps").insert({ sender_user_id: userId, recipient_user_id: otherId, storage_path: storagePath, caption });
    if (error?.code === "23505") return fail("SNAP_DAILY_LIMIT", 409);
    if (error) return fail("SNAP_REGISTER_FAILED", 500);
    const friendship = await relation(otherId);
    const today = utcDayNow();
    const { data: reciprocal } = await admin.from("streak_snaps").select("id")
      .eq("sender_user_id", otherId).eq("recipient_user_id", userId).eq("sent_day", today).maybeSingle();
    if (!friendship?.id || !reciprocal) return reply({ ok: true, data: { streakCompletedToday: false } });
    const { data: currentStreak, error: streakReadError } = await admin.from("friend_streaks")
      .select("streak_count, last_completed_day").eq("friendship_id", friendship.id).maybeSingle();
    if (streakReadError) return reply({ ok: true, data: { streakSetupRequired: true, streakCompletedToday: true } });
    const nextCount = currentStreak?.last_completed_day === previousUtcDay(today) ? Number(currentStreak.streak_count || 0) + 1 : 1;
    const { error: streakSaveError } = await admin.from("friend_streaks").upsert({ friendship_id: friendship.id, streak_count: nextCount, last_completed_day: today, updated_at: isoNow() });
    if (streakSaveError) return reply({ ok: true, data: { streakSetupRequired: true, streakCompletedToday: true } });
    return reply({ ok: true, data: { streakCompletedToday: true, streakCount: nextCount } });
  }

  if (mode === "list_snaps") {
    const { data: snaps, error } = await admin.from("streak_snaps").select("id, sender_user_id, recipient_user_id, storage_path, caption, created_at, expires_at, opened_at")
      .or(`sender_user_id.eq.${userId},recipient_user_id.eq.${userId}`).gt("expires_at", isoNow()).order("created_at", { ascending: false }).limit(60);
    if (error) return fail("SNAPS_READ_FAILED", 500);
    const ids = [...new Set((snaps || []).map((snap) => snap.sender_user_id === userId ? snap.recipient_user_id : snap.sender_user_id))];
    const snapIds = (snaps || []).map((snap) => snap.id);
    const { data: profiles } = ids.length ? await admin.from("profiles").select("id, username, alias").in("id", ids) : { data: [] };
    const { data: reactions } = snapIds.length ? await admin.from("snap_reactions").select("snap_id, user_id, reaction").in("snap_id", snapIds) : { data: [] };
    const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
    const reactionsBySnap = new Map<string, { user_id: string; reaction: string }[]>();
    (reactions || []).forEach((reaction) => reactionsBySnap.set(reaction.snap_id, [...(reactionsBySnap.get(reaction.snap_id) || []), reaction]));
    const output = await Promise.all((snaps || []).map(async (snap) => {
      const otherId = snap.sender_user_id === userId ? snap.recipient_user_id : snap.sender_user_id;
      const signed = await admin.storage.from(SNAP_BUCKET).createSignedUrl(snap.storage_path, 60 * 10);
      const snapReactions = reactionsBySnap.get(snap.id) || [];
      return { id: snap.id, fromMe: snap.sender_user_id === userId, canReact: snap.recipient_user_id === userId, userId: otherId, username: profileById.get(otherId)?.username || "", alias: profileById.get(otherId)?.alias || profileById.get(otherId)?.username || "", caption: snap.caption || "", createdAt: snap.created_at, expiresAt: snap.expires_at, openedAt: snap.opened_at, reactions: snapReactions.map((item) => item.reaction), myReaction: snapReactions.find((item) => item.user_id === userId)?.reaction || null, url: signed.data?.signedUrl || null };
    }));
    return reply({ ok: true, data: { snaps: output.filter((snap) => snap.url) } });
  }

  if (mode === "set_snap_reaction") {
    const snapId = String(body.snapId || "").trim();
    const reaction = String(body.reaction || "").trim();
    if (!snapId || !["fire", "clap", "heart"].includes(reaction)) return fail("INVALID_REACTION");
    const { data: snap } = await admin.from("streak_snaps").select("id, sender_user_id, recipient_user_id, expires_at")
      .eq("id", snapId).gt("expires_at", isoNow()).maybeSingle();
    if (!snap || snap.recipient_user_id !== userId || await isBlocked(snap.sender_user_id)) return fail("REACTION_NOT_ALLOWED", 403);
    const { error } = await admin.from("snap_reactions").upsert({ snap_id: snapId, user_id: userId, reaction, updated_at: isoNow() }, { onConflict: "snap_id,user_id" });
    if (error) return fail("REACTION_SAVE_FAILED", 500);
    return reply({ ok: true });
  }

  if (mode === "mark_snap_opened") {
    const snapId = String(body.snapId || "").trim();
    const { error } = await admin.from("streak_snaps").update({ opened_at: isoNow() }).eq("id", snapId).eq("recipient_user_id", userId).is("opened_at", null);
    if (error) return fail("SNAP_OPEN_FAILED", 500);
    return reply({ ok: true });
  }

  return fail("UNKNOWN_MODE", 404);
});
