const API_URL = 'http://localhost:3002/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

export const fetchPatients = async () => {
  const res = await fetch(`${API_URL}/patients`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const createPatient = async (data: any) => {
  const res = await fetch(`${API_URL}/patients`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const updatePatient = async (id: string, data: any) => {
  const res = await fetch(`${API_URL}/patients/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deletePatient = async (id: string) => {
  const res = await fetch(`${API_URL}/patients/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.json();
};

export const fetchAppointments = async () => {
  const res = await fetch(`${API_URL}/appointments`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const deleteAllAppointments = async () => {
  const res = await fetch(`${API_URL}/appointments`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.json();
};

export const createAppointment = async (data: { startTime: string; endTime: string; patientId: string; procedureId?: string; dentistId?: string }) => {
  const res = await fetch(`${API_URL}/appointments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteAppointment = async (id: string) => {
  const res = await fetch(`${API_URL}/appointments/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.json();
};

export const updateAppointmentStatus = async (id: string, status: string) => {
  const res = await fetch(`${API_URL}/appointments/${id}/status`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ status }),
  });
  return res.json();
};

// --- DENTISTS ---
export const fetchDentists = async () => {
  const res = await fetch(`${API_URL}/dentists`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const createDentist = async (data: { name: string; specialization?: string; color?: string }) => {
  const res = await fetch(`${API_URL}/dentists`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const updateDentist = async (id: string, data: { name: string; specialization?: string; color?: string }) => {
  const res = await fetch(`${API_URL}/dentists/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteDentist = async (id: string) => {
  const res = await fetch(`${API_URL}/dentists/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.json();
};

// --- SCHEDULE BLOCKS ---
export const fetchScheduleBlocks = async () => {
  const res = await fetch(`${API_URL}/schedule-blocks`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const createScheduleBlock = async (data: { startTime: string; endTime: string; reason: string; dentistId?: string }) => {
  const res = await fetch(`${API_URL}/schedule-blocks`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteScheduleBlock = async (id: string) => {
  const res = await fetch(`${API_URL}/schedule-blocks/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
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
  const res = await fetch(url.toString(), {
    headers: getHeaders(),
  });
  return res.json();
};

export const createTransaction = async (data: { amount: number; method: string; patientId?: string; procedureId?: string; type?: string }) => {
  const res = await fetch(`${API_URL}/transactions`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteTransaction = async (id: string) => {
  const res = await fetch(`${API_URL}/transactions/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.json();
};

export const fetchAllTreatments = async () => {
  const res = await fetch(`${API_URL}/treatments`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const fetchTreatments = async (patientId: string) => {
  const res = await fetch(`${API_URL}/patients/${patientId}/treatments`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const createTreatment = async (data: { name: string; description: string; patientId: string; procedures: {name: string, tooth: string, price: number, duration: number}[] }) => {
  const res = await fetch(`${API_URL}/treatments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const updateTreatment = async (id: string, data: { name: string; description: string; status: string }) => {
  const res = await fetch(`${API_URL}/treatments/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const updateTreatmentStatus = async (id: string, status: string) => {
  const res = await fetch(`${API_URL}/treatments/${id}/status`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ status }),
  });
  return res.json();
};

export const deleteTreatment = async (id: string) => {
  const res = await fetch(`${API_URL}/treatments/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.json();
};

export const fetchCatalog = async () => {
  const res = await fetch(`${API_URL}/catalog`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const createCatalogItem = async (data: { type: string; name: string; description?: string; price: number; duration: number; color?: string }) => {
  const res = await fetch(`${API_URL}/catalog`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const updateCatalogItem = async (id: string, data: { type: string; name: string; description?: string; price: number; duration: number; color?: string }) => {
  const res = await fetch(`${API_URL}/catalog/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteCatalogItem = async (id: string) => {
  const res = await fetch(`${API_URL}/catalog/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.json();
};

export const fetchPatientRecord = async (patientId: string) => {
  const res = await fetch(`${API_URL}/patients/${patientId}/record`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const updatePatientRecord = async (patientId: string, data: any) => {
  const res = await fetch(`${API_URL}/patients/${patientId}/record`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const fetchClinicalNotes = async (patientId: string) => {
  const res = await fetch(`${API_URL}/patients/${patientId}/notes`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const createClinicalNote = async (patientId: string, data: { description: string, dentistName: string }) => {
  const res = await fetch(`${API_URL}/patients/${patientId}/notes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteClinicalNote = async (id: string) => {
  const res = await fetch(`${API_URL}/notes/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.json();
};

export const fetchPeriodontalCharts = async (patientId: string) => {
  const res = await fetch(`${API_URL}/patients/${patientId}/periodontal`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const createPeriodontalChart = async (patientId: string, data: any) => {
  const res = await fetch(`${API_URL}/patients/${patientId}/periodontal`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ data }),
  });
  return res.json();
};

export const fetchAttachments = async (patientId: string) => {
  const res = await fetch(`${API_URL}/patients/${patientId}/attachments`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const createAttachment = async (patientId: string, data: any) => {
  const res = await fetch(`${API_URL}/patients/${patientId}/attachments`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteAttachment = async (id: string) => {
  const res = await fetch(`${API_URL}/attachments/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.json();
};

// --- WHATSAPP API ---
export const fetchWhatsAppStatus = async () => {
  const res = await fetch(`${API_URL}/whatsapp/status`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const fetchWhatsAppQr = async () => {
  const res = await fetch(`${API_URL}/whatsapp/qr`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const sendWhatsAppMessage = async (phone: string, message: string) => {
  const res = await fetch(`${API_URL}/whatsapp/send`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ phone, message }),
  });
  return res.json();
};

export const logoutWhatsApp = async () => {
  const res = await fetch(`${API_URL}/whatsapp/logout`, {
    method: 'POST',
    headers: getHeaders(),
  });
  return res.json();
};

// --- AUTH API ---
export const login = async (data: any) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};
export const register = async (data: any) => {
  const res = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
};

// --- SUPER ADMIN API ---
export const fetchAllTenants = async () => {
  const res = await fetch(`${API_URL}/admin/tenants`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const deleteTenant = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/tenants/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  return res.json();
};
