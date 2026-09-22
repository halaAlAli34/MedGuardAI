import { Pill, Trash2, Pencil, UserRound } from "lucide-react";

export default function MedicationCard({ medication, onEdit, onDelete, readOnly, deleting = false }) {
  const isExpired = medication.end_date && new Date(medication.end_date) < new Date();

  return (
    <div className={`bg-warm-card border border-warm-border rounded-2xl p-4 flex items-start gap-3.5 transition-opacity ${deleting ? "opacity-50 pointer-events-none" : ""}`}>
      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
        <Pill size={19} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-gray-800">{medication.name}</h3>
          {medication.source === "ai_scan" && (
            <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">Scanned</span>
          )}
          {isExpired && (
            <span className="text-xs font-medium text-severity-mild bg-severity-mildBg px-2 py-0.5 rounded-full">Expired</span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-0.5">{medication.dosage} · {medication.frequency}</p>
        {medication.prescribing_doctor && (
          <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
            <UserRound size={13} /> {medication.prescribing_doctor}
          </p>
        )}
        {isExpired && (
          <p className="text-xs text-severity-mild mt-1">
            End date passed on {new Date(medication.end_date).toLocaleDateString()} — no longer checked for new interactions.
          </p>
        )}
      </div>
      {!readOnly && (
        <div className="flex gap-1 shrink-0">
          <button onClick={() => onEdit(medication)} aria-label="Edit medication" className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg">
            <Pencil size={16} />
          </button>
          <button onClick={() => onDelete(medication)} disabled={deleting} aria-label="Delete medication" className="p-2 text-gray-400 hover:text-severity-severe hover:bg-severity-severeBg rounded-lg disabled:opacity-50">
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
