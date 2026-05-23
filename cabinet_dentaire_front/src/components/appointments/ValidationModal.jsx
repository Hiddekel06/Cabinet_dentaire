import React from 'react';

/**
 * Modale de validation de rendez-vous (Décision traitement)
 * 
 * Ce composant est extrait de Appointments.jsx pour améliorer la performance et la lisibilité.
 * Le design et les classes Tailwind sont conservés à l'identique.
 */
const ValidationModal = ({ 
  isOpen, 
  onClose, 
  validationData, 
  navigate, 
  isValidating 
}) => {
  if (!isOpen || !validationData.appointment) return null;

  const appointmentMotif = validationData.appointment.motif || validationData.appointment.reason || '';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-emerald-100 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-emerald-600 px-6 py-4 flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Rendez-vous validé !</h3>
            <p className="text-emerald-100 text-xs">Que souhaitez-vous faire pour le traitement ?</p>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-emerald-50 rounded-xl p-4 mb-6 border border-emerald-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-emerald-700 uppercase">Patient</span>
              <span className="text-sm font-bold text-gray-900">{validationData.appointment.patient}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-emerald-700 uppercase">Traitement lié</span>
              <span className="text-sm font-medium text-gray-700">{validationData.treatment?.name || 'N/A'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => navigate(`/treatments/${validationData.treatment.id}/session`, { 
                state: { defaultTreatmentPerformed: appointmentMotif } 
              })}
              className="w-full flex items-center justify-between p-4 bg-white border-2 border-emerald-100 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-lg group-hover:bg-emerald-200 transition-colors">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900">Continuer le traitement</p>
                  <p className="text-xs text-gray-500">Ajouter une séance médicale</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-emerald-300 group-hover:text-emerald-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => navigate(`/treatments/${validationData.treatment.id}/session`, { 
                state: { 
                  defaultTreatmentPerformed: appointmentMotif,
                  finishTreatment: true
                } 
              })}
              disabled={isValidating}
              className="w-full flex items-center justify-between p-4 bg-white border-2 border-gray-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-bold text-gray-900">Terminer le traitement</p>
                  <p className="text-xs text-gray-500">Clôturer le dossier de soins</p>
                </div>
              </div>
              {isValidating ? (
                <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-blue-300 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full text-center text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-4"
          >
            Fermer sans action supplémentaire
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ValidationModal);
