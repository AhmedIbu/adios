import { useEffect, useRef, useState, useCallback } from "react";
import type { Track } from "../lib/types";
import { playableUrl } from "../lib/offline";
import { savePosition } from "../lib/supabase";

export interface PlayerState {
  track: Track | null;
  playing: boolean;
  time: number;
  duration: number;
  speed: number;
  sleepLeft: number | null; // seconds remaining, null = off
}

export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const lastSaveRef = useRef(0);
  const sleepUntilRef = useRef<number | null>(null);

  const [state, setState] = useState<PlayerState>({
    track: null,
    playing: false,
    time: 0,
    duration: 0,
    speed: 1,
    sleepLeft: null
  });

  // Lazily create the single <audio> element.
  const audio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      const a = new Audio();
      a.preload = "metadata";
      audioRef.current = a;

      a.addEventListener("timeupdate", () => {
        setState((s) => ({ ...s, time: a.currentTime, duration: a.duration || s.duration }));
        // Throttled resume-position save (every 5s, lectures/podcasts need this)
        const now = Date.now();
        if (now - lastSaveRef.current > 5000 && a.currentTime > 0) {
          lastSaveRef.current = now;
          const id = a.dataset.trackId;
          if (id) {
            localStorage.setItem(`pos:${id}`, String(a.currentTime));
            savePosition(id, a.currentTime).catch(() => {});
          }
        }
        // Sleep timer
        if (sleepUntilRef.current !== null) {
          const left = Math.max(0, Math.round((sleepUntilRef.current - Date.now()) / 1000));
          setState((s) => ({ ...s, sleepLeft: left }));
          if (left === 0) {
            a.pause();
            sleepUntilRef.current = null;
            setState((s) => ({ ...s, sleepLeft: null }));
          }
        }
      });
      a.addEventListener("play", () => setState((s) => ({ ...s, playing: true })));
      a.addEventListener("pause", () => setState((s) => ({ ...s, playing: false })));
      a.addEventListener("ended", () => {
        const id = a.dataset.trackId;
        if (id) {
          localStorage.setItem(`pos:${id}`, "0");
          savePosition(id, 0).catch(() => {});
        }
      });
    }
    return audioRef.current;
  }, []);

  const play = useCallback(
    async (track: Track) => {
      const a = audio();
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      const { url, local } = await playableUrl(track);
      if (local) blobUrlRef.current = url;

      a.src = url;
      a.dataset.trackId = track.id;
      a.playbackRate = state.speed;

      // Resume: prefer freshest local position, fall back to cloud value.
      const localPos = parseFloat(localStorage.getItem(`pos:${track.id}`) ?? "");
      const resumeAt = isFinite(localPos) ? Math.max(localPos, track.position) : track.position;
      if (resumeAt > 3 && resumeAt < (track.duration || Infinity) - 5) {
        a.currentTime = resumeAt;
      }

      setState((s) => ({ ...s, track, time: a.currentTime, duration: track.duration }));
      await a.play();

      // Lock-screen controls (iOS honors these in a Home Screen PWA)
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: "Pocket Audio",
          album: track.folder
        });
        navigator.mediaSession.setActionHandler("play", () => a.play());
        navigator.mediaSession.setActionHandler("pause", () => a.pause());
        navigator.mediaSession.setActionHandler("seekbackward", () => {
          a.currentTime = Math.max(0, a.currentTime - 15);
        });
        navigator.mediaSession.setActionHandler("seekforward", () => {
          a.currentTime = Math.min(a.duration || Infinity, a.currentTime + 15);
        });
        navigator.mediaSession.setActionHandler("seekto", (d) => {
          if (d.seekTime != null) a.currentTime = d.seekTime;
        });
      }
    },
    [audio, state.speed]
  );

  const toggle = useCallback(() => {
    const a = audio();
    if (!a.src) return;
    a.paused ? a.play() : a.pause();
  }, [audio]);

  const seekBy = useCallback(
    (delta: number) => {
      const a = audio();
      a.currentTime = Math.min(Math.max(0, a.currentTime + delta), a.duration || Infinity);
    },
    [audio]
  );

  const seekTo = useCallback(
    (t: number) => {
      audio().currentTime = t;
    },
    [audio]
  );

  const setSpeed = useCallback(
    (speed: number) => {
      audio().playbackRate = speed;
      setState((s) => ({ ...s, speed }));
    },
    [audio]
  );

  const setSleep = useCallback((minutes: number | null) => {
    if (minutes === null) {
      sleepUntilRef.current = null;
      setState((s) => ({ ...s, sleepLeft: null }));
    } else {
      sleepUntilRef.current = Date.now() + minutes * 60_000;
      setState((s) => ({ ...s, sleepLeft: minutes * 60 }));
    }
  }, []);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  return { state, play, toggle, seekBy, seekTo, setSpeed, setSleep };
}
