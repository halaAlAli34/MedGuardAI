export default function FormInput({ label, error, className = "", textarea = false, ...props }) {
  const Tag = textarea ? "textarea" : "input";
  return (
    <label className="block">
      {label && <span className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</span>}
      <Tag
        className={`w-full rounded-xl border px-3.5 py-2.5 text-base bg-white placeholder:text-gray-400
          focus:ring-2 focus:ring-teal-200 focus:border-teal outline-none transition
          ${error ? "border-severity-severe" : "border-warm-border"} ${className}`}
        {...props}
      />
      {error && <span className="block text-sm text-severity-severe mt-1">{error}</span>}
    </label>
  );
}
