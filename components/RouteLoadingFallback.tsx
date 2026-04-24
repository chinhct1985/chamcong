/** Skeleton nhẹ khi segment đang tải (Next.js `loading.tsx`) — cải thiện cảm nhận khi chuyển trang. */
export function RouteLoadingFallback({
  variant = "default",
}: {
  variant?: "default" | "admin";
}) {
  if (variant === "admin") {
    return (
      <div className="page-shell" role="status" aria-live="polite" aria-label="Đang tải">
        <div className="h-14 w-full animate-pulse bg-blue-600/25" />
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="h-72 max-w-3xl animate-pulse rounded-2xl bg-slate-200/60" />
        </main>
      </div>
    );
  }

  return (
    <div
      className="page-shell flex min-h-[45vh] items-center justify-center px-4 py-16"
      role="status"
      aria-live="polite"
      aria-label="Đang tải"
    >
      <div className="card w-full max-w-md animate-pulse border-blue-100">
        <div className="mb-4 h-3 w-1/3 rounded bg-slate-200" />
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="mt-3 h-4 w-4/5 rounded bg-slate-100" />
        <div className="mt-6 h-10 w-full rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}
