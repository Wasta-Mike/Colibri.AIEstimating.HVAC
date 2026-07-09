import { WORKFLOW_STEPS } from "../data/workflowSteps.js";

export default function WorkflowGuide({ currentStepId, onSelectStep }) {
  const currentIndex = WORKFLOW_STEPS.findIndex((s) => s.id === currentStepId);

  return (
    <div className="workflow-guide">
      <h2>Workflow</h2>
      <ol className="stepper">
        {WORKFLOW_STEPS.map((step, i) => {
          const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "upcoming";
          return (
            <li key={step.id} className={`stepper-item ${state}`}>
              <button className="stepper-header" onClick={() => onSelectStep(step.id)}>
                <span className="stepper-marker">{state === "done" ? "✓" : i + 1}</span>
                <span className="stepper-title">{step.title}</span>
              </button>
              {state === "current" && (
                <div className="stepper-detail">
                  <p className="verify-gate">
                    <strong>Verify gate:</strong> {step.verifyGate}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
