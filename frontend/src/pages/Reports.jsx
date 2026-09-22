import { useState } from "react";
import { FileText, Download } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import Button from "../components/Button";
import Alert from "../components/Alert";

export default function Reports() {
  const { patientId, user, activePatient } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  const displayName = user?.role === "patient" ? user.name : activePatient?.name;

  async function handleDownload() {
    setDownloading(true);
    setError(null);
    try {
      const res = await api.get(`/reports/${patientId}?patientId=${patientId}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `medguard-report-${displayName?.replace(/\s+/g, "-").toLowerCase() || "patient"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError("Couldn't generate the report right now. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-gray-800 flex items-center gap-2"><FileText className="text-teal" /> Doctor Visit Report</h1>
        <p className="text-gray-500 mt-1">Generate a PDF with {displayName ? `${displayName}'s` : "the"} current medications and active flagged interactions — ready to bring to an appointment.</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="bg-warm-card border border-warm-border rounded-2xl p-6 flex flex-col items-center text-center">
        <div className="w-14 h-14 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
          <FileText size={26} />
        </div>
        <p className="text-gray-600 mb-5">The report includes your medication list, all active interaction flags, AI explanations (clearly labeled), and questions to ask your doctor.</p>
        <Button onClick={handleDownload} disabled={downloading || !patientId}>
          <Download size={16} /> {downloading ? "Generating…" : "Download PDF report"}
        </Button>
      </div>
    </div>
  );
}
