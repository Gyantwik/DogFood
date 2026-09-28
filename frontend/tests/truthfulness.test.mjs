// Frontend Truthfulness and Dynamic Route Test Suite
// Run using: node frontend/tests/truthfulness.test.mjs
import assert from 'node:assert';

// Robust lightweight DOM Mock for Node.js test execution
class ClassList {
  constructor(el) {
    this.el = el;
    this._classes = new Set();
  }
  add(...classes) {
    classes.forEach(c => this._classes.add(c));
    this.el.className = Array.from(this._classes).join(' ');
  }
  remove(...classes) {
    classes.forEach(c => this._classes.delete(c));
    this.el.className = Array.from(this._classes).join(' ');
  }
  contains(cls) {
    return this._classes.has(cls);
  }
  toggle(cls) {
    if (this._classes.has(cls)) this.remove(cls);
    else this.add(cls);
  }
}

class MockNode {
  constructor(nodeName = '#node', nodeType = 1) {
    this.nodeName = nodeName;
    this.nodeType = nodeType;
    this.parentNode = null;
    this.children = [];
    this._textContent = '';
  }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }
  get textContent() {
    if (this.nodeType === 3) return this._textContent;
    if (this.children.length > 0) return this.children.map(c => c.textContent).join('');
    return this._textContent;
  }
  set textContent(val) {
    this.children = [];
    this._textContent = String(val);
  }
  get outerHTML() {
    if (this.nodeType === 3) return this._textContent;
    return '';
  }
}

class MockElement extends MockNode {
  constructor(tagName = 'div') {
    super(tagName.toUpperCase(), 1);
    this.tagName = tagName.toUpperCase();
    this._value = '';
    this.className = '';
    this.classList = new ClassList(this);
    this.style = {
      setProperty: (k, v) => { this.style[k] = v; }
    };
    this.attributes = {};
    this.dataset = {};
    this.disabled = false;
    this._listeners = {};
    this.width = 800;
    this.height = 600;
  }

  getContext() {
    return {
      fillRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      moveTo: () => {},
      lineTo: () => {},
      drawImage: () => {},
      setTransform: () => {},
      scale: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {}
    };
  }

  getBoundingClientRect() {
    return { width: 800, height: 600, top: 0, left: 0, bottom: 600, right: 800 };
  }

  get parentElement() {
    return this.parentNode || new MockElement('div');
  }

  get id() { return this.attributes['id'] || ''; }
  set id(val) { this.setAttribute('id', val); }

  get value() { return this._value; }
  set value(val) { this._value = String(val); }

  get innerHTML() {
    if (this._textContent) return this._textContent;
    if (this.children.length > 0) return this.children.map(c => c.outerHTML).join('');
    return '';
  }
  set innerHTML(html) {
    this.children = [];
    this._textContent = '';
    this._parseHtml(html);
  }

  get outerHTML() {
    const tag = this.tagName.toLowerCase();
    const attrs = Object.entries(this.attributes).map(([k, v]) => ` ${k}="${v}"`).join('');
    return `<${tag}${attrs}>${this.innerHTML}</${tag}>`;
  }

  setAttribute(name, val) {
    this.attributes[name] = String(val);
    if (name === 'id') globalDocMap.set(String(val), this);
    if (name === 'class') {
      this.className = String(val);
      this.classList._classes = new Set(String(val).split(/\s+/).filter(Boolean));
    }
    if (name === 'value') {
      this._value = String(val);
    }
  }
  getAttribute(name) { return this.attributes[name] || null; }
  hasAttribute(name) { return name in this.attributes; }
  removeAttribute(name) {
    if (name === 'id' && this.attributes['id']) {
      globalDocMap.delete(this.attributes['id']);
    }
    delete this.attributes[name];
  }

  addEventListener(type, handler) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(handler);
  }

  dispatchEvent(event) {
    const list = this._listeners[event.type] || [];
    for (const h of list) {
      h.call(this, event);
    }
  }

  querySelector(sel) {
    const all = this.querySelectorAll(sel);
    return all.length > 0 ? all[0] : null;
  }

  querySelectorAll(sel) {
    const results = [];
    const walk = (node) => {
      if (node !== this && node instanceof MockElement) {
        if (sel.startsWith('#')) {
          if (node.id === sel.slice(1)) results.push(node);
        } else if (sel.startsWith('.')) {
          if (node.classList.contains(sel.slice(1))) results.push(node);
        } else if (node.tagName.toLowerCase() === sel.toLowerCase()) {
          results.push(node);
        }
      }
      for (const c of node.children) walk(c);
    };
    walk(this);
    return results;
  }

  get firstChild() {
    return this.children.length > 0 ? this.children[0] : new MockElement('span');
  }

  _parseHtml(html) {
    const tagRegex = /<([-a-zA-Z0-9]+)([\s\S]*?)>/g;
    let tm;
    while ((tm = tagRegex.exec(html)) !== null) {
      const tag = tm[1];
      if (tag.startsWith('/')) continue;
      const attrStr = tm[2] || '';
      const el = new MockElement(tag);
      const attrRegex = /([-a-zA-Z0-9_]+)=["']([^"']*)["']/g;
      let am;
      while ((am = attrRegex.exec(attrStr)) !== null) {
        el.setAttribute(am[1], am[2]);
      }
      this.appendChild(el);
      if (el.id) {
        if (tag.toLowerCase() === 'select') el.value = 'All';
        globalDocMap.set(el.id, el);
      }
    }
    this._textContent = html;
  }
}

let globalDocMap = new Map();
let globalStorage = {};

function initGlobalDOM() {
  globalDocMap.clear();
  globalStorage = {};

  const localStorageMock = {
    getItem: (key) => globalStorage[key] || null,
    setItem: (key, val) => { globalStorage[key] = String(val); },
    removeItem: (key) => { delete globalStorage[key]; },
    clear: () => { globalStorage = {}; }
  };

  const body = new MockElement('body');
  globalDocMap.set('body', body);
  const documentElement = new MockElement('html');
  documentElement.scrollHeight = 2000;

  const documentMock = {
    body,
    documentElement,
    createElement: (tag) => new MockElement(tag),
    createTextNode: (text) => {
      const n = new MockNode('#text', 3);
      n._textContent = text;
      n.textContent = text;
      return n;
    },
    getElementById: (id) => globalDocMap.get(id) || null,
    querySelector: (sel) => {
      if (sel.startsWith('#')) return globalDocMap.get(sel.slice(1)) || null;
      return body.querySelector(sel);
    },
    querySelectorAll: (sel) => body.querySelectorAll(sel)
  };

  global.window = {
    location: { hash: '#/', pathname: '/' },
    localStorage: localStorageMock,
    sessionStorage: localStorageMock,
    addEventListener: () => {},
    dispatchEvent: () => {},
    scrollTo: () => {},
    matchMedia: () => ({ matches: false })
  };
  global.document = documentMock;
  global.localStorage = localStorageMock;
  global.sessionStorage = localStorageMock;
  global.Node = MockNode;
  global.HTMLElement = MockElement;
  global.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  global.cancelAnimationFrame = (id) => clearTimeout(id);
  global.Event = class Event {
    constructor(type) {
      this.type = type;
      this.defaultPrevented = false;
    }
    preventDefault() { this.defaultPrevented = true; }
  };
  global.CustomEvent = class CustomEvent extends global.Event {
    constructor(type, init = {}) {
      super(type);
      this.detail = init.detail;
    }
  };
}

