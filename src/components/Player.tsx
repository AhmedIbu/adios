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

export function Player({ state, onToggle, onSeekBy, onSeekTo, onSpeed, onSleep }: Props) {
  const [open, setOpen] = useState(false);
  const { track, playing, time, duration, speed, sleepLeft } = state;
  if (!track) return null;

  const pct = duration > 0 ? (time / duration) * 100 : 0;

  return (
    <>
      {/* Mini bar */}
      <div className={`mini ${open ? "mini--hidden" : ""}`}>
        <button className="mini__body" onClick={() => setOpen(true)} aria-label="Open player">
          <span className="mini__disc" aria-hidden="true">
            🎧
          </span>
          <span className="mini__text">
            <span className="mini__title">{track.title}</span>
            <span className="mini__time">
              {fmtTime(time)} / {fmtTime(duration)}
            </span>
          </span>
        </button>
        <button className="mini__toggle" onClick={onToggle} aria-label={playing ? "Pause" : "Play"}>
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="mini__bar" aria-hidden="true">
          <div className="mini__bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Full sheet */}
      <div className={`sheet ${open ? "sheet--open" : ""}`} role="dialog" aria-label="Now playing">
        <button className="sheet__close" onClick={() => setOpen(false)} aria-label="Close player">
          ▾
        </button>

        <div className="sheet__art" aria-hidden="true">
          <div className={`sheet__wave ${playing ? "sheet__wave--live" : ""}`}>
            {Array.from({ length: 14 }).map((_, i) => (
              <i key={i} style={{ animationDelay: `${(i % 5) * 0.12}s` }} />
            ))}
          </div>
        </div>

        <h2 className="sheet__title">{track.title}</h2>
        <p className="sheet__folder">{track.folder}</p>

        <input
          className="sheet__scrub"
          type="range"
          min={0}
          max={duration || 0}
          step={1}
          value={Math.min(time, duration || 0)}
          onChange={(e) => onSeekTo(Number(e.target.value))}
          aria-label="Seek"
        />
        <div className="sheet__times">
          <span>{fmtTime(time)}</span>
          <span>{fmtTime(duration)}</span>
        </div>

        <div className="sheet__controls">
          <button className="sheet__skip" onClick={() => onSeekBy(-15)}>
            −15s
          </button>
          <button className="sheet__play" onClick={onToggle} aria-label={playing ? "Pause" : "Play"}>
            {playing ? "❚❚" : "▶"}
          </button>
          <button className="sheet__skip" onClick={() => onSeekBy(15)}>
            +15s
          </button>
        </div>

        <div className="sheet__row">
          <span className="sheet__row-label">Speed</span>
          <div className="sheet__pills">
            {SPEEDS.map((s) => (
              <button
                key={s}
                className={`sheet__pill ${speed === s ? "sheet__pill--on" : ""}`}
                onClick={() => onSpeed(s)}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        <div className="sheet__row">
          <span className="sheet__row-label">Sleep</span>
          <div className="sheet__pills">
            {SLEEPS.map((m) => (
              <button
                key={m}
                className={`sheet__pill ${
                  sleepLeft !== null && Math.ceil(sleepLeft / 60) <= m && sleepLeft > (m - 15) * 60
                    ? ""
                    : ""
                }`}
                onClick={() => onSleep(m)}
              >
                {m}m
              </button>
            ))}
            <button
              className={`sheet__pill ${sleepLeft === null ? "sheet__pill--on" : ""}`}
              onClick={() => onSleep(null)}
            >
              off
            </button>
          </div>
        </div>
        {sleepLeft !== null && (
          <p className="sheet__sleep-note">Pausing in {fmtTime(sleepLeft)}</p>
        )}
      </div>
    </>
  );
}
