import { useEffect, useState } from "react";
import { Pill, AlertTriangle, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import DashboardCard from "../components/DashboardCard";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import InteractionCard from "../components/InteractionCard";
import Button from "../components/Button";
import Alert from "../components/Alert";

export default function Dashboard() {
  const { user, patientId, activePatient } = useAuth();
  const [medications, setMedications] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const displayName = user?.role === "patient" ? user.name : activePatient?.name;

  function load() {
    if (!patientId) { setLoading(false); return; }
    setLoading(true);
    setLoadError(null);
    Promise.all([
      api.get(`/medications?patientId=${patientId}`),
      api.get(`/interactions?patientId=${patientId}`)
    ]).then(([m, i]) => {
      setMedications(m.data.medications);
      setInteractions(i.data.interactions);
    }).catch((err) => {
      setLoadError(err.response?.data?.message || "Couldn't load your dashboard right now. Please check your connection and try again.");
    }).finally(() => setLoading(false));
  }

  useEffect(load, [patientId]);

  if (user?.role === "caregiver" && !patientId) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No patient selected"
        description="Ask a patient for their invite code to link your account, then select them from the switcher at the top."
        action={<Link to="/caregiver"><Button>Go to Caregivers</Button></Link>}
      />
    );
  }

  if (loading) return <LoadingState label="Loading your dashboard…" />;

  if (loadError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold text-gray-800">Dashboard</h1>
        <Alert type="error">{loadError}</Alert>
        <Button variant="outline" onClick={load}>Try again</Button>
      </div>
    );
  }

  const severeCount = interactions.filter((i) => i.severity === "severe").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800">
          {user?.role === "patient" ? `Welcome back, ${user.name.split(" ")[0]}` : `${displayName}'s Overview`}
        </h1>
        <p className="text-gray-500 mt-1">Here's a snapshot of medications and flagged interactions.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <DashboardCard icon={Pill} label="Active medications" value={medications.length} />
        <DashboardCard icon={AlertTriangle} label="Flagged interactions" value={interactions.length} tone={interactions.length ? "warning" : "neutral"} />
        <DashboardCard icon={ShieldCheck} label="Severe flags" value={severeCount} tone={severeCount ? "danger" : "neutral"} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-800">Flagged interactions</h2>
          {interactions.length > 0 && (
            <Link to="/interactions" className="text-teal text-sm font-semibold flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {interactions.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            tone="positive"
            title="No interactions found"
            description="Great news — none of the current medications have a known interaction flagged. Keep this list up to date as things change."
          />
        ) : (
          <div className="space-y-3">
            {interactions.slice(0, 3).map((i) => (
              <InteractionCard key={i._id} interaction={i} patientId={patientId}
                onResolved={(id) => setInteractions((prev) => prev.filter((x) => x._id !== id))} />
            ))}
          </div>
        )}
      </div>

      {medications.length === 0 && (
        <EmptyState
          icon={Pill}
          title="No medications yet"
          description="Add your first medication manually or scan a prescription label to get started."
          action={<Link to="/medications"><Button>Add a medication</Button></Link>}
        />
      )}
    </div>
  );
}
