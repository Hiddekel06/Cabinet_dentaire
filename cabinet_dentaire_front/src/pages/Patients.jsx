import React, { useState, useMemo, useEffect } from "react";
import { Layout } from "../components/Layout";
import { patientAPI } from "../services/api";

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

const initialForm = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  date_of_birth: '',
  gender: '',
  address: '',
  city: '',
  notes: '',
};

const Patients = () => {
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTreatment, setSelectedTreatment] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const isFormBusy = formLoading || editLoading;

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
    if (status === 'Suivi') return 'emerald';
    if (status === 'En traitement') return 'amber';
    return 'blue';
  };

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  };

  const mapPatient = (p) => ({
    apiId: p.id,
    id: `N°${p.id}`,
    initials: getInitials(p.first_name, p.last_name),
    name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
    phone: p.phone || '',
    email: p.email || '',
    city: p.city || '',
    address: p.address || '',
    gender: p.gender || '',
    date_of_birth: p.date_of_birth || '',
    notes: p.notes || '',
    date: formatDate(p.last_appointment_date || p.created_at || p.updated_at),
    treatment: p.last_treatment || '-',
    status: p.status || 'Nouveau',
    color: statusToColor(p.status),
    timeAgo: '',
  });

  useEffect(() => {
    const loadPatients = async () => {
      setPatientsLoading(true);
      setPatientsError('');
      try {
        const { data } = await patientAPI.getAll(1);
        const list = Array.isArray(data?.data) ? data.data : [];
        setPatients(list.map(mapPatient));
      } catch (error) {
        console.error('Erreur chargement patients:', error);
        setPatientsError('Impossible de charger les patients.');
      } finally {
        setPatientsLoading(false);
      }
    };

    loadPatients();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isInsideMenu = event.target.closest('[data-patient-menu="true"]');
      if (!isInsideMenu) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const closeForm = () => {
    setShowForm(false);
    setEditingPatient(null);
    setForm(initialForm);
    setFormError("");
    setFormSuccess("");
  };

  const handleEdit = async (patient) => {
    if (!patient?.apiId) return;
    setEditLoading(true);
    setEditingPatient(patient);
    setFormError('');
    try {
      const { data } = await patientAPI.getById(patient.apiId);
      setForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
        email: data.email || '',
        city: data.city || '',
        address: data.address || '',
        gender: data.gender || '',
        date_of_birth: data.date_of_birth || '',
        notes: data.notes || '',
      });
      setShowForm(true);
    } catch (error) {
      console.error('Erreur chargement patient:', error);
      setFormError('Impossible de charger le patient.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (patient) => {
    if (!patient?.apiId) return;
    if (!window.confirm(`Supprimer le patient ${patient.name} ?`)) return;
    try {
      await patientAPI.delete(patient.apiId);
      await reloadPatients();
    } catch (error) {
      console.error('Erreur suppression patient:', error);
      setPatientsError('Impossible de supprimer le patient.');
    }
  };

  const reloadPatients = async () => {
    setPatientsLoading(true);
    setPatientsError('');
    try {
      const { data } = await patientAPI.getAll(1);
      const list = Array.isArray(data?.data) ? data.data : [];
      setPatients(list.map(mapPatient));
    } catch (error) {
      console.error('Erreur chargement patients:', error);
      setPatientsError('Impossible de charger les patients.');
    } finally {
      setPatientsLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    if (!form.first_name || !form.last_name || !form.phone) {
      setFormError("Prénom, nom et téléphone sont obligatoires.");
      return;
    }
    setFormLoading(true);
    try {
      if (editingPatient?.apiId) {
        await patientAPI.update(editingPatient.apiId, form);
        setFormSuccess("Patient mis à jour avec succès !");
        await reloadPatients();
      } else {
        await patientAPI.create(form);
        setFormSuccess("Patient ajouté avec succès !");
        await reloadPatients();
      }
      closeForm();
    } catch (err) {
      setFormError(err.response?.data?.message || "Erreur lors de l'ajout du patient");
    } finally {
      setFormLoading(false);
    }
  };

  const filteredPatients = useMemo(() => {
    let results = [...patients];
    const normalizedSearch = searchTerm.trim().toLowerCase();

    // Filtre par recherche
    if (normalizedSearch) {
      results = results.filter(patient =>
        (patient.name || '').toLowerCase().includes(normalizedSearch) ||
        (patient.email || '').toLowerCase().includes(normalizedSearch) ||
        (patient.phone || '').includes(normalizedSearch) ||
        (patient.id || '').toLowerCase().includes(normalizedSearch)
      );
    }

    // Filtre par statut
    if (selectedStatus !== 'all') {
      results = results.filter(patient => patient.status === selectedStatus);
    }

    // Filtre par traitement
    if (selectedTreatment !== 'all') {
      results = results.filter(patient => patient.treatment === selectedTreatment);
    }

    // Tri
    results.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'date':
          aValue = a.date ? new Date(a.date.split('/').reverse().join('-')).getTime() : 0;
          bValue = b.date ? new Date(b.date.split('/').reverse().join('-')).getTime() : 0;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return results;
  }, [patients, searchTerm, selectedStatus, selectedTreatment, sortBy, sortOrder]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedTreatment('all');
    setSortBy('name');
    setSortOrder('desc');
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <Layout>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Liste des patients</h1>
        <p className="text-gray-600 mt-1">Gérez et suivez tous vos patients</p>
      </div>

      {/* Formulaire d'ajout de patient */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.25)' }}
          onClick={closeForm}
        >
          <div
            className="relative w-full max-w-3xl mx-2 sm:mx-auto bg-white rounded-xl shadow-lg border border-blue-100 animate-fadeIn"
            style={{ maxHeight: '90vh', minHeight: '320px', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
              onClick={closeForm}
              aria-label="Fermer"
              type="button"
            >
              &times;
            </button>
            <div className="flex items-center gap-3 px-6 pt-6 pb-2 bg-linear-to-r from-blue-50 via-white to-blue-50">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-50">
                <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold">{editingPatient ? 'Modifier un patient' : 'Ajouter un patient'}</h2>
              {editLoading && (
                <span className="text-xs text-gray-500">Chargement...</span>
              )}
                <div className="w-full border-t border-gray-200 my-2"></div>

            </div>
            <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 pb-6">
              <div className="border border-blue-100 rounded-lg px-4 py-2 flex flex-col gap-1 shadow-sm">
                <label className="text-xs font-semibold text-gray-900 mb-1">Prénom *</label>
                <input
                  name="first_name"
                  value={form.first_name}
                  onChange={handleFormChange}
                  placeholder="Prénom"
                  className="bg-gray-50 rounded-lg px-3 py-2 text-left focus:ring-2 focus:ring-blue-200 focus:outline-none w-full border border-transparent focus:border-blue-300 transition placeholder-gray-400"
                  required
                />
              </div>
              <div className="border border-blue-100 rounded-lg px-4 py-2 flex flex-col gap-1 shadow-sm">
                <label className="text-xs font-semibold text-gray-900 mb-1">Nom *</label>
                <input
                  name="last_name"
                  value={form.last_name}
                  onChange={handleFormChange}
                  placeholder="Nom"
                  className="bg-gray-50 rounded-lg px-3 py-2 text-left focus:ring-2 focus:ring-blue-200 focus:outline-none w-full border border-transparent focus:border-blue-300 transition placeholder-gray-400"
                  required
                />
              </div>
              <div className=" border border-blue-100 rounded-lg px-4 py-2 flex flex-col gap-1 shadow-sm">
                <label className="text-xs font-semibold text-gray-900 mb-1">Téléphone *</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleFormChange}
                    placeholder="Téléphone"
                  className="bg-gray-50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:outline-none w-full border border-transparent focus:border-blue-300 transition placeholder-gray-400"
                  required
                />
              </div>
              <div className="border border-blue-100 rounded-lg px-4 py-2 flex flex-col gap-1 shadow-sm">
                <label className="text-xs font-semibold text-gray-800 mb-1">Email</label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleFormChange}
                    placeholder="Email"
                  className="bg-gray-50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:outline-none w-full border border-transparent focus:border-blue-300 transition placeholder-gray-400"
                  type="email"
                />
              </div>
              <div className=" border border-blue-100 rounded-lg px-4 py-2 flex flex-col gap-1 shadow-sm">
                <label className="text-xs font-semibold text-gray-800 mb-1">Date de naissance</label>
                <input
                  name="date_of_birth"
                  value={form.date_of_birth}
                  onChange={handleFormChange}
                    placeholder="Date de naissance"
                  className="bg-gray-50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:outline-none w-full border border-transparent focus:border-blue-300 transition placeholder-gray-400"
                  type="date"
                />
              </div>
              <div className="   border border-blue-100 rounded-lg px-4 py-2 flex flex-col gap-1 shadow-sm">
                <label className="text-xs font-semibold text-gray-800 mb-1">Genre</label>
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 flex flex-col items-start w-fit shadow-sm">
                  <span className="text-xs font-semibold text-blue-700 mb-1">Sexe</span>
                  <div className="flex flex-row gap-4 items-center">
                    <label className="inline-flex items-center cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="gender"
                        value="M"
                        checked={form.gender === 'M'}
                        onChange={handleFormChange}
                        className="form-radio text-blue-500 focus:ring-blue-400 h-3 w-3 border-gray-300 accent-blue-500"
                      />
                      <span className="ml-1 text-gray-700">Masculin</span>
                    </label>
                    <label className="inline-flex items-center cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="gender"
                        value="F"
                        checked={form.gender === 'F'}
                        onChange={handleFormChange}
                        className="form-radio text-blue-500 focus:ring-blue-400 h-3 w-3 border-gray-300 accent-blue-500"
                      />
                      <span className="ml-1 text-gray-700">Féminin</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-3 md:col-span-2">
                <div className=" border border-blue-100 rounded-lg px-4 py-2 flex flex-col gap-1 w-full md:w-1/2 shadow-sm">
                  <label className="text-xs font-semibold text-gray-800 mb-1">Ville</label>
                  <input
                    name="city"
                    value={form.city}
                    onChange={handleFormChange}
                    placeholder="Ville"
                    className="bg-gray-50 rounded-lg px-3 py-2 text-left focus:ring-2 focus:ring-blue-200 focus:outline-none w-full border border-transparent focus:border-blue-300 transition placeholder-gray-400"
                  />
                </div>
                <div className="border border-blue-100 rounded-lg px-4 py-2 flex flex-col gap-1 w-full md:w-1/2 shadow-sm">
                  <label className="text-xs font-semibold text-gray-800 mb-1">Adresse</label>
                  <input
                    name="address"
                    value={form.address}
                    onChange={handleFormChange}
                    placeholder="Adresse"
                    className="bg-gray-50 rounded-lg px-3 py-2 text-left focus:ring-2 focus:ring-blue-200 focus:outline-none w-full border border-transparent focus:border-blue-300 transition placeholder-gray-400"
                  />
                </div>
              </div>
              <div className="border border-blue-100 rounded-lg px-4 py-2 flex flex-col gap-1 md:col-span-2 shadow-sm">
                <label className="text-xs font-semibold text-gray-800 mb-1">Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  placeholder="Notes"
                  className="bg-gray-50 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-200 focus:outline-none w-full border border-transparent focus:border-blue-300 transition placeholder-gray-400"
                />
              </div>
              {formError && <div className="text-red-600 text-sm">{formError}</div>}
              {formSuccess && <div className="text-green-600 text-sm">{formSuccess}</div>}
              <div className="flex justify-center mt-4 md:col-span-2">
                <button
                  type="submit"
                  className="px-6 py-2.5 text-white rounded-full font-semibold bg-emerald-600 border-2 border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700 focus:ring-4 focus:ring-emerald-200 flex items-center justify-center gap-2 text-sm shadow-sm transition disabled:opacity-60 disabled:cursor-not-allowed max-w-xs w-full mx-auto"
                  disabled={isFormBusy}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{isFormBusy ? "Enregistrement..." : (editingPatient ? "Mettre à jour" : "Ajouter le patient")}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barre de recherche et filtres */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Barre de recherche */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un patient par nom, email, téléphone..."
                className="block w-full pl-10 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-normal placeholder-gray-400"
                style={{ maxWidth: 260, fontFamily: 'Inter, Arial, sans-serif' }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filtres */}
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 text-sm font-medium border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white shadow-sm hover:border-blue-400"
              style={{ minWidth: 170, fontFamily: 'Inter, Arial, sans-serif' }}
            >
              {statusOptions.map(option => (
                <option
                  key={option.value}
                  value={option.value}
                  className={
                    selectedStatus === option.value
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'bg-white text-gray-700'
                  }
                >
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={selectedTreatment}
              onChange={(e) => setSelectedTreatment(e.target.value)}
              className="px-3 py-1.5 text-sm font-medium border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white shadow-sm hover:border-blue-400"
              style={{ minWidth: 170, fontFamily: 'Inter, Arial, sans-serif' }}
            >
              {treatmentOptions.map(option => (
                <option
                  key={option.value}
                  value={option.value}
                  className={
                    selectedTreatment === option.value
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'bg-white text-gray-700'
                  }
                >
                  {option.label}
                </option>
              ))}
            </select>

            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm font-medium border border-gray-300 text-gray-700 rounded-md bg-white shadow-sm hover:bg-gray-50 hover:border-blue-400 transition-colors flex items-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Résumé des filtres */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">
              {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''} trouvé{filteredPatients.length !== 1 ? 's' : ''}
            </span>
            {(searchTerm || selectedStatus !== 'all' || selectedTreatment !== 'all') && (
              <div className="flex flex-wrap gap-2">
                {searchTerm && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                    Recherche: "{searchTerm}"
                    <button onClick={() => setSearchTerm('')} className="hover:text-blue-900">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {selectedStatus !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full">
                    Statut: {statusOptions.find(s => s.value === selectedStatus)?.label}
                    <button onClick={() => setSelectedStatus('all')} className="hover:text-emerald-900">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
                {selectedTreatment !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-full">
                    Traitement: {selectedTreatment}
                    <button onClick={() => setSelectedTreatment('all')} className="hover:text-amber-900">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Options de tri */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Trier par:</span>
            <div className="flex gap-1">
              {['date', 'name', 'status'].map((field) => (
                <button
                  key={field}
                  onClick={() => toggleSort(field)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    sortBy === field
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  {field === 'date' && 'Date'}
                  {field === 'name' && 'Nom'}
                  {field === 'status' && 'Statut'}
                  {sortBy === field && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des patients */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-100 shadow-lg bg-linear-to-br from-white/80 via-blue-50/60 to-white/90 backdrop-blur-sm transition-all duration-300 group hover:shadow-2xl hover:border-blue-200">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Patients</h2>
            <p className="text-gray-500 text-sm mt-1">Liste complète des patients enregistrés</p>
          </div>
          <div className="mt-3 sm:mt-0 flex space-x-2">
            <button
              className="inline-flex items-center gap-1.5 px-3 py-2 text-orange-500 text-sm font-medium rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer select-none border border-orange-100"
              onClick={() => setShowForm((v) => !v)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {showForm ? 'Fermer' : 'Nouveau patient'}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider">
                  <button 
                    onClick={() => toggleSort('name')}
                    className="flex items-center hover:text-gray-900 transition-colors"
                  >
                    <span>Patient</span>
                    <svg className={`w-4 h-4 ml-1 ${sortBy === 'name' ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider">Contact</th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider">
                  <button 
                    onClick={() => toggleSort('date')}
                    className="flex items-center hover:text-gray-900 transition-colors"
                  >
                    <span>Dernière visite</span>
                    <svg className={`w-4 h-4 ml-1 ${sortBy === 'date' ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider">
                  <button 
                    onClick={() => toggleSort('status')}
                    className="flex items-center hover:text-gray-900 transition-colors"
                  >
                    <span>Statut</span>
                    <svg className={`w-4 h-4 ml-1 ${sortBy === 'status' ? 'text-blue-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </button>
                </th>
                <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {patientsLoading ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v2m0 12v2m8-8h-2M6 12H4m12.364-6.364-1.414 1.414M8.05 15.95l-1.414 1.414m0-11.314 1.414 1.414m7.9 7.9 1.414 1.414" />
                      </svg>
                      Chargement des patients...
                    </div>
                  </td>
                </tr>
              ) : patientsError ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-red-600">
                    {patientsError}
                  </td>
                </tr>
              ) : filteredPatients.length > 0 ? (
                filteredPatients.map((patient, index) => (
                  <tr key={patient.apiId || index} className="hover:bg-gray-50 transition-colors duration-150 group">
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <div className="relative">
                          <div className="w-8 h-8 bg-linear-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform duration-200">
                            <span className="font-semibold text-blue-600 text-xs">{patient.initials}</span>
                          </div>
                          {patient.status === 'Nouveau' && (
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-xs truncate max-w-35">{patient.name}</p>
                          <div className="flex items-center text-gray-500 text-xs mt-0.5">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {patient.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-900 text-sm flex items-center">
                          <svg className="w-3 h-3 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {patient.phone}
                        </p>
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="font-medium text-gray-700">Ville:</span>{' '}
                          {patient.city || '-'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          <span className="font-medium text-gray-700">Adresse:</span>{' '}
                          {patient.address || '-'}
                        </div>
                        <div>
                          <svg className="w-3 h-3 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {patient.treatment}
                          <p className="text-gray-400 text-xs mt-1">{patient.timeAgo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colorClasses[patient.color] || colorClasses.blue}`}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="relative inline-flex" data-patient-menu="true">
                        <button
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          onClick={() => setOpenMenu(openMenu === patient.apiId ? null : patient.apiId)}
                          title="Actions"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        {openMenu === patient.apiId && (
                          <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                            <button
                              onClick={() => {
                                handleEdit(patient);
                                setOpenMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Modifier
                            </button>
                            <button
                              onClick={() => {
                                handleDelete(patient);
                                setOpenMenu(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Supprimer
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-gray-500 text-lg font-medium mb-2">Aucun patient trouvé</p>
                      <p className="text-gray-400 text-sm">Essayez de modifier vos critères de recherche</p>
                      <button
                        onClick={clearFilters}
                        className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-700 text-sm font-medium hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Réinitialiser tous les filtres
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="px-8 py-4 border-t border-blue-100 flex items-center justify-between mt-2">
          <p className="text-gray-500 text-sm">Affichage de {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}</p>
          <div className="flex space-x-2">
            <button className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              ← Précédent
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 hover:shadow-md rounded-lg transition-all duration-200 flex items-center gap-1">
              <span>Suivant</span>
              <svg className="w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Patients;