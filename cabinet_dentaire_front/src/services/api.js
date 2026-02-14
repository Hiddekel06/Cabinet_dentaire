import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

// 🔥 Interceptor pour ajouter le token XSRF à chaque requête
api.interceptors.request.use((config) => {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];

  if (token) {
    config.headers['X-XSRF-TOKEN'] = decodeURIComponent(token);
  }

  return config;
});

export async function getCsrfToken() {
  await api.get('/sanctum/csrf-cookie');
}

// Endpoints d'authentification
export const authAPI = {
  login: async (email, password) => {
    await getCsrfToken();
    return api.post('/api/login', { email, password });
  },

  logout: () =>
    api.post('/api/logout'),

  getUser: () =>
    api.get('/api/user'),
};

// Endpoints pour les patients
export const patientAPI = {
  getAll: (page = 1) =>
    api.get(`/api/patients?page=${page}`),

  getById: (id) =>
    api.get(`/api/patients/${id}`),

  create: (data) =>
    api.post('/api/patients', data),

  update: (id, data) =>
    api.put(`/api/patients/${id}`, data),

  delete: (id) =>
    api.delete(`/api/patients/${id}`),
};

// Endpoints pour les rendez-vous
export const appointmentAPI = {
  getAll: (page = 1) =>
    api.get(`/api/appointments?page=${page}`),

  getById: (id) =>
    api.get(`/api/appointments/${id}`),

  create: (data) =>
    api.post('/api/appointments', data),

  update: (id, data) =>
    api.put(`/api/appointments/${id}`, data),

  delete: (id) =>
    api.delete(`/api/appointments/${id}`),
};

// Endpoints pour les traitements (catalogue)
export const treatmentAPI = {
  getAll: (page = 1) =>
    api.get(`/api/treatments?page=${page}`),

  getById: (id) =>
    api.get(`/api/treatments/${id}`),

  create: (data) =>
    api.post('/api/treatments', data),

  update: (id, data) =>
    api.put(`/api/treatments/${id}`, data),

  delete: (id) =>
    api.delete(`/api/treatments/${id}`),
};

// Endpoints pour les suivis patients (patient-treatments)
export const patientTreatmentAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/api/patient-treatments?${query}`);
  },

  getById: (id) =>
    api.get(`/api/patient-treatments/${id}`),

  create: (data) =>
    api.post('/api/patient-treatments', data),

  update: (id, data) =>
    api.put(`/api/patient-treatments/${id}`, data),

  delete: (id) =>
    api.delete(`/api/patient-treatments/${id}`),
};

// Endpoints pour les dossiers médicaux
export const medicalRecordAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/api/medical-records?${query}`);
  },

  getById: (id) =>
    api.get(`/api/medical-records/${id}`),

  create: (data) =>
    api.post('/api/medical-records', data),

  update: (id, data) =>
    api.put(`/api/medical-records/${id}`, data),

  delete: (id) =>
    api.delete(`/api/medical-records/${id}`),
};

export default api;
