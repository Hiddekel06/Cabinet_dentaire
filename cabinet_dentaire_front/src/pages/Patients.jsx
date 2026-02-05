import React, { useState, useMemo } from "react";
import { Layout } from "../components/Layout";

const fakePatients = [
  {
    initials: 'AD',
    name: 'Awa Diop',
    id: 'N°1248',
    phone: '77 123 45 67',
    email: 'awa.diop@email.com',
    date: '12/01/2026',
    treatment: 'Détartrage',
    status: 'Suivi',
    color: 'emerald',
    timeAgo: 'Il y a 3 jours'
  },
  {
    initials: 'MF',
    name: 'Moussa Fall',
    id: 'N°1249',
    phone: '77 234 56 78',
    email: 'moussa.fall@email.com',
    date: '15/01/2026',
    treatment: 'Consultation',
    status: 'Nouveau',
    color: 'blue',
    timeAgo: "Aujourd'hui"
  },
  {
    initials: 'FS',
    name: 'Fatou Seck',
    id: 'N°1250',
    phone: '77 345 67 89',
    email: 'fatou.seck@email.com',
    date: '10/01/2026',
    treatment: 'Implant',
    status: 'En traitement',
    color: 'amber',
    timeAgo: 'Il y a 5 jours'
  },
  {
    initials: 'AK',
    name: 'Amadou Kane',
    id: 'N°1251',
    phone: '77 456 78 90',
    email: 'amadou.kane@email.com',
    date: '08/01/2026',
    treatment: 'Extraction',
    status: 'Suivi',
    color: 'emerald',
    timeAgo: 'Il y a 7 jours'
  },
  {
    initials: 'ND',
    name: 'Ndeye Diagne',
    id: 'N°1252',
    phone: '77 567 89 01',
    email: 'ndeye.diagne@email.com',
    date: '18/01/2026',
    treatment: 'Consultation',
    status: 'Nouveau',
    color: 'blue',
    timeAgo: "Aujourd'hui"
  }
];

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedTreatment, setSelectedTreatment] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  const filteredPatients = useMemo(() => {
    let results = [...fakePatients];

    // Filtre par recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(patient =>
        patient.name.toLowerCase().includes(term) ||
        patient.email.toLowerCase().includes(term) ||
        patient.phone.includes(term) ||
        patient.id.toLowerCase().includes(term)
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
          aValue = new Date(a.date.split('/').reverse().join('-'));
          bValue = new Date(b.date.split('/').reverse().join('-'));
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
  }, [searchTerm, selectedStatus, selectedTreatment, sortBy, sortOrder]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedTreatment('all');
    setSortBy('date');
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
      <div className="relative overflow-hidden rounded-2xl border border-blue-100 shadow-lg bg-gradient-to-br from-white/80 via-blue-50/60 to-white/90 backdrop-blur-sm transition-all duration-300 group hover:shadow-2xl hover:border-blue-200">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Patients</h2>
            <p className="text-gray-500 text-sm mt-1">Liste complète des patients enregistrés</p>
          </div>
          <div className="mt-3 sm:mt-0 flex space-x-2">
            <button className="inline-flex items-center gap-1.5 px-3 py-2 text-orange-500 text-sm font-medium rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer select-none border border-orange-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouveau patient
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
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors duration-150 group">
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <div className="relative">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center mr-3 group-hover:scale-105 transition-transform duration-200">
                            <span className="font-semibold text-blue-600 text-xs">{patient.initials}</span>
                          </div>
                          {patient.status === 'Nouveau' && (
                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-xs truncate max-w-[140px]">{patient.name}</p>
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
                        <p className="text-gray-500 text-xs truncate max-w-[160px] flex items-center mt-1">
                          <svg className="w-3 h-3 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89-5.42a2 2 0 012.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          {patient.email}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{patient.date}</p>
                        <div className="flex items-center text-gray-500 text-xs mt-0.5">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {patient.treatment}
                        </div>
                        <p className="text-gray-400 text-xs mt-1">{patient.timeAgo}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-${patient.color}-50 text-${patient.color}-700 border border-${patient.color}-100`}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
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