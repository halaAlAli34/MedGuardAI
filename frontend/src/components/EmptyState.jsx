export default function EmptyState({ icon: Icon, title, description, action, tone = "neutral" }) {
  const iconColor = tone === "positive" ? "text-teal-500" : "text-gray-400";
  const iconBg = tone === "positive" ? "bg-teal-50" : "bg-gray-100";
  return (
    <div className="flex flex-col items-center text-center py-14 px-6">
      {Icon && (
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${iconBg}`}>
          <Icon className={iconColor} size={26} />
        </div>
      )}
      <h3 className="text-lg font-bold text-gray-800 mb-1.5">{title}</h3>
      {description && <p className="text-gray-500 max-w-sm mb-5">{description}</p>}
      {action}
    </div>
  );
}
