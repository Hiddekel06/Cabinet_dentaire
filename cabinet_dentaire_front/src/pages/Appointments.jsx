
import React, { useState, useMemo, useEffect, useRef } from "react";
import { Layout } from "../components/Layout";

const fakeAppointments = [
  {
    id: 1,
    date: '2026-02-10',
    heure: '09:00',
    patient: 'Awa Diop',
    motif: 'Consultation',
    praticien: 'Dr. Ndiaye',
    statut: 'À venir',
  },
  {
    id: 2,
    date: '2026-02-10',
    heure: '10:30',
    patient: 'Moussa Fall',
    motif: 'Détartrage',
    praticien: 'Dr. Ndiaye',
    statut: 'Terminé',
  },
  {
    id: 3,
    date: '2026-02-11',
    heure: '14:00',
    patient: 'Fatou Seck',
    motif: 'Implant',
    praticien: 'Dr. Ba',
    statut: 'Annulé',
  },
];

const statusOptions = [
  { value: 'all', label: 'Tous les statuts', color: 'gray' },
  { value: 'À venir', label: 'À venir', color: 'emerald' },
  { value: 'Terminé', label: 'Terminé', color: 'slate' },
  { value: 'Annulé', label: 'Annulé', color: 'red' },
];

const motifOptions = [
  { value: 'all', label: 'Tous les motifs' },
  { value: 'Consultation', label: 'Consultation' },
  { value: 'Détartrage', label: 'Détartrage' },
  { value: 'Implant', label: 'Implant' },
];

