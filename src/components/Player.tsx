import { useEffect, useMemo, useRef, useState } from "react";
import type { PlayerState } from "../hooks/usePlayer";
import { folderLabel, fmtTime } from "../lib/types";
import { vibrate } from "../lib/haptics";
import { clearFolderSpeed, getFolderSpeed, setFolderSpeed } from "../lib/folderSpeed";

interface Props {
  state: PlayerState;
  onToggle: () => void;
  onSeekBy: (delta: number) => void;
  onSeekTo: (t: number) => void;
  onSpeed: (s: number) => void;
  onSleep: (minutes: number | null) => void;
  onNext: () => void;
  onPrev: () => void;
  onJumpTo: (position: number) => void;
  onReorderQueue: (fromPos: number, toPos: number) => void;
  onToggleShuffle: () => void;
  onCycleLoop: () => void;
  /** Raise the mini bar clear of a bottom tab bar (e.g. the Salah view). */
  lifted?: boolean;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];
const SLEEPS = [5, 10, 15, 30, 45, 60];
const WAVE_HEIGHTS = [10, 18, 26, 15, 22, 30, 14, 20];
const SWIPE_THRESHOLD = 70;
const SEEK_BAR_COUNT = 46;

/** Deterministic pseudo-random bar heights (0.25-1) seeded by track id — a
 *  stable decorative waveform shape, not real amplitude analysis. */
function waveformHeights(seed: string, count: number): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  let state = h || 1;
  const heights: number[] = [];
  for (let i = 0; i < count; i++) {
    state = (state * 1103515245 + 12345) >>> 0;
    heights.push(0.25 + ((state >>> 8) % 1000) / 1000 / 1.33);
  }
  return heights;
}

