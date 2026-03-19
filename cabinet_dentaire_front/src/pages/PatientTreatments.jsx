import { useState, useEffect, useRef } from 'react';
import { Layout } from '../components/Layout';
import { appointmentAPI, patientAPI, patientTreatmentAPI, medicalRecordAPI, authAPI, dentalActAPI } from '../services/api';

const PatientTreatments = () => {
    // Barre de recherche pour actes dentaires
    const [dentalActsSearchTerm, setDentalActsSearchTerm] = useState('');
    const [sessionActsSearchTerm, setSessionActsSearchTerm] = useState('');
  const [patients, setPatients] = useState([]);
  const [patientTreatments, setPatientTreatments] = useState([]);
  const [dentalActs, setDentalActs] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState(false);
  const [treatmentToFinish, setTreatmentToFinish] = useState(null);
  const [currentTreatmentForSession, setCurrentTreatmentForSession] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [auditLogsByTreatment, setAuditLogsByTreatment] = useState({});
  const [openAuditByTreatment, setOpenAuditByTreatment] = useState({});
  const [loadingAuditByTreatment, setLoadingAuditByTreatment] = useState({});
  const hasLoadedRef = useRef(false);
  
  // États pour la recherche et les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // États pour la recherche de patient dans le formulaire
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);

  // Formulaire pour démarrer un suivi
  const [startForm, setStartForm] = useState({
    patient_id: '',
    name: '',
    acts: [], // [{ dental_act_id, quantity }]
    start_date: new Date().toISOString().split('T')[0],
    next_appointment_date: '',
    next_appointment_duration: 60,
    next_appointment_reason: '',
    next_appointment_notes: '',
    notes: '',
  });

  // Formulaire pour ajouter une session
  const [sessionForm, setSessionForm] = useState({
    treatment_performed: '',
    next_action: '',
    next_appointment_date: '',
    next_appointment_time: '',
    acts: [], // Nouveaux actes à ajouter
  });

  // Calcul du total des actes sélectionnés
  const totalActs = startForm.acts.reduce((sum, a) => {
    const act = dentalActs.find(act => act.id === a.dental_act_id);
    return sum + (act && act.tarif ? act.tarif * a.quantity : 0);
  }, 0);

  // Filtrer les patients selon la recherche
  const filteredPatients = patients.filter(p => {
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
    return fullName.includes(patientSearchTerm.toLowerCase()) || (p.phone && p.phone.includes(patientSearchTerm));
  });

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadInitialData();
    // Récupérer l'utilisateur connecté
    authAPI.getUser().then(res => setCurrentUser(res.data)).catch(() => setCurrentUser(null));
    // Charger les actes dentaires
    dentalActAPI.getAll().then(res => {
      setDentalActs(res.data.data || res.data || []);
    }).catch(() => setDentalActs([]));
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [patientsRes, ptRes] = await Promise.all([
        patientAPI.getAll(),
        patientTreatmentAPI.getAll(),
      ]);
      console.log('Patients reçus:', patientsRes);
      console.log('PatientTreatments reçus:', ptRes);
      
      const patientsData = patientsRes.data?.data || patientsRes.data || [];
      const ptData = ptRes.data?.data || ptRes.data || [];
      
      console.log('Patients après extraction:', patientsData);
      console.log('Nombre de patients:', patientsData.length);
      
      setPatients(patientsData);
      setPatientTreatments(ptData);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTreatment = async (e) => {
    e.preventDefault();
    if (!startForm.patient_id || !startForm.name || !startForm.next_appointment_date) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      await patientTreatmentAPI.create(startForm);
      alert('Suivi démarré avec succès !');
      setShowStartModal(false);
      setPatientSearchTerm('');
      setShowPatientList(false);
      setStartForm({
        patient_id: '',
        name: '',
        acts: [],
        start_date: new Date().toISOString().split('T')[0],
        next_appointment_date: '',
        next_appointment_duration: 60,
        next_appointment_reason: '',
        next_appointment_notes: '',
        notes: '',
      });
      loadInitialData();
    } catch (error) {
      console.error('Erreur démarrage suivi:', error);
      
      // Vérifier si c'est une erreur de suivi existant
      if (error.response?.data?.error === 'PATIENT_HAS_ACTIVE_TREATMENT') {
        const existing = error.response.data.existing_treatment;
        const patientName = patients.find(p => p.id === startForm.patient_id);
        const fullName = patientName ? `${patientName.first_name} ${patientName.last_name}` : 'Ce patient';
        
        const message = `⚠️ ${fullName} a déjà un suivi en cours:\n\n` +
                       `📋 Nom: ${existing.name}\n` +
                       `📅 Démarré le: ${new Date(existing.start_date).toLocaleDateString('fr-FR')}\n` +
                       `🔄 Statut: ${existing.status === 'planned' ? 'Planifié' : 'En cours'}\n\n` +
                       `Veuillez terminer ou annuler ce suivi avant d'en créer un nouveau.`;
        
        alert(message);
      } else {
        const errorMsg = error.response?.data?.message || 'Erreur lors du démarrage du suivi';
        alert(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddSession = async (e) => {
    e.preventDefault();
    if (!sessionForm.treatment_performed) {
      alert('Veuillez renseigner ce que vous avez fait exactement');
      return;
    }

    if (!currentTreatmentForSession?.next_appointment_id && !sessionForm.next_appointment_date) {
      alert('Aucun rendez-vous actuel trouvé. Veuillez renseigner un prochain rendez-vous.');
      return;
    }

    // Empêcher la création d'un rendez-vous à une date passée
    if (sessionForm.next_appointment_date) {
      const now = new Date();
      const selectedDateTime = sessionForm.next_appointment_time
        ? new Date(`${sessionForm.next_appointment_date}T${sessionForm.next_appointment_time}`)
        : new Date(`${sessionForm.next_appointment_date}T00:00`);
      if (selectedDateTime < now) {
        alert("Impossible de créer un rendez-vous dans le passé.");
        return;
      }
    }

    setLoading(true);
    try {
      let newNextAppointmentId = null;

      if (sessionForm.next_appointment_date) {
        const appointmentDateTime = sessionForm.next_appointment_time
          ? `${sessionForm.next_appointment_date} ${sessionForm.next_appointment_time}:00`
          : sessionForm.next_appointment_date;
        const appointmentRes = await appointmentAPI.create({
          patient_id: currentTreatmentForSession.patient_id,
          dentist_id: currentUser?.id,
          appointment_date: appointmentDateTime,
          duration: null,
          reason: null,
          notes: null,
        });
        newNextAppointmentId = appointmentRes?.data?.id || null;
      }

      const sessionAppointmentId = currentTreatmentForSession.next_appointment_id || newNextAppointmentId;

      await medicalRecordAPI.create({
        patient_id: currentTreatmentForSession.patient_id,
        patient_treatment_id: currentTreatmentForSession.id,
        appointment_id: sessionAppointmentId,
        ...sessionForm,
      });

      await patientTreatmentAPI.update(currentTreatmentForSession.id, {
        status: 'in_progress',
        completed_sessions: (currentTreatmentForSession.completed_sessions || 0) + 1,
        next_appointment_id: newNextAppointmentId,
      });

      // Ajouter les nouveaux actes si présents
      if (sessionForm.acts.length > 0) {
        await patientTreatmentAPI.addActs(currentTreatmentForSession.id, sessionForm.acts);
      }

      alert('Session ajoutée avec succès !');
      setShowSessionModal(false);
      setSessionForm({
        treatment_performed: '',
        next_action: '',
        next_appointment_date: '',
        next_appointment_time: '',
        acts: [],
      });
      setSessionActsSearchTerm('');
      setCurrentTreatmentForSession(null);
      loadInitialData();
    } catch (error) {
      console.error('Erreur ajout session:', error);
      let message = 'Erreur lors de l\'ajout de la session';
      if (error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          message += ` : ${error.response.data}`;
        } else if (error.response.data.message) {
          message += ` : ${error.response.data.message}`;
        } else if (error.response.data.errors) {
          message += ' : ' + Object.values(error.response.data.errors).flat().join(' | ');
        }
      }
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueTreatment = async (treatment) => {
    const confirmed = confirm(
      'Continuer ce suivi va :\n' +
        '- passer le statut à "En cours"\n' +
        '- incrémenter le nombre de sessions\n\n' +
        'Le prochain rendez-vous se planifie dans la page "Rendez-vous".\n\n' +
        'Voulez-vous continuer ?'
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      // Créer un nouveau rendez-vous et mettre à jour le suivi
      await patientTreatmentAPI.update(treatment.id, {
        status: 'in_progress',
        completed_sessions: (treatment.completed_sessions || 0) + 1,
      });
      alert('Traitement continué. Pensez à planifier le prochain rendez-vous.');
      loadInitialData();
    } catch (error) {
      console.error('Erreur continuation:', error);
      alert('Erreur lors de la continuation du traitement');
    } finally {
      setLoading(false);
    }
  };

  const handleFinishTreatment = async () => {
    if (!treatmentToFinish) return;

    setLoading(true);
    try {
      await patientTreatmentAPI.update(treatmentToFinish.id, {
        status: 'completed',
        end_date: new Date().toISOString().split('T')[0],
      });
      alert('Suivi terminé avec succès !');
      setShowFinishConfirmModal(false);
      setTreatmentToFinish(null);
      loadInitialData();
    } catch (error) {
      console.error('Erreur fin suivi:', error);
      alert('Erreur lors de la fin du suivi');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAct = async (treatmentId, act) => {
    if (!treatmentId || !act?.id) {
      alert('Acte introuvable.');
      return;
    }

    const confirmed = confirm('Voulez-vous vraiment supprimer cet acte ?');
    if (!confirmed) return;

    const auditNote = prompt('Note d\'audit (optionnelle)', '') ?? '';

    setLoading(true);
    try {
      await patientTreatmentAPI.removeAct(treatmentId, act.id, auditNote);
      await loadInitialData();
      if (openAuditByTreatment[treatmentId]) {
        await handleToggleAuditLogs(treatmentId, true);
      }
      alert('Acte supprimé avec succès.');
    } catch (error) {
      const message = error?.response?.data?.message || 'Suppression impossible.';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditAct = async (treatmentId, act) => {
    if (!treatmentId || !act?.id) {
      alert('Acte introuvable.');
      return;
    }

    const nextQuantityRaw = prompt('Nouvelle quantité', String(act.quantity || 1));
    if (nextQuantityRaw === null) return;

    const nextQuantity = parseInt(nextQuantityRaw, 10);
    if (!Number.isInteger(nextQuantity) || nextQuantity < 1) {
      alert('Quantité invalide.');
      return;
    }

    const currentPrice = Number(act.tarif_snapshot ?? 0);
    const nextPriceRaw = prompt('Nouveau tarif unitaire (snapshot)', String(currentPrice));
    if (nextPriceRaw === null) return;

    const nextPrice = Number(nextPriceRaw);
    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      alert('Tarif invalide.');
      return;
    }

    const auditNote = prompt('Note d\'audit (optionnelle)', '') ?? '';

    setLoading(true);
    try {
      await patientTreatmentAPI.updateAct(treatmentId, act.id, {
        quantity: nextQuantity,
        tarif_snapshot: nextPrice,
        audit_note: auditNote || null,
      });
      await loadInitialData();
      if (openAuditByTreatment[treatmentId]) {
        await handleToggleAuditLogs(treatmentId, true);
      }
      alert('Acte modifié avec succès.');
    } catch (error) {
      const message = error?.response?.data?.message || 'Modification impossible.';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const isConsultationSimpleAct = (actFromCatalog, actFromTreatment) => {
    const catalogName = (actFromCatalog?.name || actFromCatalog?.label || '').toLowerCase();
    const nestedName = (actFromTreatment?.dentalAct?.name || '').toLowerCase();
    return catalogName.includes('consultation simple') || nestedName.includes('consultation simple');
  };

  const handleToggleAuditLogs = async (treatmentId, forceReload = false) => {
    const wasOpen = !!openAuditByTreatment[treatmentId];
    const nextOpen = forceReload ? true : !wasOpen;
    setOpenAuditByTreatment(prev => ({ ...prev, [treatmentId]: nextOpen }));

    if (!nextOpen) return;
    if (!forceReload && auditLogsByTreatment[treatmentId]) return;

    setLoadingAuditByTreatment(prev => ({ ...prev, [treatmentId]: true }));
    try {
      const res = await patientTreatmentAPI.getAuditLogs(treatmentId);
      const logs = res?.data?.audit_logs || [];
      setAuditLogsByTreatment(prev => ({ ...prev, [treatmentId]: logs }));
    } catch {
      setAuditLogsByTreatment(prev => ({ ...prev, [treatmentId]: [] }));
    } finally {
      setLoadingAuditByTreatment(prev => ({ ...prev, [treatmentId]: false }));
    }
  };

  // Filtres et tri
  const statusOptions = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'planned', label: 'Planifié' },
    { value: 'in_progress', label: 'En cours' },
    { value: 'completed', label: 'Terminé' },
    { value: 'cancelled', label: 'Annulé' },
  ];

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setSortBy('date');
    setSortOrder('desc');
  };

  // Onglet sélectionné : 'en_cours' ou 'termines'
  const [tab, setTab] = useState('en_cours');

  // Filtrer et trier selon l'onglet
  const filteredTreatments = patientTreatments
    .filter((pt) => {
      if (tab === 'en_cours') {
        if (pt.status === 'completed') return false;
      } else if (tab === 'termines') {
        if (pt.status !== 'completed') return false;
      }
      // Filtre par recherche
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const patientName = `${pt.patient?.first_name || ''} ${pt.patient?.last_name || ''}`.toLowerCase();
        const treatmentName = (pt.name || '').toLowerCase();
        if (!patientName.includes(search) && !treatmentName.includes(search)) {
          return false;
        }
      }
      // Filtre par statut
      if (selectedStatus !== 'all' && pt.status !== selectedStatus) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.start_date).getTime();
          bValue = new Date(b.start_date).getTime();
          break;
        case 'patient':
          aValue = `${a.patient?.first_name || ''} ${a.patient?.last_name || ''}`.toLowerCase();
          bValue = `${b.patient?.first_name || ''} ${b.patient?.last_name || ''}`.toLowerCase();
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
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

  const getStatusBadge = (status) => {
    const badges = {
      planned: 'bg-gray-100 text-gray-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    const labels = {
      planned: 'Planifié',
      in_progress: 'En cours',
      completed: 'Terminé',
      cancelled: 'Annulé',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded ${badges[status] || badges.planned}`}>
        {labels[status] || status}
      </span>
    );
  };

  // Obtenir les 5 derniers patients enregistrés
  const recentPatients = [...patients]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suivi des patients</h1>
            <p className="text-sm text-gray-600 mt-1">Gestion des traitements et suivis médicaux</p>
          </div>
          <button
            onClick={() => setShowStartModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-linear-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-colors font-medium shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau suivi
          </button>
        </div>

        {/* Section derniers patients enregistrés */}
        {recentPatients.length > 0 && (
          <div className="bg-linear-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-100 shadow-sm p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-900">Derniers patients enregistrés</h3>
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  Démarrez un traitement pour vos nouveaux patients
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentPatients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => {
                        setStartForm(prev => ({ ...prev, patient_id: patient.id }));
                        setPatientSearchTerm(`${patient.first_name || ''} ${patient.last_name || ''}`.trim());
                        setShowPatientList(false);
                        setShowStartModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all text-sm group"
                    >
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-xs">
                        {patient.first_name?.charAt(0)}{patient.last_name?.charAt(0)}
                      </div>
                      <span className="text-gray-700 font-medium">
                        {patient.first_name} {patient.last_name}
                      </span>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* Affichage du total des actes sélectionnés */}
              {startForm.acts.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                  <span className="font-medium text-gray-700">Total actes sélectionnés :</span>
                  <span className="text-lg font-bold text-blue-700">{totalActs.toFixed(2)} €</span>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Barre de recherche et filtres */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
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
                  placeholder="Rechercher par patient ou traitement..."
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
                {filteredTreatments.length} suivi{filteredTreatments.length !== 1 ? 's' : ''} trouvé{filteredTreatments.length !== 1 ? 's' : ''}
              </span>
              {(searchTerm || selectedStatus !== 'all') && (
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
                </div>
              )}
            </div>

            {/* Options de tri */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">Trier par:</span>
              <div className="flex gap-1">
                {['date', 'patient', 'status'].map((field) => (
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
                    {field === 'patient' && 'Patient'}
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

        {/* Onglets traitements en cours / terminés (style minimaliste) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex border-b border-gray-100 justify-start gap-1">
            <button
              className={`px-3 py-1 text-center text-sm font-medium transition-colors rounded-t-md ${tab === 'en_cours' ? 'text-blue-700 bg-blue-50 shadow-sm' : 'text-gray-400 hover:text-blue-600 bg-transparent'}`}
              style={{ border: 'none', outline: 'none', minWidth: 60 }}
              onClick={() => setTab('en_cours')}
            >
              En cours
            </button>
            <button
              className={`px-3 py-1 text-center text-sm font-medium transition-colors rounded-t-md ${tab === 'termines' ? 'text-green-700 bg-green-50 shadow-sm' : 'text-gray-400 hover:text-green-600 bg-transparent'}`}
              style={{ border: 'none', outline: 'none', minWidth: 60 }}
              onClick={() => setTab('termines')}
            >
              Terminé
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Chargement...</div>
            ) : filteredTreatments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                {searchTerm || selectedStatus !== 'all' 
                  ? 'Aucun suivi trouvé avec ces critères' 
                  : tab === 'en_cours' ? 'Aucun suivi en cours' : 'Aucun traitement terminé'}
              </div>
            ) : (
              filteredTreatments.map((pt) => (
                <div key={pt.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-base font-semibold text-gray-900">
                          {pt.patient?.first_name} {pt.patient?.last_name}
                        </h3>
                        {getStatusBadge(pt.status)}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Suivi: <span className="font-medium">{pt.name}</span>
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>Début: {pt.start_date ? new Date(pt.start_date).toLocaleDateString('fr-FR') : ''}</span>
                        {pt.end_date && <span>Fin: {new Date(pt.end_date).toLocaleDateString('fr-FR')}</span>}
                      </div>
                      {/* Affichage détail actes et total */}
                      {Array.isArray(pt.acts) && pt.acts.length > 0 && (
                        <div className="mt-2">
                          <div className="font-semibold text-xs text-blue-700 mb-1">Actes sélectionnés :</div>
                          <ul className="text-xs text-gray-700 space-y-1">
                            {pt.acts.map((a, idx) => {
                              const act = dentalActs.find(act => act.id === a.dental_act_id);
                              const actLabel = act ? (act.code ? `${act.code} - ` : '') + (act.label || act.name || '') : `Acte #${a.dental_act_id}`;
                              const isInvoiceLocked = !!pt.is_invoice_paid_locked;
                              const isEditableTreatment = pt.status !== 'completed' && pt.status !== 'cancelled' && tab === 'en_cours' && !isInvoiceLocked;
                              const isMandatoryConsultation = isConsultationSimpleAct(act, a);
                              const unitPrice = Number(a.tarif_snapshot ?? act?.tarif ?? 0);
                              return (
                                <li key={idx} className="flex items-center gap-2">
                                  <span className="font-medium">{actLabel}</span>
                                  <span>x{a.quantity}</span>
                                  {Number.isFinite(unitPrice) && (
                                    <span className="ml-2 text-gray-500">{(unitPrice * a.quantity).toFixed(2)} €</span>
                                  )}
                                  {isMandatoryConsultation && (
                                    <span className="ml-2 px-2 py-0.5 rounded text-[11px] font-semibold text-amber-800 bg-amber-100">
                                      Obligatoire
                                    </span>
                                  )}
                                  {isEditableTreatment && !isMandatoryConsultation && (
                                    <button
                                      type="button"
                                      onClick={() => handleEditAct(pt.id, a)}
                                      className="ml-2 px-2 py-0.5 rounded text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                                      title="Modifier quantité/prix"
                                      disabled={loading}
                                    >
                                      Modifier
                                    </button>
                                  )}
                                  {isEditableTreatment && !isMandatoryConsultation && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveAct(pt.id, a)}
                                      className="ml-2 px-2 py-0.5 rounded text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100"
                                      title="Supprimer cet acte"
                                      disabled={loading}
                                    >
                                      Supprimer
                                    </button>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                          <div className="mt-1 text-xs font-bold text-blue-800">
                            Total actes : {pt.acts.reduce((sum, a) => {
                              const act = dentalActs.find(act => act.id === a.dental_act_id);
                              const unitPrice = Number(a.tarif_snapshot ?? act?.tarif ?? 0);
                              return sum + (Number.isFinite(unitPrice) ? unitPrice * a.quantity : 0);
                            }, 0).toFixed(2)} €
                          </div>
                        </div>
                      )}
                      {pt.invoice_preview && (
                        <div className="mt-2 text-xs">
                          {pt.invoice_preview.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-semibold">
                              Facture finale payée: {Number(pt.invoice_preview.total_amount || 0).toFixed(2)} €
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-sky-100 text-sky-800 font-semibold">
                              Facture en cours (brouillon): {Number(pt.invoice_preview.total_amount || 0).toFixed(2)} €
                            </span>
                          )}
                        </div>
                      )}
                      {pt.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">{pt.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {pt.is_invoice_paid_locked && (
                        <span className="px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-100 rounded-md">
                          Facture payée - modifications verrouillées
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleToggleAuditLogs(pt.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        {openAuditByTreatment[pt.id] ? 'Masquer audit' : 'Voir audit'}
                      </button>
                      {pt.status !== 'completed' && pt.status !== 'cancelled' && tab === 'en_cours' && !pt.is_invoice_paid_locked && (
                        <>
                          <button
                            onClick={() => {
                              setCurrentTreatmentForSession(pt);
                              setShowSessionModal(true);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
                          >
                            Ajouter séance
                          </button>
                          <button
                            onClick={() => {
                              setTreatmentToFinish(pt);
                              setShowFinishConfirmModal(true);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 rounded-md hover:bg-rose-100 transition-colors"
                          >
                            Terminer
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {openAuditByTreatment[pt.id] && (
                    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <h4 className="text-xs font-semibold text-gray-800 mb-2">Historique audit</h4>
                      {loadingAuditByTreatment[pt.id] ? (
                        <div className="text-xs text-gray-500">Chargement...</div>
                      ) : (auditLogsByTreatment[pt.id]?.length || 0) === 0 ? (
                        <div className="text-xs text-gray-500">Aucune entrée d'audit</div>
                      ) : (
                        <ul className="space-y-1">
                          {auditLogsByTreatment[pt.id].map((log) => (
                            <li key={log.id} className="text-xs text-gray-700">
                              <span className="font-semibold">{log.action}</span>
                              {log.description ? ` - ${log.description}` : ''}
                              {log.created_at ? ` (${new Date(log.created_at).toLocaleString('fr-FR')})` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Modal confirmation fin de suivi */}
        {showFinishConfirmModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="px-6 py-4 border-b border-gray-100 bg-linear-to-r from-rose-50 to-orange-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-100 rounded-lg">
                    <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirmer la fin du suivi</h3>
                </div>
              </div>

              <div className="px-6 py-5 space-y-3">
                <p className="text-sm text-gray-700">Voulez-vous vraiment terminer ce suivi ?</p>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-900 font-medium">{treatmentToFinish?.name || 'Suivi'}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Patient: {treatmentToFinish?.patient?.first_name} {treatmentToFinish?.patient?.last_name}
                  </p>
                </div>
                <p className="text-xs text-gray-500">Cette action marquera le suivi comme terminé à la date du jour.</p>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowFinishConfirmModal(false);
                    setTreatmentToFinish(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleFinishTreatment}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50"
                >
                  {loading ? 'En cours...' : 'Oui, terminer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal démarrer suivi */}
{showStartModal && (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
      {/* En-tête */}
      <div className="px-6 py-4 border-b border-gray-100 bg-linear-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Démarrer un nouveau suivi
            </h2>
          </div>
          <button
            onClick={() => setShowStartModal(false)}
            className="p-1 hover:bg-white/50 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Renseignez les informations pour commencer le suivi du patient
        </p>
      </div>

      {/* Formulaire avec scroll */}
      <form onSubmit={handleStartTreatment} className="overflow-y-auto max-h-[calc(90vh-180px)]">
        <div className="p-6 space-y-6">
          {/* Section informations principales */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-700 uppercase tracking-wider">
              Informations principales
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1 relative">
                <label className="block text-sm font-medium text-gray-700">
                  Patient <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={patientSearchTerm}
                    onChange={(e) => {
                      setPatientSearchTerm(e.target.value);
                      setShowPatientList(true);
                    }}
                    onFocus={() => setShowPatientList(true)}
                    placeholder="Rechercher un patient..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
                  />
                  {/* Affichage du patient sélectionné */}
                  {startForm.patient_id && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
                {/* Liste de suggestions */}
                {showPatientList && patientSearchTerm && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((p) => {
                        // Vérifier si le patient a un suivi actif
                        const activePatientTreatment = patientTreatments.find(
                          pt => pt.patient_id === p.id && ['planned', 'in_progress'].includes(pt.status)
                        );
                        
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setStartForm({ ...startForm, patient_id: p.id });
                              setPatientSearchTerm(`${p.first_name} ${p.last_name}`);
                              setShowPatientList(false);
                            }}
                            className={`w-full text-left px-3 py-2 transition-colors border-b border-gray-100 last:border-b-0 ${
                              activePatientTreatment ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-blue-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-900">{p.first_name} {p.last_name}</div>
                                {p.phone && <div className="text-xs text-gray-500">{p.phone}</div>}
                                {p.email && <div className="text-xs text-gray-500">{p.email}</div>}
                              </div>
                              {activePatientTreatment && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-orange-200 text-orange-900 rounded-full text-xs font-medium">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                  Suivi actif
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">Aucun patient trouvé</div>
                    )}
                  </div>
                )}
              </div>

              {/* Avertissement si le patient a déjà un suivi actif */}
              {startForm.patient_id && (() => {
                const activePatientTreatment = patientTreatments.find(
                  pt => pt.patient_id === startForm.patient_id && ['planned', 'in_progress'].includes(pt.status)
                );
                if (activePatientTreatment) {
                  return (
                    <div className="p-4 bg-orange-50 border-l-4 border-orange-400 rounded-lg">
                      <div className="flex items-start">
                        <div className="shrink-0">
                          <svg className="w-5 h-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-orange-800">⚠️ Suivi déjà en cours</h3>
                          <div className="mt-2 text-sm text-orange-700">
                            <p>Ce patient a déjà un suivi actif:</p>
                            <p className="mt-1 font-semibold">📋 {activePatientTreatment.name}</p>
                            <p className="text-xs mt-1">
                              Démarré le {new Date(activePatientTreatment.start_date).toLocaleDateString('fr-FR')} •&nbsp;
                              Statut: {activePatientTreatment.status === 'planned' ? 'Planifié' : 'En cours'}
                            </p>
                            <p className="mt-2 text-xs font-medium">
                              ❌ Vous ne pourrez pas créer ce nouveau suivi tant que le suivi actuel n'est pas terminé ou annulé.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Nom du suivi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={startForm.name}
                  onChange={(e) => setStartForm({ ...startForm, name: e.target.value })}
                  placeholder="Ex: Détartrage + Nettoyage, Dévitalisation dent 36, etc."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
                />
              </div>

              <div className="space-y-1">
                                {/* Barre de recherche pour actes dentaires */}
                                <input
                                  type="text"
                                  placeholder="Rechercher un acte..."
                                  className="w-full px-3 py-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
                                  value={dentalActsSearchTerm || ''}
                                  onChange={e => setDentalActsSearchTerm(e.target.value)}
                                />
                <label className="block text-sm font-medium text-gray-700">
                  Actes dentaires (optionnels)
                </label>
                <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1">
                  Consultation simple est ajoutée automatiquement au démarrage du traitement.
                </p>
                <div className="space-y-2">
                  {dentalActsSearchTerm && dentalActs.filter(act =>
                    (act.name && act.name.toLowerCase().includes(dentalActsSearchTerm.toLowerCase())) ||
                    (act.code && act.code.toLowerCase().includes(dentalActsSearchTerm.toLowerCase())) ||
                    (act.description && act.description.toLowerCase().includes(dentalActsSearchTerm.toLowerCase()))
                  ).map((act) => {
                    const selected = startForm.acts.find(a => a.dental_act_id === act.id);
                    return (
                      <div key={act.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={e => {
                            if (e.target.checked) {
                              setStartForm(prev => ({
                                ...prev,
                                acts: [...prev.acts, { dental_act_id: act.id, quantity: 1 }],
                              }));
                            } else {
                              setStartForm(prev => ({
                                ...prev,
                                acts: prev.acts.filter(a => a.dental_act_id !== act.id),
                              }));
                            }
                          }}
                        />
                        <span className="flex-1">
                          {act.code ? `${act.code} - ` : ''}{act.name} {act.tarif ? `(${act.tarif} €)` : ''}
                        </span>
                        {selected && (
                          <input
                            type="number"
                            min="1"
                            value={selected.quantity}
                            onChange={e => {
                              const qty = Math.max(1, parseInt(e.target.value) || 1);
                              setStartForm(prev => ({
                                ...prev,
                                acts: prev.acts.map(a => a.dental_act_id === act.id ? { ...a, quantity: qty } : a),
                              }));
                            }}
                            className="w-16 px-2 py-1 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Récapitulatif des actes sélectionnés */}
                {startForm.acts.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">📋 Actes sélectionnés ({startForm.acts.length})</h4>
                    <ul className="space-y-1">
                      {startForm.acts.map((selectedAct) => {
                        const act = dentalActs.find(a => a.id === selectedAct.dental_act_id);
                        return act ? (
                          <li key={act.id} className="text-sm text-blue-800 flex justify-between">
                            <span>• {act.code ? `${act.code} - ` : ''}{act.name}</span>
                            <span className="font-medium">x{selectedAct.quantity} = {(act.tarif * selectedAct.quantity).toLocaleString()} FCFA</span>
                          </li>
                        ) : null;
                      })}
                    </ul>
                    <div className="mt-2 pt-2 border-t border-blue-300">
                      <div className="flex justify-between text-sm font-bold text-blue-900">
                        <span>Total estimé:</span>
                        <span>{totalActs.toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Date de début
                </label>
                <input
                  type="date"
                  value={startForm.start_date}
                  onChange={(e) => setStartForm({ ...startForm, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section premier rendez-vous */}
          <div className="bg-linear-to-br from-blue-50 to-indigo-50/30 rounded-xl p-4 space-y-4">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">
                Premier rendez-vous <span className="text-red-500">*</span>
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Date du rendez-vous <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={startForm.next_appointment_date}
                    onChange={(e) => setStartForm({ ...startForm, next_appointment_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Durée (minutes)
                  </label>
                  <input
                    type="number"
                    value={startForm.next_appointment_duration}
                    onChange={(e) => setStartForm({ ...startForm, next_appointment_duration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    min="15"
                    step="15"
                    placeholder="45"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Raison du rendez-vous
                </label>
                <input
                  type="text"
                  value={startForm.next_appointment_reason}
                  onChange={(e) => setStartForm({ ...startForm, next_appointment_reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  placeholder="Ex: Première consultation, contrôle..."
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                  Notes pour le rendez-vous
                </label>
                <textarea
                  value={startForm.next_appointment_notes}
                  onChange={(e) => setStartForm({ ...startForm, next_appointment_notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  rows="2"
                  placeholder="Informations supplémentaires..."
                />
              </div>
            </div>
          </div>

          {/* Section notes générales */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Notes générales sur le suivi
            </label>
            <textarea
              value={startForm.notes}
              onChange={(e) => setStartForm({ ...startForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
              rows="3"
              placeholder="Observations, plan de traitement..."
            />
          </div>
        </div>
      </form>

      {/* Pied de page */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              setShowStartModal(false);
              setPatientSearchTerm('');
              setShowPatientList(false);
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
          >
            Annuler
          </button>
          <button
            type="submit"
            onClick={handleStartTreatment}
            disabled={loading || (startForm.patient_id && patientTreatments.some(
              pt => pt.patient_id === startForm.patient_id && ['planned', 'in_progress'].includes(pt.status)
            ))}
            className="px-4 py-2 text-sm font-medium text-white bg-linear-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                <span>En cours...</span>
              </span>
            ) : (startForm.patient_id && patientTreatments.some(
              pt => pt.patient_id === startForm.patient_id && ['planned', 'in_progress'].includes(pt.status)
            )) ? '⚠️ Suivi déjà actif' : 'Démarrer le suivi'}
          </button>
        </div>
      </div>
    </div>
  </div>
)}

        {/* Modal ajouter session */}
        {showSessionModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
              {/* En-tête */}
              <div className="px-6 py-4 border-b border-gray-100 bg-linear-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Ajouter une séance + prochain rendez-vous
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setShowSessionModal(false);
                      setCurrentTreatmentForSession(null);
                    }}
                    className="p-1 hover:bg-white/50 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Patient: {currentTreatmentForSession?.patient?.first_name} {currentTreatmentForSession?.patient?.last_name}
                </p>
              </div>

              {/* Formulaire avec scroll */}
              <form onSubmit={handleAddSession} className="overflow-y-auto max-h-[calc(90vh-180px)]">
                <div className="p-6 space-y-4">
                  <div className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Traitement en cours
                    </label>
                    <input
                      type="text"
                      value={currentTreatmentForSession?.name || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {`Actes réalisés le ${new Date().toLocaleDateString('fr-FR')}`}
                      <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={sessionForm.treatment_performed}
                      onChange={(e) => setSessionForm({ ...sessionForm, treatment_performed: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 hover:bg-white transition-colors"
                      rows="3"
                      placeholder="Décrivez précisément ce qui a été fait pendant la séance..."
                      required
                    />
                  </div>

                  {/* Section pour ajouter des actes supplémentaires */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-amber-100 rounded-lg">
                        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-amber-900">Ajouter de nouveaux actes (optionnel)</h3>
                    </div>
                    
                    <input
                      type="text"
                      placeholder="Rechercher un acte à ajouter..."
                      className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                      value={sessionActsSearchTerm}
                      onChange={e => setSessionActsSearchTerm(e.target.value)}
                    />
                    
                    {sessionActsSearchTerm && (
                      <div className="max-h-48 overflow-y-auto space-y-2 border border-amber-200 rounded-lg p-2 bg-white">
                        {dentalActs.filter(act =>
                          (act.name && act.name.toLowerCase().includes(sessionActsSearchTerm.toLowerCase())) ||
                          (act.code && act.code.toLowerCase().includes(sessionActsSearchTerm.toLowerCase()))
                        ).map((act) => {
                          const selected = sessionForm.acts.find(a => a.dental_act_id === act.id);
                          return (
                            <div key={act.id} className="flex items-center gap-2 p-2 hover:bg-amber-50 rounded">
                              <input
                                type="checkbox"
                                checked={!!selected}
                                onChange={e => {
                                  if (e.target.checked) {
                                    setSessionForm(prev => ({
                                      ...prev,
                                      acts: [...prev.acts, { dental_act_id: act.id, quantity: 1 }],
                                    }));
                                  } else {
                                    setSessionForm(prev => ({
                                      ...prev,
                                      acts: prev.acts.filter(a => a.dental_act_id !== act.id),
                                    }));
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="flex-1 text-sm">
                                {act.code ? `${act.code} - ` : ''}{act.name} {act.tarif ? `(${act.tarif.toLocaleString()} FCFA)` : ''}
                              </span>
                              {selected && (
                                <input
                                  type="number"
                                  min="1"
                                  value={selected.quantity}
                                  onChange={e => {
                                    const qty = Math.max(1, parseInt(e.target.value) || 1);
                                    setSessionForm(prev => ({
                                      ...prev,
                                      acts: prev.acts.map(a => a.dental_act_id === act.id ? { ...a, quantity: qty } : a),
                                    }));
                                  }}
                                  className="w-16 px-2 py-1 border border-amber-200 rounded focus:ring-2 focus:ring-amber-500"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    {/* Récapitulatif des actes ajoutés */}
                    {sessionForm.acts.length > 0 && (
                      <div className="mt-2 p-2 bg-white border border-amber-200 rounded-lg">
                        <h4 className="text-xs font-semibold text-amber-900 mb-1">Nouveaux actes à ajouter:</h4>
                        <ul className="space-y-1">
                          {sessionForm.acts.map((selectedAct) => {
                            const act = dentalActs.find(a => a.id === selectedAct.dental_act_id);
                            return act ? (
                              <li key={act.id} className="text-xs text-amber-800 flex justify-between">
                                <span>• {act.name}</span>
                                <span>x{selectedAct.quantity}</span>
                              </li>
                            ) : null;
                          })}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="bg-linear-to-br from-blue-50 to-indigo-50/30 rounded-xl p-4 space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-blue-100 rounded-lg">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900">Prochain rendez-vous (optionnel)</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Date du prochain rendez-vous
                        </label>
                        <input
                          type="date"
                          value={sessionForm.next_appointment_date}
                          onChange={(e) => setSessionForm({ ...sessionForm, next_appointment_date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Heure (optionnel)
                        </label>
                        <input
                          type="time"
                          value={sessionForm.next_appointment_time}
                          onChange={(e) => setSessionForm({ ...sessionForm, next_appointment_time: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Choses prévues à faire (optionnel)
                      </label>
                      <textarea
                        value={sessionForm.next_action}
                        onChange={(e) => setSessionForm({ ...sessionForm, next_action: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        rows="2"
                        placeholder="Ex: ajustement, contrôle, nouvelle étape..."
                      />
                    </div>
                  </div>
                </div>
              </form>

              {/* Pied de page */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSessionModal(false);
                      setCurrentTreatmentForSession(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    onClick={handleAddSession}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-linear-to-r from-blue-600 to-blue-700 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
                  >
                    {loading ? (
                      <span className="flex items-center space-x-2">
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>En cours...</span>
                      </span>
                    ) : 'Enregistrer séance'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PatientTreatments;
