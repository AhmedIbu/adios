import { useMemo } from "react";
import { upcomingEvents } from "../../lib/content/events";

export function SalahIslamicEvents() {
  const events = useMemo(() => upcomingEvents(new Date(), 6), []);

  return (
    <div className="rounded-3xl border border-white/8 bg-surface-glass p-6 backdrop-blur-2xl">
      <h3 className="mb-1 text-lg font-bold text-on-surface">Upcoming events</h3>
      <p className="mb-4 text-xs text-on-surface-dim">
        Estimated from the calculated Hijri calendar — actual observance may shift by a day based
        on local moonsighting.
      </p>
      <div className="space-y-2">
        {events.map((e) => (
          <div
            key={e.name}
            className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3"
          >
            <div>
              <p className="text-sm font-semibold text-on-surface">{e.name}</p>
              <p className="text-xs text-on-surface-dim">{e.note}</p>
            </div>
            <p className="text-xs font-bold text-primary">
              {e.daysAway === 0 ? "Today" : `in ${e.daysAway}d`}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
