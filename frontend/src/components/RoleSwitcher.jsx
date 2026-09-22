export default function RoleSwitcher({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {["patient", "caregiver"].map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={`py-2.5 rounded-xl font-semibold text-sm capitalize border transition-colors ${
            value === r ? "bg-teal text-white border-teal" : "bg-white text-gray-600 border-warm-border hover:bg-teal-50"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
