// Preserve the pause state independently of the help overlay. Repeated H presses
// must not overwrite the original state with help's temporary pause.
export function openHelp(state) {
  if (state.help) return;
  state.helpWasPaused = state.paused;
  state.help = true;
  if (state.screen === 'battle') state.paused = true;
}

export function closeHelp(state) {
  if (!state.help) return;
  state.help = false;
  state.paused = state.helpWasPaused;
  state.helpWasPaused = false;
}

export function canAdvanceSession(state) {
  return !state.paused && !state.help;
}
