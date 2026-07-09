# Counting & Measurement Phases

## COUNTING

### Capture requirements (non-negotiable)

Counting requires zoomed-region captures. Full-sheet screenshots downscale
small symbols into ambiguity — in live piloting, a full-sheet view produced a
hedged "6–8 diffusers" while a zoomed capture produced a committed, verifiable
7 and resolved a thermostat invisible at full-sheet zoom. The rule to teach:
"zoom until YOU can read it, then capture that region." If the human can read
the capture, the model can. If a provided capture is not legible enough to
count, say so and request regions — never guess.

### Symbol recognition — the taught distinctions

- **Supply diffuser**: square with a full X (louvers seen from below). Always
  at the END of a duct run, inside a room. It is a DESTINATION.
- **Return grille**: square with ONE diagonal. Easy to confuse with supply at
  a glance — check the legend, not intuition.
- **Exhaust grille**: the legend's third square variant.
- **Duct fittings** (elbows, takeoffs w/ balancing dampers, reducers): appear
  ALONG a duct line, mid-run. Air passes through; nothing enters the room.
  NOT counted as devices (takeoffs/dampers may be counted as fittings per
  notes).
- **Flex duct**: coiled/spiral line. Each coil has exactly one destination —
  coils counted should equal diffusers counted; a mismatch means a miss.
- **Thermostat**: circled T, typically near the AHU or on a central wall.

**The counting rule**: trace every duct line to where it stops. The symbol at
the end, in a room, is the device — count it. Anything along the way is a
fitting — don't.

### Scope may hide in keynotes, not symbols

Some counted items never appear as glyphs. Live-pilot example: the return was
a filter grille at the AHU plenum, specified only by a circled keynote number
referencing a plan note — no return-grille symbol anywhere on the plan. When
the learner cannot find an expected symbol, check keynotes, plan notes, and
schedule remarks before concluding the item doesn't exist. Teach: symbols,
keynotes, notes, and schedules are the four places scope hides.

### Present counts as inspectable proposals

Never deliver a bare number. Deliver an annotated proposal: each counted item
with its location (room/zone), plus the trace logic ("seven coils, seven
terminations"). Invite challenge. When the human disputes a placement,
RE-EXAMINE THE SOURCE IMAGE rather than defending the proposal — in piloting,
a learner correctly caught a mis-placed diffuser (count right, room wrong).
Location errors are real errors: room assignment affects the takeoff record
and, on larger jobs, zone pricing. Accept corrections, restate the corrected
map, and re-verify.

### Exhaust side

Count on the exhaust/ventilation diagram if the set splits systems across
diagrams (common; prevents double-counting). Typical items: bath exhaust fans
(quantity from plan, spec from schedule), range hood terminations,
outside-air/ventilation intake assemblies (often with a motorized isolation
damper per the notes).

## MEASUREMENT

### Calibration — never trust the stated scale on a capture

The printed scale (e.g., 1/4" = 1'-0") dies the moment a PDF is zoomed or
screenshotted. Calibrate against a known on-drawing reference instead, in
order of preference:

1. **Dimension strings** — from the ARCHITECTURAL floor plan (M and E sheets
   almost never carry dimensions; the architectural sheet is the geometry
   authority — every trade measures off it). Outermost string = overall
   building dimension.
2. **Self-check the reading**: multiply overall width × depth and compare to
   the stated floor area if given (pilot example: 38'-4" × 28'-6" ≈ 1,092 SF,
   matching the sheet's label). A wildly-off product means a misread string.
3. **Fallback**: standard-size objects — interior door 2'-6"–3'-0", tub
   5'-0", counter depth 2'-0".

The human reads and verifies the calibration numbers — every downstream
measurement inherits calibration error.

### The conversion is code, not vision

pixels-per-foot = reference pixels ÷ reference feet; length = item pixels ÷
pixels-per-foot. Code does this arithmetic. Vision proposes endpoints; the
human confirms them. State results as approximations with the method shown.

### Spec constraints reshape measurements

Check notes before pricing lengths. Pilot example: drawn flex runs scaled to
4–14 ft, but notes capped flex at 5 ft — so long runs are rigid branch duct
finished with ≤5 ft of flex. Pricing all-flex violates spec; pricing only
5 ft/run shorts material. The note + measurement together give the number.

### What the plan view hides

Floor plans show two dimensions. Add vertical footage for every riser/drop
(duct up/down symbols; AHU riser) using ceiling/attic height assumptions,
stated explicitly. Learners forget vertical footage constantly — always ask
"how many risers, at what height?"

### Waste and honesty

Apply a stated waste/rounding factor (10% default) to measured lengths.
Schematic drawings (most residential mechanical sets say so on their face)
support defensible approximation, not precision theater. Say which numbers
are measured, which estimated, and what margin was applied.
