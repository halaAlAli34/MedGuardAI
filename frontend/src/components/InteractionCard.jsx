import { useState } from "react";
import { ChevronDown, ChevronUp, MessageCircleQuestion, CheckCircle2 } from "lucide-react";
import SeverityBadge from "./SeverityBadge";
import AIDisclaimer from "./AIDisclaimer";
import Button from "./Button";
import api from "../api/axios";

export default function InteractionCard({ interaction, patientId, onResolved }) {
  const [expanded, setExpanded] = useState(false);
  const [explanation, setExplanation] = useState(interaction.ai_explanation || null);
  const [questions, setQuestions] = useState(interaction.ai_doctor_questions || []);
  const [loadingExplain, setLoadingExplain] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [aiMessage, setAiMessage] = useState(null);

  const medA = interaction.medication_a_id;
  const medB = interaction.medication_b_id;
  const ref = interaction.interaction_reference_id;

  async function handleExpand() {
    setExpanded((e) => !e);
    if (!expanded && !explanation) {
      setLoadingExplain(true);
      try {
        const { data } = await api.post(`/interactions/${interaction._id}/explain?patientId=${patientId}`);
        setExplanation(data.explanation);
        setQuestions(data.doctorQuestions || []);
        setAiUnavailable(!data.aiAvailable);
        setAiMessage(data.message || null);
      } catch {
        setExplanation(ref?.description || "Unable to load explanation right now.");
        setAiUnavailable(true);
      } finally {
        setLoadingExplain(false);
      }
    }
  }

  async function handleResolve() {
    await api.post(`/interactions/${interaction._id}/resolve?patientId=${patientId}`);
    onResolved?.(interaction._id);
  }

  return (
    <div className="bg-warm-card border border-warm-border rounded-2xl overflow-hidden">
      <button onClick={handleExpand} className="w-full flex items-center justify-between gap-3 p-4 text-left">
        <div className="min-w-0">
          <p className="font-bold text-gray-800 truncate">{medA?.name} + {medB?.name}</p>
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{ref?.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SeverityBadge severity={interaction.severity} />
          {expanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-warm-border pt-3.5 space-y-3.5">
          {loadingExplain ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-teal-100 border-t-teal rounded-full animate-spin" />
              Generating a plain-language explanation…
            </div>
          ) : (
            <>
              <AIDisclaimer />
              {aiMessage && <p className="text-xs text-gray-400 italic">{aiMessage}</p>}
              <p className="text-sm text-gray-700 leading-relaxed">{explanation}</p>

              {questions.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-1.5 mb-1.5">
                    <MessageCircleQuestion size={15} className="text-teal-600" />
                    Questions to ask your doctor
                  </p>
                  <ul className="space-y-1">
                    {questions.map((q, i) => (
                      <li key={i} className="text-sm text-gray-600 pl-3.5 relative before:content-['•'] before:absolute before:left-0 before:text-teal-400">
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {ref?.alternative_suggestion && (
                <div className="bg-teal-50 rounded-xl p-3">
                  <p className="text-sm text-teal-800"><span className="font-semibold">Worth discussing: </span>{ref.alternative_suggestion}</p>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button variant="outline" size="sm" onClick={handleResolve}>
                  <CheckCircle2 size={15} /> Mark as discussed / resolved
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
