export default function LoadingState({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3">
      <div className="w-9 h-9 border-[3px] border-teal-100 border-t-teal rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">{label}</p>
    </div>
  );
}
