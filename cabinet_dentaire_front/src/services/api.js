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

export default api;
