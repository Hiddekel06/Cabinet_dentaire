import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { patientAPI, radiographyAPI } from '../services/api';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('fr-FR');
};

const getPatientName = (patient) => {
  if (!patient) return 'Patient';
  return `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Patient';
};

const buildPublicFileUrl = (filePath) => {
  if (!filePath) return '#';
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:8088').replace(/\/+$/, '').replace(/\/api$/, '');
  return `${base}/storage/${filePath}`;
};

const Radiographies = () => {
  const [patients, setPatients] = useState([]);
  const [radiographies, setRadiographies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [filters, setFilters] = useState({
    patient_id: '',
  });

  const [form, setForm] = useState({
    patient_id: '',
    scan_date: new Date().toISOString().slice(0, 10),
    description: '',
    file: null,
  });

  const loadPatients = async () => {
    try {
      const res = await patientAPI.getAll(1, { per_page: 500 });
      setPatients(res.data?.data || res.data || []);
    } catch {
      setPatients([]);
    }
  };

  const loadRadiographies = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.patient_id) params.patient_id = filters.patient_id;

      const res = await radiographyAPI.getAll(params);
      setRadiographies(res.data?.data || []);
    } catch {
      setError('Impossible de charger les radiographies.');
      setRadiographies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    loadRadiographies();
  }, [filters.patient_id]);

  const patientNameById = useMemo(() => {
    return patients.reduce((acc, patient) => {
      acc[patient.id] = getPatientName(patient);
      return acc;
    }, {});
  }, [patients]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.patient_id || !form.scan_date || !form.file) {
      alert('Patient, date et fichier sont obligatoires.');
      return;
    }

    const payload = new FormData();
    payload.append('patient_id', form.patient_id);
    payload.append('scan_date', form.scan_date);
    payload.append('description', form.description || '');
    payload.append('file', form.file);

    setSaving(true);
    try {
      await radiographyAPI.create(payload);
      setForm({
        patient_id: '',
        scan_date: new Date().toISOString().slice(0, 10),
        description: '',
        file: null,
      });
      await loadRadiographies();
    } catch (err) {
      const message = err?.response?.data?.message || 'Erreur lors de l\'upload de la radiographie.';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette radiographie ?')) return;

    try {
      await radiographyAPI.delete(id);
      await loadRadiographies();
    } catch {
      alert('Suppression impossible.');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Radiographies</h1>
          <p className="text-gray-600 mt-1">Importez et gérez les radios/scanners de vos patients.</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Importer une radiographie</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Patient *</label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.patient_id}
                onChange={(e) => setForm((prev) => ({ ...prev, patient_id: e.target.value }))}
              >
                <option value="">Sélectionner un patient</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {getPatientName(patient)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date du scan *</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.scan_date}
                onChange={(e) => setForm((prev) => ({ ...prev, scan_date: e.target.value }))}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                placeholder="Ex: Panoramique, rétro-alvéolaire dent 36..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fichier (jpg, jpeg, png, pdf) *</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,image/*,application/pdf"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                onChange={(e) => setForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? 'Import en cours...' : 'Importer la radiographie'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Radiographies enregistrées</h2>
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={filters.patient_id}
              onChange={(e) => setFilters({ patient_id: e.target.value })}
            >
              <option value="">Tous les patients</option>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {getPatientName(patient)}
                </option>
              ))}
            </select>
          </div>

          {error && <div className="mb-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm px-3 py-2">{error}</div>}

          {loading ? (
            <p className="text-sm text-gray-500">Chargement...</p>
          ) : radiographies.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune radiographie trouvée.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b border-gray-200">
                    <th className="py-2 pr-3">Patient</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Description</th>
                    <th className="py-2 pr-3">Fichier</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {radiographies.map((radio) => {
                    const fileUrl = buildPublicFileUrl(radio.file_path);
                    return (
                      <tr key={radio.id} className="border-b border-gray-100">
                        <td className="py-2 pr-3">{getPatientName(radio.patient) || patientNameById[radio.patient_id] || 'Patient'}</td>
                        <td className="py-2 pr-3">{formatDate(radio.scan_date)}</td>
                        <td className="py-2 pr-3">{radio.description || '-'}</td>
                        <td className="py-2 pr-3">
                          <a
                            href={fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Ouvrir
                          </a>
                        </td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => handleDelete(radio.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Radiographies;
