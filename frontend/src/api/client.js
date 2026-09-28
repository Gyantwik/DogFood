/**
 * client.js — Centralized API client for Dogfood Full-Stack Platform
 * Manages HTTP communication, Bearer tokens, CORS handling, downloads, and fallback mocks.
 */

import { authStore } from '../store/authStore.js';
import { config } from '../../config.js';

class ApiClient {
  constructor() {
    this.baseUrl = config.apiBaseUrl || '';
    this.online = true;
    this.lastHealth = null;
  }

  setBaseUrl(url) {
    this.baseUrl = url;
  }

  async request(path, options = {}) {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const token = authStore.getToken();

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };

    if (token && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401) {
        authStore.clearSession();
        if (window.location.hash !== '#/login') {
          window.location.hash = '#/login';
        }
        throw new Error('Session expired or unauthorized (401)');
      }

      if (response.status === 403) {
        throw new Error('Access forbidden (403)');
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorJson;
        try { errorJson = JSON.parse(errorText); } catch { errorJson = null; }
        throw new Error((errorJson && (errorJson.message || errorJson.error)) || `HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await response.json();
        // Transparently unwrap standard ApiResponse envelope if present
        if (json && typeof json === 'object' && json.success !== undefined && json.data !== undefined) {
          return json.data;
        }
        return json;
      }
      return await response.text();
    } catch (err) {
      // Re-throw so callers can decide on mock fallback
      throw err;
    }
  }

  // Health check endpoint with rich payload
  async checkHealth() {
    try {
      const data = await this.request('/api/health', { skipAuth: true });
      this.online = true;
      this.lastHealth = data;
      return { ok: true, data };
    } catch (err) {
      this.online = false;
      return { ok: false, error: err.message };
    }
  }

  // Auth endpoints
  async login(identifier, password) {
    let email = (identifier || '').trim();
    if (email && !email.includes('@')) {
      const seededMap = {
        'organizer': 'organizer@dogfood.local',
        'judge_a': 'judge_a@dogfood.local',
        'judge_b': 'judge_b@dogfood.local',
        'participant': 'participant@dogfood.local'
      };
      email = seededMap[email.toLowerCase()] || `${email.toLowerCase()}@dogfood.local`;
    }

    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async signup(payload) {
    let email = payload.email || payload.username || '';
    if (email && !email.includes('@')) {
      email = `${payload.username.toLowerCase()}@dogfood.local`;
    }

    return this.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        username: payload.username,
        email,
        password: payload.password
      })
    });
  }

  async getMe() {
    return this.request('/api/auth/me');
  }

  // Event & Team endpoints
  async getEvents() {
    return this.request('/api/events', { skipAuth: true });
  }

  async getEvent(id) {
    if (!id) throw new Error('Event ID is required');
    return this.request(`/api/events/${id}`, { skipAuth: true });
  }

  async registerForEvent(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/register`, {
      method: 'POST'
    });
  }

