import { useRef, useState } from "react";
import type { PlayerState } from "../hooks/usePlayer";
import { fmtTime } from "../lib/types";
import { vibrate } from "../lib/haptics";

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
  onToggleShuffle: () => void;
  onCycleLoop: () => void;
  /** Raise the mini bar clear of a bottom tab bar (e.g. the Salah view). */
  lifted?: boolean;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];
const SLEEPS = [5, 10, 15, 30, 45, 60];
const WAVE_HEIGHTS = [10, 18, 26, 15, 22, 30, 14, 20];
const SWIPE_THRESHOLD = 70;

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

  if (!track) return null;

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
        className={`fixed right-3 left-3 z-40 mx-auto flex h-16 max-w-xl items-center justify-between overflow-hidden rounded-[24px] border border-white/10 px-3 shadow-[0_15px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/5 backdrop-blur-2xl transition-all duration-[400ms] ease-brand ${
          open ? "pointer-events-none translate-y-[calc(100%+2rem)] opacity-0" : ""
        }`}
        style={{
          bottom: `calc(env(safe-area-inset-bottom, 0px) + ${lifted ? "5.5rem" : "1rem"})`,
          backgroundColor: "rgb(45 49 51 / 0.7)",
          backdropFilter: "blur(24px) saturate(180%)"
        }}
      >
        <button
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={() => setOpen(true)}
          aria-label="Open player"
        >
          <span className="relative flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-white/10 bg-primary-container text-lg shadow-lg">
            🎧
            <span
              className={`absolute right-0.5 bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#2d3133] bg-primary ${
                playing ? "animate-pulse" : ""
              }`}
            />
          </span>
          <span className="min-w-0">
            <p className="truncate text-sm leading-tight font-extrabold tracking-tight text-on-surface">
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
              <span className="text-[8px] font-black tracking-[0.1em] text-primary uppercase opacity-90">
                {playing ? "Playing" : "Paused"}
              </span>
            </span>
          </span>
        </button>
        <button
          className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-primary text-on-primary shadow-lg transition-transform active:scale-90"
          onClick={onToggle}
          aria-label={playing ? "Pause" : "Play"}
        >
          <span className="material-symbols-outlined is-filled text-2xl">
            {playing ? "pause" : "play_arrow"}
          </span>
        </button>
        <div className="absolute right-6 bottom-0 left-6 h-0.5 overflow-hidden rounded-full bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-primary to-secondary"
            style={{ width: `${pct}%` }}
          />
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

          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-primary">{track.title}</h2>
            <p className="mt-1 font-medium text-on-surface-dim capitalize opacity-90">
              {track.folder}
            </p>
          </div>

          <div className="mb-6 space-y-2">
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-high">
              <div className="absolute h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              <input
                className="absolute inset-0 z-10 w-full cursor-pointer opacity-0"
                type="range"
                min={0}
                max={duration || 0}
                step={1}
                value={Math.min(time, duration || 0)}
                onChange={(e) => onSeekTo(Number(e.target.value))}
                aria-label="Seek"
              />
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
              className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black shadow-lg shadow-black/30 transition-all hover:brightness-95 active:scale-95"
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

          <div className="flex items-center justify-between px-2">
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
            className="mx-auto flex max-h-[75vh] w-full max-w-xl flex-col rounded-t-3xl bg-[#1a1a1a] shadow-2xl"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            {sheet === "speed" && (
              <>
                <h3 className="py-3 text-center text-base font-semibold text-on-surface">Speed</h3>
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
                  style={{ accentColor: "#fff" }}
                />
                <div className="mx-6 mb-4 flex justify-between text-[11px] text-on-surface-dim">
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
                        speed === s ? "bg-white text-black" : "bg-white/10 text-on-surface"
                      }`}
                      onClick={() => onSpeed(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
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
                <ul className="overflow-y-auto pb-2">
                  {order.map((queueIdx, pos) => {
                    const t = queue[queueIdx];
                    const isCurrent = pos === position;
                    return (
                      <li key={`${t.id}-${pos}`}>
                        <button
                          className={`flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-white/5 ${
                            isCurrent ? "text-primary" : "text-on-surface"
                          }`}
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
