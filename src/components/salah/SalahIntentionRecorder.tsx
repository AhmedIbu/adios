import { useEffect, useRef, useState } from "react";

interface Props {
  onChange: (value: { text: string; audioBlob: Blob | null }) => void;
}

const canRecord = typeof window !== "undefined" && typeof MediaRecorder !== "undefined";

export function SalahIntentionRecorder({ onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    onChange({ text: mode === "text" ? text : "", audioBlob: mode === "voice" ? audioBlob : null });
    // onChange intentionally excluded — parent passes a fresh callback per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, audioBlob, mode]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function startRecording() {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch (e) {
      console.error(e);
      setMicError("Couldn't access the microphone — try a typed intention instead.");
      setMode("text");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  function reRecord() {
    setAudioBlob(null);
    setAudioUrl(null);
  }

  if (!open) {
    return (
      <button
        className="mt-5 flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10"
        onClick={() => setOpen(true)}
      >
        <span className="text-sm font-semibold text-on-surface">Add an intention</span>
        <span className="material-symbols-outlined text-on-surface-dim">add</span>
      </button>
    );
  }

  return (
    <div className="mt-5 rounded-2xl border border-white/8 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-on-surface">Intention</span>
        {canRecord && (
          <div className="flex items-center rounded-full bg-black/20 p-0.5">
            {(["text", "voice"] as const).map((m) => (
              <button
                key={m}
                className={`rounded-full px-3 py-1 text-[10px] font-extrabold tracking-widest uppercase transition-colors ${
                  mode === m ? "bg-primary text-on-primary" : "text-on-surface-dim"
                }`}
                onClick={() => setMode(m)}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === "text" ? (
        <textarea
          className="w-full resize-none rounded-xl border border-white/10 bg-surface-high p-3 text-sm text-on-surface placeholder:text-on-surface-dim/50"
          rows={3}
          placeholder="What are you asking Allah for?"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      ) : (
        <div className="flex flex-col items-center gap-3 py-2">
          {!audioUrl ? (
            <button
              className={`flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
                recording ? "bg-error text-on-primary" : "bg-primary text-on-primary"
              }`}
              onClick={recording ? stopRecording : startRecording}
              aria-label={recording ? "Stop recording" : "Start recording"}
            >
              <span className="material-symbols-outlined is-filled text-2xl">
                {recording ? "stop" : "mic"}
              </span>
            </button>
          ) : (
            <div className="flex w-full items-center gap-3">
              <audio className="h-9 flex-1" controls src={audioUrl} />
              <button
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/5 text-on-surface-dim"
                onClick={reRecord}
                aria-label="Re-record"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
              </button>
            </div>
          )}
          <p className="text-xs text-on-surface-dim">
            {recording ? "Recording…" : audioUrl ? "Tap play to review" : "Tap to record"}
          </p>
        </div>
      )}
      {micError && <p className="mt-2 text-xs text-error">{micError}</p>}
    </div>
  );
}
