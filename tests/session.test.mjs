import test from 'node:test';
import assert from 'node:assert/strict';
import { openHelp, closeHelp, canAdvanceSession } from '../src/session.mjs';

const battle = paused => ({
  screen: 'battle', phase: 'resolving', paused, help: false,
  helpWasPaused: false, beat: 1, beatTimer: 840, elapsed: 5100,
});

test('P then H then Escape preserves pause and keeps the production frame gate closed', () => {
  const state = battle(true);
  openHelp(state);
  assert.equal(state.help, true);
  assert.equal(canAdvanceSession(state), false);
  closeHelp(state);
  assert.equal(state.help, false);
  assert.equal(state.paused, true);
  assert.equal(canAdvanceSession(state), false);
  assert.equal(state.beat, 1);
  assert.equal(state.beatTimer, 840);
  assert.equal(state.elapsed, 5100);
});

test('help opened from running battle restores running state and original beat', () => {
  const state = battle(false);
  openHelp(state);
  assert.equal(state.paused, true);
  assert.equal(canAdvanceSession(state), false);
  closeHelp(state);
  assert.equal(state.paused, false);
  assert.equal(canAdvanceSession(state), true);
  assert.equal(state.beatTimer, 840);
});

test('repeated H cannot replace the pre-help running state with temporary pause', () => {
  const state = battle(false);
  openHelp(state);
  openHelp(state);
  closeHelp(state);
  assert.equal(state.paused, false);
  assert.equal(canAdvanceSession(state), true);
});

test('closing absent help is a no-op and cannot resume a paused game', () => {
  const state = battle(true), before = structuredClone(state);
  closeHelp(state);
  assert.deepEqual(state, before);
});

test('nonbattle help restores its prior state without changing the screen', () => {
  const state = { screen: 'title', help: false, paused: false };
  openHelp(state);
  assert.equal(state.paused, false);
  assert.equal(canAdvanceSession(state), false);
  closeHelp(state);
  assert.equal(state.paused, false);
  assert.equal(state.screen, 'title');
});
