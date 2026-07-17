import { useEffect, useRef, useState } from "react";
import type { Track } from "../lib/types";
import { folderLabel } from "../lib/types";
import { uploadTrack } from "../lib/supabase";
import type { FolderRow } from "../lib/supabase";

interface Props {
  folders: FolderRow[];
  onUploaded: (t: Track) => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (f: FolderRow, newName: string) => void;
  onDeleteFolder: (f: FolderRow) => void;
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

export function Upload({ folders, onUploaded, onCreateFolder, onRenameFolder, onDeleteFolder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState<string>("");
  const [queue, setQueue] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<FolderRow | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (!folder && folders.length > 0) setFolder(folders[0].name);
  }, [folders, folder]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !folder) return;
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

      <div className="mb-2">
        <div className="mb-2 ml-1 flex items-center justify-between">
          <label
            className="block text-xs font-medium tracking-wider text-on-surface-dim uppercase"
            htmlFor="upload-folder"
          >
            Choose destination folder
          </label>
          <button
            className="text-xs font-semibold text-primary hover:underline"
            onClick={() => setManageOpen((v) => !v)}
          >
            {manageOpen ? "Close" : "Manage folders"}
          </button>
        </div>
        <div className="relative">
          <select
            id="upload-folder"
            className="h-14 w-full appearance-none rounded-xl border border-outline-dim bg-surface-glass px-4 text-on-surface transition-shadow focus:ring-2 focus:ring-primary/20 focus:outline-none"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
          >
            {folders.map((f) => (
              <option key={f.id} value={f.name}>
                {folderLabel(f.name)}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-on-surface-dim">
            expand_more
          </span>
        </div>
      </div>

      {manageOpen && (
        <div className="mb-4 rounded-xl border border-white/10 bg-surface-glass p-3">
          <div className="mb-2 flex gap-2">
            <input
              className="h-10 min-w-0 flex-1 rounded-lg border border-outline-dim bg-bg/40 px-3 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
              placeholder="New folder name…"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newFolderName.trim()) {
                  onCreateFolder(newFolderName.trim());
                  setNewFolderName("");
                }
              }}
            />
            <button
              className="flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-primary text-on-primary disabled:opacity-50"
              disabled={!newFolderName.trim()}
              onClick={() => {
                onCreateFolder(newFolderName.trim());
                setNewFolderName("");
              }}
              aria-label="Create folder"
            >
              <span className="material-symbols-outlined text-lg">add</span>
            </button>
          </div>

          <ul className="flex flex-col gap-1">
            {folders.map((f) => (
              <li key={f.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                {editingFolder?.id === f.id ? (
                  <>
                    <input
                      autoFocus
                      className="h-9 min-w-0 flex-1 rounded-md border border-outline-dim bg-bg/40 px-2 text-sm text-on-surface focus:outline-none"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && editValue.trim()) {
                          onRenameFolder(f, editValue.trim());
                          setEditingFolder(null);
                        }
                        if (e.key === "Escape") setEditingFolder(null);
                      }}
                    />
                    <button
                      className="rounded-md px-2 py-1 text-xs font-semibold text-primary"
                      onClick={() => {
                        if (editValue.trim()) onRenameFolder(f, editValue.trim());
                        setEditingFolder(null);
                      }}
                    >
                      Save
                    </button>
                  </>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate text-sm text-on-surface">
                      {folderLabel(f.name)}
                    </span>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-dim hover:bg-white/5"
                      onClick={() => {
                        setEditingFolder(f);
                        setEditValue(f.name);
                      }}
                      aria-label={`Rename ${f.name}`}
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>
                    <button
                      className="flex h-8 w-8 items-center justify-center rounded-md text-on-surface-dim hover:text-error hover:bg-white/5"
                      onClick={() => onDeleteFolder(f)}
                      aria-label={`Delete ${f.name}`}
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

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
          Tap to select, or drop audio into “{folderLabel(folder)}”
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
