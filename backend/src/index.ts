import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { whatsappService } from './whatsapp';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Initialize WhatsApp
whatsappService.initialize();

// --- WHATSAPP API ---
app.get('/api/whatsapp/status', (req, res) => {
  res.json({ 
    status: whatsappService.getStatus(),
    hasQr: !!whatsappService.getQrCode()
  });
});

app.get('/api/whatsapp/qr', (req, res) => {
  const qr = whatsappService.getQrCode();
  if (qr) {
    res.json({ qr });
  } else {
    res.status(404).json({ error: 'QR Code not available' });
  }
});

app.post('/api/whatsapp/send', async (req, res) => {
  const { phone, message } = req.body;
  try {
    await whatsappService.sendMessage(phone, message);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/whatsapp/logout', async (req, res) => {
  try {
    await whatsappService.logout();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- PATIENTS ---
app.get('/api/patients', async (req, res) => {
  try {
    const patients = await prisma.patient.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(patients);
  } catch (error) {
    console.error('GET PATIENTS ERROR:', error);
    res.status(500).json({ error: 'Falha ao buscar pacientes' });
  }
});

app.post('/api/patients', async (req, res) => {
  try {
    const { 
      name, phone, email, dentalPlan, planNumber,
      document, birthDate, gender, maritalStatus,
      address, city, state, zipCode
    } = req.body;
    
    const patient = await prisma.patient.create({
      data: { 
        name: name || null, 
        phone: phone || null, 
        email: email || null, 
        dentalPlan: dentalPlan || null, 
        planNumber: planNumber || null,
        document: document || null, 
        birthDate: birthDate ? new Date(birthDate) : null, 
        gender: gender || null, 
        maritalStatus: maritalStatus || null,
        address: address || null, 
        city: city || null, 
        state: state || null, 
        zipCode: zipCode || null
      }
    });
    res.json(patient);
  } catch (error) {
    console.error('POST PATIENT ERROR:', error);
    res.status(500).json({ error: 'Falha ao criar paciente' });
  }
});

app.put('/api/patients/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { 
      name, phone, email, dentalPlan, planNumber,
      document, birthDate, gender, maritalStatus,
      address, city, state, zipCode
    } = req.body;
    
    const patient = await prisma.patient.update({
      where: { id },
      data: { 
        name: name || null, 
        phone: phone || null, 
        email: email || null, 
        dentalPlan: dentalPlan || null, 
        planNumber: planNumber || null,
        document: document || null, 
        birthDate: birthDate ? new Date(birthDate) : null, 
        gender: gender || null, 
        maritalStatus: maritalStatus || null,
        address: address || null, 
        city: city || null, 
        state: state || null, 
        zipCode: zipCode || null
      }
    });
    res.json(patient);
  } catch (error) {
    console.error('PUT PATIENT ERROR:', error);
    res.status(500).json({ error: 'Falha ao atualizar paciente' });
  }
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
  try {
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
  } catch (error) {
    console.error('GET APPOINTMENTS ERROR:', error);
    res.status(500).json({ error: 'Falha ao buscar agendamentos' });
  }
});

app.post('/api/appointments', async (req, res) => {
  try {
    const { startTime, endTime, patientId, procedureId, dentistId } = req.body;
    const appointment = await prisma.appointment.create({
      data: {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        patientId,
        procedureId,
        dentistId
      },
      include: { patient: true, procedure: true, dentist: true }
    });
    res.json(appointment);
  } catch (error) {
    console.error('POST APPOINTMENT ERROR:', error);
    res.status(500).json({ error: 'Falha ao agendar consulta' });
  }
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

// --- PERIODONTAL CHART ---
app.get('/api/patients/:id/periodontal', async (req, res) => {
  try {
    const charts = await prisma.periodontalChart.findMany({
      where: { patientId: req.params.id },
      orderBy: { date: 'desc' }
    });
    res.json(charts);
  } catch (error) {
    console.error('GET PERIODONTAL ERROR:', error);
    res.status(500).json({ error: 'Erro ao buscar fichas periodontais' });
  }
});

app.post('/api/patients/:id/periodontal', async (req, res) => {
  try {
    const { data } = req.body;
    const chart = await prisma.periodontalChart.create({
      data: {
        patientId: req.params.id,
        data: JSON.stringify(data)
      }
    });
    res.json(chart);
  } catch (error) {
    console.error('POST PERIODONTAL ERROR:', error);
    res.status(500).json({ error: 'Erro ao salvar ficha periodontal' });
  }
});

// --- DENTISTS ---
app.get('/api/dentists', async (req, res) => {
  try {
    const dentists = await prisma.dentist.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(dentists);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dentists' });
  }
});

app.post('/api/dentists', async (req, res) => {
  try {
    const { name, specialization, color } = req.body;
    const dentist = await prisma.dentist.create({
      data: { name, specialization, color }
    });
    res.json(dentist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create dentist' });
  }
});

app.put('/api/dentists/:id', async (req, res) => {
  const { id } = req.params;
  const { name, specialization, color } = req.body;
  try {
    const dentist = await prisma.dentist.update({
      where: { id },
      data: { name, specialization, color }
    });
    res.json(dentist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update dentist' });
  }
});

app.delete('/api/dentists/:id', async (req, res) => {
  try {
    await prisma.dentist.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete dentist' });
  }
});

// --- SCHEDULE BLOCKS ---
app.get('/api/schedule-blocks', async (req, res) => {
  try {
    const blocks = await prisma.scheduleBlock.findMany({
      include: { dentist: true }
    });
    res.json(blocks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedule blocks' });
  }
});

app.post('/api/schedule-blocks', async (req, res) => {
  try {
    const { startTime, endTime, reason, dentistId } = req.body;
    const block = await prisma.scheduleBlock.create({
      data: {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        reason,
        dentistId
      }
    });
    res.json(block);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create schedule block' });
  }
});

app.delete('/api/schedule-blocks/:id', async (req, res) => {
  try {
    await prisma.scheduleBlock.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete block' });
  }
});

// --- TRANSACTIONS & FINANCIAL ---
app.get('/api/transactions', async (req, res) => {
  const { month, year } = req.query;
  try {
    const where: any = {};
    if (month && year) {
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
      where.date = { gte: startDate, lte: endDate };
    }
    const transactions = await prisma.transaction.findMany({
      where,
      include: { patient: true, procedure: true },
      orderBy: { date: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/transactions', async (req, res) => {
  const { amount, method, patientId, procedureId, type } = req.body;
  try {
    const transaction = await prisma.transaction.create({
      data: { amount, method, patientId, procedureId, type: type || 'INCOME' }
    });

    // If it's a payment for a procedure, update the procedure's paidAmount
    if (procedureId && type !== 'EXPENSE') {
      const proc = await prisma.procedure.findUnique({ where: { id: procedureId } });
      if (proc) {
        const newPaidAmount = proc.paidAmount + amount;
        let status = 'PARTIAL';
        if (newPaidAmount >= proc.price) status = 'PAID';
        
        await prisma.procedure.update({
          where: { id: procedureId },
          data: { paidAmount: newPaidAmount, paymentStatus: status }
        });
      }
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// --- ATTACHMENTS ---
app.get('/api/patients/:id/attachments', async (req, res) => {
  try {
    const attachments = await prisma.attachment.findMany({
      where: { patientId: req.params.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(attachments);
  } catch (error) {
    console.error('GET ATTACHMENTS ERROR:', error);
    res.status(500).json({ error: 'Erro ao buscar anexos' });
  }
});

app.post('/api/patients/:id/attachments', async (req, res) => {
  try {
    const { fileName, fileType, url, category } = req.body;
    const attachment = await prisma.attachment.create({
      data: {
        patientId: req.params.id,
        fileName,
        fileType,
        url,
        category
      }
    });
    res.json(attachment);
  } catch (error) {
    console.error('POST ATTACHMENTS ERROR:', error);
    res.status(500).json({ error: 'Erro ao salvar anexo' });
  }
});

app.delete('/api/attachments/:id', async (req, res) => {
  try {
    await prisma.attachment.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE ATTACHMENT ERROR:', error);
    res.status(500).json({ error: 'Erro ao excluir anexo' });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, async () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  
  // Auto-seed default dentist if none exist
  try {
    const count = await prisma.dentist.count();
    if (count === 0) {
      await prisma.dentist.create({
        data: {
          name: 'Dentista Principal',
          specialization: 'Clínico Geral',
          color: '#4F46E5'
        }
      });
      console.log('✅ Default dentist created');
    }
  } catch (e) {
    console.error('Auto-seed error:', e);
  }
});
