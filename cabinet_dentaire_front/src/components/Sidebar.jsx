import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { doctorAPI } from '../services/api';

export const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Configuration des modules (Feature Flags)
  const FEATURES = {
    CLINICAL_OBSERVATIONS: false, // Désactivé par défaut
  };

  // État pour le mode Multi/Solo
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });

  const [openGroups, setOpenGroups] = useState({
    patientDossier: true
  });

  // Détection du mode Multi-praticiens
  useEffect(() => {
    const checkMode = async () => {
      try {
        const res = await doctorAPI.getAll();
        const doctors = res.data || [];
        setIsMultiMode(doctors.length > 1);
      } catch (error) {
        console.error('Erreur détection mode:', error);
      }
    };
    checkMode();
  }, []);
  
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleGroup = (group) => {
    if (isCollapsed) setIsCollapsed(false);
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Structure des menus
  const menuItems = useMemo(() => [
    { 
      path: '/dashboard', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ), 
      label: 'Tableau de bord',
      roles: ['admin', 'doctor', 'secretary'] 
    },
    { 
      path: '/patients', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ), 
      label: 'Patients',
      roles: ['admin', 'doctor', 'secretary']
    },
    { 
      path: '/appointments', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ), 
      label: 'Rendez-vous',
      roles: ['admin', 'doctor', 'secretary']
    },
    { 
      path: '/treatments', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      ), 
      label: 'Traitements',
      roles: ['admin', 'doctor']
    },
    {
      id: 'patientDossier',
      label: 'Dossier Patient',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
        </svg>
      ),
      roles: ['admin', 'doctor', 'secretary'],
      children: [
        { path: '/treatments/history', label: 'Diagnostics' },
        ...(FEATURES.CLINICAL_OBSERVATIONS ? [{ path: '/clinical-observations', label: 'Obs. Cliniques' }] : []),
        { path: '/radiographies', label: 'Radiographies' },
      ]
    },
    { 
      path: '/medical-certificates', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c0-1.105.895-2 2-2s2 .895 2 2-.895 2-2 2-2-.895-2-2zm-6 8V7a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2zm2-8h8" />
        </svg>
      ), 
      label: 'Certificats médicaux',
      roles: ['admin', 'doctor']
    },
    {
      path: '/ordonnances',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      label: 'Ordonnances',
      roles: ['admin', 'doctor']
    },
    {
      path: '/session-receipts',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6M8 4h8a2 2 0 012 2v14l-2-1-2 1-2-1-2 1-2-1-2 1V6a2 2 0 012-2z" />
        </svg>
      ),
      label: 'Reçus',
      roles: ['admin', 'doctor', 'secretary']
    },
    { 
      path: '/achats', 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4l1-12z" />
        </svg>
      ), 
      label: 'Achats',
      roles: ['admin', 'doctor']
    },
    {
      path: '/factures',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14h6m-6 4h6M7 3h8a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zm10 4H7" />
        </svg>
      ),
      label: 'Factures',
      roles: ['admin', 'doctor', 'secretary']
    },
    {
      path: '/admin/parametres',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      label: 'Paramètres Cabinet',
      roles: ['superviseur']
    },
  ], []);

  // Items dont l'accès est TOUJOURS restreint par rôle, quel que soit le mode (solo ou multi)
  const ALWAYS_RESTRICTED_PATHS = ['/admin/parametres'];

  // Le superviseur a accès à TOUT (all-access), sauf que les routes restreintes
  // restent invisibles pour les autres rôles.
  const isSuperviseur = user?.role === 'superviseur';

  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      if (!item.roles) return true;
      // Le superviseur voit tout sans exception
      if (isSuperviseur) return true;
      const isAlwaysRestricted = item.path && ALWAYS_RESTRICTED_PATHS.includes(item.path);
      if (isAlwaysRestricted || isMultiMode) {
        return item.roles.includes(user?.role);
      }
      return true;
    });
  }, [isMultiMode, menuItems, user?.role, isSuperviseur]);

  const isActive = (path) => location.pathname === path;
  const isGroupActive = (items) => items.some(child => location.pathname === child.path);

  return (
    <aside
      className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col h-full ${
        isCollapsed ? 'w-16' : 'w-52'
      }`}
    >
      <nav className="flex-1 pl-0 pr-2 py-4 space-y-1 overflow-y-auto">
        {filteredMenuItems.map((item) => (
          <div key={item.id || item.path}>
            {item.children ? (
              <div>
                <button
                  onClick={() => toggleGroup(item.id)}
                  className={`w-full flex items-center px-3 py-2 rounded-lg transition-colors duration-200 ${
                    isCollapsed ? 'justify-center' : 'justify-between'
                  } ${
                    isGroupActive(item.children) ? 'bg-gray-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center" style={{ minWidth: 20 }}>
                      {item.icon}
                    </div>
                    {!isCollapsed && <span className="text-sm font-semibold">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    <svg className={`w-4 h-4 transition-transform duration-200 ${openGroups[item.id] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                
                {!isCollapsed && openGroups[item.id] && (
                  <div className="mt-1 ml-4 pl-4 border-l border-gray-100 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.path}
                        to={child.path}
                        className={`block px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200 ${
                          isActive(child.path) ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-50'
                        }`}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                to={item.path}
                className={`flex items-center px-3 py-2 rounded-lg transition-colors duration-200 ${
                  isCollapsed ? 'justify-center' : 'space-x-2'
                } ${
                  isActive(item.path)
                    ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'
                }`}
                title={isCollapsed ? item.label : ''}
              >
                <div className={`${isActive(item.path) ? 'text-blue-600' : 'text-gray-500'} flex items-center`} style={{ minWidth: 20 }}>
                  {item.icon}
                </div>
                {!isCollapsed && (
                  <span className="text-sm text-gray-700 font-medium">
                    {item.label}
                  </span>
                )}
              </Link>
            )}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex justify-center mt-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            title={isCollapsed ? 'Agrandir' : 'Réduire'}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7z" />
              )}
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
};