export default function DashboardCard({ icon: Icon, label, value, tone = "neutral" }) {
  const toneStyles = {
    neutral: "bg-teal-50 text-teal-600",
    warning: "bg-severity-moderateBg text-severity-moderate",
    danger: "bg-severity-severeBg text-severity-severe"
  };
  return (
    <div className="bg-warm-card border border-warm-border rounded-2xl p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${toneStyles[tone]}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-gray-800 leading-none">{value}</p>
        <p className="text-sm text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  );
}