const Appointments = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMotif, setSelectedMotif] = useState('all');
  const [openMenu, setOpenMenu] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' ou 'calendar'
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 5)); // Février 2026
  const menuRef = useRef(null);

  // Fermer le menu quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleViewDetails = (appointment) => {
    console.log('Voir détails:', appointment);
    alert(`Détails du rendez-vous:\n\nPatient: ${appointment.patient}\nDate: ${appointment.date}\nHeure: ${appointment.heure}\nMotif: ${appointment.motif}\nPraticien: ${appointment.praticien}\nStatut: ${appointment.statut}`);
  };

  const handleEdit = (appointment) => {
    console.log('Modifier:', appointment);
    alert(`Modification du rendez-vous avec ${appointment.patient}`);
  };

  const handleDelete = (appointment) => {
    console.log('Supprimer:', appointment);
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le rendez-vous avec ${appointment.patient}?`)) {
      alert('Rendez-vous supprimé avec succès');
    }
  };

  const filteredAppointments = useMemo(() => {
    let results = [...fakeAppointments];

    // Filtre par recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(app =>
        app.patient.toLowerCase().includes(term) ||
        app.praticien.toLowerCase().includes(term) ||
        app.motif.toLowerCase().includes(term)
      );
    }

    // Filtre par statut
    if (selectedStatus !== 'all') {
      results = results.filter(app => app.statut === selectedStatus);
    }

    // Filtre par motif
    if (selectedMotif !== 'all') {
      results = results.filter(app => app.motif === selectedMotif);
    }

    return results;
  }, [searchTerm, selectedStatus, selectedMotif]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedMotif('all');
  };

  // Fonction pour obtenir les rendez-vous d'un jour
  const getAppointmentsForDay = (day) => {
    const dateStr = `2026-02-${String(day).padStart(2, '0')}`;
    return filteredAppointments.filter(a => a.date === dateStr);
  };

  // Fonction pour générer le calendrier
  const generateCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return { days, monthNames, dayNames, monthName: monthNames[month], year };
  };

  const { days, monthNames, dayNames, monthName, year } = generateCalendar();

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des rendez-vous</h1>
          <p className="text-gray-600 mt-1">Consultez, planifiez et gérez tous les rendez-vous du cabinet</p>
        </div>
        
        {/* Boutons de vue */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('table')}
            className={`px-2.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
              viewMode === 'table'
                ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-sm'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
            aria-pressed={viewMode === 'table'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Tableau
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-2.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
              viewMode === 'calendar'
                ? 'bg-blue-100 text-blue-700 border-blue-300 shadow-sm'
                : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
            }`}
            aria-pressed={viewMode === 'calendar'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Calendrier
          </button>
        </div>
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
                placeholder="Rechercher par patient, praticien, motif..."
                className="block w-full pl-10 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors font-normal placeholder-gray-400"
                style={{ maxWidth: 300, fontFamily: 'Inter, Arial, sans-serif' }}
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
              value={selectedMotif}
              onChange={(e) => setSelectedMotif(e.target.value)}
              className="px-3 py-1.5 text-sm font-medium border border-blue-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-white shadow-sm hover:border-blue-400"
              style={{ minWidth: 170, fontFamily: 'Inter, Arial, sans-serif' }}
            >
              {motifOptions.map(option => (
                <option
                  key={option.value}
                  value={option.value}
                  className={
                    selectedMotif === option.value
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
              {filteredAppointments.length} rendez-vous trouvé{filteredAppointments.length !== 1 ? 's' : ''}
            </span>
            {(searchTerm || selectedStatus !== 'all' || selectedMotif !== 'all') && (
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
                {selectedMotif !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-full">
                    Motif: {selectedMotif}
                    <button onClick={() => setSelectedMotif('all')} className="hover:text-amber-900">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VUE TABLEAU */}
      {viewMode === 'table' && (
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 shadow-lg bg-gradient-to-br from-white/80 via-blue-50/60 to-white/90 backdrop-blur-sm transition-all duration-300 group hover:shadow-2xl hover:border-blue-200">
          <div className="px-4 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Rendez-vous</h2>
              <p className="text-gray-500 text-sm mt-1">Liste des rendez-vous du cabinet</p>
            </div>
            <div className="mt-3 sm:mt-0 flex space-x-2">
              <button className="inline-flex items-center gap-1.5 px-3 py-2 text-blue-600 text-sm font-medium rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer select-none border border-blue-100">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nouveau rendez-vous
              </button>
            </div>
          </div>
          <div className="w-full overflow-x-auto">
            <table className="min-w-[600px] w-full text-xs sm:text-sm md:text-base">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Date</th>
                  <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Heure</th>
                  <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Patient</th>
                  <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Motif</th>
                  <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Praticien</th>
                  <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Statut</th>
                  <th className="text-left py-2 px-2 sm:py-3 sm:px-4 text-gray-600 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAppointments.length > 0 ? (
                  filteredAppointments.map((a) => (
                    <tr key={a.id} className="hover:bg-blue-50 transition-colors duration-150 group">
                      <td className="py-2 px-2 sm:py-3 sm:px-4 font-medium text-gray-900 whitespace-nowrap">{a.date}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap">{a.heure}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap">{a.patient}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap">{a.motif}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap">{a.praticien}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap">
                        <span className={
                          a.statut === 'À venir' ? 'inline-block px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700' :
                          a.statut === 'Terminé' ? 'inline-block px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600' :
                          'inline-block px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600'
                        }>
                          {a.statut}
                        </span>
                      </td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 whitespace-nowrap">
                        <div className="relative flex items-center" ref={menuRef}>
                          {/* Menu actions rapides */}
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenu(openMenu === a.id ? null : a.id)}
                              className="inline-flex items-center justify-center w-8 h-8 text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-gray-400"
                              title="Actions"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                            {/* Dropdown menu */}
                            {openMenu === a.id && (
                              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                <button
                                  onClick={() => {
                                    handleViewDetails(a);
                                    setOpenMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  Voir détails
                                </button>
                                <button
                                  onClick={() => {
                                    handleEdit(a);
                                    setOpenMenu(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Modifier
                                </button>
                                <div className="border-t border-gray-200 my-1"></div>
                                <button
                                  onClick={() => {
                                    handleDelete(a);
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
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-400">Aucun rendez-vous trouvé</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


    {/* Pagination en bas */}
      {viewMode === 'table' && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-gray-500 text-sm">
            Affichage de {filteredAppointments.length} rendez-vous
          </p>
          <div className="flex space-x-2">
            <button className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              ← Précédent
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 rounded-lg flex items-center gap-1">
              <span>Suivant</span>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* VUE CALENDRIER */}
      {viewMode === 'calendar' && (
        <div className="relative overflow-hidden rounded-2xl border border-blue-100 shadow-lg bg-gradient-to-br from-white/80 via-blue-50/60 to-white/90 backdrop-blur-sm transition-all duration-300 group hover:shadow-2xl hover:border-blue-200">
          <div className="p-3 sm:p-6">
            {/* En-tête du calendrier */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{monthName} {year}</h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium text-xs sm:text-base"
                >
                  <span>← Précédent</span>
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors font-medium text-xs sm:text-base"
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium text-xs sm:text-base"
                >
                  Suivant →
                </button>
              </div>
            </div>

            {/* Grille du calendrier */}
            <div className="w-full overflow-x-auto">
              <div className="grid grid-cols-7 gap-1 mb-4 min-w-[500px] sm:min-w-0 text-xs sm:text-sm">
                {/* En-têtes des jours */}
                {dayNames.map(day => (
                  <div key={day} className="text-center py-2 font-bold text-gray-600 text-sm bg-gray-50 rounded">
                    {day}
                  </div>
                ))}

                {/* Jours du mois */}
                {days.map((day, index) => {
                  const appointmentsForDay = day ? getAppointmentsForDay(day) : [];
                  const isToday = day && day === new Date().getDate() && 
                                currentDate.getMonth() === new Date().getMonth() &&
                                currentDate.getFullYear() === new Date().getFullYear();
                  return (
                    <div
                      key={index}
                      className={`min-h-24 p-2 rounded-lg border-2 transition-all ${
                        day
                          ? isToday
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-white border-gray-200 hover:border-blue-300'
                          : 'bg-gray-50 border-gray-100'
                      }`}
                    >
                      {day && (
                        <>
                          <div className={`font-bold text-sm mb-1 ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                            {day}
                          </div>
                          <div className="space-y-1">
                            {appointmentsForDay.slice(0, 2).map((app, idx) => (
                              <div
                                key={idx}
                                className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-colors font-medium ${
                                  app.statut === 'À venir'
                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                    : app.statut === 'Terminé'
                                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                                }`}
                                title={`${app.patient} - ${app.heure} - ${app.motif}`}
                              >
                                {app.heure} {app.patient.split(' ')[0]}
                              </div>
                            ))}
                            {appointmentsForDay.length > 2 && (
                              <div className="text-xs text-blue-600 font-medium px-1.5 py-0.5">
                                +{appointmentsForDay.length - 2} autres
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Légende */}
            <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded"></div>
                <span className="text-sm text-gray-600">À venir</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
                <span className="text-sm text-gray-600">Terminé</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
                <span className="text-sm text-gray-600">Annulé</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Appointments;
