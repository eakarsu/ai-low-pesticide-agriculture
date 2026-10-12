const BASE = '/api';

function getToken() {
  return localStorage.getItem('token') || '';
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options?.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.message || err.error || 'Request failed');
  }
  return res.json();
}

async function requestList<T>(path: string): Promise<T[]> {
  const payload: unknown = await request<unknown>(path);
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && 'data' in payload && Array.isArray(payload.data)) return payload.data;
  throw new Error(`Unexpected list response from ${path}`);
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  demoLogin: () => request<{ token: string; user: any }>('/auth/demo', { method: 'POST' }),
  me: () => request<any>('/auth/me'),

  // Fields
  getFields: () => requestList<any>('/fields'),
  getField: (id: number) => request<any>(`/fields/${id}`),
  createField: (data: any) => request<any>('/fields', { method: 'POST', body: JSON.stringify(data) }),
  updateField: (id: number, data: any) => request<any>(`/fields/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteField: (id: number) => request<any>(`/fields/${id}`, { method: 'DELETE' }),

  // Detections
  getDetections: () => requestList<any>('/detections'),
  getDetection: (id: number) => request<any>(`/detections/${id}`),
  createDetection: (data: any) => request<any>('/detections', { method: 'POST', body: JSON.stringify(data) }),
  updateDetection: (id: number, data: any) => request<any>(`/detections/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDetection: (id: number) => request<any>(`/detections/${id}`, { method: 'DELETE' }),

  // Treatments
  getTreatments: () => requestList<any>('/treatments'),
  getTreatment: (id: number) => request<any>(`/treatments/${id}`),
  createTreatment: (data: any) => request<any>('/treatments', { method: 'POST', body: JSON.stringify(data) }),
  updateTreatment: (id: number, data: any) => request<any>(`/treatments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTreatment: (id: number) => request<any>(`/treatments/${id}`, { method: 'DELETE' }),

  // Health Reports
  getHealthReports: () => requestList<any>('/health-reports'),
  getHealthReport: (id: number) => request<any>(`/health-reports/${id}`),
  createHealthReport: (data: any) => request<any>('/health-reports', { method: 'POST', body: JSON.stringify(data) }),
  updateHealthReport: (id: number, data: any) => request<any>(`/health-reports/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteHealthReport: (id: number) => request<any>(`/health-reports/${id}`, { method: 'DELETE' }),

  // Sensors
  getSensors: () => requestList<any>('/sensors'),
  getSensor: (id: number) => request<any>(`/sensors/${id}`),
  createSensor: (data: any) => request<any>('/sensors', { method: 'POST', body: JSON.stringify(data) }),
  updateSensor: (id: number, data: any) => request<any>(`/sensors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSensor: (id: number) => request<any>(`/sensors/${id}`, { method: 'DELETE' }),

  // Weather
  getWeather: () => requestList<any>('/weather'),
  getWeatherItem: (id: number) => request<any>(`/weather/${id}`),
  createWeather: (data: any) => request<any>('/weather', { method: 'POST', body: JSON.stringify(data) }),
  updateWeather: (id: number, data: any) => request<any>(`/weather/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWeather: (id: number) => request<any>(`/weather/${id}`, { method: 'DELETE' }),

  // AI
  pestAnalysis: (data: any) => request<any>('/ai/pest-analysis', { method: 'POST', body: JSON.stringify(data) }),
  yieldPrediction: (data: any) => request<any>('/ai/yield-prediction', { method: 'POST', body: JSON.stringify(data) }),
  treatmentPlan: (data: any) => request<any>('/ai/treatment-plan', { method: 'POST', body: JSON.stringify(data) }),
  fieldSummary: (data: any) => request<any>('/ai/field-summary', { method: 'POST', body: JSON.stringify(data) }),

  // AI extras (5 new)
  sprayWindow: (data: any) => request<any>('/ai/spray-window', { method: 'POST', body: JSON.stringify(data) }),
  residueRisk: (data: any) => request<any>('/ai/residue-risk', { method: 'POST', body: JSON.stringify(data) }),
  soilHealth: (data: any) => request<any>('/ai/soil-health', { method: 'POST', body: JSON.stringify(data) }),
  diseaseEarlyWarning: (data: any) => request<any>('/ai/disease-early-warning', { method: 'POST', body: JSON.stringify(data) }),
  beneficialInsects: (data: any) => request<any>('/ai/beneficial-insects', { method: 'POST', body: JSON.stringify(data) }),

  // Utility (3 new)
  exportFieldsCsvUrl: () => `${BASE}/utility/export/fields.csv`,
  globalSearch: (q: string, type = 'all', status = '') =>
    request<{ results: any[]; total: number }>(
      `/utility/search?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}${status ? `&status=${encodeURIComponent(status)}` : ''}`
    ),
  activityFeed: (limit = 50) =>
    request<{ events: any[]; total: number }>(`/utility/activity?limit=${limit}`),

  // Field operations
  getServiceOrders: (status = '') => request<{ orders: any[]; limit: number }>(
    `/field-operations/orders${status ? `?status=${encodeURIComponent(status)}` : ''}`
  ),
  getServiceOrder: (id: string) => request<any>(`/field-operations/orders/${encodeURIComponent(id)}`),
  transitionServiceOrder: (id: string, data: any) => request<any>(
    `/field-operations/orders/${encodeURIComponent(id)}/transitions`,
    { method: 'POST', body: JSON.stringify(data) }
  ),
};
