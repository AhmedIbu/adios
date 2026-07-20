import { useEffect, useRef, useState, useCallback } from "react";
import type { Track } from "../lib/types";
import { playableUrl } from "../lib/offline";
import { savePosition } from "../lib/supabase";
import { vibrate } from "../lib/haptics";

export type LoopMode = "off" | "all" | "one";

export interface PlayerState {
  track: Track | null;
  playing: boolean;
  time: number;
  duration: number;
  speed: number;
  sleepLeft: number | null; // seconds remaining, null = off
  queue: Track[]; // original order as handed to playQueue
  order: number[]; // indices into queue, representing play order (post-shuffle)
  position: number; // index into `order` pointing at the current track; -1 if none
  shuffle: boolean;
  loop: LoopMode;
}

function shuffledIndices(length: number): number[] {
  const idxs = Array.from({ length }, (_, i) => i);
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
  }
  return idxs;
}

/** @param onTrackChange fires whenever a track actually starts playing (initial play, next/prev, shuffle jump, auto-advance, lock-screen). */
export function usePlayer(onTrackChange?: (t: Track) => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const lastSaveRef = useRef(0);
  const sleepUntilRef = useRef<number | null>(null);
  const onTrackChangeRef = useRef(onTrackChange);
  onTrackChangeRef.current = onTrackChange;

  const [state, setState] = useState<PlayerState>({
    track: null,
    playing: false,
    time: 0,
    duration: 0,
    speed: 1,
    sleepLeft: null,
    queue: [],
    order: [],
    position: -1,
    shuffle: false,
    loop: "off"
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const loadAndPlayRef = useRef<(track: Track, position: number) => void>(() => {});
  const nextRef = useRef<() => void>(() => {});
  const prevRef = useRef<() => void>(() => {});

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
            vibrate([30, 50, 30]);
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
        const s = stateRef.current;
        if (s.loop === "one") {
          a.currentTime = 0;
          a.play();
          return;
        }
        let pos = s.position + 1;
        if (pos >= s.order.length) {
          if (s.loop === "all") pos = 0;
          else return; // stop — end of queue
        }
        const track = s.queue[s.order[pos]];
        if (track) loadAndPlayRef.current(track, pos);
      });
    }
    return audioRef.current;
  }, []);

  const loadAndPlay = useCallback(
    async (track: Track, position: number) => {
      const a = audio();
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      const { url, local } = await playableUrl(track);
      if (local) blobUrlRef.current = url;

      a.src = url;
      a.dataset.trackId = track.id;
      a.playbackRate = stateRef.current.speed;

      // Resume: prefer freshest local position, fall back to cloud value.
      const localPos = parseFloat(localStorage.getItem(`pos:${track.id}`) ?? "");
      const resumeAt = isFinite(localPos) ? Math.max(localPos, track.position) : track.position;
      if (resumeAt > 3 && resumeAt < (track.duration || Infinity) - 5) {
        a.currentTime = resumeAt;
      } else {
        a.currentTime = 0;
      }

      setState((s) => ({ ...s, track, position, time: a.currentTime, duration: track.duration }));
      await a.play();
      onTrackChangeRef.current?.(track);

      // Lock-screen controls (iOS honors these in a Home Screen PWA)
      if ("mediaSession" in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title,
          artist: "Adios",
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
        navigator.mediaSession.setActionHandler("previoustrack", () => prevRef.current());
        navigator.mediaSession.setActionHandler("nexttrack", () => nextRef.current());
      }
    },
    [audio]
  );
  loadAndPlayRef.current = loadAndPlay;

  /** Start playing `tracks[startIndex]` with the rest of `tracks` as the queue for next/prev. */
  const playQueue = useCallback(
    (tracks: Track[], startIndex: number) => {
      const shuffle = stateRef.current.shuffle;
      const order = shuffle ? shuffledIndices(tracks.length) : tracks.map((_, i) => i);
      const position = order.indexOf(startIndex);
      setState((s) => ({ ...s, queue: tracks, order }));
      loadAndPlay(tracks[startIndex], position);
    },
    [loadAndPlay]
  );

  /** Play a single track with no queue context (e.g. resuming from a notification). */
  const play = useCallback(
    (track: Track) => {
      playQueue([track], 0);
    },
    [playQueue]
  );

  const next = useCallback(() => {
    const s = stateRef.current;
    if (s.order.length === 0) return;
    let pos = s.position + 1;
    if (pos >= s.order.length) {
      if (s.loop === "all") pos = 0;
      else return;
    }
    const track = s.queue[s.order[pos]];
    if (track) loadAndPlay(track, pos);
  }, [loadAndPlay]);
  nextRef.current = next;

  const prev = useCallback(() => {
    const a = audioRef.current;
    // Scrubbed in more than a few seconds — restart the current track first, like most players.
    if (a && a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    const s = stateRef.current;
    if (s.order.length === 0) return;
    let pos = s.position - 1;
    if (pos < 0) {
      if (s.loop === "all") pos = s.order.length - 1;
      else {
        if (a) a.currentTime = 0;
        return;
      }
    }
    const track = s.queue[s.order[pos]];
    if (track) loadAndPlay(track, pos);
  }, [loadAndPlay]);
  prevRef.current = prev;

  const jumpTo = useCallback(
    (position: number) => {
      const s = stateRef.current;
      const track = s.queue[s.order[position]];
      if (track) loadAndPlay(track, position);
    },
    [loadAndPlay]
  );

  const toggleShuffle = useCallback(() => {
    setState((s) => {
      const shuffle = !s.shuffle;
      const currentQueueIndex = s.order[s.position];
      const order = shuffle ? shuffledIndices(s.queue.length) : s.queue.map((_, i) => i);
      const position = order.indexOf(currentQueueIndex);
      return { ...s, shuffle, order, position };
    });
  }, []);

  const cycleLoop = useCallback(() => {
    setState((s) => ({
      ...s,
      loop: s.loop === "off" ? "all" : s.loop === "all" ? "one" : "off"
    }));
  }, []);

  const toggle = useCallback(() => {
    const a = audio();
    if (!a.src) return;
    vibrate(10);
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

  return {
    state,
    play,
    playQueue,
    next,
    prev,
    jumpTo,
    toggleShuffle,
    cycleLoop,
    toggle,
    seekBy,
    seekTo,
    setSpeed,
    setSleep
  };
}
