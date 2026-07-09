import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";
import { stepById } from "../data/workflowSteps.js";

export default function ChatPanel({ session, stepId, captures, pendingAttachIds, clearPendingAttach, onAnnotationsCreated }) {
  const step = stepById(stepId);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState(step?.starterPrompt || "");
  const [attachedIds, setAttachedIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    setDraft(step?.starterPrompt || "");
    setAttachedIds([]);
    api.getMessages(session.id, stepId).then(setMessages).catch(console.error);
  }, [stepId, session.id]);

  useEffect(() => {
    if (pendingAttachIds.length) {
      setAttachedIds((prev) => Array.from(new Set([...prev, ...pendingAttachIds])));
      clearPendingAttach();
    }
  }, [pendingAttachIds]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    if (!draft.trim() && attachedIds.length === 0) return;
    setBusy(true);
    setError(null);
    const userMsg = { role: "user", content: draft, task_type: attachedIds.length ? "vision" : "text" };
    setMessages((prev) => [...prev, userMsg]);
    try {
      const result = await api.runStep({
        sessionId: session.id,
        stepId,
        message: draft,
        captureIds: attachedIds,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: result.text, task_type: result.taskType }]);
      if (result.annotations?.length) onAnnotationsCreated?.();
      setDraft("");
      setAttachedIds([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function needHelp() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.runStep({
        sessionId: session.id,
        stepId,
        message: `Step: ${step?.title}. Explain this step to me — what am I doing and why.`,
        captureIds: [],
        taskTypeOverride: "text",
        isHelp: true,
      });
      setMessages((prev) => [
        ...prev,
        { role: "user", content: "(need help)", task_type: "text" },
        { role: "assistant", content: result.text, task_type: "text" },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function toggleAttach(id) {
    setAttachedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h2>{step?.title || "Chat"}</h2>
        <button className="help-btn" onClick={needHelp} disabled={busy}>
          Need help?
        </button>
      </div>

      <div className="chat-messages" ref={scrollRef}>
        {messages.length === 0 && <p className="muted">No messages yet — edit the starter prompt below and send.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role} ${m.task_type === "warning" ? "warning" : ""}`}>
            <div className="chat-bubble-role">
              {m.role === "user" ? "You" : "Claude"}
              {m.task_type ? ` · ${m.task_type}` : ""}
            </div>
            <div className="chat-bubble-content">{m.content}</div>
          </div>
        ))}
      </div>

      {error && <div className="error-text">{error}</div>}

      {captures.length > 0 && (
        <div className="attach-strip">
          <span className="muted">Attach captures:</span>
          {captures.map((c) => (
            <button
              key={c.id}
              className={attachedIds.includes(c.id) ? "chip active" : "chip"}
              onClick={() => toggleAttach(c.id)}
              title={c.capture_type === "full-page" ? "Full page (not ideal for counting)" : "Zoomed region"}
            >
              {c.label}
              {c.capture_type === "full-page" ? " (full page)" : ""}
            </button>
          ))}
        </div>
      )}

      <textarea
        className="chat-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
      />
      <button className="primary-btn" onClick={send} disabled={busy}>
        {busy ? "Sending…" : "Send"}
      </button>
    </div>
  );
}
