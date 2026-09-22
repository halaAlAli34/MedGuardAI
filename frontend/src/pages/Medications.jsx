import { useEffect, useState } from "react";
import { Plus, Pill, ScanLine } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import MedicationCard from "../components/MedicationCard";
import LoadingState from "../components/LoadingState";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";
import Modal from "../components/Modal";
import FormInput from "../components/FormInput";
import Alert from "../components/Alert";

const EMPTY_FORM = { name: "", dosage: "", frequency: "", prescribing_doctor: "", start_date: "" };

export default function Medications() {
  const { patientId, user, activePatient } = useAuth();
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [newFlagsAlert, setNewFlagsAlert] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const readOnly = user?.role === "caregiver" && activePatient?.permission_level === "view";

  function load() {
    if (!patientId) return;
    setLoading(true);
    setLoadError(null);
    api.get(`/medications?patientId=${patientId}`)
      .then(({ data }) => setMedications(data.medications))
      .catch((err) => setLoadError(err.response?.data?.message || "Couldn't load medications. Please check your connection and try again."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [patientId]);

  function openAdd(prefill) {
    setEditing(null);
    setForm(prefill ? { ...EMPTY_FORM, ...prefill } : EMPTY_FORM);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(med) {
    setEditing(med);
    setForm({
      name: med.name, dosage: med.dosage, frequency: med.frequency,
      prescribing_doctor: med.prescribing_doctor || "",
      start_date: med.start_date ? med.start_date.slice(0, 10) : ""
    });
    setError(null);
    setModalOpen(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.put(`/medications/${editing._id}?patientId=${patientId}`, form);
      } else {
        const { data } = await api.post(`/medications?patientId=${patientId}`, form);
        if (data.newFlagsCount > 0) {
          setNewFlagsAlert(`${data.newFlagsCount} new interaction${data.newFlagsCount > 1 ? "s" : ""} flagged — check the Interactions tab.`);
        }
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(med) {
    if (!confirm(`Remove ${med.name} from the medication list?`)) return;
    if (deletingId) return; // guard against double-clicks firing two deletes
    setDeletingId(med._id);
    setLoadError(null);
    try {
      await api.delete(`/medications/${med._id}?patientId=${patientId}`);
      load();
    } catch (err) {
      setLoadError(err.response?.data?.message || "Couldn't delete this medication. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <LoadingState label="Loading medications…" />;

  if (loadError && medications.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold text-gray-800">Medications</h1>
        <Alert type="error">{loadError}</Alert>
        <Button variant="outline" onClick={load}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold text-gray-800">Medications</h1>
        {!readOnly && (
          <div className="flex gap-2">
            <Link to="/scan"><Button variant="outline"><ScanLine size={16} /> Scan label</Button></Link>
            <Button onClick={() => openAdd()}><Plus size={16} /> Add medication</Button>
          </div>
        )}
      </div>

      {newFlagsAlert && <Alert type="info" onDismiss={() => setNewFlagsAlert(null)}>{newFlagsAlert}</Alert>}
      {loadError && medications.length > 0 && <Alert type="error" onDismiss={() => setLoadError(null)}>{loadError}</Alert>}

      {medications.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="No medications yet"
          description={readOnly ? "This patient hasn't added any medications yet." : "Add your first medication manually or scan a prescription label."}
          action={!readOnly && <Button onClick={() => openAdd()}><Plus size={16} /> Add medication</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {medications.map((m) => (
            <MedicationCard key={m._id} medication={m} onEdit={openEdit} onDelete={handleDelete} readOnly={readOnly} deleting={deletingId === m._id} />
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit medication" : "Add medication"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} loading={saving}>{saving ? "Saving…" : "Save"}</Button>
          </>
        }
      >
        {error && <div className="mb-4"><Alert type="error">{error}</Alert></div>}
        <form onSubmit={handleSave} className="space-y-3.5">
          <FormInput label="Medication name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Dosage" required placeholder="e.g. 20mg" value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} />
            <FormInput label="Frequency" required placeholder="e.g. Once daily" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} />
          </div>
          <FormInput label="Prescribing doctor (optional)" value={form.prescribing_doctor} onChange={(e) => setForm({ ...form, prescribing_doctor: e.target.value })} />
          <FormInput label="Start date (optional)" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </form>
      </Modal>
    </div>
  );
}