function SkipIcon({ direction }: { direction: "back" | "forward" }) {
  return (
    <span className="relative inline-flex h-7 w-7 items-center justify-center">
      <svg
        viewBox="0 0 24 24"
        className={`h-7 w-7 ${direction === "back" ? "-scale-x-100" : ""}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 12a8 8 0 1 0 2.7-5.95" />
        <polyline points="3 4 4 8.7 8.7 7.6" />
      </svg>
      <span className="absolute text-[8px] font-bold">15</span>
    </span>
  );
}

export function Player({
  state,
  onToggle,
  onSeekBy,
  onSeekTo,
  onSpeed,
  onSleep,
  onNext,
  onPrev,
  onJumpTo,
  onReorderQueue,
  onToggleShuffle,
  onCycleLoop,
  lifted = false
}: Props) {
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState<"speed" | "sleep" | "queue" | null>(null);
  const { track, playing, time, duration, speed, sleepLeft, queue, order, position, shuffle, loop } =
    state;

  const [dragX, setDragX] = useState(0);
  const dragging = useRef(false);
  const startX = useRef(0);

  const bars = useMemo(() => waveformHeights(track?.id ?? "x", SEEK_BAR_COUNT), [track?.id]);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const scrubbing = useRef(false);

  const [folderDefaultSpeed, setFolderDefaultSpeedState] = useState<number | null>(null);
  useEffect(() => {
    setFolderDefaultSpeedState(track ? getFolderSpeed(track.folder) : null);
  }, [track]);

  // Up Next drag-to-reorder.
  const [queueDragPos, setQueueDragPos] = useState<number | null>(null);
  const [queueOverIndex, setQueueOverIndex] = useState<number | null>(null);
  const queueRowRefs = useRef<Map<number, HTMLElement>>(new Map());
  const queueRectsRef = useRef<{ pos: number; top: number; height: number }[]>([]);

  function beginQueueDrag(pos: number, orderLength: number) {
    queueRectsRef.current = Array.from({ length: orderLength }, (_, i) => {
      const el = queueRowRefs.current.get(i);
      const rect = el?.getBoundingClientRect();
      return { pos: i, top: rect?.top ?? 0, height: rect?.height ?? 0 };
    });
    setQueueDragPos(pos);
    setQueueOverIndex(pos);
  }
  function queueDragMove(clientY: number) {
    const rects = queueRectsRef.current;
    let idx = rects.length - 1;
    for (let i = 0; i < rects.length; i++) {
      if (clientY < rects[i].top + rects[i].height / 2) {
        idx = i;
        break;
      }
    }
    setQueueOverIndex(idx);
  }
  function endQueueDrag() {
    if (queueDragPos !== null && queueOverIndex !== null && queueDragPos !== queueOverIndex) {
      onReorderQueue(queueDragPos, queueOverIndex);
    }
    setQueueDragPos(null);
    setQueueOverIndex(null);
  }
  const queueDragMoveRef = useRef(queueDragMove);
  queueDragMoveRef.current = queueDragMove;
  const endQueueDragRef = useRef(endQueueDrag);
  endQueueDragRef.current = endQueueDrag;

  useEffect(() => {
    if (queueDragPos === null) return;
    const onMove = (e: PointerEvent) => queueDragMoveRef.current(e.clientY);
    const onUp = () => endQueueDragRef.current();
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueDragPos]);

  if (!track) return null;

  function seekFromPointer(clientX: number) {
    const el = seekBarRef.current;
    if (!el || duration <= 0) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeekTo(frac * duration);
  }

  function onSeekBarDown(e: React.PointerEvent) {
    scrubbing.current = true;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    seekFromPointer(e.clientX);
  }
  function onSeekBarMove(e: React.PointerEvent) {
    if (!scrubbing.current) return;
    seekFromPointer(e.clientX);
  }
  function onSeekBarUp() {
    scrubbing.current = false;
  }

  const isDefaultSpeed = folderDefaultSpeed !== null && Math.abs(folderDefaultSpeed - speed) < 0.001;
  function toggleFolderDefaultSpeed() {
    if (isDefaultSpeed) {
      clearFolderSpeed(track!.folder);
      setFolderDefaultSpeedState(null);
    } else {
      setFolderSpeed(track!.folder, speed);
      setFolderDefaultSpeedState(speed);
    }
  }

  const pct = duration > 0 ? (time / duration) * 100 : 0;
  const hasQueue = order.length > 1;

  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true;
    startX.current = e.clientX;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    setDragX(e.clientX - startX.current);
  }
  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragX <= -SWIPE_THRESHOLD) {
      vibrate(15);
      onNext();
    } else if (dragX >= SWIPE_THRESHOLD) {
      vibrate(15);
      onPrev();
    }
    setDragX(0);
  }

  return (
    <>
      {/* Mini bar */}
      <div
        className={`fixed right-3 left-3 z-40 mx-auto flex h-16 max-w-xl items-center gap-3 overflow-hidden rounded-full bg-surface-container-high/90 px-3 shadow-[0_4px_24px_rgba(0,0,0,0.3)] backdrop-blur-2xl transition-all duration-[400ms] ease-brand ${
          open ? "pointer-events-none translate-y-[calc(100%+2rem)] opacity-0" : ""
        }`}
        style={{
          bottom: `calc(env(safe-area-inset-bottom, 0px) + ${lifted ? "5.5rem" : "1rem"})`
        }}
      >
        <button
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => setOpen(true)}
          aria-label="Open player"
        >
          <span className="relative flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <span className="material-symbols-outlined is-filled text-xl">headset</span>
            <span
              className={`absolute right-0.5 bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-container-high bg-primary ${
                playing ? "animate-pulse" : ""
              }`}
            />
          </span>
          <span className="min-w-0">
            <p className="truncate text-sm leading-tight font-medium text-on-surface">
              {track.title}
            </p>
            <span className="mt-0.5 flex items-center gap-1.5">
              <span className="flex h-2.5 items-end gap-0.5" aria-hidden="true">
                {[10, 7].map((h, i) => (
                  <span
                    key={i}
                    className={`w-0.5 rounded-full bg-primary ${playing ? "animate-pulse" : ""}`}
                    style={{ height: h, animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </span>
              <span className="text-[10px] font-medium text-on-surface-variant">
                {playing ? "Playing" : "Paused"}
              </span>
            </span>
          </span>
        </button>
        <button
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary text-on-primary shadow-md transition-transform active:scale-90"
          onClick={onToggle}
          aria-label={playing ? "Pause" : "Play"}
        >
          <span className="material-symbols-outlined is-filled text-2xl">
            {playing ? "pause" : "play_arrow"}
          </span>
        </button>
        <div className="absolute right-6 bottom-0 left-6 h-0.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Full sheet */}
      <div
        role="dialog"
        aria-label="Now playing"
        className={`fixed inset-0 z-50 mx-auto flex max-w-xl flex-col overflow-y-auto bg-bg transition-transform duration-[450ms] ease-brand ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 26px)"
        }}
      >
        <header className="flex h-16 items-center justify-center px-5">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-surface-high active:scale-90"
            onClick={() => setOpen(false)}
            aria-label="Close player"
          >
            <span className="material-symbols-outlined text-3xl">keyboard_arrow_down</span>
          </button>
        </header>

        <div className="flex flex-1 flex-col px-6 pb-6">
          <div className="flex flex-grow flex-col items-center justify-center py-6">
            <div
              className="relative aspect-square w-full max-w-[320px] touch-none overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-container to-secondary-container shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
              onPointerDown={hasQueue ? onPointerDown : undefined}
              onPointerMove={hasQueue ? onPointerMove : undefined}
              onPointerUp={hasQueue ? onPointerUp : undefined}
              onPointerCancel={hasQueue ? onPointerUp : undefined}
              style={{
                transform: `translateX(${dragX}px)`,
                transition: dragging.current ? "none" : "transform 0.3s var(--ease-brand)"
              }}
            >
              <div className="flex h-full items-center justify-center text-7xl">🎧</div>
              <div className="absolute inset-x-0 bottom-0 flex h-24 items-end justify-center gap-1 px-8 pb-8">
                {WAVE_HEIGHTS.map((h, i) => (
                  <div
                    key={i}
                    className={`waveform-bar w-1 rounded-full bg-white/80 ${
                      playing ? "waveform-bar--live" : ""
                    }`}
                    style={{ height: h * 2, animationDelay: `${(i % 5) * 0.12}s` }}
                  />
                ))}
              </div>
            </div>
            {hasQueue && (
              <p className="mt-2 text-[11px] text-on-surface-dim">Swipe to skip</p>
            )}
          </div>

          <div className="mb-8 text-center">
            <h2 className="font-headline text-2xl text-on-surface">{track.title}</h2>
            <p className="mt-1 text-on-surface-variant capitalize opacity-90">
              {track.folder}
            </p>
          </div>

          <div className="mb-6 space-y-2">
            <div
              ref={seekBarRef}
              tabIndex={0}
              className="relative flex h-10 w-full touch-none items-center gap-[2px]"
              onPointerDown={onSeekBarDown}
              onPointerMove={onSeekBarMove}
              onPointerUp={onSeekBarUp}
              onPointerCancel={onSeekBarUp}
              onKeyDown={(e) => {
                if (e.key === "ArrowLeft") onSeekBy(-5);
                else if (e.key === "ArrowRight") onSeekBy(5);
              }}
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={duration || 0}
              aria-valuenow={Math.min(time, duration || 0)}
            >
              {bars.map((h, i) => {
                const barPct = (i / (bars.length - 1)) * 100;
                const filled = barPct <= pct;
                return (
                  <div
                    key={i}
                    className={`pointer-events-none flex-1 rounded-full transition-colors ${filled ? "bg-primary" : "bg-surface-high"}`}
                    style={{ height: `${h * 100}%` }}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-on-surface-dim">
              <span>{fmtTime(time)}</span>
              <span>{fmtTime(duration)}</span>
            </div>
          </div>

          <div className="mb-6 flex items-center justify-between px-1">
            <button
              className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-high active:scale-90 disabled:opacity-30"
              onClick={onPrev}
              disabled={!hasQueue}
              aria-label="Previous track"
            >
              <span className="material-symbols-outlined text-3xl">skip_previous</span>
            </button>
            <button
              className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-high active:scale-90"
              onClick={() => onSeekBy(-15)}
              aria-label="Back 15 seconds"
            >
              <SkipIcon direction="back" />
            </button>
            <button
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg transition-all hover:scale-105 active:scale-95"
              onClick={onToggle}
              aria-label={playing ? "Pause" : "Play"}
            >
              <span className="material-symbols-outlined is-filled text-[36px]">
                {playing ? "pause" : "play_arrow"}
              </span>
            </button>
            <button
              className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-high active:scale-90"
              onClick={() => onSeekBy(15)}
              aria-label="Forward 15 seconds"
            >
              <SkipIcon direction="forward" />
            </button>
            <button
              className="flex h-11 w-11 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-high active:scale-90 disabled:opacity-30"
              onClick={onNext}
              disabled={!hasQueue}
              aria-label="Next track"
            >
              <span className="material-symbols-outlined text-3xl">skip_next</span>
            </button>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-white/5 bg-surface-container-low px-2 py-4">
            <button
              className="rounded-full px-3 py-1.5 text-sm font-bold text-on-surface transition-colors hover:bg-surface-high active:scale-90"
              onClick={() => setSheet("speed")}
              aria-label="Playback speed"
            >
              {speed}×
            </button>
            <button
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-high active:scale-90 ${
                shuffle ? "text-primary" : "text-on-surface"
              }`}
              onClick={onToggleShuffle}
              aria-label={shuffle ? "Disable shuffle" : "Enable shuffle"}
              aria-pressed={shuffle}
            >
              <span className="material-symbols-outlined text-xl">shuffle</span>
            </button>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-high active:scale-90 disabled:opacity-30"
              onClick={() => setSheet("queue")}
              disabled={queue.length === 0}
              aria-label="Show queue"
            >
              <span className="material-symbols-outlined text-xl">queue_music</span>
            </button>
            <button
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-high active:scale-90 ${
                loop !== "off" ? "text-primary" : "text-on-surface"
              }`}
              onClick={onCycleLoop}
              aria-label={`Repeat: ${loop}`}
            >
              <span className="material-symbols-outlined text-xl">
                {loop === "one" ? "repeat_one" : "repeat"}
              </span>
            </button>
            <button
              className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-surface-high active:scale-90 ${
                sleepLeft !== null ? "text-primary" : "text-on-surface"
              }`}
              onClick={() => setSheet("sleep")}
              aria-label="Sleep timer"
            >
              <span className="material-symbols-outlined text-xl">timer</span>
            </button>
          </div>
          {sleepLeft !== null && (
            <p className="mt-3 text-center text-xs text-primary">
              Pausing in {fmtTime(sleepLeft)}
            </p>
          )}
        </div>
      </div>

      {/* Bottom sheets */}
      {sheet && (
        <div
          className="fixed inset-0 z-[90] flex items-end bg-black/50 backdrop-blur-sm"
          onClick={() => setSheet(null)}
        >
          <div
            className="mx-auto flex max-h-[75vh] w-full max-w-xl flex-col rounded-t-3xl bg-surface-container-low shadow-2xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-outline-variant" />
            </div>

            {sheet === "speed" && (
              <>
                <h3 className="font-headline py-3 text-center text-base text-on-surface">Speed</h3>
                <p className="mb-4 text-center text-3xl font-bold text-on-surface">{speed}×</p>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.05}
                  value={speed}
                  onChange={(e) => onSpeed(Number(e.target.value))}
                  aria-label="Playback speed slider"
                  className="mx-6 w-[calc(100%-3rem)]"
                />
                <div className="mx-6 mb-4 flex justify-between text-[11px] text-on-surface-variant">
                  <span>0.5</span>
                  <span>1</span>
                  <span>1.5</span>
                  <span>2</span>
                </div>
                <div className="mb-2 flex items-center justify-center gap-2 px-6 pb-4">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      className={`flex-1 rounded-full py-2.5 text-sm font-bold transition-colors ${
                        speed === s ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface"
                      }`}
                      onClick={() => onSpeed(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <button
                  className={`mx-6 mb-4 flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition-colors ${
                    isDefaultSpeed
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-white/5 bg-surface-container-high text-on-surface-variant"
                  }`}
                  onClick={toggleFolderDefaultSpeed}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {isDefaultSpeed ? "check_circle" : "bookmark_add"}
                  </span>
                  {isDefaultSpeed
                    ? `Default for "${folderLabel(track.folder)}" — tap to unset`
                    : `Set as default for "${folderLabel(track.folder)}"`}
                </button>
              </>
            )}

            {sheet === "sleep" && (
              <>
                <h3 className="py-3 text-center text-base font-semibold text-on-surface">
                  Sleep timer
                </h3>
                <ul className="pb-2">
                  {sleepLeft !== null && (
                    <li>
                      <button
                        className="flex w-full items-center justify-center px-6 py-4 text-base font-semibold text-error"
                        onClick={() => {
                          onSleep(null);
                          setSheet(null);
                        }}
                      >
                        Turn off timer
                      </button>
                    </li>
                  )}
                  {SLEEPS.map((m) => (
                    <li key={m}>
                      <button
                        className="flex w-full items-center justify-center px-6 py-4 text-base text-on-surface hover:bg-white/5"
                        onClick={() => {
                          onSleep(m);
                          setSheet(null);
                        }}
                      >
                        {m < 60 ? `${m} minutes` : "1 hour"}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {sheet === "queue" && (
              <>
                <h3 className="py-3 text-center text-base font-semibold text-on-surface">
                  Up Next {shuffle && <span className="text-on-surface-dim">· Shuffled</span>}
                </h3>
                {(() => {
                  const currentQueueIdx = order[position];
                  const displayOrder =
                    queueDragPos !== null && queueOverIndex !== null
                      ? (() => {
                          const next = [...order];
                          const [item] = next.splice(queueDragPos, 1);
                          next.splice(queueOverIndex, 0, item);
                          return next;
                        })()
                      : order;
                  return (
                    <ul className="overflow-y-auto pb-2">
                      {displayOrder.map((queueIdx, pos) => {
                        const t = queue[queueIdx];
                        const isCurrent = queueIdx === currentQueueIdx;
                        const isDragging = queueDragPos !== null && order[queueDragPos] === queueIdx;
                        return (
                          <li
                            key={`${t.id}-${queueIdx}`}
                            ref={(el) => {
                              if (el) queueRowRefs.current.set(pos, el);
                              else queueRowRefs.current.delete(pos);
                            }}
                            className={`flex w-full items-center gap-1 px-3 hover:bg-white/5 ${
                              isCurrent ? "text-primary" : "text-on-surface"
                            } ${isDragging ? "opacity-50" : ""}`}
                          >
                            <button
                              className="flex h-10 w-8 flex-none touch-none items-center justify-center text-on-surface-dim active:cursor-grabbing"
                              onPointerDown={(e) => {
                                e.preventDefault();
                                beginQueueDrag(pos, order.length);
                              }}
                              aria-label={`Drag to reorder ${t.title}`}
                            >
                              <span className="material-symbols-outlined text-lg">drag_indicator</span>
                            </button>
                            <button
                              className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-2 text-left"
                              onClick={() => {
                                onJumpTo(pos);
                                setSheet(null);
                              }}
                            >
                              <span className="material-symbols-outlined w-5 text-lg">
                                {isCurrent && playing ? "graphic_eq" : "music_note"}
                              </span>
                              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                                {t.title}
                              </span>
                              <span className="flex-none text-xs text-on-surface-dim">
                                {fmtTime(t.duration)}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
