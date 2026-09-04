import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { Layout } from "../components/Layout";
import { patientAPI, patientTreatmentAPI } from "../services/api";

const statusOptions = [
  { value: 'all', label: 'Tous les statuts', color: 'gray' },
  { value: 'Nouveau', label: 'Nouveau', color: 'blue' },
  { value: 'Suivi', label: 'Suivi', color: 'emerald' },
  { value: 'En traitement', label: 'En traitement', color: 'amber' }
];

const treatmentOptions = [
  { value: 'all', label: 'Tous les traitements' },
  { value: 'Détartrage', label: 'Détartrage' },
  { value: 'Consultation', label: 'Consultation' },
  { value: 'Implant', label: 'Implant' },
  { value: 'Extraction', label: 'Extraction' }
];

const Patients = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // États de données
  const [patients, setPatients] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState('');

  // États de filtres et tri
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTreatment, setSelectedTreatment] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // États UI
  const [openMenu, setOpenMenu] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const successTimeoutRef = useRef(null);

  // Helpers
  const formatDate = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const getInitials = (first, last) => {
    const f = (first || '').trim().charAt(0).toUpperCase();
    const l = (last || '').trim().charAt(0).toUpperCase();
    return `${f}${l}` || 'P';
  };

  const statusToColor = (status) => {
    if (status === 'Diagnostic') return 'emerald';
    if (status === 'En traitement') return 'amber';
    return 'blue';
  };

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const mapPatient = (p) => ({
    apiId: p.id,
    id: `N°${p.id}`,
    initials: getInitials(p.first_name, p.last_name),
    name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
    phone: p.phone || p.contact_phone || '',
    date: formatDate(p.last_visit_date) || '-',
    treatment: p.last_treatment || '-',
    status: p.status || 'Nouveau',
    color: statusToColor(p.status),
    timeAgo: '',
    age: calculateAge(p.date_of_birth),
    generalState: p.general_state,
  });

  // Chargement des données optimisé (Côté serveur)
  const reloadPatients = async () => {
    setPatientsLoading(true);
    setPatientsError('');
    try {
      // Mapping des champs de tri vers le backend
      const backendSortMap = {
        name: 'last_name',
        date: 'last_visit_date_precalc',
        status: 'id'
      };

      const { data } = await patientAPI.getAll(page, { 
        search: searchTerm.trim(), 
        per_page: 10,
        sort_by: backendSortMap[sortBy] || 'id',
        sort_order: sortOrder,
        status: selectedStatus !== 'all' ? selectedStatus : undefined
      });
      
      const list = Array.isArray(data?.data) ? data.data : [];
      setPatients(list.map(mapPatient));
      setTotalPages(data?.last_page || 1);
    } catch (error) {
      console.error('Erreur chargement patients:', error);
      setPatientsError('Impossible de charger les patients.');
    } finally {
      setPatientsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    reloadPatients();
  }, [searchTerm, selectedStatus, sortBy, sortOrder]);

  useEffect(() => {
    if (page !== 1) {
      reloadPatients();
    }
  }, [page]);

  const handleEdit = async (patient) => {
    if (!patient?.apiId) return;
    navigate(`/patients/${patient.apiId}/edit`);
  };

  const handleDelete = (patient) => {
    if (!patient?.apiId) return;
    setPatientToDelete(patient);
    setShowDeleteConfirmation(true);
  };

  const confirmDelete = async () => {
    if (!patientToDelete?.apiId) return;
    setDeleteLoading(true);
    try {
      await patientAPI.delete(patientToDelete.apiId);
      await reloadPatients();
      setShowDeleteConfirmation(false);
      setPatientToDelete(null);
    } catch (error) {
      console.error('Erreur suppression patient:', error);
      setPatientsError('Impossible de supprimer le patient.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredPatients = useMemo(() => {
    // Filtrage/Tri gérés par le serveur désormais. 
    // On pourrait encore filtrer localement par 'selectedTreatment' si non géré par le backend
    let results = [...patients];
    if (selectedTreatment !== 'all') {
      results = results.filter(p => p.treatment === selectedTreatment);
    }
    return results;
  }, [patients, selectedTreatment]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedTreatment('all');
    setSortBy('date');
    setSortOrder('desc');
    setPage(1);
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleRowClick = async (patient) => {
    if (!patient?.apiId) return;
    try {
      const res = await patientTreatmentAPI.getAll({ patient_id: patient.apiId, per_page: 1 });
      const list = Array.isArray(res?.data?.data) ? res.data.data : (res?.data || []);
      const activeTreatment = list.find(t => ['planned', 'in_progress'].includes(t.status));
      
      if (activeTreatment && activeTreatment.id) {
        navigate(`/treatments/${activeTreatment.id}/session`);
      } else {
        navigate('/treatments/new', { state: { patientId: patient.apiId } });
      }
    } catch (error) {
      console.error('Erreur navigation traitements patient:', error);
      navigate('/treatments', { state: { patientId: patient.apiId } });
    }
  };

  return (
    <Layout>
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Liste des patients</h1>
        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Gérez et suivez tous vos patients</p>
      </div>

      {successMessage && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      )}

      {/* Modale Suppression */}
      {showDeleteConfirmation && patientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirmation(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-red-100" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-50 text-red-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Supprimer le patient</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">Souhaitez-vous vraiment supprimer <strong>{patientToDelete.name}</strong> ?</p>
            <div className="flex gap-3 justify-end">
              <button className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-xl" onClick={() => setShowDeleteConfirmation(false)}>Annuler</button>
              <button className="px-5 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200" onClick={confirmDelete} disabled={deleteLoading}>{deleteLoading ? '...' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher nom ou téléphone..."
              className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 text-sm font-semibold border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            >
              {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={clearFilters} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl border border-gray-200 transition-colors">Réinitialiser</button>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-3xl border border-blue-50 shadow-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-linear-to-r from-white to-blue-50/30">
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Registre Patients</h2>
          <button onClick={() => navigate('/patients/new')} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            Nouveau
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <th className="py-4 px-6 text-left cursor-pointer hover:text-blue-600" onClick={() => toggleSort('name')}>Patient {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="py-4 px-6 text-left">Contact</th>
                <th className="py-4 px-6 text-left cursor-pointer hover:text-blue-600" onClick={() => toggleSort('date')}>Dernière Visite {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}</th>
                <th className="py-4 px-6 text-left">Statut</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patientsLoading ? (
                <tr><td colSpan="5" className="py-20 text-center font-bold text-slate-400 animate-pulse">Chargement intelligent...</td></tr>
              ) : filteredPatients.map(p => (
                <tr key={p.apiId} onClick={() => handleRowClick(p)} className="hover:bg-blue-50/40 transition-colors cursor-pointer group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">{p.initials}</div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          {p.name}
                          {p.age && <span className="text-slate-400 font-medium">({p.age} ans)</span>}
                          {p.generalState && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{p.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm font-medium text-slate-600">{p.phone}</td>
                  <td className="py-4 px-6"><span className="text-sm font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{p.date}</span></td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${colorClasses[p.color] || colorClasses.blue}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right relative" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setOpenMenu(openMenu === p.apiId ? null : p.apiId)} className="p-2 hover:bg-white rounded-lg transition-colors"><svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg></button>
                    {openMenu === p.apiId && (
                      <div className="absolute right-6 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <button className="w-full text-left px-4 py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-50" onClick={() => handleEdit(p)}>Modifier dossier</button>
                        <button className="w-full text-left px-4 py-2 text-sm font-bold text-emerald-600 hover:bg-emerald-50" onClick={() => navigate(`/ordonnances/new?patient_id=${p.apiId}`)}>Ordonnance</button>
                        <button className="w-full text-left px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50" onClick={() => navigate(`/medical-certificates/new?patient_id=${p.apiId}`)}>Certificat</button>
                        <div className="h-px bg-slate-100 my-1"></div>
                        <button className="w-full text-left px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50" onClick={() => handleDelete(p)}>Supprimer</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-5 border-t border-slate-50 bg-slate-50/30 flex justify-between items-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Page {page} / {totalPages}</p>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm">Précédent</button>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-30 transition-all shadow-lg shadow-blue-200">Suivant</button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Patients;
