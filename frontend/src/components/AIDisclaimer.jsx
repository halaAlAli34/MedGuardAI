import { Sparkles } from "lucide-react";

export default function AIDisclaimer({ className = "" }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full w-fit ${className}`}>
      <Sparkles size={13} strokeWidth={2.5} />
      <span>AI-generated — not medical advice</span>
    </div>
  );
}
