import { NavLink } from "react-router-dom";
import { LayoutDashboard, Pill, AlertTriangle, ScanLine, Users, FileText } from "lucide-react";

const LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/medications", label: "Medications", icon: Pill },
  { to: "/interactions", label: "Interactions", icon: AlertTriangle },
  { to: "/scan", label: "Scan a Label", icon: ScanLine },
  { to: "/caregiver", label: "Caregivers", icon: Users },
  { to: "/reports", label: "Doctor Report", icon: FileText }
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col w-60 shrink-0 border-r border-warm-border bg-warm-card p-4 gap-1">
      {LINKS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
              isActive ? "bg-teal text-white" : "text-gray-600 hover:bg-teal-50"
            }`
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </aside>
  );
}
