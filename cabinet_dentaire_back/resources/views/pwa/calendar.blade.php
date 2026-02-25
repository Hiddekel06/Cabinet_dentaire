<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calendrier des rendez-vous</title>
    <meta name="theme-color" content="#2563eb">
    <link rel="manifest" href="/manifest.json">
    <style>
        body { font-family: 'Inter', Arial, sans-serif; background: #f3f4f6; margin: 0; }
        .header { background: #2563eb; color: #fff; padding: 1.2rem 0; text-align: center; font-size: 1.4rem; font-weight: bold; }
        .calendar { max-width: 480px; margin: 2rem auto; background: #fff; border-radius: 1.2rem; box-shadow: 0 2px 12px #0001; padding: 1.5rem; }
        .appt { border-bottom: 1px solid #e5e7eb; padding: 1rem 0; }
        .appt:last-child { border-bottom: none; }
        .appt-title { font-weight: 600; color: #2563eb; }
        .appt-time { color: #374151; font-size: 1.1rem; }
        .appt-notes { color: #6b7280; font-size: 0.95rem; margin-top: 0.2rem; }
        .empty { color: #9ca3af; text-align: center; margin: 2rem 0; }
    </style>
</head>
<body>
    <div class="header">Calendrier des rendez-vous</div>
    <div class="calendar" id="calendar">
        <div class="empty">Chargement...</div>
    </div>
    <script>
    async function loadAppointments() {
        const today = new Date().toISOString().slice(0, 10);
        const res = await fetch('/api/appointments?date=' + today);
        const data = await res.json();
        const el = document.getElementById('calendar');
        if (!data.data || !data.data.length) {
            el.innerHTML = '<div class="empty">Aucun rendez-vous aujourd\'hui</div>';
            return;
        }
        el.innerHTML = data.data.map(appt => `
            <div class="appt">
                <div class="appt-title">${appt.patient?.first_name || ''} ${appt.patient?.last_name || ''}</div>
                <div class="appt-time">${new Date(appt.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                <div class="appt-notes">${appt.reason || ''}</div>
            </div>
        `).join('');
    }
    loadAppointments();
    </script>
</body>
</html>
