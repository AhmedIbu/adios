// One-off reclassifier: splits the old single "lectures" folder into 5 folders
// matching the local MediaHuman subfolders, by matching track titles back to
// the filenames in each source subfolder.
//
// Run the supabase/expand-lecture-folders.sql migration FIRST (in the
// Supabase SQL Editor), then run this locally with your own credentials:
//
//   UPLOAD_EMAIL=you@example.com UPLOAD_PASSWORD=yourpassword node scripts/reclassify-lectures.mjs "C:\path\to\MediaHuman"

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import { join, extname, basename } from "node:path";

const AUDIO_EXT = new Set([".mp3", ".m4a", ".wav", ".flac", ".ogg"]);

const FOLDER_MAP = {
  "Beginning to the end": "beginning-to-the-end",
  "Emotional reminders": "emotional-reminders",
  "Lessons from quran": "lessons-from-quran",
  "Motivational reminders": "motivational-reminders",
  "Powerful reminders": "powerful-reminders"
};

function loadEnvFile() {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

async function main() {
  const [, , srcArg] = process.argv;
  if (!srcArg) {
    console.error('Usage: node scripts/reclassify-lectures.mjs "<MediaHuman folder>"');
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

  const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) {
    console.error("Sign-in failed:", authErr.message);
    process.exit(1);
  }
  console.log(`Signed in as ${email}`);

  let updated = 0;
  let missing = 0;

  for (const [subfolder, slug] of Object.entries(FOLDER_MAP)) {
    const dir = join(srcArg, subfolder);
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      console.error(`Couldn't read "${dir}" — skipping`);
      continue;
    }
    const titles = entries
      .filter((e) => AUDIO_EXT.has(extname(e).toLowerCase()))
      .map((e) => basename(e).replace(/\.[^.]+$/, ""));

    console.log(`\n${subfolder} -> ${slug} (${titles.length} files)`);
    for (const title of titles) {
      const { data, error } = await supabase
        .from("tracks")
        .update({ folder: slug })
        .eq("title", title)
        .select("id");
      if (error) {
        console.log(`  FAILED: ${title} — ${error.message}`);
        continue;
      }
      if (!data || data.length === 0) {
        missing++;
        console.log(`  not found: ${title}`);
      } else {
        updated++;
      }
    }
  }

  console.log(`\nDone. Updated ${updated}, not found ${missing}.`);
}

main();