  async createEvent(payload) {
    return this.request('/api/events', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateEvent(eventId, payload) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  async getTracks(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/tracks`, { skipAuth: true });
  }

  async addTrack(eventId, payload) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/tracks`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async createTeam(eventId, payload) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/teams`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async joinTeam(inviteCode) {
    return this.request('/api/teams/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode })
    });
  }

  async getTeams(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/teams`);
  }

  // Submissions / Gallery endpoints
  async getSubmissions(eventId, params = {}) {
    if (!eventId) throw new Error('Event ID is required');
    const qs = new URLSearchParams(params).toString();
    return this.request(`/api/events/${eventId}/submissions${qs ? `?${qs}` : ''}`, { skipAuth: true });
  }

  async getMySubmission(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/submissions/mine`);
  }

  async submitProject(eventId, payload) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/submissions`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateSubmission(submissionId, payload) {
    if (!submissionId) throw new Error('Submission ID is required');
    return this.request(`/api/submissions/${submissionId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  // Judging & Rubric endpoints
  async getRubric(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    try {
      const res = await this.request(`/api/events/${eventId}/rubric`);
      if (Array.isArray(res) && res.length > 0) return res;
      if (res && Array.isArray(res.criteria) && res.criteria.length > 0) return res.criteria;
      return [
        { name: 'Technical Depth', key: 'tech_depth', weight: 25, minScore: 1, maxScore: 5 },
        { name: 'Business Value', key: 'biz_value', weight: 25, minScore: 1, maxScore: 5 },
        { name: 'Design & UX', key: 'design_ux', weight: 25, minScore: 1, maxScore: 5 },
        { name: 'Presentation', key: 'presentation', weight: 25, minScore: 1, maxScore: 5 }
      ];
    } catch (err) {
      // In isolated/offline environments where server returns HTTP 404 or network fails, supply standard default rubric
      return [
        { name: 'Technical Depth', key: 'tech_depth', weight: 25, minScore: 1, maxScore: 5 },
        { name: 'Business Value', key: 'biz_value', weight: 25, minScore: 1, maxScore: 5 },
        { name: 'Design & UX', key: 'design_ux', weight: 25, minScore: 1, maxScore: 5 },
        { name: 'Presentation', key: 'presentation', weight: 25, minScore: 1, maxScore: 5 }
      ];
    }
  }

  async getRubricDetails(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/rubric/details`);
  }

  async saveRubric(eventId, rubric) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/rubric`, {
      method: 'POST',
      body: JSON.stringify({ criteria: rubric })
    });
  }

  async autoAssignJudges(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/assignments`, {
      method: 'POST',
      body: JSON.stringify({ autoAssign: true })
    });
  }

