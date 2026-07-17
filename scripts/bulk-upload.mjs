// One-off bulk importer for local audio folders into Adios.
// Run locally with your own credentials — never pass your password to anyone else:
//
//   UPLOAD_EMAIL=you@example.com UPLOAD_PASSWORD=yourpassword node scripts/bulk-upload.mjs "C:\path\to\folder" lectures
//
// Walks the given folder recursively for .mp3/.m4a/.wav/.flac/.ogg files, probes duration
// with ffprobe, uploads each to the `audio` storage bucket, and inserts a `tracks` row.
// Safe to re-run: skips files whose title already exists in your library.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, basename } from "node:path";
import { execFileSync } from "node:child_process";

const AUDIO_EXT = new Set([".mp3", ".m4a", ".wav", ".flac", ".ogg"]);

function loadEnvFile() {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (AUDIO_EXT.has(extname(entry).toLowerCase())) out.push(full);
  }
  return out;
}

function probeDuration(path) {
  const out = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
    { encoding: "utf8" }
  );
  const n = parseFloat(out.trim());
  return Number.isFinite(n) ? n : 0;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRetry(fn, attempts = 4) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await sleep(1000 * 2 ** i); // 1s, 2s, 4s
    }
  }
  throw lastErr;
}

async function main() {
  const [, , dirArg, folderArg] = process.argv;
  const folder = folderArg || "lectures";
  if (!dirArg) {
    console.error('Usage: node scripts/bulk-upload.mjs "<folder>" [music|lectures|notes]');
    process.exit(1);
  }
  if (!["music", "lectures", "notes"].includes(folder)) {
    console.error(`Invalid folder "${folder}" — must be music, lectures, or notes`);
    process.exit(1);
  }
  const email = process.env.UPLOAD_EMAIL;
  const password = process.env.UPLOAD_PASSWORD;
  if (!email || !password) {
    console.error("Set UPLOAD_EMAIL and UPLOAD_PASSWORD environment variables first.");
    process.exit(1);
  }

  const env = loadEnvFile();
  const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (authErr) {
    console.error("Sign-in failed:", authErr.message);
    process.exit(1);
  }
  const uid = authData.user.id;
  console.log(`Signed in as ${email}`);

  const { data: existing, error: listErr } = await supabase.from("tracks").select("title");
  if (listErr) {
    console.error("Couldn't list existing tracks:", listErr.message);
    process.exit(1);
  }
  const existingTitles = new Set(existing.map((t) => t.title));

  const files = walk(dirArg);
  console.log(`Found ${files.length} audio files under ${dirArg}`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const [i, file] of files.entries()) {
    const title = basename(file).replace(/\.[^.]+$/, "");
    if (existingTitles.has(title)) {
      skipped++;
      continue;
    }
    process.stdout.write(`[${i + 1}/${files.length}] ${title} ... `);
    try {
      const duration = probeDuration(file);
      const buffer = readFileSync(file);
      const safeName = basename(file).replace(/[^\w.\-() ]+/g, "_");
      const path = `${uid}/${Date.now()}-${safeName}`;

      await withRetry(async () => {
        const { error: upErr } = await supabase.storage.from("audio").upload(path, buffer, {
          contentType: "audio/mpeg",
          upsert: true
        });
        if (upErr) throw upErr;
      });

      await withRetry(async () => {
        const { data: already } = await supabase
          .from("tracks")
          .select("id")
          .eq("storage_path", path)
          .maybeSingle();
        if (already) return; // a prior attempt's response was lost but the insert landed
        const { error: insErr } = await supabase.from("tracks").insert({
          title,
          folder,
          duration,
          storage_path: path
        });
        if (insErr) throw insErr;
      });

      uploaded++;
      console.log("ok");
    } catch (e) {
      failed++;
      console.log("FAILED after retries:", e instanceof Error ? e.message : e);
    }
    await sleep(150);
  }

  console.log(`\nDone. Uploaded ${uploaded}, skipped ${skipped} (already present), failed ${failed}.`);
}

main();
