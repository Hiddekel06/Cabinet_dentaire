
import React, { useState, useMemo, useEffect, useRef } from "react";
import { Layout } from "../components/Layout";
import { appointmentAPI, patientAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";

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
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState('');
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMotif, setSelectedMotif] = useState('all');
  const [openMenu, setOpenMenu] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' ou 'calendar'
  const [calendarView, setCalendarView] = useState('month'); // 'month' | 'week' | 'day'
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 5)); // Février 2026
  const [selectedDate, setSelectedDate] = useState(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [showMoveConfirmation, setShowMoveConfirmation] = useState(false);
  const [moveData, setMoveData] = useState({ appointmentId: null, newDate: null, appointment: null });
  const hasLoadedRef = useRef(false);
  const [quickForm, setQuickForm] = useState({
    date: '',
    heure: '09:00',
    patient_id: '',
    motif: 'Consultation',
    praticien: 'Dr. Ndiaye',
    statut: 'À venir',
  });
  const menuRef = useRef(null);

  // Fermer le menu quand on clique en dehors
  const statusMap = {
    pending: 'À venir',
    confirmed: 'À venir',
    completed: 'Terminé',
    cancelled: 'Annulé',
  };

  const statusToApi = {
    'À venir': 'pending',
    'Terminé': 'completed',
    'Annulé': 'cancelled',
  };

  const loadAppointments = async () => {
    setAppointmentsLoading(true);
    setAppointmentsError('');
    try {
      const { data } = await appointmentAPI.getAll(page);
      const list = Array.isArray(data?.data) ? data.data : [];
      const mapped = list.map((a) => {
        const dateObj = a.appointment_date ? new Date(a.appointment_date) : null;
        const date = dateObj ? dateObj.toISOString().slice(0, 10) : '';
        const heure = dateObj
          ? dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          : '';
        const patient = a.patient ? `${a.patient.first_name || ''} ${a.patient.last_name || ''}`.trim() : '';
        return {
          apiId: a.id,
          id: a.id,
          date,
          heure,
          patient,
          patientId: a.patient?.id,
          motif: a.reason || 'Consultation',
          praticien: a.dentist?.name || 'Dentiste',
          statut: statusMap[a.status] || 'À venir',
        };
      });
      setAppointments(mapped);
      setTotalPages(data?.last_page || 1);
    } catch (error) {
      console.error('Erreur chargement rendez-vous:', error);
      setAppointmentsError('Impossible de charger les rendez-vous.');
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const loadPatients = async () => {
    setPatientsLoading(true);
    try {
      const { data } = await patientAPI.getAll(1);
      const list = Array.isArray(data?.data) ? data.data : [];
      setPatients(list);
    } catch (error) {
      console.error('Erreur chargement patients:', error);
    } finally {
      setPatientsLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isInsideMenu = event.target.closest('[data-appointment-menu="true"]');
      if (!isInsideMenu) {
        setOpenMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    loadAppointments();
    loadPatients();
    // eslint-disable-next-line
  }, [page]);

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  const handleEdit = (appointment) => {
    setEditingAppointment(appointment);
    setQuickForm({
      date: appointment.date,
      heure: appointment.heure || '09:00',
      patient_id: appointment.patientId || '',
      motif: appointment.motif || 'Consultation',
      praticien: appointment.praticien || (user?.name || 'Dentiste'),
      statut: appointment.statut || 'À venir',
    });
    setShowQuickCreate(true);
  };

  const handleDelete = async (appointment) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le rendez-vous avec ${appointment.patient} ?`)) {
      try {
        if (appointment.apiId) {
          await appointmentAPI.delete(appointment.apiId);
        }
        await loadAppointments();
        if (selectedAppointment?.id === appointment.id) {
          setShowDetailsModal(false);
          setSelectedAppointment(null);
        }
      } catch (error) {
        console.error('Erreur suppression rendez-vous:', error);
        setAppointmentsError('Impossible de supprimer le rendez-vous.');
      }
    }
  };

  const filteredAppointments = useMemo(() => {
    let results = [...appointments];

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
  }, [appointments, searchTerm, selectedStatus, selectedMotif]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedMotif('all');
  };

  const toDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayDateStr = toDateStr(new Date());

  const isDateInPast = (date) => {
    const checkDate = date instanceof Date ? date : new Date(date);
    return toDateStr(checkDate) < todayDateStr;
  };

  // Fonction pour obtenir les rendez-vous d'un jour
  const getAppointmentsForDay = (dayOrDate) => {
    const dateStr = dayOrDate instanceof Date
      ? toDateStr(dayOrDate)
      : `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dayOrDate).padStart(2, '0')}`;
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

  const getWeekDates = (baseDate) => {
    const start = new Date(baseDate);
    start.setDate(baseDate.getDate() - baseDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const weekDates = getWeekDates(currentDate);
  const selectedAppointments = selectedDate ? getAppointmentsForDay(selectedDate) : [];

  const addQuickAppointment = (date) => {
    if (isDateInPast(date)) {
      setAppointmentsError("Impossible de créer un rendez-vous sur une date passée.");
      return;
    }

    const dateStr = toDateStr(date);
    setQuickForm({
      date: dateStr,
      heure: '09:00',
      patient_id: '',
      motif: 'Consultation',
      praticien: user?.name || 'Dentiste',
      statut: 'À venir',
    });
    setEditingAppointment(null);
    setSelectedDate(date);
    setShowQuickCreate(true);
  };

  const handleQuickCreateChange = (e) => {
    const { name, value } = e.target;
    setQuickForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleQuickCreateSubmit = async (e) => {
    e.preventDefault();
    if (!quickForm.patient_id || !quickForm.date || !quickForm.heure) return;
    if (!user?.id) {
      setAppointmentsError("Utilisateur non authentifié.");
      return;
    }
    // Empêcher la création à une date passée
    const now = new Date();
    const selectedDateTime = new Date(`${quickForm.date}T${quickForm.heure}`);
    if (selectedDateTime < now) {
      setAppointmentsError("Impossible de créer un rendez-vous dans le passé.");
      return;
    }
    try {
      const payload = {
        patient_id: Number(quickForm.patient_id),
        dentist_id: user?.id,
        appointment_date: `${quickForm.date}T${quickForm.heure}:00`,
        status: statusToApi[quickForm.statut] || 'pending',
        reason: quickForm.motif || null,
        notes: null,
      };

      if (editingAppointment?.apiId) {
        await appointmentAPI.update(editingAppointment.apiId, payload);
      } else {
        await appointmentAPI.create(payload);
      }

      await loadAppointments();
      setShowQuickCreate(false);
      setEditingAppointment(null);
    } catch (error) {
      console.error('Erreur création/modification rendez-vous:', error);
      setAppointmentsError("Impossible d'enregistrer le rendez-vous.");
    }
  };

  const moveAppointment = (appointmentId, newDate) => {
    const dateStr = toDateStr(newDate);
    setAppointments((prev) =>
      prev.map((a) => (a.id === appointmentId ? { ...a, date: dateStr } : a))
    );
    setSelectedDate(newDate);
  };

  const confirmMoveAppointment = async () => {
    try {
      const { appointmentId, newDate, appointment } = moveData;
      if (!appointmentId || !appointment) return;

      if (isDateInPast(newDate)) {
        setAppointmentsError('Impossible de déplacer le rendez-vous vers une date passée.');
        setShowMoveConfirmation(false);
        return;
      }
      
      // Créer le nouvel objet datetime
      const dateStr = toDateStr(newDate);
      const [year, month, day] = dateStr.split('-');
      const [hours, minutes] = (appointment.heure || '09:00').split(':');
      const newDateTime = `${year}-${month}-${day}T${hours}:${minutes}:00`;
      
      // Appel API pour mettre à jour le rendez-vous
      await appointmentAPI.update(appointmentId, {
        appointment_date: newDateTime,
      });
      
      // Mettre à jour l'état local
      moveAppointment(appointmentId, newDate);
      setShowMoveConfirmation(false);
      setMoveData({ appointmentId: null, newDate: null, appointment: null });
    } catch (error) {
      console.error('Erreur déplacement rendez-vous:', error);
      setAppointmentsError('Impossible de déplacer le rendez-vous.');
      setShowMoveConfirmation(false);
    }
  };

  const handleDragStart = (e, appointmentId) => {
    e.dataTransfer.setData('text/plain', String(appointmentId));
  };

  const handleDropOnDay = (e, date) => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData('text/plain'));
    if (!Number.isNaN(id)) {
      const appointment = appointments.find(a => a.id === id);
      if (appointment) {
        setMoveData({ appointmentId: id, newDate: date, appointment });
        setShowMoveConfirmation(true);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (viewMode !== 'calendar') return;
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'ArrowLeft') {
        handlePrev();
      }
      if (e.key === 'ArrowRight') {
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, calendarView, currentDate]);

  const handlePrev = () => {
    if (calendarView === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (calendarView === 'week') {
      const prev = new Date(currentDate);
      prev.setDate(currentDate.getDate() - 7);
      setCurrentDate(prev);
    } else {
      const prev = new Date(currentDate);
      prev.setDate(currentDate.getDate() - 1);
      setCurrentDate(prev);
    }
  };

  const handleNext = () => {
    if (calendarView === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (calendarView === 'week') {
      const next = new Date(currentDate);
      next.setDate(currentDate.getDate() + 7);
      setCurrentDate(next);
    } else {
      const next = new Date(currentDate);
      next.setDate(currentDate.getDate() + 1);
      setCurrentDate(next);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  return (
    <Layout>
      {showQuickCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.25)' }}
          onClick={() => setShowQuickCreate(false)}
        >
          <div
            className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-lg border border-blue-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
              onClick={() => setShowQuickCreate(false)}
              aria-label="Fermer"
              type="button"
            >
              &times;
            </button>
            <div className="px-6 pt-6 pb-3 bg-gradient-to-r from-blue-50 via-white to-blue-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-900">{editingAppointment ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}</h3>
              <p className="text-sm text-gray-500 mt-1">Saisie rapide</p>
            </div>
            <form onSubmit={handleQuickCreateSubmit} className="px-6 py-4 grid grid-cols-1 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">Patient *</label>
                <select
                  name="patient_id"
                  value={quickForm.patient_id}
                  onChange={handleQuickCreateChange}
                  className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                  required
                  disabled={patientsLoading}
                >
                  <option value="">{patientsLoading ? 'Chargement...' : 'Sélectionner un patient'}</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {(p.first_name || '').trim()} {(p.last_name || '').trim()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={quickForm.date}
                    onChange={handleQuickCreateChange}
                    min={todayDateStr}
                    className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Heure</label>
                  <input
                    type="time"
                    name="heure"
                    value={quickForm.heure}
                    onChange={handleQuickCreateChange}
                    className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Motif</label>
                  <select
                    name="motif"
                    value={quickForm.motif}
                    onChange={handleQuickCreateChange}
                    className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                  >
                    {motifOptions.filter(m => m.value !== 'all').map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Statut</label>
                  <select
                    name="statut"
                    value={quickForm.statut}
                    onChange={handleQuickCreateChange}
                    className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                  >
                    {statusOptions.filter(s => s.value !== 'all').map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Praticien</label>
                <input
                  name="praticien"
                  value={quickForm.praticien}
                  onChange={handleQuickCreateChange}
                  className="mt-1 w-full bg-gray-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-200 focus:outline-none border border-transparent focus:border-blue-300"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold rounded-full bg-blue-600 text-white hover:bg-blue-700 transition"
                >
                  {editingAppointment ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showDetailsModal && selectedAppointment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.25)' }}
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-lg border border-blue-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
              onClick={() => setShowDetailsModal(false)}
              aria-label="Fermer"
              type="button"
            >
              &times;
            </button>
            <div className="px-6 pt-6 pb-3 bg-gradient-to-r from-blue-50 via-white to-blue-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-gray-900">Détails du rendez-vous</h3>
              <p className="text-sm text-gray-500 mt-1">Informations complètes</p>
            </div>
            <div className="px-6 py-4 grid grid-cols-1 gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Patient</span>
                <span className="text-sm font-semibold text-gray-900">{selectedAppointment.patient}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Date</span>
                <span className="text-sm font-semibold text-gray-900">{selectedAppointment.date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Heure</span>
                <span className="text-sm font-semibold text-gray-900">{selectedAppointment.heure}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Motif</span>
                <span className="text-sm font-semibold text-gray-900">{selectedAppointment.motif}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Praticien</span>
                <span className="text-sm font-semibold text-gray-900">{selectedAppointment.praticien}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Statut</span>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  selectedAppointment.statut === 'À venir'
                    ? 'bg-emerald-100 text-emerald-700'
                    : selectedAppointment.statut === 'Terminé'
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-red-100 text-red-600'
                }`}>
                  {selectedAppointment.statut}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale de confirmation du déplacement */}
      {showMoveConfirmation && moveData.appointment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.25)' }}
          onClick={() => setShowMoveConfirmation(false)}
        >
          <div
            className="relative w-full max-w-sm mx-2 bg-white rounded-lg shadow-lg border border-blue-100"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none"
              onClick={() => setShowMoveConfirmation(false)}
              aria-label="Fermer"
              type="button"
            >
              &times;
            </button>
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Confirmer le déplacement</h3>
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Êtes-vous sûr de vouloir déplacer ce rendez-vous ?
                </p>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Patient :</span>
                    <span className="text-sm font-semibold text-gray-900">{moveData.appointment.patient}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Nouvelle date :</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {moveData.newDate ? moveData.newDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Heure :</span>
                    <span className="text-sm font-semibold text-gray-900">{moveData.appointment.heure}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Motif :</span>
                    <span className="text-sm font-semibold text-gray-900">{moveData.appointment.motif}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                  onClick={() => setShowMoveConfirmation(false)}
                >
                  Annuler
                </button>
                <button
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition-colors"
                  onClick={confirmMoveAppointment}
                >
                  Confirmer le déplacement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <button 
                onClick={() => setShowQuickCreate(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-blue-600 text-sm font-medium rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer select-none border border-blue-100">
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
                {appointmentsLoading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-gray-500">
                      Chargement des rendez-vous...
                    </td>
                  </tr>
                ) : appointmentsError ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-red-600">
                      {appointmentsError}
                    </td>
                  </tr>
                ) : filteredAppointments.length > 0 ? (
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
                        <div className="relative flex items-center" data-appointment-menu="true">
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
            Page {page} sur {totalPages} | Affichage de {appointments.length} rendez-vous
          </p>
          <div className="flex space-x-2">
            <button
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              ← Précédent
            </button>
            <button
              className="px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 rounded-lg flex items-center gap-1"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
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
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {calendarView === 'month' && `${monthName} ${year}`}
                {calendarView === 'week' && `Semaine du ${weekDates[0].toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - ${weekDates[6].toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`}
                {calendarView === 'day' && currentDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handlePrev}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium text-xs sm:text-base"
                >
                  <span>← Précédent</span>
                </button>
                <button
                  onClick={handleToday}
                  className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors font-medium text-xs sm:text-base"
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={handleNext}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium text-xs sm:text-base"
                >
                  Suivant →
                </button>
                <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-white">
                  <button
                    onClick={() => setCalendarView('month')}
                    className={`px-2 py-1 text-xs sm:text-sm rounded ${calendarView === 'month' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    Mois
                  </button>
                  <button
                    onClick={() => setCalendarView('week')}
                    className={`px-2 py-1 text-xs sm:text-sm rounded ${calendarView === 'week' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    Semaine
                  </button>
                  <button
                    onClick={() => setCalendarView('day')}
                    className={`px-2 py-1 text-xs sm:text-sm rounded ${calendarView === 'day' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    Jour
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
              {/* Grille du calendrier */}
              <div className="w-full overflow-x-auto">
                {calendarView === 'month' && (
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
                      const isOverloaded = appointmentsForDay.length >= 4;
                      const dateObj = day ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day) : null;
                      const isPastDay = dateObj ? isDateInPast(dateObj) : false;
                      return (
                        <div
                          key={index}
                          onClick={() => day && setSelectedDate(dateObj)}
                          onDragOver={(e) => day && e.preventDefault()}
                          onDrop={(e) => day && !isPastDay && handleDropOnDay(e, dateObj)}
                          className={`min-h-24 p-2 rounded-lg border-2 transition-all text-left relative cursor-pointer ${
                            day
                              ? isToday
                                ? 'bg-blue-50 border-blue-300'
                                : isPastDay
                                ? 'bg-gray-50 border-gray-200 opacity-80'
                                : 'bg-white border-gray-200 hover:border-blue-300'
                              : 'bg-gray-50 border-gray-100'
                          }`}
                        >
                          {day && (
                            <>
                              <div className={`font-bold text-sm mb-1 ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                                {day}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addQuickAppointment(dateObj);
                                }}
                                disabled={isPastDay}
                                className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Ajouter un RDV"
                              >
                                +
                              </button>
                              {isOverloaded && (
                                <span className="absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">Surchargé</span>
                              )}
                              <div className="space-y-1">
                                {appointmentsForDay.slice(0, 2).map((app, idx) => (
                                  <div
                                    key={idx}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, app.id)}
                                    className={`text-xs px-1.5 py-0.5 rounded truncate cursor-move transition-colors font-medium ${
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
                )}

                {calendarView === 'week' && (
                  <div className="grid grid-cols-7 gap-1 mb-4 min-w-[600px] sm:min-w-0 text-xs sm:text-sm">
                    {weekDates.map((date) => {
                      const appointmentsForDay = getAppointmentsForDay(date);
                      const isToday = toDateStr(date) === toDateStr(new Date());
                      const isPastDay = isDateInPast(date);
                      const isOverloaded = appointmentsForDay.length >= 4;
                      return (
                        <div
                          key={date.toISOString()}
                          onClick={() => setSelectedDate(date)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => !isPastDay && handleDropOnDay(e, date)}
                          className={`min-h-28 p-2 rounded-lg border-2 transition-all text-left relative cursor-pointer ${
                            isToday
                              ? 'bg-blue-50 border-blue-300'
                              : isPastDay
                              ? 'bg-gray-50 border-gray-200 opacity-80'
                              : 'bg-white border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <div className={`font-bold text-sm mb-1 ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                            {date.getDate()} {dayNames[date.getDay()]}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addQuickAppointment(date);
                            }}
                            disabled={isPastDay}
                            className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Ajouter un RDV"
                          >
                            +
                          </button>
                          {isOverloaded && (
                            <span className="absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">Surchargé</span>
                          )}
                          <div className="space-y-1">
                            {appointmentsForDay.slice(0, 3).map((app, idx) => (
                              <div
                                key={idx}
                                draggable
                                onDragStart={(e) => handleDragStart(e, app.id)}
                                className={`text-xs px-1.5 py-0.5 rounded truncate font-medium ${
                                  app.statut === 'À venir'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : app.statut === 'Terminé'
                                    ? 'bg-gray-100 text-gray-600'
                                    : 'bg-red-100 text-red-600'
                                }`}
                              >
                                {app.heure} {app.patient.split(' ')[0]}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {calendarView === 'day' && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    {getAppointmentsForDay(currentDate).length === 0 ? (
                      <p className="text-sm text-gray-500">Aucun rendez-vous pour cette journée.</p>
                    ) : (
                      <div className="space-y-2">
                        {getAppointmentsForDay(currentDate).map((app) => (
                          <div
                            key={app.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, app.id)}
                            className={`p-2 rounded-lg border ${
                              app.statut === 'À venir'
                                ? 'bg-emerald-50 border-emerald-200'
                                : app.statut === 'Terminé'
                                ? 'bg-gray-50 border-gray-200'
                                : 'bg-red-50 border-red-200'
                            }`}
                          >
                            <div className="text-sm font-semibold text-gray-900">{app.heure} • {app.patient}</div>
                            <div className="text-xs text-gray-600">{app.motif} — {app.praticien}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Panneau latéral */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm h-fit mt-2">
                <h3 className="text-sm font-semibold text-gray-900">Détails du jour</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedDate ? selectedDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Sélectionnez un jour'}
                </p>
                <div className="mt-3 space-y-2">
                  {selectedDate && selectedAppointments.length === 0 && (
                    <p className="text-sm text-gray-500">Aucun rendez-vous.</p>
                  )}
                  {selectedDate && selectedAppointments.map((app) => (
                    <div key={app.id} className="p-2 rounded-lg border border-gray-200">
                      <div className="text-sm font-semibold text-gray-900">{app.heure} • {app.patient}</div>
                      <div className="text-xs text-gray-600">{app.motif} — {app.praticien}</div>
                      <span className={`mt-1 inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                        app.statut === 'À venir'
                          ? 'bg-emerald-100 text-emerald-700'
                          : app.statut === 'Terminé'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {app.statut}
                      </span>
                    </div>
                  ))}
                </div>
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