  async assignJudge(eventId, judgeId, submissionId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/assignments`, {
      method: 'POST',
      body: JSON.stringify({ judgeId, submissionId })
    });
  }

  async getJudges(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/judges`);
  }

  async getAssignments(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/assignments`);
  }

  async deleteAssignment(eventId, assignmentId) {
    if (!eventId) throw new Error('Event ID is required');
    if (!assignmentId) throw new Error('Assignment ID is required');
    return this.request(`/api/events/${eventId}/assignments/${assignmentId}`, {
      method: 'DELETE'
    });
  }

  async getJudgeAssignments(eventId = null) {
    const targetEventId = eventId || authStore.getEventId();
    if (!targetEventId) {
      throw new Error('Event ID is required for judge queue');
    }
    // Strictly accesses authenticated judge's own private queue scoped to event
    return this.request(`/api/judges/me/assignments?eventId=${encodeURIComponent(targetEventId)}`);
  }

  async getJudgeAssignment(assignmentId, eventId = null) {
    if (!assignmentId) throw new Error('Assignment ID is required');
    const targetEventId = eventId || authStore.getEventId();
    const query = targetEventId ? `?eventId=${encodeURIComponent(targetEventId)}` : '';
    // Server-authorized single assignment lookup scoped to event
    return this.request(`/api/judges/me/assignments/${assignmentId}${query}`);
  }

  async getCustomQuestions(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/questions`, { skipAuth: true });
  }

  async addCustomQuestion(eventId, payload) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/questions`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async deleteCustomQuestion(eventId, questionId) {
    if (!eventId) throw new Error('Event ID is required');
    if (!questionId) throw new Error('Question ID is required');
    return this.request(`/api/events/${eventId}/questions/${questionId}`, {
      method: 'DELETE'
    });
  }

  async getMyScores(eventId = null) {
    const targetEventId = eventId || authStore.getEventId();
    const qs = targetEventId ? `?eventId=${encodeURIComponent(targetEventId)}` : '';
    return this.request(`/api/judge/scores${qs}`);
  }

  async submitScore(payload) {
    const eventId = payload?.eventId || authStore.getEventId();
    const qs = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';
    return this.request(`/api/judging/scores${qs}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async declareCOI(payload) {
    const eventId = payload?.eventId || authStore.getEventId();
    const qs = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';
    return this.request(`/api/judging/coi${qs}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Operational Dashboard endpoints
  async getDashboard(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/dashboard`);
  }

  async getScoreDistribution(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/score-distribution`);
  }

  // Results & Exports (Stage 7 Normalization Engine)
  async getResults(eventId, mode = 'raw') {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/leaderboard?mode=${mode}`);
  }

  async exportSubmissions(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.downloadCSV(`/api/events/${eventId}/export/submissions`, `submissions_event_${eventId}.csv`);
  }

  async exportScores(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.downloadCSV(`/api/events/${eventId}/export/scores`, `scores_event_${eventId}.csv`);
  }

  async exportResults(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.downloadCSV(`/api/events/${eventId}/export/results`, `results_event_${eventId}.csv`);
  }

  async downloadCSV(path, filename) {
    const token = authStore.getToken();
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }
  // T3 — Community Voting
  async getVotingStatus(eventId, voterIdentifier) {
    if (!eventId) throw new Error('Event ID is required');
    const qs = voterIdentifier ? `?voterIdentifier=${encodeURIComponent(voterIdentifier)}` : '';
    return this.request(`/api/events/${eventId}/voting/status${qs}`);
  }

  async getBallot(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/voting/ballot`);
  }

  async submitVote(eventId, payload) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/voting/vote`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async getVotingResults(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/voting/results`);
  }

  // T3 — Comments
  async getComments(eventId, submissionId) {
    if (!eventId || !submissionId) throw new Error('Event ID and Submission ID are required');
    return this.request(`/api/events/${eventId}/submissions/${submissionId}/comments`);
  }

  async addComment(eventId, submissionId, payload) {
    if (!eventId || !submissionId) throw new Error('Event ID and Submission ID are required');
    return this.request(`/api/events/${eventId}/submissions/${submissionId}/comments`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // T4 — Webhooks
  async listWebhooks(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/webhooks`);
  }

  async registerWebhook(eventId, payload) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/webhooks`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async deleteWebhook(eventId, webhookId) {
    if (!eventId || !webhookId) throw new Error('Event ID and Webhook ID are required');
    return this.request(`/api/events/${eventId}/webhooks/${webhookId}`, {
      method: 'DELETE'
    });
  }

  async getWebhookDeliveries(eventId, webhookId) {
    if (!eventId) throw new Error('Event ID is required');
    const path = webhookId
      ? `/api/events/${eventId}/webhooks/${webhookId}/deliveries`
      : `/api/events/${eventId}/webhooks/null/deliveries`;
    return this.request(path);
  }

  async testWebhook(eventId, webhookId) {
    if (!eventId || !webhookId) throw new Error('Event ID and Webhook ID are required');
    return this.request(`/api/events/${eventId}/webhooks/${webhookId}/test`, {
      method: 'POST'
    });
  }

  // T4 — Certificates & Verifications
  async getCertificate(certificateId) {
    if (!certificateId) throw new Error('Certificate ID is required');
    return this.request(`/api/certificates/${encodeURIComponent(certificateId)}`, { skipAuth: true });
  }

  async verifyJudgeRecord(payload) {
    return this.request('/api/verify/judge-record', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(payload)
    });
  }

  async generateCertificates(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/certificates/generate`, {
      method: 'POST'
    });
  }

  async getEventCertificates(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/certificates`);
  }

  async getMyJudgeRecord(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/judges/me/record`);
  }

  // T4 — Bulk Data & Audit
  async exportBundle(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/export/bundle`);
  }

  async importBundle(eventId, bundle) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/import`, {
      method: 'POST',
      body: JSON.stringify(bundle)
    });
  }

  async getAuditLogs(eventId) {
    if (!eventId) throw new Error('Event ID is required');
    return this.request(`/api/events/${eventId}/audit-logs`);
  }
}

export const api = new ApiClient();
export default api;
