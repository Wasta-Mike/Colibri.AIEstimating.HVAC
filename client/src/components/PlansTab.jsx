import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { api } from "../api.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const RENDER_SCALE = 2.5; // "render at high DPI" per brief — capture crops come from this canvas

export default function PlansTab({ session, captures, onCapturesChanged, onOpenCapture, onAttachToChat }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [thumbUrls, setThumbUrls] = useState([]);
  const [displayScale, setDisplayScale] = useState(1);
  const [drag, setDrag] = useState(null); // {startX, startY, x, y, w, h} in displayed px
  const [pendingCrop, setPendingCrop] = useState(null); // {dataUrl, width, height}
  const [label, setLabel] = useState("");
  const [error, setError] = useState(null);

  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setCurrentPage(1);
      const thumbs = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 0.25 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
        thumbs.push(canvas.toDataURL("image/png"));
      }
      setThumbUrls(thumbs);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (!pdfDoc) return;
    renderPage(currentPage);
  }, [pdfDoc, currentPage]);

  async function renderPage(pageNum) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = canvasRef.current;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  }

  function toCanvasCoords(clientX, clientY) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY, rect, scaleX, scaleY };
  }

  function onMouseDown(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    setDrag({
      startClientX: e.clientX,
      startClientY: e.clientY,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      w: 0,
      h: 0,
    });
  }
  function onMouseMove(e) {
    if (!drag) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const curX = e.clientX - rect.left;
    const curY = e.clientY - rect.top;
    setDrag((d) => ({
      ...d,
      x: Math.min(d.startClientX - rect.left, curX),
      y: Math.min(d.startClientY - rect.top, curY),
      w: Math.abs(curX - (d.startClientX - rect.left)),
      h: Math.abs(curY - (d.startClientY - rect.top)),
    }));
  }
  function onMouseUp() {
    if (!drag || drag.w < 8 || drag.h < 8) {
      setDrag(null);
      return;
    }
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const sx = drag.x * scaleX;
    const sy = drag.y * scaleY;
    const sw = drag.w * scaleX;
    const sh = drag.h * scaleY;
    const crop = document.createElement("canvas");
    crop.width = sw;
    crop.height = sh;
    crop.getContext("2d").drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
    setPendingCrop({ dataUrl: crop.toDataURL("image/png"), width: sw, height: sh });
    setDrag(null);
  }

  async function saveCapture(captureType = "region") {
    if (captureType === "full-page") {
      const canvas = canvasRef.current;
      await api.createCapture({
        sessionId: session.id,
        label: label || `Page ${currentPage} (full)`,
        pageNumber: currentPage,
        dataUrl: canvas.toDataURL("image/png"),
        width: canvas.width,
        height: canvas.height,
        captureType: "full-page",
      });
    } else {
      if (!pendingCrop) return;
      await api.createCapture({
        sessionId: session.id,
        label: label || `Page ${currentPage} region`,
        pageNumber: currentPage,
        dataUrl: pendingCrop.dataUrl,
        width: pendingCrop.width,
        height: pendingCrop.height,
        captureType: "region",
      });
    }
    setPendingCrop(null);
    setLabel("");
    onCapturesChanged();
  }

  return (
    <div className="plans-tab">
      <h2>Plans</h2>
      {!pdfDoc && (
        <div className="upload-zone">
          <p className="muted">Upload the plan-set PDF to begin (or re-upload it — captures below persist across reloads).</p>
          <input type="file" accept="application/pdf" onChange={handleFile} />
        </div>
      )}
      {error && <div className="error-text">{error}</div>}

      <div className={pdfDoc ? "plans-layout" : "plans-layout no-pdf"}>
        {pdfDoc && (
          <div className="thumb-rail">
            {thumbUrls.map((url, i) => (
              <button
                key={i}
                className={currentPage === i + 1 ? "thumb active" : "thumb"}
                onClick={() => setCurrentPage(i + 1)}
              >
                <img src={url} alt={`Page ${i + 1}`} />
                <span>{i + 1}</span>
              </button>
            ))}
          </div>
        )}

        {pdfDoc && (
          <div className="page-viewer">
            <p className="muted small">
              Drag a box over the area you want to count/measure, then label and save it as a capture.
              "Zoom until you can read it, then capture that region."
            </p>
            <div
              className="canvas-wrapper"
              ref={wrapperRef}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
            >
              <canvas ref={canvasRef} />
              {drag && (
                <div
                  className="selection-box"
                  style={{ left: drag.x, top: drag.y, width: drag.w, height: drag.h }}
                />
              )}
            </div>

            {pendingCrop && (
              <div className="capture-confirm">
                <img src={pendingCrop.dataUrl} alt="capture preview" className="capture-preview" />
                <input
                  type="text"
                  placeholder="Label this capture (e.g. 'M0.1 legend')"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
                <button className="primary-btn" onClick={() => saveCapture("region")}>
                  Save capture
                </button>
                <button className="link-btn" onClick={() => setPendingCrop(null)}>
                  Discard
                </button>
              </div>
            )}

            <div className="page-viewer-actions">
              <input
                type="text"
                placeholder="Label for full-page capture"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <button className="link-btn" onClick={() => saveCapture("full-page")}>
                Capture whole page
              </button>
            </div>
          </div>
        )}

        <div className="capture-gallery">
          <h3>Session gallery</h3>
          {captures.length === 0 && <p className="muted small">No captures yet.</p>}
          {captures.map((c) => (
            <div key={c.id} className="gallery-item">
              <img src={`/uploads/captures/${c.image_path}`} alt={c.label} />
              <div className="gallery-item-meta">
                <strong>{c.label}</strong>
                <span className="muted small">
                  {c.capture_type}
                  {c.pixels_per_foot ? " · calibrated" : ""}
                </span>
                <div className="gallery-item-actions">
                  <button className="link-btn small" onClick={() => onOpenCapture(c.id)}>
                    Review / calibrate
                  </button>
                  <button className="link-btn small" onClick={() => onAttachToChat(c.id)}>
                    Attach to chat
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
