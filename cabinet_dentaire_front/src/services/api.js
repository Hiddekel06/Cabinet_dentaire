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
    generate: (id) =>
      api.post(`/api/medical-certificates/${id}/generate`, {}, { responseType: 'blob' }),
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

// Endpoints pour les ordonnances
export const ordonnanceAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const cacheKey = `ordonnances:${query}`;
    const cached = getCachedData(cacheKey);
    if (cached) return Promise.resolve(cached);

    return api.get(`/api/ordonnances?${query}`).then(res => {
      setCachedData(cacheKey, res);
      return res;
    });
  },

  getById: (id) =>
    api.get(`/api/ordonnances/${id}`),

  create: (data) => {
    clearCache('ordonnances');
    return api.post('/api/ordonnances', data);
  },

  delete: (id) => {
    clearCache('ordonnances');
    return api.delete(`/api/ordonnances/${id}`);
  },

  generate: (id, data = {}) =>
    api.post(`/api/ordonnances/${id}/generate`, data, { responseType: 'blob' }),
};

// Endpoints pour les factures
export const invoiceAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const cacheKey = `invoices:${query}`;
    const cached = getCachedData(cacheKey);
    if (cached) return Promise.resolve(cached);

    return api.get(`/api/invoices?${query}`).then(res => {
      setCachedData(cacheKey, res);
      return res;
    });
  },

  getById: (id) =>
    api.get(`/api/invoices/${id}`),

  getBillableActs: (patientId) =>
    api.get(`/api/patients/${patientId}/billable-acts`),

  create: (data) => {
    clearCache('invoices');
    clearCache('statistics:overview');
    clearCache('dashboard:overview');
    return api.post('/api/invoices', data);
  },

  markAsPaid: (id) => {
    clearCache('invoices');
    clearCache('statistics:overview');
    clearCache('dashboard:overview');
    return api.post(`/api/invoices/${id}/mark-paid`);
  },

  generate: (id) =>
    api.post(`/api/invoices/${id}/generate`, {}, { responseType: 'blob' }),
};

// Endpoints pour les suggestions de médicaments
export const medicationAPI = {
  suggestions: (query = '') =>
    api.get(`/api/medications/suggestions?query=${encodeURIComponent(query)}`),
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

// 🔥 Interceptor pour ajouter le Bearer token à chaque requête
api.interceptors.request.use((config) => {
  const bearerToken = localStorage.getItem('token');
  if (bearerToken) {
    config.headers['Authorization'] = `Bearer ${bearerToken}`;
  }

  // Garder aussi le XSRF token en cas de besoin
  const xsrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];

  if (xsrfToken) {
    config.headers['X-XSRF-TOKEN'] = decodeURIComponent(xsrfToken);
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
    const response = await api.post('/api/login', { email, password });
    
    // Stocker le token Bearer si fourni
    if (response.data?.token) {
      localStorage.setItem('token', response.data.token);
    }
    
    return response;
  },

  logout: () => {
    clearCache(); // Vider le cache à la déconnexion
    localStorage.removeItem('token');
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

  // Ajouter des actes à un traitement existant
  addActs: (id, acts) => {
    clearCache('patient-treatments');
    return api.post(`/api/patient-treatments/${id}/acts`, { acts });
  },

  // Modifier un acte d'un traitement existant
  updateAct: (treatmentId, actId, data) => {
    clearCache('patient-treatments');
    return api.patch(`/api/patient-treatments/${treatmentId}/acts/${actId}`, data);
  },

  // Supprimer un acte d'un traitement existant
  removeAct: (treatmentId, actId, auditNote = '') => {
    clearCache('patient-treatments');
    return api.delete(`/api/patient-treatments/${treatmentId}/acts/${actId}`, {
      data: {
        audit_note: auditNote || null,
      },
    });
  },

  // Historique d'audit d'un traitement
  getAuditLogs: (id) =>
    api.get(`/api/patient-treatments/${id}/audit-logs`),
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

// Endpoints pour les types de produits
export const productTypeAPI = {
  getAll: () => {
    const cacheKey = 'product-types:all';
    const cached = getCachedData(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/api/product-types').then(res => {
      setCachedData(cacheKey, res);
      return res;
    });
  },

  getById: (id) =>
    api.get(`/api/product-types/${id}`),

  create: (data) => {
    clearCache('product-types');
    return api.post('/api/product-types', data);
  },

  update: (id, data) => {
    clearCache('product-types');
    return api.put(`/api/product-types/${id}`, data);
  },

  delete: (id) => {
    clearCache('product-types');
    return api.delete(`/api/product-types/${id}`);
  },
};

// Endpoints pour les produits (achats)
export const productAPI = {
  getAll: (page = 1, params = {}) => {
    const queryParams = new URLSearchParams({
      page,
      ...params,
    }).toString();
    const cacheKey = `products:${queryParams}`;
    const cached = getCachedData(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get(`/api/products?${queryParams}`).then(res => {
      setCachedData(cacheKey, res);
      return res;
    });
  },

  getById: (id) =>
    api.get(`/api/products/${id}`),

  create: (data) => {
    clearCache('products');
    clearCache('statistics:overview');
    clearCache('dashboard:overview');
    return api.post('/api/products', data);
  },

  update: (id, data) => {
    clearCache('products');
    clearCache('statistics:overview');
    clearCache('dashboard:overview');
    return api.put(`/api/products/${id}`, data);
  },

  delete: (id) => {
    clearCache('products');
    clearCache('statistics:overview');
    clearCache('dashboard:overview');
    return api.delete(`/api/products/${id}`);
  },

  getStatistics: () => {
    const cacheKey = 'products:statistics';
    const cached = getCachedData(cacheKey);
    if (cached) return Promise.resolve(cached);
    
    return api.get('/api/products/statistics').then(res => {
      setCachedData(cacheKey, res);
      return res;
    });
  },
};

// Endpoint pour le tableau de bord statistiques
export const statisticsAPI = {
  getOverview: (period = 'month') => {
    const cacheKey = `statistics:overview:${period}`;
    const cached = getCachedData(cacheKey);
    if (cached) return Promise.resolve(cached);

    return api.get(`/api/statistics/overview?period=${encodeURIComponent(period)}`).then(res => {
      setCachedData(cacheKey, res);
      return res;
    });
  },
};

// Endpoint pour la vue dashboard
export const dashboardAPI = {
  getOverview: (period = 'month') => {
    const cacheKey = `dashboard:overview:${period}`;
    const cached = getCachedData(cacheKey);
    if (cached) return Promise.resolve(cached);

    return api.get(`/api/dashboard/overview?period=${encodeURIComponent(period)}`).then(res => {
      setCachedData(cacheKey, res);
      return res;
    });
  },
};

export default api;
