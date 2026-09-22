import { useEffect, useRef, useState } from "react";
import { Users, ChevronDown, Eye, Pencil } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

export default function PatientSwitcher() {
  const { user, activePatient, setActivePatient } = useAuth();
  const [patients, setPatients] = useState([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (user?.role !== "caregiver") return;
    api.get("/caregiver/patients").then(({ data }) => {
      setPatients(data.patients);
      if (!activePatient && data.patients.length > 0) setActivePatient(data.patients[0]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Bug fix: the dropdown previously only closed when the trigger button
  // itself was clicked again - clicking anywhere else on the page left it
  // open. Close it on any outside click instead.
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (user?.role !== "caregiver") return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-teal-50 text-teal-800 px-3.5 py-2 rounded-xl font-semibold text-sm max-w-[220px]"
      >
        <Users size={16} className="shrink-0" />
        <span className="truncate">{activePatient ? `Viewing: ${activePatient.name}` : "Select a patient"}</span>
        {activePatient?.permission_level === "view" && <Eye size={13} className="shrink-0" />}
        <ChevronDown size={14} className="shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 sm:left-0 w-64 max-w-[calc(100vw-2rem)] bg-white border border-warm-border rounded-xl shadow-lg z-20 py-1">
          {patients.length === 0 && (
            <p className="px-3.5 py-2.5 text-sm text-gray-400">No linked patients yet.</p>
          )}
          {patients.map((p) => (
            <button
              key={p.id}
              onClick={() => { setActivePatient(p); setOpen(false); }}
              className="w-full text-left px-3.5 py-2.5 hover:bg-teal-50 flex items-center justify-between text-sm gap-2"
            >
              <span className="font-medium text-gray-700 truncate">{p.name}</span>
              {p.permission_level === "view" ? <Eye size={13} className="text-gray-400 shrink-0" /> : <Pencil size={13} className="text-gray-400 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
