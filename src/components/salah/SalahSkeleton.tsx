/** Generic pulsing card-stack placeholder used while a tab's data is loading. */
export function SalahSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-4 pb-6" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl"
          style={{ background: "var(--s-surface-container)", height: i === 0 ? "9rem" : "5rem" }}
        />
      ))}
    </div>
  );
}
