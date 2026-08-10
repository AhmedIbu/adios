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
    <section className="mt-4 flex flex-col gap-6">
      <div>
        <h2 className="font-headline text-xl text-on-surface">Upload Files</h2>
        <p className="mt-1 text-sm text-on-surface-variant">Add new audio to your library with a tap.</p>
      </div>

      <div className="flex flex-col gap-4 rounded-card border border-white/5 bg-surface-container-low p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <label className="text-sm text-on-surface-variant" htmlFor="upload-folder">
            Choose destination folder
          </label>
          <button
            className="flex items-center gap-1 text-xs font-semibold text-primary transition-opacity hover:opacity-80"
            onClick={() => setManageOpen((v) => !v)}
          >
            <span className="material-symbols-outlined text-[16px]">folder_managed</span>
            {manageOpen ? "Close" : "Manage folders"}
          </button>
        </div>
        <div className="relative">
          <select
            id="upload-folder"
            className="h-12 w-full appearance-none rounded-full border border-white/5 bg-surface-container px-4 text-on-surface transition-colors focus:border-primary focus:outline-none"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
          >
            {folders.map((f) => (
              <option key={f.id} value={f.name}>
                {folderLabel(f.name)}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-on-surface-variant">
            expand_more
          </span>
        </div>

        {manageOpen && (
          <div className="flex flex-col gap-4 border-t border-white/5 pt-4">
            <div className="flex items-center gap-2">
              <input
                className="h-10 min-w-0 flex-1 border-b border-on-surface-variant/30 bg-transparent px-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none"
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
                className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/5 bg-surface-container-high text-primary transition-colors hover:bg-surface-variant disabled:opacity-50"
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

            <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
              {folders.map((f) => (
                <li
                  key={f.id}
                  className="group flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-surface p-2 transition-colors hover:bg-surface-container-high"
                >
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
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                          folder
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-on-surface">
                          {folderLabel(f.name)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-primary"
                          onClick={() => {
                            setEditingFolder(f);
                            setEditValue(f.name);
                          }}
                          aria-label={`Rename ${f.name}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-error"
                          onClick={() => onDeleteFolder(f)}
                          aria-label={`Delete ${f.name}`}
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div
        className={`group relative flex h-[200px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-card border-2 border-dashed transition-all duration-300 active:scale-[0.98] ${
          dragOver ? "border-primary bg-surface-container-low" : "border-outline-variant bg-surface-container-lowest hover:border-primary/50 hover:bg-surface-container-low"
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
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-white/5 bg-surface-container-high text-primary transition-transform duration-300 group-hover:-translate-y-1">
          <span className="material-symbols-outlined text-[32px]">cloud_upload</span>
        </div>
        <p className="px-8 text-center text-on-surface">
          Tap to select, or drop audio into{" "}
          <span className="font-medium text-primary">'{folderLabel(folder)}'</span>
        </p>
        <p className="mt-1 text-xs text-on-surface-variant">MP3, M4A, WAV, FLAC…</p>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.m4a,.mp3,.wav,.aac,.flac,.ogg"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      {queue.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="px-1 text-sm text-on-surface-variant">Uploading ({queue.length})</h3>
          {queue.map((name) => (
            <div
              key={name}
              className="flex items-center gap-4 rounded-xl border border-white/5 bg-surface-container-low p-4 shadow-sm"
            >
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-white/5 bg-surface-container text-primary">
                <span className="material-symbols-outlined animate-spin text-[20px]">
                  progress_activity
                </span>
              </div>
              <p className="truncate text-sm text-on-surface">{name}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
