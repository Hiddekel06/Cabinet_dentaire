// Endpoints pour les actes dentaires
export const dentalActAPI = {
  getAll: () => {
    const cacheKey = 'dental-acts:all';
    const cached = getCachedData(cacheKey);
    if (cached) return Promise.resolve(cached);
    return api.get('/api/dental-acts').then(res => {
      setCachedData(cacheKey, res);
      return res;
    });
  },
};
// Endpoints pour les certificats médicaux
export const medicalCertificateAPI = {
    generate: (data) =>
      api.post('/api/medical-certificates/generate', data, { responseType: 'blob' }),
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const cacheKey = `medical-certificates:${query}`;
    const cached = getCachedData(cacheKey);
    if (cached) return Promise.resolve(cached);
    return api.get(`/api/medical-certificates?${query}`).then(res => {
      setCachedData(cacheKey, res);
      return res;
    });
  },

  getById: (id) =>
    api.get(`/api/medical-certificates/${id}`),
  
  getByPatient: (patientId) =>
    api.get(`/api/medical-certificates?patient_id=${patientId}`),

  create: (data) => {
    clearCache('medical-certificates');
    return api.post('/api/medical-certificates', data);
  },

  update: (id, data) => {
    clearCache('medical-certificates');
    return api.put(`/api/medical-certificates/${id}`, data);
  },

  delete: (id) => {
    clearCache('medical-certificates');
    return api.delete(`/api/medical-certificates/${id}`);
  },
};
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

// 🔥 Mini système de cache (5 minutes par défaut)
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

const clearCache = (pattern = null) => {
  if (!pattern) {
    cache.clear();
  } else {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  }
};

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
    clearCache(); // Vider le cache à la connexion
    return api.post('/api/login', { email, password });
  },

  logout: () => {
    clearCache(); // Vider le cache à la déconnexion
    return api.post('/api/logout');
  },

  getUser: () =>
    api.get('/api/user'),
};

// Endpoints pour les patients
export const patientAPI = {
  getAll: (page = 1) => {
    const cacheKey = `patients:${page}`;
    const cached = getCachedData(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get(`/api/patients?page=${page}`).then(res => {
      setCachedData(cacheKey, res);
      return res;
    });
  },

  getById: (id) =>
    api.get(`/api/patients/${id}`),

  create: (data) => {
    clearCache('patients');
    return api.post('/api/patients', data);
  },

  update: (id, data) => {
    clearCache('patients');
    return api.put(`/api/patients/${id}`, data);
  },

  delete: (id) => {
    clearCache('patients');
    return api.delete(`/api/patients/${id}`);
  },
};

// Endpoints pour les rendez-vous
export const appointmentAPI = {
  getAll: (page = 1) => {
    const cacheKey = `appointments:${page}`;
    const cached = getCachedData(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get(`/api/appointments?page=${page}`).then(res => {
      setCachedData(cacheKey, res);
      return res;
    });
  },

  getById: (id) =>
    api.get(`/api/appointments/${id}`),

  create: (data) => {
    clearCache('appointments');
    return api.post('/api/appointments', data);
  },

  update: (id, data) => {
    clearCache('appointments');
    return api.put(`/api/appointments/${id}`, data);
  },

  delete: (id) => {
    clearCache('appointments');
    return api.delete(`/api/appointments/${id}`);
  },
};

// Endpoints pour les traitements (catalogue)
export const treatmentAPI = {
  getAll: (page = 1) => {
    const cacheKey = `treatments:${page}`;
    const cached = getCachedData(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get(`/api/treatments?page=${page}`).then(res => {
      setCachedData(cacheKey, res);
      return res;
    });
  },

  getById: (id) =>
    api.get(`/api/treatments/${id}`),

  create: (data) => {
    clearCache('treatments');
    return api.post('/api/treatments', data);
  },

  update: (id, data) => {
    clearCache('treatments');
    return api.put(`/api/treatments/${id}`, data);
  },

  delete: (id) => {
    clearCache('treatments');
    return api.delete(`/api/treatments/${id}`);
  },
};

// Endpoints pour les suivis patients (patient-treatments)
export const patientTreatmentAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const cacheKey = `patient-treatments:${query}`;
    const cached = getCachedData(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get(`/api/patient-treatments?${query}`).then(res => {
      setCachedData(cacheKey, res);
      return res;
    });
  },

  getById: (id) =>
    api.get(`/api/patient-treatments/${id}`),

  create: (data) => {
    clearCache('patient-treatments');
    return api.post('/api/patient-treatments', data);
  },

  update: (id, data) => {
    clearCache('patient-treatments');
    return api.put(`/api/patient-treatments/${id}`, data);
  },

  delete: (id) => {
    clearCache('patient-treatments');
    return api.delete(`/api/patient-treatments/${id}`);
  },
};

// Endpoints pour les dossiers médicaux
export const medicalRecordAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const cacheKey = `medical-records:${query}`;
    const cached = getCachedData(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get(`/api/medical-records?${query}`).then(res => {
      setCachedData(cacheKey, res);
      return res;
    });
  },

  getById: (id) =>
    api.get(`/api/medical-records/${id}`),
  
  getByPatient: (patientId) =>
    api.get(`/api/medical-records?patient_id=${patientId}`),

  create: (data) => {
    clearCache('medical-records');
    return api.post('/api/medical-records', data);
  },

  update: (id, data) => {
    clearCache('medical-records');
    return api.put(`/api/medical-records/${id}`, data);
  },

  delete: (id) => {
    clearCache('medical-records');
    return api.delete(`/api/medical-records/${id}`);
  },
};

export default api;
