import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { appointmentAPI } from '../services/api';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAlertsMenu, setShowAlertsMenu] = useState(false);
  const [todayPotentialOverdue, setTodayPotentialOverdue] = useState([]);

  const todayDateStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const alertCount = todayPotentialOverdue.length;

  const loadPotentialOverdueToday = async () => {
    try {
      const { data } = await appointmentAPI.getByDate(todayDateStr);
      const list = Array.isArray(data?.data) ? data.data : [];
      const now = new Date();

      // Potential overdue today: pending/confirmed appointments that should have started.
      const overdueList = list
        .filter((a) => ['pending', 'confirmed'].includes(a.status))
        .filter((a) => {
          if (!a.appointment_date) return false;
          const appointmentDate = new Date(a.appointment_date);
          const hasTime = typeof a.appointment_time_specified === 'boolean'
            ? a.appointment_time_specified
            : true;

          // If time is not specified, keep it visible as potential overdue for today.
          if (!hasTime) return true;

          return appointmentDate <= now;
        })
        .map((a) => {
          const dateObj = a.appointment_date ? new Date(a.appointment_date) : null;
          const hasTime = typeof a.appointment_time_specified === 'boolean'
            ? a.appointment_time_specified
            : true;
          const timeLabel = (dateObj && hasTime)
            ? `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`
            : 'Heure non precisee';

          return {
            id: a.id,
            patientName: a.patient ? `${a.patient.first_name || ''} ${a.patient.last_name || ''}`.trim() : 'Patient inconnu',
            reason: a.reason || 'Consultation',
            timeLabel,
          };
        });

      setTodayPotentialOverdue(overdueList);
    } catch (error) {
      console.error('Erreur chargement alertes retard:', error);
      setTodayPotentialOverdue([]);
    }
  };

  useEffect(() => {
    loadPotentialOverdueToday();

    // Refresh every minute so count stays current.
    const intervalId = setInterval(loadPotentialOverdueToday, 60 * 1000);
    return () => clearInterval(intervalId);
  }, [todayDateStr]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-white via-gray-50 to-gray-100 border-b border-gray-200 shadow backdrop-blur-md bg-opacity-90">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo et titre - Côté gauche */}
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
              <img
                src="/images/logoCabinet.png"
                alt="Logo Cabinet Dentaire"
                className="w-12 h-12 rounded-full object-cover shadow-sm border border-gray-200 bg-white"
                style={{ backgroundColor: '#fff' }}
              />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-900 leading-tight">MATLABUL SHIFAH</h1>
                <p className="text-xs text-gray-500">Gestion médicale intelligente</p>
              </div>
            </Link>
          </div>

          {/* Notifications et actions - Centre (optionnel pour futur) */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Espace réservé pour notifications, recherche, etc. */}
          </div>

          {/* User info et actions - Côté droit */}
          <div className="flex items-center space-x-3">
            {/* Boutons d'action rapides */}
            <div className="hidden md:flex items-center space-x-2">
              <Link to="/statistics" className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-medium rounded-lg transition-colors flex items-center">
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Statistiques
              </Link>
              <div
                className="relative"
                onMouseEnter={() => setShowAlertsMenu(true)}
                onMouseLeave={() => setShowAlertsMenu(false)}
              >
                <button className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-medium rounded-lg transition-colors flex items-center relative">
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Alertes
                  {alertCount > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] leading-[18px] text-center font-bold border border-white">
                      {alertCount > 99 ? '99+' : alertCount}
                    </span>
                  )}
                </button>

                {showAlertsMenu && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-amber-100 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                      <p className="text-sm font-semibold text-amber-900">Retards potentiels du jour</p>
                      <p className="text-xs text-amber-700">{todayDateStr.split('-').reverse().join('/')}</p>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {alertCount === 0 ? (
                        <div className="px-4 py-5 text-sm text-gray-500">Aucun rendez-vous potentiellement en retard pour aujourd'hui.</div>
                      ) : (
                        todayPotentialOverdue.map((item) => (
                          <div key={item.id} className="px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-amber-50/40">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{item.patientName}</p>
                                <p className="text-xs text-gray-600">{item.reason}</p>
                              </div>
                              <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-md whitespace-nowrap">
                                {item.timeLabel}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-right">
                      <Link to="/appointments" className="text-xs font-medium text-blue-700 hover:text-blue-800">
                        Voir les rendez-vous
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Séparateur */}
            <div className="hidden md:block h-6 w-px bg-gray-200 mx-2"></div>

            {/* Info utilisateur avec menu déroulant */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-3 p-1 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {/* Avatar utilisateur */}
                <div className="relative">
                  <div className="w-9 h-9 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center border border-blue-50">
                    <span className="text-blue-700 font-semibold text-sm">
                      {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                </div>

                {/* Infos texte (visible sur desktop) */}
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium text-gray-900 leading-tight">
                    {user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Utilisateur'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize flex items-center">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5"></span>
                    {user?.role || 'Docteur'}
                  </p>
                </div>

                {/* Icône flèche */}
                <div className="hidden lg:block">
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Menu déroulant */}
              {showProfileMenu && (
                <>
                  {/* Overlay pour fermer le menu en cliquant ailleurs */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowProfileMenu(false)}
                  />
                  
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    {/* En-tête du menu */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center">
                          <span className="text-blue-700 font-semibold">
                            {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {user?.name || user?.email || 'Utilisateur'}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">{user?.role || 'Docteur'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Items du menu */}
                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <svg className="w-4 h-4 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Mon profil
                      </Link>
                      
                      <Link
                        to="/settings"
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <svg className="w-4 h-4 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Paramètres
                      </Link>
                      
                      <div className="border-t border-gray-100 my-1"></div>
                      
                      <button
                        onClick={handleLogout}
                        className="flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Déconnexion
                      </button>
                    </div>

                    {/* Footer du menu */}
                    <div className="px-4 py-2 border-t border-gray-100">
                      <p className="text-xs text-gray-400 text-center">
                        © 2026 MATLABUL SHIFAH
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bouton déconnexion mobile (seulement visible sur mobile) */}
            <button
              onClick={handleLogout}
              className="lg:hidden p-2 text-gray-500 hover:text-red-600 transition-colors"
              title="Déconnexion"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};