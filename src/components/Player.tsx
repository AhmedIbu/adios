import { useState } from "react";
import type { PlayerState } from "../hooks/usePlayer";
import { fmtTime } from "../lib/types";

interface Props {
  state: PlayerState;
  onToggle: () => void;
  onSeekBy: (delta: number) => void;
  onSeekTo: (t: number) => void;
  onSpeed: (s: number) => void;
  onSleep: (minutes: number | null) => void;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];
const SLEEPS = [15, 30, 60];
const WAVE_HEIGHTS = [10, 18, 26, 15, 22, 30, 14, 20];

export function Player({ state, onToggle, onSeekBy, onSeekTo, onSpeed, onSleep }: Props) {
  const [open, setOpen] = useState(false);
  const { track, playing, time, duration, speed, sleepLeft } = state;
  if (!track) return null;

  const pct = duration > 0 ? (time / duration) * 100 : 0;

  return (
    <>
      {/* Mini bar */}
      <div
        className={`fixed right-3 left-3 z-40 mx-auto flex h-16 max-w-xl items-center justify-between overflow-hidden rounded-[24px] border border-white/10 px-3 shadow-[0_15px_40px_rgba(0,0,0,0.5)] ring-1 ring-white/5 backdrop-blur-2xl transition-all duration-[400ms] ease-brand ${
          open ? "pointer-events-none translate-y-[calc(100%+2rem)] opacity-0" : ""
        }`}
        style={{
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
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
            <div className="relative aspect-square w-full max-w-[320px] overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-container to-secondary-container shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
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

          <div className="mb-8 flex items-center justify-center gap-8">
            <button
              className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-extrabold text-primary transition-colors hover:bg-surface-high active:scale-90"
              onClick={() => onSeekBy(-15)}
              aria-label="Back 15 seconds"
            >
              −15s
            </button>
            <button
              className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg shadow-black/30 transition-all hover:brightness-110 active:scale-95"
              onClick={onToggle}
              aria-label={playing ? "Pause" : "Play"}
            >
              <span className="material-symbols-outlined is-filled text-[44px]">
                {playing ? "pause" : "play_arrow"}
              </span>
            </button>
            <button
              className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-extrabold text-primary transition-colors hover:bg-surface-high active:scale-90"
              onClick={() => onSeekBy(15)}
              aria-label="Forward 15 seconds"
            >
              +15s
            </button>
          </div>

          <div className="mb-6 flex items-center gap-3">
            <span className="w-14 flex-none text-xs font-extrabold tracking-wide text-on-surface-dim uppercase">
              Speed
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                    speed === s
                      ? "bg-primary text-on-primary"
                      : "bg-surface-high text-on-surface-dim"
                  }`}
                  onClick={() => onSpeed(s)}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="w-14 flex-none text-xs font-extrabold tracking-wide text-on-surface-dim uppercase">
              Sleep
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SLEEPS.map((m) => (
                <button
                  key={m}
                  className="rounded-full bg-surface-high px-3 py-1.5 text-xs font-bold text-on-surface-dim transition-colors"
                  onClick={() => onSleep(m)}
                >
                  {m}m
                </button>
              ))}
              <button
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                  sleepLeft === null
                    ? "bg-primary text-on-primary"
                    : "bg-surface-high text-on-surface-dim"
                }`}
                onClick={() => onSleep(null)}
              >
                off
              </button>
            </div>
          </div>
          {sleepLeft !== null && (
            <p className="mt-3 text-center text-xs text-primary">
              Pausing in {fmtTime(sleepLeft)}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
