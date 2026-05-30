export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4" role="status" aria-label="Loading">
      <div className="flex items-center gap-3 text-slate-500">
        <span className="inline-block w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
        <span className="font-medium">Loading…</span>
      </div>
    </div>
  )
}
