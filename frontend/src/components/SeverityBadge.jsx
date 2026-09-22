import { AlertTriangle, AlertOctagon, Info } from "lucide-react";

const CONFIG = {
  mild: { label: "Mild", icon: Info, text: "text-severity-mild", bg: "bg-severity-mildBg" },
  moderate: { label: "Moderate", icon: AlertTriangle, text: "text-severity-moderate", bg: "bg-severity-moderateBg" },
  severe: { label: "Severe", icon: AlertOctagon, text: "text-severity-severe", bg: "bg-severity-severeBg" }
};

export default function SeverityBadge({ severity, size = "md" }) {
  const cfg = CONFIG[severity] || CONFIG.mild;
  const Icon = cfg.icon;
  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5 gap-1" : "text-sm px-2.5 py-1 gap-1.5";
  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${cfg.text} ${cfg.bg} ${sizeClasses}`}>
      <Icon size={size === "sm" ? 12 : 14} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}
