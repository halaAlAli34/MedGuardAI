import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import InteractionCard from "../components/InteractionCard";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import Alert from "../components/Alert";
import Button from "../components/Button";

export default function Interactions() {
  const { user, patientId } = useAuth();
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  function load() {
    // Bug fix: previously this returned early with no patientId and never
    // called setLoading(false), leaving an infinite spinner for a caregiver
    // who navigates here directly before picking a patient.
    if (!patientId) { setLoading(false); return; }
    setLoading(true);
    setLoadError(null);
    api.get(`/interactions?patientId=${patientId}`)
      .then(({ data }) => setInteractions(data.interactions))
      .catch((err) => setLoadError(err.response?.data?.message || "Couldn't load interactions right now. Please try again."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [patientId]);

  if (user?.role === "caregiver" && !patientId) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No patient selected"
        description="Select a patient from the switcher at the top to view their flagged interactions."
        action={<Link to="/caregiver"><Button>Go to Caregivers</Button></Link>}
      />
    );
  }

  if (loading) return <LoadingState label="Checking for interactions…" />;

  if (loadError) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold text-gray-800">Flagged Interactions</h1>
        <Alert type="error">{loadError}</Alert>
        <Button variant="outline" onClick={load}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800">Flagged Interactions</h1>
        <p className="text-gray-500 mt-1">Tap any card to see a plain-language explanation and questions for your doctor.</p>
      </div>

      {interactions.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          tone="positive"
          title="No interactions found"
          description="None of the current medications on file have a known interaction. This list updates automatically whenever a medication is added."
        />
      ) : (
        <div className="space-y-3">
          {interactions.map((i) => (
            <InteractionCard key={i._id} interaction={i} patientId={patientId}
              onResolved={(id) => setInteractions((prev) => prev.filter((x) => x._id !== id))} />
          ))}
        </div>
      )}
    </div>
  );
}
