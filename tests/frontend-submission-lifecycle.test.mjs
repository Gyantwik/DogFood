import { JSDOM } from '../frontend/node_modules/jsdom/lib/api.js';
import assert from 'node:assert';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>');
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

const { renderSubmit } = await import('../frontend/src/views/submitView.js');
const { api } = await import('../frontend/src/api/client.js');
const { authStore } = await import('../frontend/src/store/authStore.js');

authStore.setSession({ token: 'test', userId: 100, role: 'PARTICIPANT' });

// Test Case 1: Before deadline -> Submitted project is EDITABLE!
api.getMySubmission = async () => ({
  id: 123,
  title: 'Active Submission',
  status: 'SUBMITTED',
  description: 'Pre-deadline build'
});
api.getEvent = async () => ({
  id: 2,
  name: 'Open Hackathon',
  submissionDeadline: new Date(Date.now() + 3600000).toISOString()
});
api.getTeams = async () => [];
api.getTracks = async () => [];
api.getCustomQuestions = async () => [];

const root = document.getElementById('root');
renderSubmit(root, '2');
await new Promise(r => setTimeout(r, 60));

const titleInput = document.getElementById('pTitle');
const submitBtn = document.getElementById('submitProjectBtn');
const deadlinePill = document.getElementById('deadlinePill');
const subPill = document.getElementById('subStatusPill');

console.log('1. Pre-Deadline Submitted State:');
console.log('  titleInput disabled:', titleInput.disabled, '(Expected: false)');
console.log('  submitBtn text:', submitBtn.textContent, '(Expected: Update submission →)');
console.log('  deadlinePill text:', deadlinePill.textContent, '(Expected: SUBMISSIONS OPEN)');
console.log('  subPill text:', subPill.textContent, '(Expected: SUBMITTED)');

assert.strictEqual(titleInput.disabled, false, "titleInput must be enabled before deadline");
assert.ok(submitBtn.textContent.includes('Update submission'), "submitBtn must indicate update submission");
assert.ok(deadlinePill.textContent.includes('SUBMISSIONS OPEN'), "deadlinePill must indicate open submissions");

// Test Case 2: After deadline -> Locked read-only!
root.innerHTML = '';
api.getEvent = async () => ({
  id: 2,
  name: 'Closed Hackathon',
  submissionDeadline: new Date(Date.now() - 3600000).toISOString()
});

renderSubmit(root, '2');
await new Promise(r => setTimeout(r, 60));

const titleLocked = document.getElementById('pTitle');
const submitLocked = document.getElementById('submitProjectBtn');
const deadlineClosed = document.getElementById('deadlinePill');
const subLockedPill = document.getElementById('subStatusPill');

console.log('\n2. Post-Deadline Locked State:');
console.log('  titleLocked disabled:', titleLocked.disabled, '(Expected: true)');
console.log('  submitLocked disabled:', submitLocked.disabled, '(Expected: true)');
console.log('  deadlineClosed text:', deadlineClosed.textContent, '(Expected: SUBMISSIONS CLOSED)');
console.log('  subLockedPill text:', subLockedPill.textContent, '(Expected: SUBMITTED (LOCKED))');

assert.strictEqual(titleLocked.disabled, true, "titleInput must be locked after deadline");
assert.strictEqual(submitLocked.disabled, true, "submitBtn must be disabled after deadline");
assert.ok(deadlineClosed.textContent.includes('SUBMISSIONS CLOSED'), "deadlinePill must indicate closed submissions");

console.log('\n[PASS] All frontend submission lifecycle assertions verified successfully!');
