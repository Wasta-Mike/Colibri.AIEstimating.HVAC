import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";
import { WORKFLOW_STEPS } from "../data/workflowSteps.js";
import WorkflowGuide from "./WorkflowGuide.jsx";
import ChatPanel from "./ChatPanel.jsx";
import GridPanel from "./GridPanel.jsx";
import PlansTab from "./PlansTab.jsx";
import CaptureReview from "./CaptureReview.jsx";

const PANEL_VIEWS = [
  { id: "all", label: "All panels" },
  { id: "plans", label: "Plans" },
  { id: "chat", label: "Chat" },
  { id: "guide", label: "Guide" },
  { id: "grid", label: "Grid" },
];

export default function Workspace({ session, setSession }) {
  const [stepId, setStepId] = useState(session.current_step_id || "orientation-0");
  const [panelView, setPanelView] = useState("all");
  const [captures, setCaptures] = useState([]);
  const [reviewCaptureId, setReviewCaptureId] = useState(null);
  const [pendingAttachIds, setPendingAttachIds] = useState([]);

  const refreshCaptures = useCallback(() => {
    api.listCaptures(session.id).then(setCaptures).catch(console.error);
  }, [session.id]);

  useEffect(() => {
    refreshCaptures();
  }, [refreshCaptures]);

  async function selectStep(id) {
    setStepId(id);
    const updated = await api.patchSession(session.id, { currentStepId: id });
    setSession(updated);
  }

  const reviewCapture = captures.find((c) => c.id === reviewCaptureId);

  return (
    <div className="workspace">
      <nav className="panel-toggle">
        {PANEL_VIEWS.map((v) => (
          <button
            key={v.id}
            className={panelView === v.id ? "toggle-btn active" : "toggle-btn"}
            onClick={() => setPanelView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </nav>

      <div className={`panel-grid view-${panelView}`}>
        {(panelView === "all" || panelView === "plans") && (
          <section className="panel panel-plans">
            <PlansTab
              session={session}
              captures={captures}
              onCapturesChanged={refreshCaptures}
              onOpenCapture={setReviewCaptureId}
              onAttachToChat={(id) => setPendingAttachIds((prev) => [...prev, id])}
            />
          </section>
        )}
        {(panelView === "all" || panelView === "guide") && (
          <section className="panel panel-guide">
            <WorkflowGuide currentStepId={stepId} onSelectStep={selectStep} />
          </section>
        )}
        {(panelView === "all" || panelView === "chat") && (
          <section className="panel panel-chat">
            <ChatPanel
              session={session}
              stepId={stepId}
              captures={captures}
              pendingAttachIds={pendingAttachIds}
              clearPendingAttach={() => setPendingAttachIds([])}
              onAnnotationsCreated={() => refreshCaptures()}
            />
          </section>
        )}
        {(panelView === "all" || panelView === "grid") && (
          <section className="panel panel-grid-section">
            <GridPanel session={session} />
          </section>
        )}
      </div>

      {reviewCapture && (
        <CaptureReview
          session={session}
          capture={reviewCapture}
          stepId={stepId}
          onClose={() => setReviewCaptureId(null)}
          onCaptureUpdated={refreshCaptures}
        />
      )}
    </div>
  );
}
