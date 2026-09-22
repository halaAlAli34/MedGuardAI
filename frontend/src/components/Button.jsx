export default function Button({ children, variant = "primary", size = "md", loading = false, disabled, className = "", ...props }) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2.5 text-base", lg: "px-6 py-3 text-lg" };
  const variants = {
    primary: "bg-teal text-white hover:bg-teal-600",
    secondary: "bg-teal-50 text-teal-700 hover:bg-teal-100",
    outline: "border border-warm-border bg-white text-gray-700 hover:bg-gray-50",
    danger: "bg-severity-severeBg text-severity-severe hover:bg-red-100",
    ghost: "text-teal hover:bg-teal-50"
  };
  const spinnerColor = variant === "primary" ? "border-white/40 border-t-white" : "border-teal-200 border-t-teal";

  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <span className={`w-3.5 h-3.5 border-2 rounded-full animate-spin ${spinnerColor}`} aria-hidden="true" />}
      {children}
    </button>
  );
}
