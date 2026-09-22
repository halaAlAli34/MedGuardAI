import { NavLink } from "react-router-dom";
import { LayoutDashboard, Pill, AlertTriangle, ScanLine, FileText } from "lucide-react";

const LINKS = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/medications", label: "Meds", icon: Pill },
  { to: "/scan", label: "Scan", icon: ScanLine },
  { to: "/interactions", label: "Flags", icon: AlertTriangle },
  { to: "/reports", label: "Report", icon: FileText }
];

export default function MobileBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-warm-card border-t border-warm-border flex justify-around py-1.5 z-30">
      {LINKS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
              isActive ? "text-teal" : "text-gray-400"
            }`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
