import { useRef, useState } from "react";
import type { Folder, Track } from "../lib/types";
import { FOLDERS, FOLDER_LABELS } from "../lib/types";
import { uploadTrack } from "../lib/supabase";

const UPLOAD_FOLDERS = FOLDERS.filter((f) => f.id !== "all") as { id: Folder; label: string }[];

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
  const [folder, setFolder] = useState<Folder>("music");
  const [queue, setQueue] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const names = Array.from(files).map((f) => f.name);
    setQueue(names);
    for (const file of Array.from(files)) {
      try {
        const duration = await probeDuration(file);
        await uploadTrack(file, folder, duration, onUploaded);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      }
      setQueue((q) => q.filter((n) => n !== file.name));
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <section className="mt-8">
      <h2 className="mb-1 text-xl font-semibold text-on-surface">Upload Files</h2>
      <p className="mb-4 text-sm text-on-surface-dim">Add new audio to your library with a tap.</p>

      <div className="mb-4">
        <label
          className="mb-2 ml-1 block text-xs font-medium tracking-wider text-on-surface-dim uppercase"
          htmlFor="upload-folder"
        >
          Choose destination folder
        </label>
        <div className="relative">
          <select
            id="upload-folder"
            className="h-14 w-full appearance-none rounded-xl border border-outline-dim bg-surface-glass px-4 text-on-surface transition-shadow focus:ring-2 focus:ring-primary/20 focus:outline-none"
            value={folder}
            onChange={(e) => setFolder(e.target.value as Folder)}
          >
            {UPLOAD_FOLDERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-on-surface-dim">
            expand_more
          </span>
        </div>
      </div>

      <div
        className={`group flex h-48 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 active:scale-[0.98] ${
          dragOver ? "border-primary bg-primary/10" : "border-outline-dim bg-surface-glass/30"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <span className="material-symbols-outlined mb-2 text-4xl text-on-surface-dim transition-colors group-hover:text-primary">
          upload_file
        </span>
        <p className="px-8 text-center text-sm font-medium text-on-surface-dim">
          Tap to select, or drop audio into “{FOLDER_LABELS[folder]}”
        </p>
        <p className="mt-1 text-xs text-outline">MP3, M4A, WAV, FLAC…</p>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.m4a,.mp3,.wav,.aac,.flac,.ogg"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="mt-3 text-sm text-error">{error}</p>}

      {queue.length > 0 && (
        <div className="mt-4 space-y-2">
          <h3 className="px-1 text-xs font-medium tracking-wider text-on-surface-dim uppercase">
            Uploading ({queue.length})
          </h3>
          {queue.map((name) => (
            <div
              key={name}
              className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/5 p-3"
            >
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary/20">
                <span className="material-symbols-outlined animate-spin text-primary">
                  progress_activity
                </span>
              </div>
              <p className="truncate text-sm font-medium text-on-surface">{name}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
