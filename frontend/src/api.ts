const API_URL = 'http://localhost:3002/api';

export const fetchPatients = async () => {
  const res = await fetch(`${API_URL}/patients`);
  return res.json();
};

export const createPatient = async (data: { name: string; phone: string; email: string }) => {
  const res = await fetch(`${API_URL}/patients`, {
    method: 'POST',
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

export const createAppointment = async (data: { startTime: string; endTime: string; patientId: string; procedureId?: string }) => {
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
