import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// --- PATIENTS ---
app.get('/api/patients', async (req, res) => {
  const patients = await prisma.patient.findMany({
    orderBy: { createdAt: 'desc' }
  });
  res.json(patients);
});

app.post('/api/patients', async (req, res) => {
  const { name, phone, email } = req.body;
  const patient = await prisma.patient.create({
    data: { name, phone, email }
  });
  res.json(patient);
});

app.delete('/api/patients/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.patient.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE PATIENT ERROR:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

// --- TREATMENTS ---
app.get('/api/treatments', async (req, res) => {
  const treatments = await prisma.treatment.findMany({
    include: { procedures: true }
  });
  res.json(treatments);
});

app.get('/api/patients/:id/treatments', async (req, res) => {
  const { id } = req.params;
  const treatments = await prisma.treatment.findMany({
    where: { patientId: id },
    include: { 
      procedures: {
        include: { appointment: true }
      } 
    }
  });
  res.json(treatments);
});

app.post('/api/treatments', async (req, res) => {
  const { name, description, patientId, procedures } = req.body;
  // procedures is an array of objects
  const treatment = await prisma.treatment.create({
    data: {
      name,
      description,
      patientId,
      procedures: {
        create: procedures.map((p: any) => ({
          name: p.name,
          tooth: p.tooth,
          price: p.price,
          duration: p.duration
        }))
      }
    },
    include: { procedures: true }
  });
  res.json(treatment);
});

app.put('/api/treatments/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, status } = req.body;
  try {
    const updated = await prisma.treatment.update({
      where: { id },
      data: { name, description, status }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update treatment' });
  }
});

app.delete('/api/treatments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.treatment.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE TREATMENT ERROR:', error);
    res.status(500).json({ error: 'Failed to delete treatment' });
  }
});

// --- APPOINTMENTS ---
app.get('/api/appointments', async (req, res) => {
  const appointments = await prisma.appointment.findMany({
    include: {
      patient: true,
      procedure: {
        include: { treatment: true }
      }
    },
    orderBy: { startTime: 'asc' }
  });
  res.json(appointments);
});

app.post('/api/appointments', async (req, res) => {
  const { startTime, endTime, patientId, procedureId } = req.body;
  const appointment = await prisma.appointment.create({
    data: {
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      patientId,
      procedureId
    },
    include: { patient: true, procedure: true }
  });
  res.json(appointment);
});

app.delete('/api/appointments', async (req, res) => {
  try {
    const result = await prisma.appointment.deleteMany();
    res.json({ success: true, count: result.count });
  } catch (error) {
    console.error('DELETE ALL APPOINTMENTS ERROR:', error);
    res.status(500).json({ error: 'Failed to delete appointments' });
  }
});

app.delete('/api/appointments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.appointment.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE APPOINTMENT ERROR:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

app.patch('/api/appointments/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    // Get the appointment to find the linked procedure
    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) return res.status(404).json({ error: 'Not found' });

    // Update appointment status
    const updated = await prisma.appointment.update({
      where: { id },
      data: { status }
    });

    // Sync procedure status if it's linked
    if (appointment.procedureId) {
      await prisma.procedure.update({
        where: { id: appointment.procedureId },
        data: { isCompleted: status === 'COMPLETED' }
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// --- CATALOG ---
app.get('/api/catalog', async (req, res) => {
  const catalog = await prisma.catalogItem.findMany({
    orderBy: { name: 'asc' }
  });
  res.json(catalog);
});

app.post('/api/catalog', async (req, res) => {
  const { type, name, description, price, duration, color } = req.body;
  const item = await prisma.catalogItem.create({
    data: { type, name, description, price, duration, color: color || '#3b82f6' }
  });
  res.json(item);
});

app.put('/api/catalog/:id', async (req, res) => {
  const { id } = req.params;
  const { type, name, description, price, duration, color } = req.body;
  try {
    const updated = await prisma.catalogItem.update({
      where: { id },
      data: { type, name, description, price, duration, color: color || '#3b82f6' }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update catalog item' });
  }
});

app.delete('/api/catalog/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.catalogItem.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete catalog item' });
  }
});

// --- PRONTUARIO (PatientRecord & ClinicalNotes) ---
app.get('/api/patients/:id/record', async (req, res) => {
  const { id } = req.params;
  let record = await prisma.patientRecord.findUnique({ where: { patientId: id } });
  if (!record) {
    record = await prisma.patientRecord.create({ data: { patientId: id } });
  }
  res.json(record);
});

app.put('/api/patients/:id/record', async (req, res) => {
  const { id } = req.params;
  const { medicalAlerts, healthHistory, allergies, medications } = req.body;
  try {
    const updated = await prisma.patientRecord.upsert({
      where: { patientId: id },
      update: { medicalAlerts, healthHistory, allergies, medications },
      create: { patientId: id, medicalAlerts, healthHistory, allergies, medications }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update record' });
  }
});

app.get('/api/patients/:id/notes', async (req, res) => {
  const { id } = req.params;
  const notes = await prisma.clinicalNote.findMany({
    where: { patientId: id },
    orderBy: { date: 'desc' }
  });
  res.json(notes);
});

app.post('/api/patients/:id/notes', async (req, res) => {
  const { id } = req.params;
  const { description, dentistName } = req.body;
  const note = await prisma.clinicalNote.create({
    data: { patientId: id, description, dentistName }
  });
  res.json(note);
});

app.delete('/api/notes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.clinicalNote.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
