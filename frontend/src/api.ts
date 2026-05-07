const API_URL = 'http://localhost:3002/api';

export const fetchPatients = async () => {
  const res = await fetch(`${API_URL}/patients`);
  return res.json();
};

export const createPatient = async (data: any) => {
  const res = await fetch(`${API_URL}/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const updatePatient = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/patients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deletePatient = async (id: string) => {
  const res = await fetch(`${API_URL}/patients/${id}`, {
    method: 'DELETE',
  });
  return res.json();
};

export const fetchAppointments = async () => {
  const res = await fetch(`${API_URL}/appointments`);
  return res.json();
};

export const deleteAllAppointments = async () => {
  const res = await fetch(`${API_URL}/appointments`, {
    method: 'DELETE',
  });
  return res.json();
};

export const createAppointment = async (data: { startTime: string; endTime: string; patientId: string; procedureId?: string; dentistId?: string }) => {
  const res = await fetch(`${API_URL}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteAppointment = async (id: string) => {
  const res = await fetch(`${API_URL}/appointments/${id}`, {
    method: 'DELETE',
  });
  return res.json();
};

export const updateAppointmentStatus = async (id: string, status: string) => {
  const res = await fetch(`${API_URL}/appointments/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return res.json();
};

// --- DENTISTS ---
export const fetchDentists = async () => {
  const res = await fetch(`${API_URL}/dentists`);
  return res.json();
};

export const createDentist = async (data: { name: string; specialization?: string; color?: string }) => {
  const res = await fetch(`${API_URL}/dentists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const updateDentist = async (id: string, data: { name: string; specialization?: string; color?: string }) => {
  const res = await fetch(`${API_URL}/dentists/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteDentist = async (id: string) => {
  const res = await fetch(`${API_URL}/dentists/${id}`, {
    method: 'DELETE',
  });
  return res.json();
};

// --- SCHEDULE BLOCKS ---
export const fetchScheduleBlocks = async () => {
  const res = await fetch(`${API_URL}/schedule-blocks`);
  return res.json();
};

export const createScheduleBlock = async (data: { startTime: string; endTime: string; reason: string; dentistId?: string }) => {
  const res = await fetch(`${API_URL}/schedule-blocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteScheduleBlock = async (id: string) => {
  const res = await fetch(`${API_URL}/schedule-blocks/${id}`, {
    method: 'DELETE',
  });
  return res.json();
};

// --- TRANSACTIONS & FINANCIAL ---
export const fetchTransactions = async (month?: number, year?: number) => {
  const url = new URL(`${API_URL}/transactions`);
  if (month && year) {
    url.searchParams.append('month', month.toString());
    url.searchParams.append('year', year.toString());
  }
  const res = await fetch(url.toString());
  return res.json();
};

export const createTransaction = async (data: { amount: number; method: string; patientId?: string; procedureId?: string; type?: string }) => {
  const res = await fetch(`${API_URL}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const fetchAllTreatments = async () => {
  const res = await fetch(`${API_URL}/treatments`);
  return res.json();
};

export const fetchTreatments = async (patientId: string) => {
  const res = await fetch(`${API_URL}/patients/${patientId}/treatments`);
  return res.json();
};

export const createTreatment = async (data: { name: string; description: string; patientId: string; procedures: {name: string, tooth: string, price: number, duration: number}[] }) => {
  const res = await fetch(`${API_URL}/treatments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const updateTreatment = async (id: string, data: { name: string; description: string; status: string }) => {
  const res = await fetch(`${API_URL}/treatments/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteTreatment = async (id: string) => {
  const res = await fetch(`${API_URL}/treatments/${id}`, {
    method: 'DELETE',
  });
  return res.json();
};

export const fetchCatalog = async () => {
  const res = await fetch(`${API_URL}/catalog`);
  return res.json();
};

export const createCatalogItem = async (data: { type: string; name: string; description?: string; price: number; duration: number; color?: string }) => {
  const res = await fetch(`${API_URL}/catalog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const updateCatalogItem = async (id: string, data: { type: string; name: string; description?: string; price: number; duration: number; color?: string }) => {
  const res = await fetch(`${API_URL}/catalog/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteCatalogItem = async (id: string) => {
  const res = await fetch(`${API_URL}/catalog/${id}`, {
    method: 'DELETE',
  });
  return res.json();
};

export const fetchPatientRecord = async (patientId: string) => {
  const res = await fetch(`${API_URL}/patients/${patientId}/record`);
  return res.json();
};

export const updatePatientRecord = async (patientId: string, data: any) => {
  const res = await fetch(`${API_URL}/patients/${patientId}/record`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const fetchClinicalNotes = async (patientId: string) => {
  const res = await fetch(`${API_URL}/patients/${patientId}/notes`);
  return res.json();
};

export const createClinicalNote = async (patientId: string, data: { description: string, dentistName: string }) => {
  const res = await fetch(`${API_URL}/patients/${patientId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteClinicalNote = async (id: string) => {
  const res = await fetch(`${API_URL}/notes/${id}`, {
    method: 'DELETE',
  });
  return res.json();
};

export const fetchPeriodontalCharts = async (patientId: string) => {
  const res = await fetch(`${API_URL}/patients/${patientId}/periodontal`);
  return res.json();
};

export const createPeriodontalChart = async (patientId: string, data: any) => {
  const res = await fetch(`${API_URL}/patients/${patientId}/periodontal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data }),
  });
  return res.json();
};

export const fetchAttachments = async (patientId: string) => {
  const res = await fetch(`${API_URL}/patients/${patientId}/attachments`);
  return res.json();
};

export const createAttachment = async (patientId: string, data: any) => {
  const res = await fetch(`${API_URL}/patients/${patientId}/attachments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteAttachment = async (id: string) => {
  const res = await fetch(`${API_URL}/attachments/${id}`, {
    method: 'DELETE',
  });
  return res.json();
};

// --- WHATSAPP API ---
export const fetchWhatsAppStatus = async () => {
  const res = await fetch(`${API_URL}/whatsapp/status`);
  return res.json();
};

export const fetchWhatsAppQr = async () => {
  const res = await fetch(`${API_URL}/whatsapp/qr`);
  return res.json();
};

export const sendWhatsAppMessage = async (phone: string, message: string) => {
  const res = await fetch(`${API_URL}/whatsapp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message }),
  });
  return res.json();
};

export const logoutWhatsApp = async () => {
  const res = await fetch(`${API_URL}/whatsapp/logout`, {
    method: 'POST',
  });
  return res.json();
};
