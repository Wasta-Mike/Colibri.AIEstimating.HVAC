import { useEffect, useRef, useState } from "react";
import { api } from "../api.js";

const TYPE_COLORS = {
  diffuser: "#2b8a3e",
  return: "#1971c2",
  exhaust: "#e8590c",
  thermostat: "#9c36b5",
  equipment: "#495057",
  unknown: "#868e96",
};

const ADDABLE_TYPES = ["diffuser", "return", "exhaust", "thermostat", "equipment"];

export default function CaptureReview({ session, capture, stepId, onClose, onCaptureUpdated }) {
  const [annotations, setAnnotations] = useState([]);
  const [checked, setChecked] = useState({});
  const [addType, setAddType] = useState(null);
  const [dragState, setDragState] = useState(null); // {id, pointIndex}
  const [calibrating, setCalibrating] = useState(false);
  const [calPoints, setCalPoints] = useState([]);
  const [calForm, setCalForm] = useState(null);
  const [flagFor, setFlagFor] = useState(null);
  const [flagNote, setFlagNote] = useState("");
  const svgRef = useRef(null);
  const imgRef = useRef(null);

  const refresh = () => api.listAnnotations(capture.id).then(setAnnotations);
  useEffect(() => {
    refresh();
  }, [capture.id]);

  function clientToNormalized(clientX, clientY) {
    const rect = imgRef.current.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
    };
  }

  async function logDelta(itemType, proposed, corrected, errorType) {
    await api.logDelta({
      sessionId: session.id,
      stepId,
      captureId: capture.id,
      itemType,
      proposed,
      corrected,
      errorType,
    });
  }

  async function onImageClick(e) {
    if (calibrating) {
      const pt = clientToNormalized(e.clientX, e.clientY);
      const next = [...calPoints, pt];
      setCalPoints(next);
      if (next.length === 2) {
        setCalForm({ referencePixels: null, points: next });
      }
      return;
    }
    if (addType) {
      const pt = clientToNormalized(e.clientX, e.clientY);
      const created = await api.createAnnotation({
        sessionId: session.id,
        captureId: capture.id,
        itemType: addType,
        kind: "point",
        points: [pt],
        status: "verified",
      });
      await logDelta(addType, null, { x: pt.x, y: pt.y }, "missed-item");
      setAddType(null);
      refresh();
    }
  }

  function startDrag(annotationId, pointIndex, e) {
    e.stopPropagation();
    const a = annotations.find((x) => x.id === annotationId);
    setDragState({ id: annotationId, pointIndex, originalPoint: a?.points[pointIndex] });
  }

  async function onMouseMove(e) {
    if (!dragState) return;
    const pt = clientToNormalized(e.clientX, e.clientY);
    setAnnotations((prev) =>
      prev.map((a) => {
        if (a.id !== dragState.id) return a;
        const points = a.points.map((p, i) => (i === dragState.pointIndex ? pt : p));
        return { ...a, points };
      })
    );
  }

  async function onMouseUp() {
    if (!dragState) return;
    const a = annotations.find((x) => x.id === dragState.id);
    if (a) {
      await api.patchAnnotation(a.id, { points: a.points, captureId: capture.id });
      await logDelta(a.item_type, dragState.originalPoint, a.points[dragState.pointIndex], "location-correction");
      refresh();
    }
    setDragState(null);
  }

  async function removeAnnotation(a) {
    await api.deleteAnnotation(a.id);
    await logDelta(a.item_type, a.points, null, "false-positive");
    refresh();
  }

  async function toggleCheck(id) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function confirmAnnotation(a) {
    await api.patchAnnotation(a.id, { status: "verified" });
    refresh();
  }

  async function confirmAll() {
    for (const a of annotations) {
      if (a.status !== "verified") await api.patchAnnotation(a.id, { status: "verified" });
    }
    refresh();
  }

  async function recomputeLength(a) {
    await api.patchAnnotation(a.id, { points: a.points, captureId: capture.id });
    refresh();
  }

  async function submitCalibration(e) {
    e.preventDefault();
    const [p1, p2] = calForm.points;
    const dx = (p2.x - p1.x) * capture.width;
    const dy = (p2.y - p1.y) * capture.height;
    const referencePixels = Math.sqrt(dx * dx + dy * dy);
    await api.calibrateCapture(capture.id, {
      referencePixels,
      referenceFeet: Number(calForm.referenceFeet),
      overallWidthFt: calForm.overallWidthFt ? Number(calForm.overallWidthFt) : undefined,
      overallDepthFt: calForm.overallDepthFt ? Number(calForm.overallDepthFt) : undefined,
      statedAreaSf: calForm.statedAreaSf ? Number(calForm.statedAreaSf) : undefined,
    });
    setCalibrating(false);
    setCalPoints([]);
    setCalForm(null);
    onCaptureUpdated();
  }

  async function submitFlag(e) {
    e.preventDefault();
    await logDelta(flagFor?.item_type || "general", flagFor || null, null, `flagged: ${flagNote}`);
    setFlagFor(null);
    setFlagNote("");
    alert("Difference flagged and logged to the correction dataset.");
  }

  const allChecked = annotations.length > 0 && annotations.every((a) => checked[a.id]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal capture-review">
        <div className="modal-header">
          <h2>{capture.label}</h2>
          <button className="link-btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="capture-review-body">
          <div
            className="capture-stage"
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
          >
            <img
              ref={imgRef}
              src={`/uploads/captures/${capture.image_path}`}
              alt={capture.label}
              onClick={onImageClick}
              draggable={false}
            />
            <svg ref={svgRef} className="overlay-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              {annotations.map((a, idx) => {
                const color = TYPE_COLORS[a.item_type] || TYPE_COLORS.unknown;
                if (a.kind === "polyline") {
                  const pts = a.points.map((p) => `${p.x * 100},${p.y * 100}`).join(" ");
                  return (
                    <g key={a.id}>
                      <polyline points={pts} fill="none" stroke={color} strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
                      {a.points.map((p, i) => (
                        <circle
                          key={i}
                          cx={p.x * 100}
                          cy={p.y * 100}
                          r="1.2"
                          fill={color}
                          style={{ cursor: "grab", pointerEvents: "all" }}
                          onMouseDown={(e) => startDrag(a.id, i, e)}
                        />
                      ))}
                    </g>
                  );
                }
                const p = a.points[0];
                return (
                  <g key={a.id}>
                    <circle
                      cx={p.x * 100}
                      cy={p.y * 100}
                      r="2.2"
                      fill={color}
                      stroke={a.status === "verified" ? "#000" : "#fff"}
                      strokeWidth="0.4"
                      style={{ cursor: "grab", pointerEvents: "all" }}
                      onMouseDown={(e) => startDrag(a.id, 0, e)}
                    />
                    <text x={p.x * 100} y={p.y * 100 + 0.9} fontSize="2.2" textAnchor="middle" fill="#fff">
                      {idx + 1}
                    </text>
                  </g>
                );
              })}
              {calPoints.map((p, i) => (
                <circle key={i} cx={p.x * 100} cy={p.y * 100} r="1.4" fill="#f08c00" />
              ))}
              {calPoints.length === 2 && (
                <line
                  x1={calPoints[0].x * 100}
                  y1={calPoints[0].y * 100}
                  x2={calPoints[1].x * 100}
                  y2={calPoints[1].y * 100}
                  stroke="#f08c00"
                  strokeWidth="0.5"
                />
              )}
            </svg>
          </div>

          <div className="verify-sidebar">
            <div className="verify-sidebar-section">
              <h3>Calibration</h3>
              {capture.pixels_per_foot ? (
                <p className="muted small">{capture.calibration_note}</p>
              ) : (
                <p className="muted small">Not calibrated yet.</p>
              )}
              {!calibrating && (
                <button
                  className="link-btn small"
                  onClick={() => {
                    setCalibrating(true);
                    setCalPoints([]);
                  }}
                >
                  {capture.pixels_per_foot ? "Re-calibrate" : "Calibrate"}
                </button>
              )}
              {calibrating && !calForm && <p className="muted small">Click two points over a known reference (a dimension string or a door).</p>}
              {calForm && (
                <form className="cal-form" onSubmit={submitCalibration}>
                  <label>
                    Real length of that line (ft)
                    <input
                      type="number"
                      step="0.01"
                      required
                      onChange={(e) => setCalForm((f) => ({ ...f, referenceFeet: e.target.value }))}
                    />
                  </label>
                  <label>
                    Overall width (ft) — optional self-check
                    <input type="number" step="0.01" onChange={(e) => setCalForm((f) => ({ ...f, overallWidthFt: e.target.value }))} />
                  </label>
                  <label>
                    Overall depth (ft)
                    <input type="number" step="0.01" onChange={(e) => setCalForm((f) => ({ ...f, overallDepthFt: e.target.value }))} />
                  </label>
                  <label>
                    Stated floor area (SF)
                    <input type="number" step="0.01" onChange={(e) => setCalForm((f) => ({ ...f, statedAreaSf: e.target.value }))} />
                  </label>
                  <button type="submit" className="primary-btn small">
                    Save calibration
                  </button>
                </form>
              )}
            </div>

            <div className="verify-sidebar-section">
              <h3>Add a marker</h3>
              <div className="type-chips">
                {ADDABLE_TYPES.map((t) => (
                  <button
                    key={t}
                    className={addType === t ? "chip active" : "chip"}
                    onClick={() => setAddType(addType === t ? null : t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {addType && <p className="muted small">Click on the image to place a {addType}.</p>}
            </div>

            <div className="verify-sidebar-section">
              <h3>Verify checklist</h3>
              {annotations.length === 0 && <p className="muted small">No proposed items on this capture yet.</p>}
              <ul className="verify-list">
                {annotations.map((a, idx) => (
                  <li key={a.id} className="verify-item">
                    <label>
                      <input type="checkbox" checked={!!checked[a.id]} onChange={() => toggleCheck(a.id)} />
                      #{idx + 1} {a.item_type} {a.room ? `— ${a.room}` : ""}{" "}
                      {a.length_ft ? `— ${a.length_ft} ft` : ""}{" "}
                      <span className={`status-badge ${a.status}`}>{a.status}</span>
                    </label>
                    <div className="verify-item-actions">
                      {a.status !== "verified" && (
                        <button className="link-btn small" onClick={() => confirmAnnotation(a)}>
                          confirm
                        </button>
                      )}
                      {a.kind === "polyline" && (
                        <button className="link-btn small" onClick={() => recomputeLength(a)}>
                          recompute length
                        </button>
                      )}
                      <button className="link-btn small" onClick={() => removeAnnotation(a)}>
                        delete (false positive)
                      </button>
                      <button className="link-btn small" onClick={() => setFlagFor(a)}>
                        flag a difference
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              <button className="primary-btn" disabled={!allChecked} onClick={confirmAll}>
                {allChecked ? "Confirm all checked" : "Check every item to enable confirm-all"}
              </button>
              <button className="link-btn small" onClick={() => setFlagFor({})}>
                Flag a difference (general)
              </button>
            </div>
          </div>
        </div>

        {flagFor && (
          <form className="flag-form modal-inline-form" onSubmit={submitFlag}>
            <label>
              What's wrong? (error type / note)
              <input type="text" value={flagNote} onChange={(e) => setFlagNote(e.target.value)} required />
            </label>
            <button type="submit" className="primary-btn small">
              Submit flag
            </button>
            <button type="button" className="link-btn small" onClick={() => setFlagFor(null)}>
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
