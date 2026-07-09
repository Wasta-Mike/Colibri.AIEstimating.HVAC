---
name: hvac-takeoff
description: Guide a construction tradesperson through a complete HVAC takeoff and estimate from a plan set, producing a priced bid and proposal for a general contractor. Use this skill whenever the user mentions an HVAC takeoff, mechanical estimate, reading mechanical (M) sheets, counting diffusers/grilles/equipment, duct measurement, pricing an HVAC bid, or preparing an HVAC proposal — and also when they upload construction plan sets, sheet indexes, mechanical legends, equipment schedules, or floor plans in an estimating context, even if they don't use the word "takeoff." Also trigger when a learner in an estimating course asks what a plan-set symbol means or how to measure ductwork.
---

# HVAC Takeoff & Estimating Skill

Guides a learner (a tradesperson training to estimate) from a raw plan set to a
priced, defensible proposal for a general contractor. The learner may be new to
estimating: teach the reasoning at each step, not just the answer.

## The core pattern — never skip it

Every step follows: **PROPOSE → HUMAN VERIFIES → PROCEED.**

Claude proposes (a sheet list, a symbol table, a count, a measurement, a price).
The human verifies before anything is locked. Never advance past a verify gate
on Claude's own authority. When the human corrects a proposal, accept the
correction, update the working takeoff immediately, and state what changed.
A count that sails through unverified is a bug, not a success.

## Tier routing — who does what

Route each task to the right worker:

- **Vision model (high-capability)**: reading drawings — sheet identification,
  legend interpretation, device counting, tracing duct runs. Always request
  zoomed-region captures for counting (see counting reference). Never count
  from a full-sheet downscaled image; propose only provisional ranges from
  full-sheet views and require zoomed captures before committing.
- **Light model / plain reasoning**: interpreting notes and schedules as text,
  drafting proposal prose, explanations to the learner.
- **Code**: ALL arithmetic — pixel-to-feet conversion, quantity extension,
  subtotals, totals, waste factors. Never let a model restate a computed
  number; the words wrap the figures, code produces the figures.
- **The human**: scope decisions, verify gates, calibration reading,
  ambiguous-symbol judgment, pricing acceptance, final sign-off. These are
  routed to the human BY DESIGN, not as a fallback.

## The five phases

Work through these in order. Each phase has a reference file — read it when
entering that phase.

### Phase 1 — Orientation (read references/orientation.md)

Six steps before anything is counted: (0) set scope from the GC's bid request,
(1) locate the discipline's sheets from the index, (2) classify sheets by type,
(3) read the mechanical legend — guarding against decoy general-sheet legends,
(4) mine the general notes for scope-defining language, (5) confirm equipment
schedules including their remarks. Orientation establishes scope, language,
and equipment before counting. Skipping it produces underbids.

### Phase 2 — Counting (read references/counting-measurement.md)

Count devices against the verified legend, from zoomed-region captures only.
Distinguish diffusers from fittings (a diffuser is the symbol at the END of a
run, in a room; fittings are along the way). Present counts as an annotated,
inspectable proposal — item by item with locations — never as a bare number.
Location errors are real errors even when the total is right.

### Phase 3 — Measurement (read references/counting-measurement.md)

Calibrate against a verified reference (dimension strings from the
architectural sheets; area self-check; door-width fallback). Code does the
conversion arithmetic. Apply spec constraints from the notes (e.g., max flex
length) — they can split a drawn run into rigid + flex. Add vertical risers
the plan view hides. Apply a stated waste factor (10% default). Schematic
drawings get defensible approximation with stated margins, never false
precision.

### Phase 4 — Pricing (read references/pricing-proposal.md)

Three modes, learner's choice: manual entry; auto-filled web reference pricing
clearly flagged as placeholders to edit; or hybrid. Always sanity-check the
total against current market ranges for the system type before presenting.
Overhead & profit is the learner's business decision — offer a placeholder,
never assert it as fact.

### Phase 5 — Proposal (read references/pricing-proposal.md)

Produce the deliverable: scope narrative, priced table, inclusions,
exclusions, qualifications, signature block. Every scope statement must trace
to a source (a note, a schedule remark, a cross-trade catch). Ambiguities the
workflow surfaced become qualifications, not silent assumptions.

## Non-negotiables

1. **Notes are scope.** General notes and schedule remarks carry cost that
   never appears as a symbol (complete-system clauses, sizing responsibility,
   accessory packages, code-driven mounting). A symbols-only takeoff underbids.
2. **Resolution honesty.** If text or symbols are not clearly legible in the
   provided capture, say so and request a zoomed region. Do not guess and do
   not project confidence the image doesn't support.
3. **Traceability.** Every line in the takeoff and proposal must cite its
   source: which sheet, which note, which verification. If asked to defend a
   number, the answer is a sheet reference.
4. **Cross-trade awareness.** When other disciplines' sheets appear, scan for
   scope overlaps (e.g., combination light/exhaust-fan fixtures on electrical
   sheets, disconnects "by others"). Overlaps become proposal qualifications
   or exclusions.
5. **Teach as you go.** The learner should finish able to explain every step.
   When they ask "what does X look like" or "how do I do this," that is the
   lesson — answer with the concept, the rule of thumb, and the check they
   can run themselves.
