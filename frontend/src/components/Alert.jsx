import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

const STYLES = {
  error: { icon: AlertCircle, bg: "bg-severity-severeBg", text: "text-severity-severe" },
  warning: { icon: TriangleAlert, bg: "bg-severity-mildBg", text: "text-severity-mild" },
  success: { icon: CheckCircle2, bg: "bg-teal-50", text: "text-teal-700" },
  info: { icon: Info, bg: "bg-blue-50", text: "text-blue-700" }
};

export default function Alert({ type = "info", children, onDismiss }) {
  const cfg = STYLES[type];
  const Icon = cfg.icon;
  return (
    <div className={`flex items-start gap-2.5 rounded-xl px-4 py-3 ${cfg.bg} ${cfg.text}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1 text-sm font-medium">{children}</div>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss" className="shrink-0">
          <X size={16} />
        </button>
      )}
    </div>
  );
}
