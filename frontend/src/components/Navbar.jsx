import { ShieldCheck, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import PatientSwitcher from "./PatientSwitcher";

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="h-16 border-b border-warm-border bg-warm-card flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-teal text-white flex items-center justify-center">
          <ShieldCheck size={19} />
        </div>
        <span className="font-extrabold text-gray-800 text-lg hidden sm:inline">MedGuard AI</span>
      </div>

      <div className="flex items-center gap-3">
        <PatientSwitcher />
        <div className="hidden sm:flex flex-col items-end leading-tight">
          <span className="text-sm font-semibold text-gray-700">{user?.name}</span>
          <span className="text-xs text-gray-400 capitalize">{user?.role}</span>
        </div>
        <button onClick={logout} aria-label="Log out" className="p-2 text-gray-400 hover:text-severity-severe hover:bg-severity-severeBg rounded-lg">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
