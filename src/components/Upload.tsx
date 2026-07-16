import { useRef, useState } from "react";
import type { Folder, Track } from "../lib/types";
import { uploadTrack } from "../lib/supabase";

interface Props {
  onUploaded: (t: Track) => void;
}

function probeDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(isFinite(a.duration) ? a.duration : 0);
    };
    a.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    a.src = url;
  });
}

export function Upload({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState<Folder>("lectures");
  const [busyName, setBusyName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    for (const file of Array.from(files)) {
      setBusyName(file.name);
      try {
        const duration = await probeDuration(file);
        await uploadTrack(file, folder, duration, onUploaded);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      }
    }
    setBusyName(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section className="upload">
      <div className="upload__folders" role="radiogroup" aria-label="Save into folder">
        {(["music", "lectures", "notes"] as Folder[]).map((f) => (
          <button
            key={f}
            role="radio"
            aria-checked={folder === f}
            className={`upload__folder ${folder === f ? "upload__folder--on" : ""}`}
            onClick={() => setFolder(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <button
        className="upload__drop"
        onClick={() => inputRef.current?.click()}
        disabled={busyName !== null}
      >
        {busyName ? (
          <>
            <span className="upload__spinner" aria-hidden="true" />
            Uploading {busyName}…
          </>
        ) : (
          <>＋ Upload audio into “{folder}”</>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.m4a,.mp3,.wav,.aac,.flac,.ogg"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
      {error && <p className="upload__error">{error}</p>}
    </section>
  );
}
