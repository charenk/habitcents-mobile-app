# Onboarding beat captures: runbook

Required by ADR 0026. The carousel's three beats show the REAL app, recorded.
Never a hand-built scene, never a mock-up. A simulated beat drifts silently
every time the app is redesigned; a recording can only ever be out of date,
which is a visible chore rather than a quiet lie.

Nothing here is optional dressing: `BeatMedia` renders an honest empty frame
until these files exist, so the carousel ships visibly incomplete rather than
showing something fake.

## What to produce

Two beats, each needing two files:

| Beat | Intent | Records | Files |
|---|---|---|---|
| 1 | track | Logging one expense end to end | `beat-track.mp4`, `beat-track.png` |
| 2 | break | Naming a habit, pricing it, starting it | `beat-break.mp4`, `beat-break.png` |

The scan beat was removed from the carousel on 2026-09-05 (decision 0009):
the leak scan is dormant behind `SCAN_FLOW_ENABLED`, and a beat whose CTA
cannot start its real workflow is what ADR 0026 forbids. Do not capture
`beat-scan.*` until that flag is on again.

Both files per beat. The `.png` is the poster still, and it is NOT a
placeholder for the video: it IS the reduced-motion rendering, so a beat
without one cannot honour the accessibility rule.

Drop them in this directory. Wiring is one edit: add `asset` to the matching
entry in `BEATS` (`components/onboarding/OnboardingCarousel.tsx`).

## Capture settings

- **Device:** iPhone 16 simulator or a real iPhone with the same aspect. The
  frame renders at 9:16, so capture portrait full-screen with no device chrome.
- **Appearance:** light mode. The app is light-only (direction lock 2026-07-02).
- **Length:** 3 to 5 seconds, and the last frame should sit close to the first
  so the loop does not visibly snap.
- **Format:** HEVC or H.264 MP4. Never GIF: a GIF of this length runs to
  several MB, decodes on the JS thread, and costs battery for a worse picture.
- **Poster:** export the frame that best states the beat, not necessarily frame
  one. It is what a reduced-motion user sees instead of the whole clip.
- **No status bar clock drift:** capture in one take, so the clock does not jump
  mid-loop.

## Seed data rules

These recordings are marketing-adjacent surfaces, so ADR 0022's no-invented-
totals rule applies to them exactly as it does in the app.

- **Never record an accumulated total the user has not earned.** No kept counter
  showing $128, no "you saved" figure. If the kept band is on screen, it reads
  its true zero.
- Per-item prices are fine: a $6.50 coffee is arithmetic, not a claim.
- Use plausible, boring merchants. Nothing that names a real person, and no
  real bank data in the scan beat (the committed synthetic fixtures under
  `__tests__/leakScanEval/fixtures/` are the source).
- Keep amounts example-scale. The hook text carries the framing; the recording
  should not have to argue.

## Re-capture is a release-checklist item

Whenever an onboarding-visible surface changes (the log sheet, the scan flow,
the break sheet, the palette, the type scale), these recordings are stale and
must be retaken before the next build.

That is the standing cost ADR 0026 accepted in exchange for never shipping a
simulated beat. A stale video is a checklist miss, which is findable. A drifted
mock-up is not.

Add to the release checklist:

- [ ] Onboarding beat captures re-taken, or confirmed unaffected by this build.

## Why there is no video player yet

Playback needs a native module (`expo-video`), which is not a dependency of
this app. Adding it forces the next build to be a fresh native build rather
than an OTA update, so it is deliberately left to whoever lands the real
captures: there is no reason to pay that cost for an empty frame.

`BeatMedia` already carries the contract (`BeatAsset.video`), so that change is
additive: install the module, render the video branch, and the poster stays as
the reduced-motion path.