async function runTests() {
  console.log("=================================================");
  console.log("Running Frontend Truthfulness & Route Test Suite");
  console.log("=================================================\n");

  const results = [];
  async function test(name, fn) {
    try {
      initGlobalDOM();
      await fn();
      results.push({ name, passed: true });
      console.log(`[PASS] ${name}`);
    } catch (err) {
      results.push({ name, passed: false, error: err });
      console.error(`[FAIL] ${name}:`, err.message);
    }
  }

  // Test 1: failed login does not create a fake session
  await test("1. Auth: Failed login does not create a fake session or JWT token", async () => {
    const { authStore } = await import('../src/store/authStore.js');
    const { api } = await import('../src/api/client.js');

    authStore.clearSession();
    assert.strictEqual(authStore.isAuthenticated(), false);
    assert.strictEqual(authStore.getToken(), null);

    api.login = async () => {
      throw new Error("Invalid credentials (HTTP 401)");
    };

    let errorCaught = null;
    try {
      await authStore.quickSwitch(authStore.getTestAccounts()[0], api);
    } catch (err) {
      errorCaught = err;
    }

    assert.ok(errorCaught !== null, "quickSwitch must throw on login failure");
    assert.strictEqual(authStore.isAuthenticated(), false, "User must remain unauthenticated");
    assert.strictEqual(authStore.getToken(), null, "Token must be null");
    assert.strictEqual(localStorage.getItem('dogfood_auth_session'), null, "No session persisted");
  });

  // Test 2: failed Save Draft does not report success
  await test("2. Submit: Failed Save Draft does not report success and displays error notification", async () => {
    const { renderSubmit } = await import('../src/views/submitView.js');
    const { api } = await import('../src/api/client.js');

    api.getMySubmission = async () => null;
    api.getEvent = async () => ({ id: 2, name: 'Test Hackathon', submissionDeadline: new Date(Date.now() + 86400000).toISOString() });

    let draftCallAttempted = false;
    api.submitProject = async () => {
      draftCallAttempted = true;
      throw new Error("Network error during draft persistence (HTTP 503)");
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    renderSubmit(container, '2');

    document.getElementById('pTitle').value = 'My Draft Title';
    document.getElementById('pTagline').value = 'Draft Tagline';

    const saveDraftBtn = document.getElementById('saveDraftBtn');
    saveDraftBtn.dispatchEvent(new Event('click'));
    await new Promise(r => setTimeout(r, 50));

    assert.ok(draftCallAttempted, "api.submitProject was called for draft creation");
    const toast = document.getElementById('toast2');
    assert.ok(toast !== null, "Toast element must exist");
    assert.ok(toast.textContent.includes('Draft save failed'), "Toast should reflect failure message");
    assert.ok(!toast.textContent.includes('successfully saved to server'), "Toast must NOT claim server success");
    assert.strictEqual(saveDraftBtn.disabled, false, "Save draft button re-enabled on error");
  });

  // Test 3: successful new draft creation persists server-side and update flow works
  await test("3. Submit: Successful new draft creation persists server-side with status DRAFT and updates cleanly", async () => {
    const { renderSubmit } = await import('../src/views/submitView.js');
    const { api } = await import('../src/api/client.js');

    let createdDraft = null;
    let updatedDraft = null;

    api.getMySubmission = async () => null; // No existing draft
    api.getEvent = async () => ({ id: 2, name: 'Test Hackathon', submissionDeadline: new Date(Date.now() + 86400000).toISOString() });

    api.submitProject = async (eventId, payload) => {
      assert.strictEqual(eventId, '2');
      assert.strictEqual(payload.status, 'DRAFT');
      createdDraft = {
        id: 777,
        eventId: 2,
        title: payload.title,
        tagline: payload.tagline,
        status: 'DRAFT'
      };
      return createdDraft;
    };

    api.updateSubmission = async (subId, payload) => {
      assert.strictEqual(subId, 777);
      assert.strictEqual(payload.status, 'DRAFT');
      updatedDraft = {
        id: 777,
        eventId: 2,
        title: payload.title,
        tagline: payload.tagline,
        status: 'DRAFT'
      };
      return updatedDraft;
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    renderSubmit(container, '2');

    // 1. Save new draft
    document.getElementById('pTitle').value = 'Fresh Draft';
    document.getElementById('pTagline').value = 'First Iteration';
    const saveDraftBtn = document.getElementById('saveDraftBtn');
    saveDraftBtn.dispatchEvent(new Event('click'));
    await new Promise(r => setTimeout(r, 15));

    assert.ok(createdDraft !== null, "Draft created on backend");
    assert.strictEqual(createdDraft.id, 777);

    // 2. Edit and save again -> should call updateSubmission(777)
    document.getElementById('pTitle').value = 'Fresh Draft - Edited';
    saveDraftBtn.dispatchEvent(new Event('click'));
    await new Promise(r => setTimeout(r, 15));

    assert.ok(updatedDraft !== null, "Draft updated on backend");
    assert.strictEqual(updatedDraft.title, 'Fresh Draft - Edited');
  });

  // Test 4: saved draft survives localStorage clearing/logout and can be retrieved from server
  await test("4. Submit: Saved draft survives localStorage clearing and is hydrated from server", async () => {
    const { renderSubmit } = await import('../src/views/submitView.js');
    const { api } = await import('../src/api/client.js');

    const serverPersistedDraft = {
      id: 888,
      eventId: 2,
      title: 'Persistent Server Draft',
      tagline: 'Survives Logout',
      track: 'Infra',
      description: 'Detailed backend architecture description',
      status: 'DRAFT'
    };

    api.getMySubmission = async (eventId) => {
      if (eventId === '2') return serverPersistedDraft;
      return null;
    };
    api.getEvent = async () => ({ id: 2, name: 'Test Hackathon', submissionDeadline: new Date(Date.now() + 86400000).toISOString() });

    // Ensure localStorage is empty (simulating post-logout or new browser)
    localStorage.clear();
    assert.strictEqual(localStorage.getItem('dogfood_draft_2'), null);

    const container = document.createElement('div');
    document.body.appendChild(container);
    renderSubmit(container, '2');
    await new Promise(r => setTimeout(r, 20));

    assert.strictEqual(document.getElementById('pTitle').value, 'Persistent Server Draft', "Title restored from server");
    assert.strictEqual(document.getElementById('pTagline').value, 'Survives Logout', "Tagline restored from server");
    assert.strictEqual(document.getElementById('pTrack').value, 'Infra', "Track restored from server");
    assert.strictEqual(document.getElementById('pDesc').value, 'Detailed backend architecture description', "Description restored from server");
  });

  // Test 5: failed scoring does not report success
  await test("5. Judging: Failed scoring does not report success and preserves queue", async () => {
    const { renderJudge } = await import('../src/views/judgeView.js');
    const { api } = await import('../src/api/client.js');

    api.getJudgeAssignments = async () => [
      { id: 'sub-1', assignmentId: 'asgn-1', title: 'Project Alpha', track: 'AI', tagline: 'Smart AI', description: 'desc' }
    ];

    let scoreAttempted = false;
    api.submitScore = async () => {
      scoreAttempted = true;
      throw new Error("Score validation failed (HTTP 400)");
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderJudge(container);

    const submitBtn = document.getElementById('jSubmitScoreBtn');
    submitBtn.dispatchEvent(new Event('click'));
    const confirmBtn = document.getElementById('executeSubmitScoreBtn');
    if (confirmBtn) {
      confirmBtn.dispatchEvent(new Event('click'));
    }
    await new Promise(r => setTimeout(r, 10));

    assert.ok(scoreAttempted, "api.submitScore should be called");
    const toast = document.getElementById('toast2');
    assert.ok(toast.textContent.includes('Failed to submit score'), "Toast should show failure");
    assert.strictEqual(submitBtn.disabled, false, "Submit button re-enabled on error");
  });

  // Test 6: failed COI update does not report success
  await test("6. Judging: Failed COI declaration does not report success and retains item", async () => {
    const { renderJudge } = await import('../src/views/judgeView.js');
    const { api } = await import('../src/api/client.js');

    api.getJudgeAssignments = async () => [
      { id: 'sub-1', assignmentId: 'asgn-1', title: 'Project Alpha', track: 'AI' }
    ];

    let coiAttempted = false;
    api.declareCOI = async () => {
      coiAttempted = true;
      throw new Error("COI declaration failed on server (HTTP 500)");
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderJudge(container);

    const confirmCoiBtn = document.getElementById('confirmCoiBtn');
    confirmCoiBtn.dispatchEvent(new Event('click'));
    await new Promise(r => setTimeout(r, 10));

    assert.ok(coiAttempted, "api.declareCOI was invoked");
    const toast = document.getElementById('toast2');
    assert.ok(toast.textContent.includes('Failed to declare conflict'), "Error toast shown");
    assert.ok(document.getElementById('jTitle').textContent === 'Project Alpha', "Queue project retained");
  });

  // Test 7: gallery uses the real submission endpoint
  await test("7. Gallery: Uses real /api/events/{id}/submissions endpoint without mock fallback", async () => {
    const { renderGallery } = await import('../src/views/galleryView.js');
    const { api } = await import('../src/api/client.js');

    let requestedEventId = null;
    api.getSubmissions = async (eventId) => {
      requestedEventId = eventId;
      return [
        { id: 'sub-1', title: 'Real Project One', track: 'AI', tagline: 'Real tagline', techStack: ['Java'] }
      ];
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderGallery(container, '2');

    assert.strictEqual(requestedEventId, '2', "Called getSubmissions for event 2");
    assert.ok(document.getElementById('ggrid').innerHTML.includes('Real Project One'), "Rendered real project");
  });

  // Test 8: #/teams does not silently use event 1 when no event selected, and uses event 2 when selected
  await test("8. Teams: #/teams displays choose-event prompt when unselected, operates on Event 2 when selected", async () => {
    const { router } = await import('../src/router/router.js');
    const { authStore } = await import('../src/store/authStore.js');
    const { api } = await import('../src/api/client.js');

    // Case A: No event selected
    authStore.clearSession();
    assert.strictEqual(authStore.getEventId(), null);

    let apiEventCalled = null;
    api.getTeams = async (eventId) => {
      apiEventCalled = eventId;
      return [];
    };

    const landingContainer = document.createElement('div');
    landingContainer.id = 'landingContainer';
    document.body.appendChild(landingContainer);

    const appContent = document.createElement('div');
    appContent.id = 'appContent';
    document.body.appendChild(appContent);

    router.landingContainer = landingContainer;
    router.appContentContainer = appContent;

    window.location.hash = '#/teams';
    await router.handleRoute();

    assert.strictEqual(apiEventCalled, null, "Must NOT make API call to event 1 when unselected");
    assert.ok(appContent.innerHTML.includes('Please choose an event first'), "Must show choose event prompt");

    // Case B: Event 2 selected
    authStore.setSession({
      token: 'jwt-token',
      role: 'PARTICIPANT',
      eventId: '2',
      rolesByEvent: { '2': 'PARTICIPANT' }
    });

    await router.handleRoute();
    assert.strictEqual(apiEventCalled, '2', "Operates on Event 2 when selected");
  });

  // Test 9: #/submit does not silently use event 1 when no event selected, and uses event 2 when selected
  await test("9. Submit: #/submit displays choose-event prompt when unselected, operates on Event 2 when selected", async () => {
    const { router } = await import('../src/router/router.js');
    const { authStore } = await import('../src/store/authStore.js');
    const { api } = await import('../src/api/client.js');

    // Case A: No event selected
    authStore.clearSession();
    assert.strictEqual(authStore.getEventId(), null);

    let draftApiCalled = null;
    api.getMySubmission = async (eventId) => {
      draftApiCalled = eventId;
      return null;
    };

    const landingContainer = document.createElement('div');
    landingContainer.id = 'landingContainer';
    document.body.appendChild(landingContainer);

    const appContent = document.createElement('div');
    appContent.id = 'appContent';
    document.body.appendChild(appContent);

    router.landingContainer = landingContainer;
    router.appContentContainer = appContent;

    window.location.hash = '#/submit';
    await router.handleRoute();

    assert.strictEqual(draftApiCalled, null, "Must NOT make draft query to event 1 when unselected");
    assert.ok(appContent.innerHTML.includes('Please choose an event first'), "Must show choose event prompt");

    // Case B: Event 2 selected
    authStore.setSession({
      token: 'jwt-token',
      role: 'PARTICIPANT',
      eventId: '2',
      rolesByEvent: { '2': 'PARTICIPANT' }
    });

    await router.handleRoute();
    await new Promise(r => setTimeout(r, 15));
    assert.strictEqual(draftApiCalled, '2', "Operates against Event 2 when selected");
  });

  // Test 10: exact single-assignment judging route works for owner and denies peer access
  await test("10. Single Assignment: Route /api/judges/me/assignments/{id} works for owner and denies peer with 403", async () => {
    const { renderJudge } = await import('../src/views/judgeView.js');
    const { api } = await import('../src/api/client.js');

    let requestedAssignmentUrl = null;
    api.getJudgeAssignment = async (asgnId) => {
      requestedAssignmentUrl = `/api/judges/me/assignments/${asgnId}`;
      if (asgnId === 'asgn-owner-10') {
        return {
          id: 'sub-10',
          assignmentId: asgnId,
          title: 'Owner Authorized Submission',
          track: 'Security',
          tagline: 'Private assigned build'
        };
      } else {
        throw new Error("Access Denied: You are not authorized to view this assignment (HTTP 403)");
      }
    };

    const container = document.createElement('div');
    document.body.appendChild(container);

    // 1. Owner requests assignment
    await renderJudge(container, 'asgn-owner-10');
    assert.strictEqual(requestedAssignmentUrl, '/api/judges/me/assignments/asgn-owner-10');
    assert.ok(document.getElementById('jTitle').textContent === 'Owner Authorized Submission', "Owner receives assignment data");

    // 2. Peer requests same assignment -> 403 Forbidden
    await renderJudge(container, 'asgn-peer-99');
    assert.strictEqual(requestedAssignmentUrl, '/api/judges/me/assignments/asgn-peer-99');
    const contentArea = document.getElementById('judgeContentArea');
    assert.ok(contentArea.innerHTML.includes('Access Restricted') || contentArea.innerHTML.includes('Access Denied'), "Peer is denied with 403 screen");
  });

  // Test 11: requireRole Route Guard does not authorize against Event 1 by assumption
  await test("11. Route Guard RBAC: User with role in Event 2 is denied access to Event 1 and not authorized by assumption", async () => {
    const { checkRouteAccess } = await import('../src/components/requireRole.js');
    const { authStore } = await import('../src/store/authStore.js');

    // Case A: Unauthenticated
    authStore.clearSession();
    const unauthCheck = checkRouteAccess('#/events/1/submit');
    assert.strictEqual(unauthCheck.allowed, false);
    assert.strictEqual(unauthCheck.reason, 'UNAUTHENTICATED');

    // Case B: User has role PARTICIPANT only in Event 2
    authStore.setSession({
      token: 'jwt-token-event2',
      role: 'NONE', // No global role
      userId: 205,
      eventId: '2',
      rolesByEvent: { '2': 'PARTICIPANT' }
    });

    // Attempting to access Event 1 submit route must be FORBIDDEN
    const event1Access = checkRouteAccess('#/events/1/submit');
    assert.strictEqual(event1Access.allowed, false, "Must deny access to Event 1 when user only has role in Event 2");
    assert.strictEqual(event1Access.reason, 'FORBIDDEN');

    // Accessing Event 2 submit route must be ALLOWED
    const event2Access = checkRouteAccess('#/events/2/submit');
    assert.strictEqual(event2Access.allowed, true, "Must allow access to Event 2 for Event 2 participant");
  });

  // Test 12: #/gallery does not silently query Event 1 when unselected, discovers active events
  await test("12. Gallery Discovery: Generic #/gallery discovers active events without fetching Event 1 submissions", async () => {
    const { router } = await import('../src/router/router.js');
    const { authStore } = await import('../src/store/authStore.js');
    const { api } = await import('../src/api/client.js');

    authStore.clearSession();

    let getEventsCalled = false;
    let submissionsEventCalled = null;

    api.getEvents = async () => {
      getEventsCalled = true;
      return [
        { id: 2, name: 'Main Hackathon 2026', status: 'ACTIVE', description: 'Real Event 2' }
      ];
    };

    api.getSubmissions = async (eventId) => {
      submissionsEventCalled = eventId;
      return [];
    };

    const landingContainer = document.createElement('div');
    landingContainer.id = 'landingContainer';
    document.body.appendChild(landingContainer);

    const appContent = document.createElement('div');
    appContent.id = 'appContent';
    document.body.appendChild(appContent);

    router.landingContainer = landingContainer;
    router.appContentContainer = appContent;

    // Navigate to unselected #/gallery
    window.location.hash = '#/gallery';
    await router.handleRoute();

    assert.ok(getEventsCalled, "Must call getEvents to discover active events");
    assert.strictEqual(submissionsEventCalled, null, "Must NOT query submissions for Event 1");
    const gridEl = document.getElementById('eventsDiscoveryGrid');
    assert.ok(gridEl !== null, "eventsDiscoveryGrid element exists");
    assert.ok(gridEl.innerHTML.includes('Main Hackathon 2026'), "Renders discovered event cards");
    assert.ok(gridEl.innerHTML.includes('#/events/2/gallery'), "Includes links to event gallery");

    // Navigate to explicit #/events/2/gallery
    window.location.hash = '#/events/2/gallery';
    await router.handleRoute();
    assert.strictEqual(submissionsEventCalled, '2', "Explicit #/events/2/gallery queries Event 2 submissions");
  });

  // Test 13: Client API throws Error when eventId is missing
  await test("13. Client API: Methods throw when eventId is missing (no silent event 1 fallback)", async () => {
    const { api } = await import('../src/api/client.js');
    const freshApi = new (api.constructor)();

    await assert.rejects(async () => await freshApi.getEvent(null), /Event ID is required/);
    await assert.rejects(async () => await freshApi.createTeam(null, {}), /Event ID is required/);
    await assert.rejects(async () => await freshApi.getTeams(null), /Event ID is required/);
    await assert.rejects(async () => await freshApi.getSubmissions(null), /Event ID is required/);
    await assert.rejects(async () => await freshApi.getMySubmission(null), /Event ID is required/);
    await assert.rejects(async () => await freshApi.submitProject(null, {}), /Event ID is required/);
    await assert.rejects(async () => await freshApi.getResults(null), /Event ID is required/);
    await assert.rejects(async () => await freshApi.getDashboard(null), /Event ID is required/);
  });

  // Test 14: Teams view: Masks invite codes for other teams and reveals invite code only for user's own team
  await test("14. Teams Privacy: Masks other teams' invite codes and reveals code only for user's team", async () => {
    const { renderTeams } = await import('../src/views/teamsView.js');
    const { authStore } = await import('../src/store/authStore.js');
    const { api } = await import('../src/api/client.js');

    authStore.setSession({
      token: 'jwt-user-10',
      userId: 10,
      name: 'Current User',
      role: 'PARTICIPANT'
    });

    api.getTeams = async () => [
      { id: 1, name: 'My Own Team', inviteCode: 'SECRET-MY-TEAM', members: [{ id: 10, name: 'Current User' }] },
      { id: 2, name: 'Rival Team', inviteCode: 'LEAKED-RIVAL-CODE', members: [{ id: 20, name: 'Other User' }] }
    ];

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderTeams(container, '2');

    const rosterHtml = document.getElementById('teamRoster')?.innerHTML || '';
    assert.ok(rosterHtml.includes('My Own Team'), "Renders user's team");
    assert.ok(rosterHtml.includes('SECRET-MY-TEAM'), "Shows invite code for user's own team");
    assert.ok(rosterHtml.includes('Rival Team'), "Renders rival team");
    assert.ok(!rosterHtml.includes('LEAKED-RIVAL-CODE'), "Must NOT show invite code for rival team");
  });

  // Test 15: Security & DOM Sanitization
  await test("15. Security & Sanitization: HTML characters escaped and dangerous URL schemes rejected", async () => {
    const { escapeHtml, sanitizeUrl } = await import('../src/lib/dom.js');

    assert.strictEqual(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    assert.strictEqual(escapeHtml('Hello "world" & \'friends\''), 'Hello &quot;world&quot; &amp; &#39;friends&#39;');
    assert.strictEqual(sanitizeUrl('javascript:alert(1)'), '#');
    assert.strictEqual(sanitizeUrl('JAVASCRIPT:void(0)'), '#');
    assert.strictEqual(sanitizeUrl('data:text/html,<script>alert(1)</script>'), '#');
    assert.strictEqual(sanitizeUrl('vbscript:msgbox'), '#');
    assert.strictEqual(sanitizeUrl('https://example.com/demo'), 'https://example.com/demo');
    assert.strictEqual(sanitizeUrl('http://localhost:8080/test'), 'http://localhost:8080/test');
    assert.strictEqual(sanitizeUrl('/events/2'), '/events/2');
    assert.strictEqual(sanitizeUrl('#/gallery'), '#/gallery');
  });

  // Test 16: Signup contract: Only sends { username, email, password } and contains no fake role field
  await test("16. Signup Contract: Only submits { username, email, password } without fake role field", async () => {
    const { renderAuth } = await import('../src/views/authView.js');
    const { api } = await import('../src/api/client.js');

    const container = document.createElement('div');
    document.body.appendChild(container);
    renderAuth(container, 'signup');

    const uInput = document.getElementById('authUsername');
    const eInput = document.getElementById('authEmail');
    const pInput = document.getElementById('authPass');
    assert.ok(uInput !== null, "Username input exists");
    assert.ok(eInput !== null, "Email input exists");
    assert.ok(pInput !== null, "Password input exists");
    assert.strictEqual(document.getElementById('authRole'), null, "No fake authRole dropdown in signup DOM");

    let signupPayload = null;
    api.signup = async (payload) => {
      signupPayload = payload;
      return { token: 'new-jwt', user: { username: payload.username, role: 'PARTICIPANT' } };
    };

    uInput.value = 'newcoder';
    eInput.value = 'coder@example.com';
    pInput.value = 'Secret123!';

    const form = document.getElementById('authForm');
    form.dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r, 20));

    assert.deepStrictEqual(signupPayload, {
      username: 'newcoder',
      email: 'coder@example.com',
      password: 'Secret123!'
    }, "Signup payload strictly conforms to backend contract");
  });

  // Test 17: Submit view locked state on submission and closed status on past deadline
  await test("17. Submit Truthfulness: Locked state when submitted and closed indicator when expired", async () => {
    const { renderSubmit } = await import('../src/views/submitView.js');
    const { api } = await import('../src/api/client.js');

    // Case A: Submission already submitted with future deadline -> editable until deadline
    api.getMySubmission = async () => ({
      id: 999,
      title: 'Final Submitted Build',
      status: 'SUBMITTED',
      updatedAt: '2026-09-27T10:00:00Z'
    });
    api.getEvent = async () => ({
      id: 2,
      name: 'Active Hackathon',
      submissionDeadline: new Date(Date.now() + 86400000).toISOString()
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    renderSubmit(container, '2');
    await new Promise(r => setTimeout(r, 20));

    const subPill = document.getElementById('subStatusPill');
    assert.strictEqual(subPill.textContent, 'SUBMITTED', "Pill shows SUBMITTED");
    assert.ok(document.getElementById('submitSubtitle').textContent.includes('edit and update'), "Subtitle indicates editable until deadline");
    assert.strictEqual(document.getElementById('pTitle').disabled, false, "Title field remains editable before deadline");
    assert.strictEqual(document.getElementById('saveDraftBtn').style.display, 'none', "Save draft hidden for submitted project");

    // Case B: Event deadline expired
    container.innerHTML = '';
    api.getMySubmission = async () => null;
    api.getEvent = async () => ({
      id: 2,
      name: 'Past Hackathon',
      submissionDeadline: new Date(Date.now() - 3600000).toISOString()
    });

    renderSubmit(container, '2');
    await new Promise(r => setTimeout(r, 60));

    const deadlinePill = document.getElementById('deadlinePill');
    assert.ok(deadlinePill.textContent.includes('SUBMISSIONS CLOSED'), "Deadline pill indicates submissions closed");
  });

  // Test 18: Landing page role hero truthfulness
  await test("18. Landing Truthfulness: Role hero cards with real CTAs, no fabricated metrics", async () => {
    const { renderLanding } = await import('../src/views/landingView.js');

    const container = document.createElement('div');
    document.body.appendChild(container);
    renderLanding(container);

    const html = container.innerHTML;

    assert.ok(html.includes('#/submit'), "Builder CTA link exists");
    assert.ok(html.includes('#/judge'), "Judge CTA link exists");
    assert.ok(html.includes('#/dashboard'), "Organizer CTA link exists");

    assert.ok(!html.includes('9400+'), "No fake 9400+ projects metric");
    assert.ok(!html.includes('41000+'), "No fake 41000+ scores metric");
    assert.ok(!html.includes('128 Events'), "No fake 128 events metric");
    assert.ok(html.includes('100% Self-Hostable') || html.includes('72h Hackathon'), "Includes truthful hackathon badges");

    assert.ok(!html.includes('Autosaves on every keystroke'), "No autosave claims");
    assert.ok(!html.includes('Press Cmd+Enter to submit'), "No shortcut claims");
  });

  // Test 19: Navigation: Mobile drawer toggle exists, Design Tokens removed
  await test("19. Navigation Shell: Mobile drawer exists, Design Tokens removed from user navigation", async () => {
    const fs = await import('node:fs');
    const indexHtml = fs.readFileSync('frontend/index.html', 'utf-8');
    assert.ok(!indexHtml.includes('Design Tokens'), "Design Tokens removed from index.html");
    assert.ok(indexHtml.includes('id="mobileNavToggle"'), "Mobile navigation toggle exists");
    assert.ok(indexHtml.includes('id="mobileNavDrawer"'), "Mobile navigation drawer exists");
  });

  // Test 20: Pre-submission confirmation modal in judging view
  await test("20. Judging Confirmation Modal: Displays project name and weighted score before committing", async () => {
    const { renderJudge } = await import('../src/views/judgeView.js');
    const { api } = await import('../src/api/client.js');

    api.getJudgeAssignments = async () => [
      { id: 'sub-20', assignmentId: 'asgn-20', title: 'Confirmable Project', track: 'AI' }
    ];

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderJudge(container);

    const submitBtn = document.getElementById('jSubmitScoreBtn');
    const modal = document.getElementById('scoreConfirmModal');
    assert.ok(modal !== null, "Score confirmation modal exists");
    assert.ok(!modal.classList.contains('open'), "Modal starts closed");

    submitBtn.dispatchEvent(new Event('click'));
    assert.ok(modal.classList.contains('open'), "Modal opens on submit button click");
    assert.strictEqual(document.getElementById('confirmProjectName').textContent, 'Confirmable Project', "Modal shows project name");

    const cancelBtn = document.getElementById('cancelConfirmScoreBtn');
    cancelBtn.dispatchEvent(new Event('click'));
    assert.ok(!modal.classList.contains('open'), "Modal closes on cancel");
  });

  // Test 21: Route guard: NO_EVENT_SELECTED when user has event-specific role but no event selected
  await test("21. Route Guard: NO_EVENT_SELECTED returned when event-specific role user has no active event", async () => {
    const { checkRouteAccess } = await import('../src/components/requireRole.js');
    const { authStore } = await import('../src/store/authStore.js');

    authStore.setSession({
      token: 'jwt-scoped-user',
      role: 'NONE',
      eventId: null,
      rolesByEvent: { '2': 'ORGANIZER' }
    });

    const check = checkRouteAccess('#/dashboard');
    assert.strictEqual(check.allowed, false);
    assert.strictEqual(check.reason, 'NO_EVENT_SELECTED', "Returns NO_EVENT_SELECTED instead of authorizing on event 1");
  });

  // Test 22: Judge assignment route precedence in router
  await test("22. Router Precedence: Parameterized #/judge/:assignmentId route matched cleanly", async () => {
    const { router } = await import('../src/router/router.js');
    const { authStore } = await import('../src/store/authStore.js');
    const { api } = await import('../src/api/client.js');

    authStore.setSession({
      token: 'jwt-judge',
      role: 'JUDGE',
      eventId: '2',
      rolesByEvent: { '2': 'JUDGE' }
    });

    let requestedAssignmentId = null;
    api.getJudgeAssignment = async (id) => {
      requestedAssignmentId = id;
      return { id: 'sub-99', assignmentId: id, title: 'Deep Assignment', track: 'AI' };
    };

    const landingContainer = document.createElement('div');
    landingContainer.id = 'landingContainer';
    document.body.appendChild(landingContainer);

    const appContent = document.createElement('div');
    appContent.id = 'appContent';
    document.body.appendChild(appContent);

    router.landingContainer = landingContainer;
    router.appContentContainer = appContent;

    window.location.hash = '#/judge/asgn-special-999';
    await router.handleRoute();

    assert.strictEqual(requestedAssignmentId, 'asgn-special-999', "Route #/judge/:assignmentId routed with assignment ID");
  });

  // Test 23: Event registration: calls POST /api/events/:id/register and updates authStore role
  await test("23. Event Registration: registerForEvent calls real endpoint, updates store, and grants role", async () => {
    const { api } = await import('../src/api/client.js');
    const { authStore } = await import('../src/store/authStore.js');

    authStore.setSession({
      token: 'jwt-user-reg',
      userId: 55,
      name: 'Unregistered User',
      role: 'GUEST',
      rolesByEvent: {}
    });

    assert.strictEqual(authStore.isRegisteredForEvent('3'), false, "User not registered before call");

    let registeredEventId = null;
    let registeredMethod = null;
    api.request = async (path, options = {}) => {
      if (path === '/api/events/3/register') {
        registeredEventId = '3';
        registeredMethod = options.method;
        return { eventId: 3, userId: 55, role: 'PARTICIPANT', message: 'Successfully registered' };
      }
      throw new Error(`Unexpected request to ${path}`);
    };

    const res = await api.registerForEvent('3');
    assert.strictEqual(registeredEventId, '3', "Endpoint called with event 3");
    assert.strictEqual(registeredMethod, 'POST', "Endpoint called with POST method");
    assert.strictEqual(res.role, 'PARTICIPANT');

    authStore.addEventRole('3', 'PARTICIPANT');
    assert.strictEqual(authStore.isRegisteredForEvent('3'), true, "User registered in authStore after addEventRole");
    assert.strictEqual(authStore.getRolesByEvent()['3'], 'PARTICIPANT', "Role recorded in rolesByEvent");
  });

  // Test 24: Teams 4-State Flow: State B renders registration prompt, State D renders active team with invite code
  await test("24. Teams 4-State Flow: State B prompts registration, State D shows active team details", async () => {
    const { renderTeams } = await import('../src/views/teamsView.js');
    const { authStore } = await import('../src/store/authStore.js');
    const { api } = await import('../src/api/client.js');

    // Case 1: State B - User registered only for Event 1, accessing Event 99
    authStore.setSession({
      token: 'jwt-user-55',
      userId: 55,
      name: 'User 55',
      role: 'PARTICIPANT',
      rolesByEvent: { '1': 'PARTICIPANT' }
    });

    api.getTeams = async () => [];
    api.getEvent = async (id) => ({ id, name: `Hackathon ${id}`, status: 'ACTIVE' });
    api.getMe = async () => ({ rolesByEvent: { '1': 'PARTICIPANT' } });

    const containerB = document.createElement('div');
    document.body.appendChild(containerB);
    await renderTeams(containerB, '99');

    assert.ok(containerB.innerHTML.includes('You\'re not registered for this hackathon yet'), "Shows State B not registered prompt");
    assert.ok(containerB.querySelector('#btnRegisterForHackathon') !== null, "Shows register button in State B");

    // Case 2: State D - User is registered and on a team in Event 1
    api.getTeams = async () => [
      { id: 101, name: 'Cyber Wolves', inviteCode: 'WOLF-2026', leaderId: 55, members: [{ userId: 55, username: 'User 55', isLeader: true }] }
    ];
    api.getMySubmission = async () => null; // No submitted project yet

    const containerD = document.createElement('div');
    document.body.appendChild(containerD);
    await renderTeams(containerD, '1');

    assert.ok(containerD.innerHTML.includes('Cyber Wolves'), "Shows team name in State D");
    assert.ok(containerD.innerHTML.includes('WOLF-2026'), "Shows team invite code in State D");
    assert.ok(containerD.querySelector('#copyActiveCodeBtn') !== null, "Shows copy code button in State D");
  });

  // Test 25: Event-specific dynamic rubric loaded from backend
  await test("25. Judging Rubric: Loads event-specific criteria dynamically from backend and computes weights truthfully", async () => {
    const { renderJudge } = await import('../src/views/judgeView.js');
    const { api } = await import('../src/api/client.js');

    api.getJudgeAssignments = async () => [
      { id: 'sub-custom-1', assignmentId: 'asgn-custom-1', eventId: '77', title: 'Custom Project', track: 'AI' }
    ];

    let requestedEventId = null;
    api.getRubric = async (eventId) => {
      requestedEventId = eventId;
      return [
        { name: 'Technical Depth', key: 'tech_depth', weight: 60, minScore: 1, maxScore: 5 },
        { name: 'Business Value', key: 'biz_value', weight: 40, minScore: 1, maxScore: 5 }
      ];
    };

    let submittedPayload = null;
    api.submitScore = async (payload) => {
      submittedPayload = payload;
      return { success: true };
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderJudge(container);

    assert.strictEqual(requestedEventId, '77', "api.getRubric was called with eventId 77");
    assert.ok(document.getElementById('range_tech_depth') !== null, "Slider for tech_depth rendered");
    assert.ok(document.getElementById('range_biz_value') !== null, "Slider for biz_value rendered");

    const weightedTotal = document.getElementById('jWeightedTotal');
    assert.strictEqual(weightedTotal.textContent, '3.00', "Weighted total is computed from custom weights (60/40)");

    // Submit score
    const submitBtn = document.getElementById('jSubmitScoreBtn');
    submitBtn.dispatchEvent(new Event('click'));
    const executeBtn = document.getElementById('executeSubmitScoreBtn');
    executeBtn.dispatchEvent(new Event('click'));
    await new Promise(r => setTimeout(r, 10));

    assert.ok(submittedPayload !== null, "Score was submitted");
    assert.ok('tech_depth' in submittedPayload.criteria, "Payload criteria includes 'tech_depth'");
    assert.ok('biz_value' in submittedPayload.criteria, "Payload criteria includes 'biz_value'");
    assert.strictEqual(submittedPayload.score, 3.0, "Submitted total score matches computed score");
  });

  // Test 26: Clean error state when rubric cannot be loaded
  await test("26. Judging Rubric: Displays clean error screen and disables scoring when rubric fails to load", async () => {
    const { renderJudge } = await import('../src/views/judgeView.js');
    const { api } = await import('../src/api/client.js');

    api.getJudgeAssignments = async () => [
      { id: 'sub-fail-1', assignmentId: 'asgn-fail-1', eventId: '88', title: 'Fail Project', track: 'AI' }
    ];

    api.getRubric = async () => {
      throw new Error("HTTP 404: Rubric not configured");
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderJudge(container);

    const contentArea = document.getElementById('judgeContentArea');
    assert.ok(contentArea.innerHTML.includes('Unable to Load Judging Rubric'), "Shows clean error state for rubric failure");
    assert.ok(document.getElementById('jSubmitScoreBtn') === null, "Scoring sliders and submit button are not rendered");
  });

  // Test 27: Create Hackathon UI in Organizer Dashboard
  await test("27. Create Hackathon UI: Modal opens, validates inputs, and calls api.createEvent", async () => {
    const { renderDashboard } = await import('../src/views/dashboardView.js');
    const { api } = await import('../src/api/client.js');

    let createdPayload = null;
    api.createEvent = async (payload) => {
      createdPayload = payload;
      return { id: 999, name: payload.name, status: 'OPEN' };
    };
    api.getEvents = async () => [{ id: 999, name: 'AI Sprint 2026', status: 'OPEN' }];
    api.getDashboard = async () => ({ projectsSubmitted: 0, judgesCount: 0, avgScore: 0 });
    api.getScoreDistribution = async () => [];
    api.getRubricDetails = async () => ({ locked: false, criteria: [] });
    api.getTracks = async () => [];
    api.getJudges = async () => [];
    api.getAssignments = async () => [];
    api.getSubmissions = async () => [];

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderDashboard(container, '1');

    const openBtn = document.getElementById('openCreateEventBtn');
    const modal = document.getElementById('createEventModal');
    assert.ok(openBtn !== null, "Open Create Hackathon button exists");
    assert.ok(modal !== null, "Create Hackathon modal exists");

    openBtn.dispatchEvent(new Event('click'));
    assert.ok(modal.classList.contains('open'), "Modal opens on button click");

    document.getElementById('newEventName').value = 'AI Sprint 2026';
    document.getElementById('newEventDesc').value = 'Cutting edge sprint';
    document.getElementById('newEventDeadline').value = '2026-12-01T18:00';

    const form = document.getElementById('createEventForm');
    form.dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r, 10));

    assert.ok(createdPayload !== null, "api.createEvent was called");
    assert.strictEqual(createdPayload.name, 'AI Sprint 2026', "Event name is passed correctly");
    assert.strictEqual(createdPayload.description, 'Cutting edge sprint', "Event description is passed correctly");
    assert.ok(createdPayload.submissionDeadline.includes('2026-12-01'), "Event deadline is passed as ISO string");
  });

  // Test 28: Organizer Workflows: Tracks, Rubric validation, and Judge COI
  await test("28. Organizer Workflows: Track management, Rubric 100% validation, and Judge COI feedback", async () => {
    const { renderDashboard } = await import('../src/views/dashboardView.js');
    const { api } = await import('../src/api/client.js');

    let trackCreated = null;
    api.addTrack = async (eventId, payload) => {
      trackCreated = { eventId, ...payload };
      return { id: 50, ...payload };
    };

    let savedRubric = null;
    api.saveRubric = async (eventId, criteria) => {
      savedRubric = { eventId, criteria };
      return { locked: false, criteria };
    };

    api.assignJudge = async (eventId, judgeId, submissionId) => {
      throw new Error("Cannot assign: A Conflict of Interest exists for judge 2 on submission 10");
    };

    api.getDashboard = async () => ({ projectsSubmitted: 1, judgesCount: 1, avgScore: 0 });
    api.getScoreDistribution = async () => [];
    api.getRubricDetails = async () => ({
      locked: false,
      criteria: [
        { name: 'Criterion 1', key: 'c1', weight: 50, minScore: 1, maxScore: 5 },
        { name: 'Criterion 2', key: 'c2', weight: 50, minScore: 1, maxScore: 5 }
      ]
    });
    api.getTracks = async () => [{ id: 1, name: 'Web', description: 'Web track' }];
    api.getJudges = async () => [{ id: 2, username: 'judge_a', email: 'judge@dogfood.local' }];
    api.getAssignments = async () => [];
    api.getSubmissions = async () => [{ id: 10, title: 'Sample Project', track: 'Web' }];

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderDashboard(container, '1');

    // 1. Add track
    document.getElementById('newTrackName').value = 'Mobile Track';
    document.getElementById('newTrackDesc').value = 'Mobile apps';
    document.getElementById('addTrackForm').dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r, 10));
    assert.ok(trackCreated !== null, "api.addTrack was invoked");
    assert.strictEqual(trackCreated.name, 'Mobile Track');

    // 2. Save rubric
    const saveRubricBtn = document.getElementById('saveRubricBtn');
    saveRubricBtn.dispatchEvent(new Event('click'));
    await new Promise(r => setTimeout(r, 10));
    assert.ok(savedRubric !== null, "api.saveRubric was invoked when weight sums to 100%");
    assert.strictEqual(savedRubric.criteria.length, 2);

    // 3. Manual judge assignment with COI
    document.getElementById('assignJudgeSelect').value = '2';
    document.getElementById('assignSubSelect').value = '10';
    document.getElementById('manualAssignForm').dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r, 10));
    const feedback = document.getElementById('assignFeedback');
    assert.ok(feedback.style.display !== 'none', "COI feedback alert is displayed");
    assert.ok((feedback.textContent || feedback.innerHTML || '').includes('Conflict of Interest'), "COI reason displayed gracefully to organizer");
  });

  // Test 29: Event switching on #/judge reloads context and queries Event B queue
  await test("29. Judge Queue Event Isolation: Switching active event reloads queue for target event without cross-event leakage", async () => {
    const { renderJudge } = await import('../src/views/judgeView.js');
    const { authStore } = await import('../src/store/authStore.js');
    const { api } = await import('../src/api/client.js');

    const event1Assignments = [
      { id: 101, assignmentId: 1, eventId: 1, title: 'Event 1 Alpha', track: 'AI' }
    ];
    const event2Assignments = [
      { id: 201, assignmentId: 2, eventId: 2, title: 'Event 2 Beta', track: 'Web' }
    ];

    let lastQueriedEventId = null;
    api.getJudgeAssignments = async (eventId) => {
      lastQueriedEventId = eventId || authStore.getEventId();
      if (String(lastQueriedEventId) === '1') return event1Assignments;
      if (String(lastQueriedEventId) === '2') return event2Assignments;
      return [];
    };
    api.getRubric = async () => [
      { name: 'Quality', key: 'q', weight: 100, minScore: 1, maxScore: 5 }
    ];

    // Case 1: Active event is 1
    authStore.setSession({
      token: 'judge-token',
      role: 'JUDGE',
      eventId: '1',
      rolesByEvent: { '1': 'JUDGE', '2': 'JUDGE' }
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderJudge(container);

    assert.strictEqual(lastQueriedEventId, '1', "Queries assignments for Event 1");
    assert.strictEqual(document.getElementById('jTitle').textContent, 'Event 1 Alpha');

    // Case 2: Switch active event to 2
    authStore.setSession({
      token: 'judge-token',
      role: 'JUDGE',
      eventId: '2',
      rolesByEvent: { '1': 'JUDGE', '2': 'JUDGE' }
    });

    await renderJudge(container);

    assert.strictEqual(lastQueriedEventId, '2', "Queries assignments for Event 2 on switch");
    assert.strictEqual(document.getElementById('jTitle').textContent, 'Event 2 Beta');
    assert.ok(!container.innerHTML.includes('Event 1 Alpha'), "Event 1 assignments not leaked into Event 2 view");
  });

  // Test 30: Judge project view presents complete submission (media, demo video, live link, custom questions)
  await test("30. Judge Submission Presentation: Renders complete submission metadata, media, and custom answers", async () => {
    const { renderJudge } = await import('../src/views/judgeView.js');
    const { api } = await import('../src/api/client.js');
    const { authStore } = await import('../src/store/authStore.js');

    authStore.setSession({
      token: 'judge-token',
      role: 'JUDGE',
      eventId: '2',
      rolesByEvent: { '2': 'JUDGE' }
    });

    api.getJudgeAssignments = async () => [
      {
        id: 501,
        assignmentId: 99,
        eventId: 2,
        title: 'Quantum Grid Optimizer',
        tagline: 'Autonomous Energy Grid Routing',
        description: 'Deep neural networks optimizing smart grid loads in real time.',
        track: 'CleanTech',
        techStack: ['Python', 'PyTorch', 'Rust'],
        thumbnailUrl: 'https://example.com/grid-cover.png',
        galleryImages: ['https://example.com/shot1.png', 'https://example.com/shot2.png'],
        demoVideoUrl: 'https://youtube.com/watch?v=grid-demo',
        liveLink: 'https://grid.example.com',
        repoUrl: 'https://github.com/grid/optimizer',
        customAnswers: {
          'arch_overview': 'Decentralized Actor-Critic consensus',
          'power_savings': '32% measured in hardware simulation'
        },
        teamName: 'Volt Dynamics',
        submissionStatus: 'SUBMITTED'
      }
    ];

    api.getRubric = async () => [
      { name: 'Impact', key: 'impact', weight: 100, minScore: 1, maxScore: 5 }
    ];

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderJudge(container);

    // Title & Metadata
    assert.strictEqual(document.getElementById('jTitle').textContent, 'Quantum Grid Optimizer');
    assert.strictEqual(document.getElementById('jTagline').textContent, 'Autonomous Energy Grid Routing');
    assert.strictEqual(document.getElementById('jTrack').textContent, 'CleanTech');
    assert.ok(document.getElementById('jMetaBadges').innerHTML.includes('Volt Dynamics'), "Displays team name");

    // Media & Links
    const mediaHtml = document.getElementById('jMedia').innerHTML;
    assert.ok(mediaHtml.includes('https://example.com/grid-cover.png'), "Renders thumbnail image");
    assert.ok(mediaHtml.includes('https://example.com/shot1.png'), "Renders gallery image 1");
    assert.ok(mediaHtml.includes('https://example.com/shot2.png'), "Renders gallery image 2");

    const linksHtml = document.getElementById('jLinks').innerHTML;
    assert.ok(linksHtml.includes('https://grid.example.com'), "Renders live project link");
    assert.ok(linksHtml.includes('https://youtube.com/watch?v=grid-demo'), "Renders hosted demo video link");
    assert.ok(linksHtml.includes('https://github.com/grid/optimizer'), "Renders source repo link");

    // Custom Answers
    const qaHtml = document.getElementById('jCustomQa').innerHTML;
    assert.ok(qaHtml.includes('arch_overview'), "Renders question 1 prompt/key");
    assert.ok(qaHtml.includes('Decentralized Actor-Critic consensus'), "Renders question 1 answer");
    assert.ok(qaHtml.includes('power_savings'), "Renders question 2 prompt/key");
    assert.ok(qaHtml.includes('32% measured in hardware simulation'), "Renders question 2 answer");
  });

  // Test 31: COI workflow and prominent explanation banner
  await test("31. COI Policy & Workflow: Explains policy prominently, submits COI with event context, and removes project from queue", async () => {
    const { renderJudge } = await import('../src/views/judgeView.js');
    const { api } = await import('../src/api/client.js');
    const { authStore } = await import('../src/store/authStore.js');

    authStore.setSession({
      token: 'judge-token',
      role: 'JUDGE',
      eventId: '2',
      rolesByEvent: { '2': 'JUDGE' }
    });

    api.getJudgeAssignments = async () => [
      { id: 'sub-coi-1', assignmentId: 'asgn-coi-1', eventId: '2', title: 'COI Project', track: 'AI' }
    ];
    api.getRubric = async () => [
      { name: 'Feasibility', key: 'feas', weight: 100, minScore: 1, maxScore: 5 }
    ];

    let declaredCoiPayload = null;
    api.declareCOI = async (payload) => {
      declaredCoiPayload = payload;
      return { success: true };
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderJudge(container);

    // 1. Prominent explanation banner exists
    const banner = document.getElementById('coiExplBanner');
    assert.ok(banner !== null, "COI explanation banner exists in judge view");
    assert.ok(container.innerHTML.includes('impartiality') || banner.innerHTML.includes('impartiality'), "Banner details impartiality requirements");
    assert.ok(container.innerHTML.includes('removes this project from your judging queue'), "Banner explains reassignment");

    // 2. Open COI modal
    const coiBtn = document.getElementById('declareCoiBtn');
    const modal = document.getElementById('coiModal');
    coiBtn.dispatchEvent(new Event('click'));
    assert.ok(modal.classList.contains('open'), "COI modal opened");

    document.getElementById('coiReasonSelect').value = 'SAME_TEAM';
    document.getElementById('coiNotes').value = 'Former colleague on team';

    // 3. Confirm COI
    const confirmBtn = document.getElementById('confirmCoiBtn');
    confirmBtn.dispatchEvent(new Event('click'));
    await new Promise(r => setTimeout(r, 10));

    assert.ok(declaredCoiPayload !== null, "api.declareCOI was invoked");
    assert.strictEqual(declaredCoiPayload.submissionId, 'sub-coi-1');
    assert.strictEqual(String(declaredCoiPayload.eventId), '2');
    assert.strictEqual(declaredCoiPayload.reason, 'SAME_TEAM');

    // 4. Project removed from active queue
    const queueText = document.getElementById('jq').textContent;
    assert.ok(queueText.includes('0 of 0') || queueText.includes('empty') || queueText.includes('completed'), "Project removed from active queue");
  });

  // Test 32: api.getJudgeAssignments enforces event context and throws if event ID is missing
  await test("32. API Client Event Scoping: Enforces eventId requirement for judge queue and custom questions", async () => {
    const { api } = await import('../src/api/client.js');
    const { authStore } = await import('../src/store/authStore.js');

    // Restore unmocked client methods from prototype
    api.getJudgeAssignments = Object.getPrototypeOf(api).getJudgeAssignments.bind(api);
    api.getCustomQuestions = Object.getPrototypeOf(api).getCustomQuestions.bind(api);
    api.getJudgeAssignment = Object.getPrototypeOf(api).getJudgeAssignment.bind(api);

    authStore.clearSession();
    assert.strictEqual(authStore.getEventId(), null);

    // 1. getJudgeAssignments without eventId throws
    let judgeQueueError = null;
    try {
      await api.getJudgeAssignments();
    } catch (err) {
      judgeQueueError = err;
    }
    assert.ok(judgeQueueError !== null, "getJudgeAssignments must throw without eventId");
    assert.ok(judgeQueueError.message.includes('Event ID is required'), "Clear error message thrown");

    // 2. getCustomQuestions without eventId throws
    let customQsError = null;
    try {
      await api.getCustomQuestions();
    } catch (err) {
      customQsError = err;
    }
    assert.ok(customQsError !== null, "getCustomQuestions must throw without eventId");

    // 3. getJudgeAssignments with explicit eventId constructs correct URL
    let requestedUrl = null;
    api.request = async (url) => {
      requestedUrl = url;
      return [];
    };

    await api.getJudgeAssignments('42');
    assert.strictEqual(requestedUrl, '/api/judges/me/assignments?eventId=42', "Passes eventId query parameter");

    await api.getJudgeAssignment(10, '42');
    assert.strictEqual(requestedUrl, '/api/judges/me/assignments/10?eventId=42', "Passes eventId query parameter to single assignment");
  });

  // Test 33: Navigating to #/events/:id/* syncs active event context to authStore so generic #/results route inherits it
  await test("33. Router Event Context Sync: Direct navigation to #/events/:id/* syncs active event so generic #/results inherits it", async () => {
    const { router } = await import('../src/router/router.js');
    const { authStore } = await import('../src/store/authStore.js');
    const { api } = await import('../src/api/client.js');

    // 1. Initial state: No event selected
    authStore.clearSession();
    assert.strictEqual(authStore.getEventId(), null, "Initial eventId must be null");

    let resultsEventIdRequested = null;
    api.getResults = async (eventId, mode) => {
      resultsEventIdRequested = eventId;
      return [];
    };
    api.getSubmissions = async (eventId) => {
      return [];
    };

    const landingContainer = document.getElementById('landingContainer') || document.createElement('div');
    landingContainer.id = 'landingContainer';
    document.body.appendChild(landingContainer);

    const appContent = document.getElementById('appContent') || document.createElement('div');
    appContent.id = 'appContent';
    document.body.appendChild(appContent);

    router.landingContainer = landingContainer;
    router.appContentContainer = appContent;

    // 2. Direct navigation to event-specific parameterized route #/events/2/gallery
    window.location.hash = '#/events/2/gallery';
    await router.handleRoute();

    // 3. Verify event context was established in authStore
    assert.strictEqual(authStore.getEventId(), '2', "Active event context must be set to 2 in store");

    // 4. Now navigate to generic #/results without event in URL
    window.location.hash = '#/results';
    await router.handleRoute();
    await new Promise(r => setTimeout(r, 20));

    // 5. Must query Event 2 results and not show choose event screen
    assert.strictEqual(resultsEventIdRequested, '2', "Generic #/results must query Event 2");
    assert.ok(!appContent.innerHTML.includes('Please choose an event first'), "Must not show choose event prompt");
  });

  // Test 34: Visitor Authorization Matrix Enforcement
  await test("34. Visitor Authorization: Rejects judge queue, judge scores, dashboard, export, and mutations server-side", async () => {
    const { api } = await import('../src/api/client.js');
    const { authStore } = await import('../src/store/authStore.js');

    // Restore unmocked client methods from prototype
    api.getDashboard = Object.getPrototypeOf(api).getDashboard.bind(api);
    api.getAssignments = Object.getPrototypeOf(api).getAssignments.bind(api);
    api.getJudges = Object.getPrototypeOf(api).getJudges.bind(api);
    api.getSubmissions = Object.getPrototypeOf(api).getSubmissions.bind(api);
    api.getEvent = Object.getPrototypeOf(api).getEvent.bind(api);
    api.getJudgeAssignments = Object.getPrototypeOf(api).getJudgeAssignments.bind(api);
    api.getMyScores = Object.getPrototypeOf(api).getMyScores.bind(api);
    api.submitScore = Object.getPrototypeOf(api).submitScore.bind(api);
    api.submitProject = Object.getPrototypeOf(api).submitProject.bind(api);
    api.createTeam = Object.getPrototypeOf(api).createTeam.bind(api);

    authStore.clearSession();
    assert.strictEqual(authStore.getToken(), null, "Visitor must be unauthenticated");

    // Mock API client fetch to simulate server-side 401 Unauthorized for visitor
    const originalRequest = api.request.bind(api);
    api.request = async (endpoint, options = {}) => {
      const isPublic = endpoint.startsWith('/api/events') &&
        !endpoint.includes('/dashboard') &&
        !endpoint.includes('/assignments') &&
        !endpoint.includes('/judges') &&
        !endpoint.includes('/scores') &&
        !endpoint.includes('/export') &&
        !endpoint.includes('/score-distribution') &&
        !endpoint.includes('/mine') &&
        !endpoint.includes('/draft') &&
        options.method !== 'POST' &&
        options.method !== 'PUT' &&
        options.method !== 'DELETE';

      const isPublicGallery = endpoint.startsWith('/api/submissions') && options.method !== 'POST' && options.method !== 'PUT';

      if (isPublic || isPublicGallery) {
        return { data: [{ id: 1, name: 'Public Data' }] };
      }
      throw new Error("HTTP 401: Unauthorized - Authentication required");
    };

    // Public Gallery -> 200 / Allowed
    const galleryRes = await api.getSubmissions('1');
    assert.ok(galleryRes !== null, "Visitor can access public gallery");

    // Public Event Details -> 200 / Allowed
    const eventRes = await api.getEvent('1');
    assert.ok(eventRes !== null, "Visitor can access public event details");

    // Judge Queue -> 401 Denied
    await assert.rejects(async () => await api.getJudgeAssignments('1'), /401/, "Visitor cannot access judge queue");

    // Judge Scores -> 401 Denied
    await assert.rejects(async () => await api.getMyScores('1'), /401/, "Visitor cannot access judge scores");

    // Organizer Dashboard -> 401 Denied
    await assert.rejects(async () => await api.getDashboard('1'), /401/, "Visitor cannot access organizer dashboard");

    // Judge Assignments -> 401 Denied
    await assert.rejects(async () => await api.getAssignments('1'), /401/, "Visitor cannot access judge assignments");

    // Submit Score -> 401 Denied
    await assert.rejects(async () => await api.submitScore({ submissionId: 1, rawScore: 4.5 }), /401/, "Visitor cannot submit scores");

    // Project Submission Mutation -> 401 Denied
    await assert.rejects(async () => await api.submitProject('1', { title: 'Test' }), /401/, "Visitor cannot submit project");

    // Team Creation Mutation -> 401 Denied
    await assert.rejects(async () => await api.createTeam('1', { name: 'Test Team' }), /401/, "Visitor cannot create team");

    // Restore original request
    api.request = originalRequest;
  });

  // Test 35: Organizer Dashboard: Removing completed assignment rejects with required UI message
  await test("35. Organizer Dashboard: Removing completed assignment rejects with user message 'This review is completed and cannot be removed.'", async () => {
    const { renderDashboard } = await import('../src/views/dashboardView.js');
    const { api } = await import('../src/api/client.js');

    api.getDashboard = async () => ({ projectsSubmitted: 1, judgesCount: 1, avgScore: 0 });
    api.getScoreDistribution = async () => [];
    api.getRubricDetails = async () => ({ locked: false, criteria: [] });
    api.getTracks = async () => [];
    api.getJudges = async () => [{ id: 2, username: 'judge_a', email: 'judge@dogfood.local' }];
    api.getSubmissions = async () => [{ id: 10, title: 'Test Project', track: 'General' }];
    api.getCustomQuestions = async () => [];
    api.getEvent = async () => ({ id: 1, name: 'Sample Hack 2026' });

    // Assignment 50 has status 'ASSIGNED' (unsubmitted) with remove button
    api.getAssignments = async () => [
      { id: 50, judgeId: 2, submissionId: 10, status: 'ASSIGNED', judgeUsername: 'judge_a', submissionTitle: 'Test Project' }
    ];

    let deleteAttempted = null;
    api.deleteAssignment = async (eventId, aid) => {
      deleteAttempted = { eventId, aid };
      throw new Error("Cannot remove completed assignment: score review has already been submitted.");
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderDashboard(container, '1');

    const removeBtn = container.querySelector('.remove-assignment-btn');
    assert.ok(removeBtn !== null, "Remove assignment button exists for uncompleted assignment");

    removeBtn.dispatchEvent(new Event('click'));
    await new Promise(r => setTimeout(r, 20));

    assert.ok(deleteAttempted !== null, "api.deleteAssignment was called");
    assert.strictEqual(deleteAttempted.aid, '50');

    const toast = document.getElementById('toast2');
    assert.ok(toast !== null, "Toast element exists");
    assert.strictEqual(toast.textContent, "This review is completed and cannot be removed.", "Must show exact required rejection message");
  });

  // Test 36: Organizer Dashboard: Prevent assigning same judge twice to same project
  await test("36. Organizer Dashboard: Assigning duplicate judge to project displays error 'Cannot assign: Judge is already assigned to this project.'", async () => {
    const { renderDashboard } = await import('../src/views/dashboardView.js');
    const { api } = await import('../src/api/client.js');

    api.getDashboard = async () => ({ projectsSubmitted: 1, judgesCount: 1, avgScore: 0 });
    api.getScoreDistribution = async () => [];
    api.getRubricDetails = async () => ({ locked: false, criteria: [] });
    api.getTracks = async () => [];
    api.getJudges = async () => [{ id: 2, username: 'judge_a', email: 'judge@dogfood.local' }];
    api.getSubmissions = async () => [{ id: 10, title: 'Test Project', track: 'General' }];
    api.getCustomQuestions = async () => [];
    api.getEvent = async () => ({ id: 1, name: 'Sample Hack 2026' });

    // Judge 2 is already assigned to Submission 10
    api.getAssignments = async () => [
      { id: 50, judgeId: 2, submissionId: 10, status: 'ASSIGNED', judgeUsername: 'judge_a', submissionTitle: 'Test Project' }
    ];

    let assignApiCalled = false;
    api.assignJudge = async () => {
      assignApiCalled = true;
      return { id: 51 };
    };

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderDashboard(container, '1');

    document.getElementById('assignJudgeSelect').value = '2';
    document.getElementById('assignSubSelect').value = '10';

    const form = document.getElementById('manualAssignForm');
    form.dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r, 20));

    assert.strictEqual(assignApiCalled, false, "Must NOT call api.assignJudge when duplicate assignment is attempted");

    const feedbackEl = document.getElementById('assignFeedback');
    assert.ok(feedbackEl !== null && (feedbackEl.innerHTML.includes('Judge is already assigned to this project') || feedbackEl.textContent.includes('Judge is already assigned to this project')), "Must display inline duplicate assignment error");

    const toast = document.getElementById('toast2');
    assert.ok(toast !== null && toast.textContent.includes('Judge is already assigned to this project'), "Must notify duplicate assignment error");
  });

  // Test 37: Navigation: Home button allows returning to public scrolling page from gallery, login, and in-app screens
  await test("37. Navigation Home Option: Home buttons exist in top nav, sidebar, auth view, and gallery view", async () => {
    const fs = await import('node:fs');
    const indexHtml = fs.readFileSync('frontend/index.html', 'utf-8');

    // 1. Verify Home exists in top applinks
    assert.ok(indexHtml.includes('<nav class="applinks"') && indexHtml.includes('data-r="home"'), "Home link exists in top applinks");

    // 2. Verify Home button in sidebar
    assert.ok(indexHtml.includes('<aside class="side"') && indexHtml.includes('href="#/" data-r="home"'), "Home link exists in sidebar");

    // 3. Verify Return to Home in auth views
    const { renderAuth } = await import('../src/views/authView.js');
    const authContainer = document.createElement('div');
    renderAuth(authContainer, 'login');
    assert.ok(authContainer.innerHTML.includes('Back to Home') && authContainer.innerHTML.includes('href="#/"'), "Login screen has Back to Home option");

    // 4. Verify Return to Home in gallery view
    const { renderGallery } = await import('../src/views/galleryView.js');
    const galleryContainer = document.createElement('div');
    await renderGallery(galleryContainer, null);
    assert.ok(galleryContainer.innerHTML.includes('Home') && galleryContainer.innerHTML.includes('href="#/"'), "Discovery gallery screen has Home option");
  });

  // Test 38: Organizer Dashboard: Hackathon details and Edit Hackathon workflow
  await test("38. Organizer Dashboard: Displays hackathon details & submission deadline, and Edit Hackathon calls api.updateEvent", async () => {
    const { renderDashboard } = await import('../src/views/dashboardView.js');
    const { api } = await import('../src/api/client.js');

    let updatedPayload = null;
    let updatedEventId = null;
    api.updateEvent = async (id, payload) => {
      updatedEventId = id;
      updatedPayload = payload;
      return { id, ...payload };
    };

    api.getDashboard = async () => ({ projectsSubmitted: 2, judgesCount: 2, avgScore: 4.2 });
    api.getScoreDistribution = async () => [];
    api.getRubricDetails = async () => ({ locked: false, criteria: [] });
    api.getTracks = async () => [{ id: 1, name: 'AI Track' }];
    api.getJudges = async () => [{ id: 5, username: 'judge_one', email: 'j1@dogfood.test' }];
    api.getAssignments = async () => [];
    api.getSubmissions = async () => [];
    api.getCustomQuestions = async () => [];
    api.getEvent = async () => ({
      id: 7,
      name: 'Global AI Summit 2026',
      description: 'Building next-gen AI tools',
      status: 'OPEN',
      submissionDeadline: '2026-11-15T23:59:00Z',
      registrationStart: '2026-10-01T00:00:00Z',
      registrationEnd: '2026-11-01T00:00:00Z',
      eventStart: '2026-11-01T00:00:00Z',
      eventEnd: '2026-11-16T00:00:00Z',
      submissionStart: '2026-11-01T00:00:00Z',
      judgingStart: '2026-11-16T00:00:00Z',
      judgingEnd: '2026-11-18T00:00:00Z',
      resultsPublishAt: '2026-11-20T00:00:00Z'
    });

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderDashboard(container, '7');

    const contentArea = document.getElementById('dashboardContentArea');
    assert.ok(contentArea !== null, "dashboardContentArea exists");

    // 1. Verify Hackathon Details Card is rendered with deadline and details
    assert.ok(contentArea.innerHTML.includes('Global AI Summit 2026'), "Displays event name");
    assert.ok(contentArea.innerHTML.includes('Submission Deadline'), "Displays submission deadline section");
    assert.ok(contentArea.innerHTML.includes('Registration Phase'), "Displays registration phase");
    assert.ok(contentArea.innerHTML.includes('AI Track'), "Displays active tracks");

    // 2. Verify Edit Hackathon Modal opens and pre-fills
    const openEditBtn = document.getElementById('openEditEventBtn');
    const modal = document.getElementById('editEventModal');
    assert.ok(openEditBtn !== null, "Edit Hackathon button exists");
    assert.ok(modal !== null, "Edit Hackathon modal exists");

    openEditBtn.dispatchEvent(new Event('click'));
    assert.ok(modal.classList.contains('open'), "Edit modal opens on click");

    assert.strictEqual(document.getElementById('editEventName').value, 'Global AI Summit 2026', "Pre-fills event name");
    assert.strictEqual(document.getElementById('editEventStatus').value, 'OPEN', "Pre-fills event status");

    // 3. Edit details and submit form
    document.getElementById('editEventName').value = 'Global AI Summit 2026 - Extended';
    document.getElementById('editEventDesc').value = 'Extended deadline and new prize tracks';
    document.getElementById('editEventDeadline').value = '2026-11-25T23:59';

    const form = document.getElementById('editEventForm');
    form.dispatchEvent(new Event('submit'));
    await new Promise(r => setTimeout(r, 15));

    assert.strictEqual(updatedEventId, '7', "api.updateEvent called with correct eventId");
    assert.ok(updatedPayload !== null, "api.updateEvent received payload");
    assert.strictEqual(updatedPayload.name, 'Global AI Summit 2026 - Extended', "Updated name passed");
    assert.strictEqual(updatedPayload.description, 'Extended deadline and new prize tracks', "Updated description passed");
    assert.ok(updatedPayload.submissionDeadline.includes('2026-11-25'), "Updated deadline passed");
  });

  // Test 39: Organizer Dashboard: View All Modals & Scrolling Containers
  await test("39. Organizer Dashboard: View All modals exist and open for Hackathons, Progress, Judges, Assignments, and Distribution", async () => {
    const { renderDashboard } = await import('../src/views/dashboardView.js');
    const { api } = await import('../src/api/client.js');

    api.getDashboard = async () => ({
      projectsSubmitted: 3,
      judgesCount: 2,
      avgScore: 3.8,
      progressByJudge: [
        { name: 'Judge Alpha', scored: 5, total: 10 },
        { name: 'Judge Beta', scored: 8, total: 10 }
      ]
    });
    api.getScoreDistribution = async () => [
      { judgeId: 1, judgeName: 'Judge Alpha', rawMean: 3.5, rawStdDev: 0.8, normalizedMean: 50.0, reviewsCount: 5 }
    ];
    api.getRubricDetails = async () => ({ locked: false, criteria: [] });
    api.getTracks = async () => [];
    api.getJudges = async () => [
      { id: 1, username: 'judge_alpha', email: 'alpha@test.com' },
      { id: 2, username: 'judge_beta', email: 'beta@test.com' }
    ];
    api.getAssignments = async () => [
      { id: 101, judgeId: 1, submissionId: 201, status: 'ASSIGNED', judgeUsername: 'judge_alpha', submissionTitle: 'Project 1' }
    ];
    api.getSubmissions = async () => [];
    api.getCustomQuestions = async () => [];
    api.getEvent = async () => ({ id: 1, name: 'Main Event', submissionDeadline: '2026-12-01T00:00:00Z' });
    api.getEvents = async () => [
      { id: 1, name: 'Main Event', status: 'OPEN' },
      { id: 2, name: 'Secondary Event', status: 'OPEN' }
    ];

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderDashboard(container, '1');

    // 1. View All Hackathons Modal
    const viewAllEventsBtn = document.getElementById('openViewAllEventsBtn');
    const viewAllEventsModal = document.getElementById('viewAllEventsModal');
    assert.ok(viewAllEventsBtn !== null && viewAllEventsModal !== null, "View All Hackathons button & modal exist");
    viewAllEventsBtn.dispatchEvent(new Event('click'));
    await new Promise(r => setTimeout(r, 10));
    assert.ok(viewAllEventsModal.classList.contains('open'), "View All Hackathons modal opens");
    document.getElementById('closeViewAllEventsBtn').dispatchEvent(new Event('click'));
    assert.ok(!viewAllEventsModal.classList.contains('open'), "View All Hackathons modal closes");

    // 2. View All Progress Modal
    const viewAllProgressBtn = document.getElementById('viewAllProgressBtn');
    const viewAllProgressModal = document.getElementById('viewAllProgressModal');
    assert.ok(viewAllProgressBtn !== null && viewAllProgressModal !== null, "View All Progress button & modal exist");
    viewAllProgressBtn.dispatchEvent(new Event('click'));
    assert.ok(viewAllProgressModal.classList.contains('open'), "View All Progress modal opens");
    document.getElementById('closeViewAllProgressBtn').dispatchEvent(new Event('click'));

    // 3. View All Judges Modal
    const viewAllJudgesBtn = document.getElementById('viewAllJudgesBtn');
    const viewAllJudgesModal = document.getElementById('viewAllJudgesModal');
    assert.ok(viewAllJudgesBtn !== null && viewAllJudgesModal !== null, "View All Judges button & modal exist");
    viewAllJudgesBtn.dispatchEvent(new Event('click'));
    assert.ok(viewAllJudgesModal.classList.contains('open'), "View All Judges modal opens");
    document.getElementById('closeViewAllJudgesBtn').dispatchEvent(new Event('click'));

    // 4. View All Assignments Modal
    const viewAllAssignmentsBtn = document.getElementById('viewAllAssignmentsBtn');
    const viewAllAssignmentsModal = document.getElementById('viewAllAssignmentsModal');
    assert.ok(viewAllAssignmentsBtn !== null && viewAllAssignmentsModal !== null, "View All Assignments button & modal exist");
    viewAllAssignmentsBtn.dispatchEvent(new Event('click'));
    assert.ok(viewAllAssignmentsModal.classList.contains('open'), "View All Assignments modal opens");
    document.getElementById('closeViewAllAssignmentsBtn').dispatchEvent(new Event('click'));

    // 5. View All Distribution Modal
    const viewAllDistBtn = document.getElementById('viewAllDistributionBtn');
    const viewAllDistModal = document.getElementById('viewAllDistributionModal');
    assert.ok(viewAllDistBtn !== null && viewAllDistModal !== null, "View All Distribution button & modal exist");
    viewAllDistBtn.dispatchEvent(new Event('click'));
    assert.ok(viewAllDistModal.classList.contains('open'), "View All Distribution modal opens");
    document.getElementById('closeViewAllDistributionBtn').dispatchEvent(new Event('click'));
  });

  // Test 40: Judge View: Scrolling Queue Containers & View All Queue Modal
  await test("40. Judge Scoring View: Queue containers support scrolling and View All Queue modal opens", async () => {
    const { renderJudge } = await import('../src/views/judgeView.js');
    const { api } = await import('../src/api/client.js');

    api.getJudgeAssignments = async () => [
      { id: 'sub-1', assignmentId: 'asgn-1', title: 'Neural Canvas', track: 'AI', tagline: 'Art generator' },
      { id: 'sub-2', assignmentId: 'asgn-2', title: 'Data Vault', track: 'Security', tagline: 'Safe storage' }
    ];
    api.getMyScores = async () => [
      { submissionId: 'sub-2', rawScore: 4.5, comment: 'Great job' }
    ];
    api.getRubric = async () => [
      { name: 'Impact', key: 'impact', weight: 100, minScore: 1, maxScore: 5 }
    ];

    const container = document.createElement('div');
    document.body.appendChild(container);
    await renderJudge(container);

    const viewAllQueueBtn = document.getElementById('viewAllJudgeQueueBtn');
    const viewAllQueueModal = document.getElementById('viewAllJudgeQueueModal');

    assert.ok(viewAllQueueBtn !== null, "View All Queue button exists in Judge View");
    assert.ok(viewAllQueueModal !== null, "View All Queue modal exists in Judge View");

    viewAllQueueBtn.dispatchEvent(new Event('click'));
    assert.ok(viewAllQueueModal.classList.contains('open'), "View All Queue modal opens on click");

    const modalList = document.getElementById('allJudgeQueueListContainer');
    assert.ok(modalList.innerHTML.includes('Neural Canvas'), "Modal lists Neural Canvas");
    assert.ok(modalList.innerHTML.includes('Data Vault'), "Modal lists Data Vault");

    document.getElementById('closeViewAllJudgeQueueBtn').dispatchEvent(new Event('click'));
    assert.ok(!viewAllQueueModal.classList.contains('open'), "View All Queue modal closes on cancel");
  });

  // Test 41: Edit Details pre-fills previous details and is never empty
  await test("41. Edit Details: Pre-fills previous details for Hackathon and Submission, ensuring all inputs are populated and never empty", async () => {
    const { renderDashboard } = await import('../src/views/dashboardView.js');
    const { renderSubmit } = await import('../src/views/submitView.js');
    const { api } = await import('../src/api/client.js');

    // Part A: Dashboard Edit Details
    api.getDashboard = async () => ({ projectsSubmitted: 1, judgesCount: 1, avgScore: 4.0 });
    api.getScoreDistribution = async () => [];
    api.getRubricDetails = async () => ({ locked: false, criteria: [] });
    api.getTracks = async () => [{ id: 1, name: 'Web' }];
    api.getJudges = async () => [];
    api.getAssignments = async () => [];
    api.getSubmissions = async () => [];
    api.getCustomQuestions = async () => [];
    api.getEvent = async () => ({
      id: 99,
      name: 'Hackathon Alpha 2026',
      description: 'Alpha Hackathon description',
      status: 'OPEN',
      submissionDeadline: '2026-05-01T18:00:00Z',
      registrationStart: null,
      registrationEnd: null,
      eventStart: null,
      eventEnd: null,
      submissionStart: null,
      judgingStart: null,
      judgingEnd: null,
      resultsPublishAt: null
    });

    const dashContainer = document.createElement('div');
    document.body.appendChild(dashContainer);
    await renderDashboard(dashContainer, '99');

    const openEditBtn = document.getElementById('openEditEventBtn');
    assert.ok(openEditBtn !== null, "Edit Details button exists on dashboard card");
    assert.ok(dashContainer.innerHTML.includes('Edit Details'), "Edit button labeled 'Edit Details'");

    openEditBtn.dispatchEvent(new Event('click'));
    assert.strictEqual(document.getElementById('editEventName').value, 'Hackathon Alpha 2026', "Pre-fills event name");
    assert.strictEqual(document.getElementById('editEventDesc').value, 'Alpha Hackathon description', "Pre-fills event description");
    assert.strictEqual(document.getElementById('editEventStatus').value, 'OPEN', "Pre-fills event status");
    assert.ok(document.getElementById('editEventDeadline').value !== '', "Deadline input is not empty");
    assert.ok(document.getElementById('editSubStart').value !== '', "Submission start input is not empty");
    assert.ok(document.getElementById('editRegStart').value !== '', "Registration start input is not empty");
    assert.ok(document.getElementById('editRegEnd').value !== '', "Registration end input is not empty");
    assert.ok(document.getElementById('editEventStart').value !== '', "Event start input is not empty");
    assert.ok(document.getElementById('editEventEnd').value !== '', "Event end input is not empty");
    assert.ok(document.getElementById('editJudgingStart').value !== '', "Judging start input is not empty");
    assert.ok(document.getElementById('editJudgingEnd').value !== '', "Judging end input is not empty");
    assert.ok(document.getElementById('editResultsPublishAt').value !== '', "Results publish input is not empty");

    // Part B: Submit View Edit Details
    api.getMySubmission = async () => ({
      id: 501,
      title: 'Previous Submission Title',
      tagline: 'Previous Project Tagline',
      track: 'Web',
      techStack: ['React', 'Node'],
      repoUrl: 'https://github.com/dogfood/prev',
      demoUrl: 'https://demo.dogfood.test/prev',
      description: 'Previous submission description',
      status: 'SUBMITTED'
    });

    const submitContainer = document.createElement('div');
    document.body.appendChild(submitContainer);
    renderSubmit(submitContainer, '99');
    await new Promise(r => setTimeout(r, 20));

    assert.strictEqual(document.getElementById('pTitle').value, 'Previous Submission Title', "Pre-fills submission title");
    assert.strictEqual(document.getElementById('pTagline').value, 'Previous Project Tagline', "Pre-fills submission tagline");
    assert.strictEqual(document.getElementById('pTrack').value, 'Web', "Pre-fills submission track");
    assert.strictEqual(document.getElementById('pRepo').value, 'https://github.com/dogfood/prev', "Pre-fills submission repo");
    assert.strictEqual(document.getElementById('pDemo').value, 'https://demo.dogfood.test/prev', "Pre-fills submission demo");
    assert.strictEqual(document.getElementById('pDesc').value, 'Previous submission description', "Pre-fills submission description");
    assert.ok(document.getElementById('pTech').value.includes('React'), "Pre-fills submission tech stack");
  });

  console.log("\n=================================================");
  console.log(`Summary: ${results.filter(r => r.passed).length}/${results.length} tests passed.`);
  console.log("=================================================");
  if (results.some(r => !r.passed)) {
    process.exit(1);
  }
  process.exit(0);
}

runTests();
