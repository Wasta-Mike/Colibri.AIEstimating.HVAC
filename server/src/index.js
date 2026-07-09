import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "./db.js";

import { router as sessionsRouter } from "./routes/sessions.js";
import { router as capturesRouter } from "./routes/captures.js";
import { router as stepRouter } from "./routes/step.js";
import { router as gridRouter } from "./routes/grid.js";
import { router as annotationsRouter } from "./routes/annotations.js";
import { router as correctionsRouter } from "./routes/corrections.js";
import { router as pricingRouter } from "./routes/pricing.js";
import { router as exportRouter } from "./routes/exportRoutes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: "25mb" })); // captures arrive as base64 PNGs

app.use("/uploads/captures", express.static(path.join(__dirname, "..", "data", "captures")));

app.use("/api/sessions", sessionsRouter);
app.use("/api/captures", capturesRouter);
app.use("/api/step", stepRouter);
app.use("/api/grid", gridRouter);
app.use("/api/annotations", annotationsRouter);
app.use("/api/corrections", correctionsRouter);
app.use("/api/pricing", pricingRouter);
app.use("/api/export", exportRouter);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, anthropicKeySet: !!process.env.ANTHROPIC_API_KEY });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`hvac-takeoff-server listening on http://localhost:${port}`));
