// A lightweight in-memory edit session.
//
// Current approach:
// - When edit mode is enabled, users can change fields.
// - Clicking Save persists each section to localStorage (and appends history).
// - Clicking Cancel simply reloads the page (discarding unsaved state). This avoids having to plumb
//   a full two-phase commit through every component.
//
// This is intentionally small and can be evolved later into a richer draft system.

export function discardEdits() {
  window.location.reload()
}
