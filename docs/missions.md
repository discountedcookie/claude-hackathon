# Missions — why are you going to this event?

Beyond "free plus one", a match should be about *intent*. Both sides write a
short mission for the event: what they want out of it, or what they bring.

- A local goes to the Claude meetup **to learn Claude**.
- A foreigner goes **to find beta users**, or **to meet the Thai dev scene**,
  or just **because they hate going alone**.

Two people whose missions complement each other get a better evening than two
random strangers — and it gives them an opener for the first conversation.

## Model

- `offers.mission` — the foreigner's stated intent, written when sharing the
  Luma link. Free text, one or two sentences.
- `matches.local_mission` — the local's intent, written at claim time.

Both missions are visible to the matched pair. Locals browsing an event see
each foreigner's mission next to the "Pick them" button, so they choose by
resonance, not by a name.

## The "any" button becomes "who fits me?"

Instead of a random pick, the local can hand their mission to the LLM along
with all open offers' missions for that event and get the best-fitting
foreigner back. Plain random stays as fallback when the local has no
preference and the AI call fails.

Out of scope for now: embeddings, standing profiles of interests, two-sided
compatibility scores per pair (per-event missions only).
