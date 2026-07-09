import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.join(__dirname, "..", "..", "skill");

const SKILL_MD = fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf-8");
const ORIENTATION = fs.readFileSync(path.join(skillDir, "references", "orientation.md"), "utf-8");
const COUNTING_MEASUREMENT = fs.readFileSync(
  path.join(skillDir, "references", "counting-measurement.md"),
  "utf-8"
);
const PRICING_PROPOSAL = fs.readFileSync(
  path.join(skillDir, "references", "pricing-proposal.md"),
  "utf-8"
);

// Maps a workflow step id to the phase reference text the model needs loaded.
const STEP_REFERENCE = {
  "orientation-0": ORIENTATION,
  "orientation-1": ORIENTATION,
  "orientation-2": ORIENTATION,
  "orientation-3": ORIENTATION,
  "orientation-4": ORIENTATION,
  "orientation-5": ORIENTATION,
  counting: COUNTING_MEASUREMENT,
  measurement: COUNTING_MEASUREMENT,
  pricing: PRICING_PROPOSAL,
  proposal: PRICING_PROPOSAL,
};

export function referenceForStep(stepId) {
  return STEP_REFERENCE[stepId] || "";
}

export function coreSkillText() {
  return SKILL_MD;
}
