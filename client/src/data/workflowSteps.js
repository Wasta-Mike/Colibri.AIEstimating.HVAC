export const PHASES = {
  orientation: "Orientation",
  counting: "Counting",
  measurement: "Measurement",
  pricing: "Pricing",
  proposal: "Proposal",
};

export const WORKFLOW_STEPS = [
  {
    id: "orientation-0",
    phase: "orientation",
    title: "0 · Set scope",
    verifyGate: "Is the bid package (air-side only vs. combined mechanical) confirmed?",
    starterPrompt:
      "Here's the GC's bid request: [paste or describe it]. What package are we bidding — HVAC air-side only, or combined mechanical? Confirm scope with me before we open any drawings.",
  },
  {
    id: "orientation-1",
    phase: "orientation",
    title: "1 · Locate the M sheets",
    verifyGate: "Is the M-sheet list complete? Check for mechanical details hiding on architectural pages.",
    starterPrompt:
      "Here's the sheet index / cover sheet capture. Propose the mechanical (M) sheet list — sheet number, title, and likely contents.",
  },
  {
    id: "orientation-2",
    phase: "orientation",
    title: "2 · Classify the sheets",
    verifyGate: "Is the classification (legend/notes, schedules, plans, details, controls) confirmed?",
    starterPrompt:
      "Sort these M sheets into: legend/notes, schedules, floor plans, details/sections, controls.",
  },
  {
    id: "orientation-3",
    phase: "orientation",
    title: "3 · Read the mechanical legend",
    verifyGate: "Is the symbol table confirmed, and are there symbols on the plan with no legend entry?",
    starterPrompt:
      "Here's the capture of the M-sheet symbol key. Build the symbol table (symbol → equipment) and flag anything that looks like a decoy (abbreviations list / architectural legend) instead of the real HVAC legend.",
  },
  {
    id: "orientation-4",
    phase: "orientation",
    title: "4 · Mine the general notes",
    verifyGate: "Has the learner confirmed the scope reading — especially complete-system clause and design responsibility?",
    starterPrompt:
      "Here are the mechanical general notes. Pull out scope-defining language: complete-system clauses, design responsibility (Manual J/S/D), spec constraints affecting measurement, install requirements with cost, and permitting responsibility.",
  },
  {
    id: "orientation-5",
    phase: "orientation",
    title: "5 · Confirm equipment schedules",
    verifyGate: "Is the unit list plus accessory scope (from remarks) confirmed?",
    starterPrompt:
      "Here are the equipment schedules. Read every row including remarks and give me the unit list with accessory scope and any sizing deferrals.",
  },
  {
    id: "counting",
    phase: "counting",
    title: "Count devices",
    verifyGate: "Has every counted item been checked off in the verify sidebar (no false positives, no missed rooms)?",
    starterPrompt:
      "Here's a zoomed capture of [room/zone]. Count the diffusers, returns, exhaust grilles, and thermostats and show me each one's location and the trace logic.",
  },
  {
    id: "measurement",
    phase: "measurement",
    title: "Measure ductwork",
    verifyGate: "Is the calibration confirmed, and have spec constraints + vertical risers been applied?",
    starterPrompt:
      "Here's the calibrated capture. Propose the duct run lengths, flag spec constraints that affect them (e.g., max flex length), and ask me about vertical risers.",
  },
  {
    id: "pricing",
    phase: "pricing",
    title: "Price the takeoff",
    verifyGate: "Has every line been reviewed, and does the total pass the market-range sanity check?",
    starterPrompt:
      "Let's price the verified takeoff. I want manual / auto-fill / hybrid pricing (tell me which). Sanity-check the total against current market ranges for this system type.",
  },
  {
    id: "proposal",
    phase: "proposal",
    title: "Generate the proposal",
    verifyGate: "Does every scope statement, inclusion, exclusion, and qualification trace to a source?",
    starterPrompt:
      "Draft the scope narrative, inclusions, exclusions, and qualifications for the proposal based on everything we've confirmed so far.",
  },
];

export function stepById(id) {
  return WORKFLOW_STEPS.find((s) => s.id === id);
}

export const GRID_SECTIONS = ["Equipment", "Air distribution devices", "Ductwork", "Scope items"];
