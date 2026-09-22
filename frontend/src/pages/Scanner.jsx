import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Upload, ScanLine, ArrowLeft, PenLine } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import Button from "../components/Button";
import AIDisclaimer from "../components/AIDisclaimer";
import ConfidenceIndicator from "../components/ConfidenceIndicator";
import FormInput from "../components/FormInput";
import Alert from "../components/Alert";

const EMPTY_FORM = { name: "", dosage: "", frequency: "", prescribing_doctor: "", start_date: "" };
const LOW_CONFIDENCE_THRESHOLD = 40;

export default function Scanner() {
  const { patientId } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null); // { extracted, confidence_score, aiAvailable, message }
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [manualMode, setManualMode] = useState(false); // true once the user opts into (or falls back to) manual entry

  function reset() {
    setImagePreview(null);
    setResult(null);
    setForm(null);
    setError(null);
    setManualMode(false);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    handleScan(file);
  }

  async function handleScan(file) {
    setScanning(true);
    setError(null);
    setResult(null);
    setForm(null);
    setManualMode(false);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const { data } = await api.post("/medications/scan", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(data);
      setForm({
        name: data.extracted.name,
        dosage: data.extracted.dosage,
        frequency: data.extracted.frequency,
        prescribing_doctor: data.extracted.prescribing_doctor,
        start_date: ""
      });
    } catch (err) {
      // Scan request itself failed (network error, server error, etc). Per spec,
      // manual entry must still work even if the scanner is down.
      setError(err.response?.data?.message || "Something went wrong while scanning this label.");
    } finally {
      setScanning(false);
    }
  }

  function switchToManualEntry() {
    setForm({ ...EMPTY_FORM });
    setResult(null);
    setManualMode(true);
    setError(null);
  }

  async function handleConfirmSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const { data } = await api.post(`/medications?patientId=${patientId}`, {
        ...form,
        source: manualMode ? "manual" : "ai_scan"
      });
      navigate("/medications", { state: data.newFlagsCount > 0 ? { newFlags: data.newFlagsCount } : undefined });
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this medication. Please check the fields and try again.");
    } finally {
      setSaving(false);
    }
  }

  const isLowConfidence = result?.aiAvailable && result.confidence_score < LOW_CONFIDENCE_THRESHOLD;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-gray-500 text-sm font-medium">
        <ArrowLeft size={15} /> Back
      </button>

      <div>
        <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2"><ScanLine className="text-teal" /> Scan a Prescription Label</h1>
        <p className="text-gray-500 mt-1">Take a photo of the label and we'll pre-fill the details for you to confirm.</p>
      </div>

      {error && (
        <div className="space-y-2">
          <Alert type="error">{error}</Alert>
          <Button variant="outline" size="sm" onClick={switchToManualEntry}>
            <PenLine size={15} /> Enter medication details manually instead
          </Button>
        </div>
      )}

      {!imagePreview && !manualMode && !error && (
        <div className="border-2 border-dashed border-warm-border rounded-2xl p-10 flex flex-col items-center text-center bg-warm-card">
          <div className="w-14 h-14 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
            <Camera size={26} />
          </div>
          <p className="font-semibold text-gray-700 mb-1">Upload or take a photo</p>
          <p className="text-sm text-gray-400 mb-5">JPG or PNG, up to 8MB</p>
          <Button onClick={() => fileRef.current?.click()}>
            <Upload size={16} /> Choose photo
          </Button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
          <button onClick={switchToManualEntry} className="text-sm text-teal font-semibold mt-4 flex items-center gap-1">
            <PenLine size={14} /> Or enter details manually
          </button>
        </div>
      )}

      {imagePreview && (
        <div className="rounded-2xl overflow-hidden border border-warm-border">
          <img src={imagePreview} alt="Prescription label preview" className="w-full max-h-64 object-cover" />
        </div>
      )}

      {scanning && (
        <div className="flex items-center gap-3 bg-warm-card border border-warm-border rounded-2xl p-4">
          <div className="w-5 h-5 border-2 border-teal-100 border-t-teal rounded-full animate-spin" />
          <div>
            <p className="text-sm text-gray-600">Reading label and extracting fields…</p>
            <p className="text-xs text-gray-400 mt-0.5">This can take up to about 10 seconds.</p>
          </div>
        </div>
      )}

      {form && (
        <div className="bg-warm-card border border-warm-border rounded-2xl p-5 space-y-4">
          {manualMode ? (
            <p className="text-sm font-semibold text-gray-700">Enter the medication details manually</p>
          ) : (
            <>
              <AIDisclaimer />
              {result?.message && <p className="text-sm text-gray-500 italic">{result.message}</p>}
              {result?.aiAvailable && <ConfidenceIndicator score={result.confidence_score} />}
              {isLowConfidence && (
                <Alert type="warning">
                  We're not confident we read this label correctly. Please carefully check every field
                  below against the physical label — especially the dosage and frequency — before saving.
                </Alert>
              )}
              {result && !result.aiAvailable && (
                <Alert type="warning">
                  We couldn't read this label automatically, so all fields below are blank. Please fill
                  them in from the physical label.
                </Alert>
              )}
            </>
          )}

          <form onSubmit={handleConfirmSave} className="space-y-3.5">
            <FormInput
              label="Medication name" required value={form.name}
              className={isLowConfidence && !form.name ? "border-severity-mild" : ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Dosage" required value={form.dosage}
                className={isLowConfidence && !form.dosage ? "border-severity-mild" : ""}
                onChange={(e) => setForm({ ...form, dosage: e.target.value })}
              />
              <FormInput
                label="Frequency" required value={form.frequency}
                className={isLowConfidence && !form.frequency ? "border-severity-mild" : ""}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              />
            </div>
            <FormInput label="Prescribing doctor (optional)" value={form.prescribing_doctor} onChange={(e) => setForm({ ...form, prescribing_doctor: e.target.value })} />
            <p className="text-xs text-gray-400">Please review every field above before saving — nothing is saved automatically.</p>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={reset}>
                {manualMode ? "Cancel" : "Scan another"}
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>{saving ? "Saving…" : "Confirm & save"}</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
