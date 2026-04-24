import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { patientAPI, patientTreatmentAPI, dentalActAPI, medicalRecordAPI, sessionReceiptAPI } from '../services/api';

const PatientTreatments = () => {
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [patientTreatments, setPatientTreatments] = useState([]);
  const [dentalActs, setDentalActs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState(false);
  const [treatmentToFinish, setTreatmentToFinish] = useState(null);

  const [auditLogsByTreatment, setAuditLogsByTreatment] = useState({});
  const [openAuditByTreatment, setOpenAuditByTreatment] = useState({});
  const [loadingAuditByTreatment, setLoadingAuditByTreatment] = useState({});

  // État pour les reçus de séance
  const [sessionReceiptsByPatient, setSessionReceiptsByPatient] = useState({});
  const [loadingReceiptsByPatient, setLoadingReceiptsByPatient] = useState({});
  const [medicalRecordsByTreatment, setMedicalRecordsByTreatment] = useState({});
  const [loadingRecordsByTreatment, setLoadingRecordsByTreatment] = useState({});
  const [generatingReceiptByRecordId, setGeneratingReceiptByRecordId] = useState({});
  const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);
  const [loadedReceiptPatientIds] = useState(new Set());
  const [loadedMedicalRecordTreatmentIds] = useState(new Set());

  const hasLoadedRef = useRef(false);
  
  // États pour la recherche et les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  // Onglet sélectionné : 'en_cours' ou 'termines'
  const [tab, setTab] = useState('en_cours');
  const [expandedTreatmentId, setExpandedTreatmentId] = useState(null);
  const [showRecentPatients, setShowRecentPatients] = useState(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadInitialData();

    // Charger les actes dentaires
    dentalActAPI.getAll().then(res => {
      setDentalActs(res.data.data || res.data || []);
    }).catch(() => setDentalActs([]));
  }, []);

  // Charger les reçus quand un traitement est étendu
  useEffect(() => {
    if (expandedTreatmentId) {
      const expandedTreatment = patientTreatments.find(pt => pt.id === expandedTreatmentId);
      if (expandedTreatment?.patient_id) {
        loadSessionReceiptsForPatient(expandedTreatment.patient_id);
      }
      if (expandedTreatment?.id) {
        loadMedicalRecordsForTreatment(expandedTreatment.id);
      }
    }
  }, [expandedTreatmentId, patientTreatments]);

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

  const loadSessionReceiptsForPatient = async (patientId, forceReload = false) => {
    if (!forceReload && loadedReceiptPatientIds.has(patientId)) {
      return;
    }

    setLoadingReceiptsByPatient(prev => ({ ...prev, [patientId]: true }));
    try {
      const res = await sessionReceiptAPI.getAll({ patient_id: patientId, per_page: 200 });
      const receipts = res?.data?.data || res?.data || [];
      setSessionReceiptsByPatient(prev => ({ ...prev, [patientId]: receipts }));
      loadedReceiptPatientIds.add(patientId);
    } catch {
      setSessionReceiptsByPatient(prev => ({ ...prev, [patientId]: [] }));
    } finally {
      setLoadingReceiptsByPatient(prev => ({ ...prev, [patientId]: false }));
    }
  };

  const loadMedicalRecordsForTreatment = async (treatmentId, forceReload = false) => {
    if (!forceReload && loadedMedicalRecordTreatmentIds.has(treatmentId)) {
      return;
    }

    setLoadingRecordsByTreatment(prev => ({ ...prev, [treatmentId]: true }));
    try {
      const res = await medicalRecordAPI.getAll({ patient_treatment_id: treatmentId, per_page: 200 });
      const records = res?.data?.data || res?.data || [];
      setMedicalRecordsByTreatment(prev => ({ ...prev, [treatmentId]: records }));
      loadedMedicalRecordTreatmentIds.add(treatmentId);
    } catch {
      setMedicalRecordsByTreatment(prev => ({ ...prev, [treatmentId]: [] }));
    } finally {
      setLoadingRecordsByTreatment(prev => ({ ...prev, [treatmentId]: false }));
    }
  };

  const generateMissingSessionReceipt = async (treatment, medicalRecord) => {
    const recordId = medicalRecord?.id;
    if (!recordId) return;

    const actsPayload = (Array.isArray(treatment?.acts) ? treatment.acts : [])
      .map((act) => ({
        dental_act_id: Number(act.dental_act_id),
        quantity: Math.max(1, Number(act.quantity) || 1),
      }))
      .filter((act) => Number.isInteger(act.dental_act_id) && act.dental_act_id > 0);

    if (actsPayload.length === 0) {
      alert('Impossible de générer un reçu: aucun acte n\'est associé à ce traitement.');
      return;
    }

    setGeneratingReceiptByRecordId(prev => ({ ...prev, [recordId]: true }));
    try {
      const receiptRes = await sessionReceiptAPI.create({
        medical_record_id: recordId,
        acts: actsPayload,
      });

      await loadSessionReceiptsForPatient(treatment.patient_id, true);

      const generatedReceiptId = receiptRes?.data?.id;
      if (generatedReceiptId && window.confirm('Reçu généré avec succès. Voulez-vous le télécharger maintenant ?')) {
        await downloadSessionReceipt(generatedReceiptId);
      }
    } catch (error) {
      const message = error?.response?.data?.message || 'Impossible de générer le reçu de séance.';
      alert(message);
    } finally {
      setGeneratingReceiptByRecordId(prev => ({ ...prev, [recordId]: false }));
    }
  };

  const downloadSessionReceipt = async (receiptId) => {
    if (downloadingReceiptId) return;

    setDownloadingReceiptId(receiptId);
    try {
      const res = await sessionReceiptAPI.generate(receiptId);
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `recu-seance-${receiptId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur téléchargement reçu:', error);
      alert('Impossible de télécharger le reçu');
    } finally {
      setDownloadingReceiptId(null);
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
            onClick={() => navigate('/treatments/new')}
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
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
            <button
              type="button"
              onClick={() => setShowRecentPatients(!showRecentPatients)}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="text-sm font-semibold text-gray-800">Derniers patients enregistrés</span>
              <span className="text-xs text-blue-700 font-medium">{showRecentPatients ? 'Masquer' : 'Afficher'}</span>
            </button>
            {showRecentPatients && (
              <div className="mt-3 flex flex-wrap gap-2">
                {recentPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => {
                      navigate('/treatments/new', {
                        state: { patientId: patient.id },
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all text-sm group"
                  >
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-blue-600 font-medium text-xs">
                      {patient.first_name?.charAt(0)}{patient.last_name?.charAt(0)}
                    </div>
                    <span className="text-gray-700 font-medium">
                      {patient.first_name} {patient.last_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
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
                      {expandedTreatmentId === pt.id && (
                        <>
                          {(() => {
                            const treatmentRecords = medicalRecordsByTreatment[pt.id] || [];
                            const receiptIdsByRecord = new Set(
                              (sessionReceiptsByPatient[pt.patient_id] || [])
                                .map(receipt => Number(receipt.medical_record_id))
                                .filter((id) => Number.isInteger(id) && id > 0)
                            );
                            const missingReceiptRecords = treatmentRecords.filter(
                              (record) => !receiptIdsByRecord.has(Number(record.id))
                            );

                            if (loadingRecordsByTreatment[pt.id] || loadingReceiptsByPatient[pt.patient_id]) {
                              return (
                                <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/40 p-3 text-xs text-gray-600">
                                  Vérification des séances sans reçu...
                                </div>
                              );
                            }

                            if (missingReceiptRecords.length === 0) {
                              return null;
                            }

                            return (
                              <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/40 p-3">
                                <div className="font-semibold text-xs text-amber-800 mb-2">Séances sans reçu</div>
                                <ul className="text-xs space-y-2">
                                  {missingReceiptRecords.map((record) => (
                                    <li key={record.id} className="flex items-center justify-between bg-white rounded p-2 border border-amber-100">
                                      <div className="flex-1 pr-2">
                                        <div className="font-medium text-gray-800">
                                          Séance #{record.id} - {record.date ? new Date(record.date).toLocaleDateString('fr-FR') : 'Date inconnue'}
                                        </div>
                                        <div className="text-gray-600">{record.treatment_performed || 'Acte non précisé'}</div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => generateMissingSessionReceipt(pt, record)}
                                        disabled={!!generatingReceiptByRecordId[record.id]}
                                        className="ml-2 px-3 py-1 rounded text-[11px] font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 disabled:opacity-50 transition-colors"
                                      >
                                        {generatingReceiptByRecordId[record.id] ? 'Génération...' : 'Générer reçu'}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })()}

                          {/* Détails avancés */}
                          {Array.isArray(pt.acts) && pt.acts.length > 0 && (
                            <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                              <div className="font-semibold text-xs text-blue-700 mb-2">Actes sélectionnés</div>
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
                              <div className="mt-2 text-xs font-bold text-blue-800">
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
                          {/* Section reçus de séance */}
                          {(sessionReceiptsByPatient[pt.patient_id]?.length || 0) > 0 && (
                            <div className="mt-3 rounded-lg border border-green-100 bg-green-50/40 p-3">
                              <div className="font-semibold text-xs text-green-700 mb-2">Reçus de séance</div>
                              {loadingReceiptsByPatient[pt.patient_id] ? (
                                <div className="text-xs text-gray-500">Chargement reçus...</div>
                              ) : (
                                <ul className="text-xs space-y-2">
                                  {sessionReceiptsByPatient[pt.patient_id].map((receipt) => (
                                    <li key={receipt.id} className="flex items-center justify-between bg-white rounded p-2 border border-green-100">
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-800">{receipt.receipt_number}</div>
                                        <div className="text-gray-600">
                                          {new Date(receipt.issue_date).toLocaleDateString('fr-FR')} • {Number(receipt.total_amount).toLocaleString('fr-FR')} FCFA
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => downloadSessionReceipt(receipt.id)}
                                        disabled={downloadingReceiptId === receipt.id}
                                        className="ml-2 px-3 py-1 rounded text-[11px] font-semibold text-green-700 bg-green-100 hover:bg-green-200 disabled:opacity-50 transition-colors"
                                      >
                                        {downloadingReceiptId === receipt.id ? 'Téléchargement...' : 'Télécharger'}
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                          {pt.notes && (
                            <p className="text-sm text-gray-600 mt-2 italic">{pt.notes}</p>
                          )}
                        </>
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
                        onClick={() => setExpandedTreatmentId(expandedTreatmentId === pt.id ? null : pt.id)}
                        className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        {expandedTreatmentId === pt.id ? 'Masquer détails' : 'Détails'}
                      </button>
                      {expandedTreatmentId === pt.id && (
                        <button
                          type="button"
                          onClick={() => handleToggleAuditLogs(pt.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                        >
                          {openAuditByTreatment[pt.id] ? 'Masquer audit' : 'Voir audit'}
                        </button>
                      )}
                      {pt.status !== 'completed' && pt.status !== 'cancelled' && tab === 'en_cours' && !pt.is_invoice_paid_locked && (
                        <>
                          <button
                            onClick={() => {
                              navigate(`/treatments/${pt.id}/session`);
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
                  {expandedTreatmentId === pt.id && openAuditByTreatment[pt.id] && (
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


      </div>
    </Layout>
  );
};

export default PatientTreatments;
