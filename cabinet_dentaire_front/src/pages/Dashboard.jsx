import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';

export const Dashboard = () => {
  const { user } = useAuth();

  return (
    <Layout>
      <div className="min-h-screen bg-white p-6">
        {/* Welcome Section */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-base font-medium text-gray-600">
                Bienvenue, <span className="text-gray-700">Dr. {user?.name || 'Utilisateur'}</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 overflow-hidden relative">
            {/* Effet décoratif - Cercle supérieur gauche (bleu) */}
            <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-300 to-blue-100 to-transparent rounded-full -translate-x-10 -translate-y-10 opacity-100 pointer-events-none"></div>
            <div className="flex flex-col h-full justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-3">Patients totaux</p>
                <h2 className="text-3xl font-semibold text-gray-800 mb-1">248</h2>
                <div className="flex items-center mt-1">
                  <svg className="w-3 h-3 text-green-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-600 text-xs font-medium">+12% ce mois</span>
                </div>
              </div>
              <div className="flex items-end mt-4 h-6">
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex items-center">
                  <div className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" style={{ width: '78%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 overflow-hidden relative">
            {/* Effet décoratif - Cercle supérieur gauche (vert) */}
            <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-emerald-300 to-emerald-100 to-transparent rounded-full -translate-x-10 -translate-y-10 opacity-100 pointer-events-none"></div>

            <div className="flex flex-col h-full justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-3">Rendez-vous aujourd'hui</p>
                <h2 className="text-3xl font-semibold text-gray-800 mb-1">12</h2>
                <div className="flex items-center mt-1">
                  <svg className="w-3 h-3 text-amber-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-amber-600 text-xs font-medium">3 urgences</span>
                </div>
              </div>
              <div className="flex items-end mt-4 h-6">
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex items-center">
                  <div className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 overflow-hidden relative">
            {/* Effet décoratif - Cercle supérieur gauche (orange) */}
            <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-orange-300 to-orange-100 to-transparent rounded-full -translate-x-10 -translate-y-10 opacity-100 pointer-events-none"></div>
            <div className="flex flex-col h-full justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-3">Nouveaux patients</p>
                <h2 className="text-3xl font-semibold text-gray-800 mb-1">34</h2>
                <div className="flex items-center mt-1">
                  <svg className="w-3 h-3 text-emerald-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-emerald-600 text-xs font-medium">+8% vs mois dernier</span>
                </div>
              </div>
              <div className="flex items-end mt-4 h-6">
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex items-center">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-300 overflow-hidden relative">
            {/* Effet décoratif - Cercle supérieur gauche (bleu) */}
            <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-blue-300 to-blue-100 to-transparent rounded-full -translate-x-10 -translate-y-10 opacity-100 pointer-events-none"></div>
            <div className="flex flex-col h-full justify-between">
              <div>
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-3">Taux de remplissage</p>
                <h2 className="text-3xl font-semibold text-gray-800 mb-1">92%</h2>
                <div className="flex items-center mt-1">
                  <svg className="w-3 h-3 text-green-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-green-600 text-xs font-medium">Excellent</span>
                </div>
              </div>
              <div className="flex items-end mt-4 h-6">
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex items-center">
                  <div className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Patients Card */}
          <div className="lg:col-span-2">
            <div className="relative overflow-hidden rounded-2xl border border-blue-100 shadow-lg bg-gradient-to-br from-white/80 via-blue-50/60 to-white/90 backdrop-blur-sm transition-all duration-300 group hover:shadow-2xl hover:border-blue-200">
              <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Patients récents</h2>
                  <p className="text-gray-500 text-sm mt-1">Derniers patients ajoutés au système</p>
                </div>
                <div className="mt-3 sm:mt-0 flex space-x-2">
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-orange-500 text-xs font-medium rounded bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer select-none">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nouveau patient
                  </span>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider">
                        <div className="flex items-center">
                          <span>Patient</span>
                          <svg className="w-4 h-4 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                          </svg>
                        </div>
                      </th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider">Contact</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider">Dernière visite</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider">Statut</th>
                      <th className="text-left py-3 px-4 text-gray-600 font-medium text-xs uppercase tracking-wider"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[
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
                        timeAgo: 'Aujourd\'hui'
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
                      }
                    ].map((patient, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors duration-150 group">
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <div className="relative">
                              {/* Avatar plus petit */}
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
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-gray-500 text-sm">Affichage de 3 patients sur 248</p>
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
          </div>

          {/* Sidebar Content */}
          <div className="space-y-6">
            {/* Today's Appointments */}
            <div className="bg-white shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Rendez-vous du jour</h3>
                <span className="text-sm text-gray-500">12 au total</span>
              </div>
              <div className="space-y-4">
                {[
                  { 
                    time: '09:00', 
                    name: 'Awa Diop', 
                    type: 'Consultation', 
                    color: 'blue',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )
                  },
                  { 
                    time: '10:30', 
                    name: 'Moussa Fall', 
                    type: 'Urgence', 
                    color: 'orange',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    )
                  },
                  { 
                    time: '14:00', 
                    name: 'Fatou Seck', 
                    type: 'Contrôle', 
                    color: 'green',
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    )
                  }
                ].map((appointment, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors duration-200 group">
                    <div className="flex items-start">
                      <div className={`mt-0.5 mr-3 p-1.5 rounded-lg bg-${appointment.color}-50`}>
                        <div className={`text-${appointment.color}-600`}>
                          {appointment.icon}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-gray-900 text-sm flex items-center">
                              {appointment.time} - {appointment.name}
                            </p>
                            <p className="text-gray-600 text-xs mt-1 flex items-center">
                              <span className={`w-2 h-2 rounded-full bg-${appointment.color}-500 mr-1.5`}></span>
                              {appointment.type}
                            </p>
                          </div>
                          <button className="text-gray-400 hover:text-gray-600 opacity-60 hover:opacity-100 transition-all duration-200">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-6 px-4 py-3 text-center text-blue-600 hover:text-blue-800 font-medium text-sm border border-gray-300 rounded-lg hover:border-gray-400 transition-colors duration-300 flex items-center justify-center group">
                <svg className="w-4 h-4 mr-2 text-blue-600 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Voir tous les rendez-vous</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Résumé du jour centré en bas avec graphiques */}
      <div className="flex justify-center w-full mt-8 mb-6">
        <div className="relative overflow-hidden rounded-3xl shadow-xl border border-gray-100 bg-gradient-to-br from-white via-gray-50 to-blue-50 w-full max-w-5xl p-8 transition-all duration-300 hover:shadow-2xl">
          {/* Effet décoratif */}
          <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-blue-100 to-transparent rounded-full -translate-x-8 -translate-y-8 opacity-30"></div>
          <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-100 to-transparent rounded-full translate-x-10 translate-y-10 opacity-20"></div>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-8">
              <div className="flex items-center space-x-3 mb-4 md:mb-0">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Résumé du jour</h3>
                  <p className="text-sm text-gray-600">Analyse visuelle des activités</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <span className="text-xs font-medium text-green-700 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5 animate-pulse"></div>
                    En direct
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date().toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </div>
              </div>
            </div>

            {/* Grille de graphiques */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Graphique 1 : Patients par heure */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Patients par heure</h4>
                    <p className="text-xs text-gray-500">Distribution horaire</p>
                  </div>
                  <span className="text-xs font-medium text-blue-600">12 patients</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">08:00-10:00</span>
                    <div className="flex-1 mx-3">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full" style={{ width: '60%' }}></div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-900">4</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">10:00-12:00</span>
                    <div className="flex-1 mx-3">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full" style={{ width: '75%' }}></div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-900">5</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">14:00-16:00</span>
                    <div className="flex-1 mx-3">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full" style={{ width: '45%' }}></div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-gray-900">3</span>
                  </div>
                </div>
              </div>

              {/* Graphique 2 : Types d'actes */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Types d'actes</h4>
                    <p className="text-xs text-gray-500">Répartition des soins</p>
                  </div>
                  <span className="text-xs font-medium text-green-600">18 actes</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col items-center p-3 bg-emerald-50 rounded-xl">
                    <div className="text-lg font-bold text-emerald-700">8</div>
                    <div className="text-xs text-emerald-600 text-center mt-1">Consultations</div>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-blue-50 rounded-xl">
                    <div className="text-lg font-bold text-blue-700">6</div>
                    <div className="text-xs text-blue-600 text-center mt-1">Soins courants</div>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-purple-50 rounded-xl">
                    <div className="text-lg font-bold text-purple-700">3</div>
                    <div className="text-xs text-purple-600 text-center mt-1">Urgences</div>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-amber-50 rounded-xl">
                    <div className="text-lg font-bold text-amber-700">1</div>
                    <div className="text-xs text-amber-600 text-center mt-1">Contrôles</div>
                  </div>
                </div>
              </div>

              {/* Graphique 3 : Taux d'occupation */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Taux d'occupation</h4>
                    <p className="text-xs text-gray-500">Capacité utilisée</p>
                  </div>
                  <span className="text-xs font-medium text-purple-600">86%</span>
                </div>
                <div className="relative">
                  <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 rounded-full" style={{ width: '86%' }}></div>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-gray-500">0%</span>
                    <span className="text-xs text-gray-500">50%</span>
                    <span className="text-xs text-gray-500">100%</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded mr-2"></div>
                    <span className="text-xs text-gray-600">Occupé: 86%</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-gray-200 rounded mr-2"></div>
                    <span className="text-xs text-gray-600">Libre: 14%</span>
                  </div>
                </div>
              </div>

              {/* Graphique 4 : Rendez-vous restants */}
              <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Rendez-vous restants</h4>
                    <p className="text-xs text-gray-500">Fin de journée</p>
                  </div>
                  <span className="text-xs font-medium text-orange-600">4 RDV</span>
                </div>
                <div className="flex items-center justify-center h-32">
                  <div className="relative w-24 h-24">
                    {/* Cercle de progression */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">4</div>
                        <div className="text-xs text-gray-500">restants</div>
                      </div>
                    </div>
                    <svg className="w-24 h-24 transform -rotate-90">
                      {/* Cercle de fond */}
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="rgb(229 231 235)"
                        strokeWidth="8"
                        fill="none"
                      />
                      {/* Cercle de progression */}
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="rgb(249 115 22)"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray="251.2"
                        strokeDashoffset="175.84" /* (100-30)% de 251.2 */
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <p className="text-xs text-gray-500">Sur 12 rendez-vous prévus</p>
                </div>
              </div>
            </div>

            {/* Indicateurs clés */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-700">5</div>
                    <div className="text-xs text-blue-600">Nouveaux patients</div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-700">100%</div>
                    <div className="text-xs text-green-600">Taux de présence</div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-orange-700">4h 30m</div>
                    <div className="text-xs text-orange-600">Durée moyenne</div>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-purple-700">+15%</div>
                    <div className="text-xs text-purple-600">Vs hier</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="flex items-center space-x-3 mb-2 md:mb-0">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-600">Enregistrement en temps réel</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Dernière mise à jour: <span className="font-medium">{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
  
}