import { useEffect, useState } from "react";
import { Users, Copy, Check, ShieldOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import Alert from "../components/Alert";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";

export default function Caregiver() {
  const { user } = useAuth();
  if (user?.role === "patient") return <PatientCaregiverView />;
  return <CaregiverLinkView />;
}

function PatientCaregiverView() {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [permission, setPermission] = useState("edit");
  const [inviteCode, setInviteCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [inviting, setInviting] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  function load() {
    setLoading(true);
    setLoadError(null);
    api.get("/caregiver/invites")
      .then(({ data }) => setLinks(data.links))
      .catch((err) => setLoadError(err.response?.data?.message || "Couldn't load your caregivers right now."))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleInvite() {
    setError(null);
    setInviting(true);
    try {
      const { data } = await api.post("/caregiver/invite", { permission_level: permission });
      setInviteCode(data.inviteCode);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't generate an invite code.");
    } finally {
      setInviting(false);
    }
  }

  async function handleRevoke(linkId) {
    if (!confirm("Revoke this caregiver's access?")) return;
    setRevokingId(linkId);
    setError(null);
    try {
      await api.post(`/caregiver/revoke/${linkId}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't revoke access. Please try again.");
    } finally {
      setRevokingId(null);
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2"><Users className="text-teal" /> Caregivers</h1>
        <p className="text-gray-500 mt-1">Generate an invite code to give a caregiver access to your medication list.</p>
      </div>

      {error && <Alert type="error" onDismiss={() => setError(null)}>{error}</Alert>}

      <div className="bg-warm-card border border-warm-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={permission} onChange={(e) => setPermission(e.target.value)} className="border border-warm-border rounded-xl px-3 py-2.5 text-base bg-white">
            <option value="edit">Can edit medications</option>
            <option value="view">Can only view</option>
          </select>
          <Button onClick={handleInvite} loading={inviting}>{inviting ? "Generating…" : "Generate invite code"}</Button>
        </div>

        {inviteCode && (
          <div className="flex items-center justify-between bg-teal-50 rounded-xl px-4 py-3">
            <span className="font-mono font-bold text-teal-800 text-lg tracking-wider">{inviteCode}</span>
            <button onClick={copyCode} className="text-teal-700 flex items-center gap-1 text-sm font-medium">
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3">Linked caregivers</h2>
        {loading ? (
          <LoadingState />
        ) : loadError ? (
          <div className="space-y-3">
            <Alert type="error">{loadError}</Alert>
            <Button variant="outline" size="sm" onClick={load}>Try again</Button>
          </div>
        ) : links.length === 0 ? (
          <EmptyState icon={Users} title="No caregivers yet" description="Generate an invite code above and share it with a trusted caregiver." />
        ) : (
          <div className="space-y-2">
            {links.map((l) => (
              <div key={l._id} className="bg-warm-card border border-warm-border rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-700">{l.caregiver_id?.name || `Pending invite (${l.invite_code})`}</p>
                  <p className="text-sm text-gray-400 capitalize">{l.status} · {l.permission_level} access</p>
                </div>
                {l.status === "active" && (
                  <button onClick={() => handleRevoke(l._id)} disabled={revokingId === l._id} className="text-severity-severe text-sm font-medium flex items-center gap-1 disabled:opacity-50">
                    <ShieldOff size={14} /> {revokingId === l._id ? "Revoking…" : "Revoke"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CaregiverLinkView() {
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [redeeming, setRedeeming] = useState(false);

  function load() {
    setLoading(true);
    setLoadError(null);
    api.get("/caregiver/patients")
      .then(({ data }) => setPatients(data.patients))
      .catch((err) => setLoadError(err.response?.data?.message || "Couldn't load your linked patients right now."))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleRedeem(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setRedeeming(true);
    try {
      const { data } = await api.post("/caregiver/link", { inviteCode: code });
      setSuccess(`Linked to ${data.patient.name}. Use the patient switcher in the top bar to view their data.`);
      setCode("");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "That invite code didn't work.");
    } finally {
      setRedeeming(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2"><Users className="text-teal" /> Linked Patients</h1>
        <p className="text-gray-500 mt-1">Redeem an invite code from a patient to view or manage their medications.</p>
      </div>

      {error && <Alert type="error" onDismiss={() => setError(null)}>{error}</Alert>}
      {success && <Alert type="success" onDismiss={() => setSuccess(null)}>{success}</Alert>}

      <form onSubmit={handleRedeem} className="bg-warm-card border border-warm-border rounded-2xl p-5 flex items-end gap-3 flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <FormInput label="Invite code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. A1B2C3D4" required />
        </div>
        <Button type="submit" loading={redeeming}>{redeeming ? "Linking…" : "Link patient"}</Button>
      </form>

      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3">Your patients</h2>
        {loading ? (
          <LoadingState />
        ) : loadError ? (
          <div className="space-y-3">
            <Alert type="error">{loadError}</Alert>
            <Button variant="outline" size="sm" onClick={load}>Try again</Button>
          </div>
        ) : patients.length === 0 ? (
          <EmptyState icon={Users} title="No linked patients yet" description="Ask a patient to generate an invite code for you." />
        ) : (
          <div className="space-y-2">
            {patients.map((p) => (
              <div key={p.id} className="bg-warm-card border border-warm-border rounded-xl p-3.5">
                <p className="font-semibold text-gray-700">{p.name}</p>
                <p className="text-sm text-gray-400 capitalize">{p.permission_level} access</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
