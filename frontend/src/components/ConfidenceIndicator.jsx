export default function ConfidenceIndicator({ score }) {
  const level = score >= 75 ? "high" : score >= 40 ? "medium" : "low";
  const CONFIG = {
    high: { label: "High confidence", bar: "bg-teal", text: "text-teal-700" },
    medium: { label: "Medium confidence — please double-check", bar: "bg-severity-mild", text: "text-severity-mild" },
    low: { label: "Low confidence — please double-check every field", bar: "bg-severity-severe", text: "text-severity-severe" }
  };
  const cfg = CONFIG[level];
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</span>
        <span className="text-sm text-gray-500">{Math.round(score)}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${cfg.bar} rounded-full transition-all`} style={{ width: `${Math.max(score, 4)}%` }} />
      </div>
    </div>
  );
}
