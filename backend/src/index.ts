import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { whatsappService } from './whatsapp';
import authRoutes from './routes/auth';
import { authMiddleware, AuthRequest } from './middleware/auth';

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Protected Routes Middleware
app.use('/api', (req: any, res, next) => {
  // Skip auth for public routes if any (none for now)
  authMiddleware(req, res, next);
});

// Initialize WhatsApp
whatsappService.initialize();

// --- WHATSAPP API ---
app.get('/api/whatsapp/status', (req: AuthRequest, res) => {
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

app.post('/api/whatsapp/send', async (req: AuthRequest, res) => {
  const { phone, message } = req.body;
  try {
    await whatsappService.sendMessage(phone, message);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/whatsapp/logout', async (req: AuthRequest, res) => {
  try {
    await whatsappService.logout();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- PATIENTS ---
app.get('/api/patients', async (req: AuthRequest, res) => {
  try {
    const patients = await prisma.patient.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(patients);
  } catch (error) {
    console.error('GET PATIENTS ERROR:', error);
    res.status(500).json({ error: 'Falha ao buscar pacientes' });
  }
});

app.post('/api/patients', async (req: AuthRequest, res) => {
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
        zipCode: zipCode || null,
        tenantId: req.tenantId!
      }
    });
    res.json(patient);
  } catch (error) {
    console.error('POST PATIENT ERROR:', error);
    res.status(500).json({ error: 'Falha ao criar paciente' });
  }
});

app.put('/api/patients/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    const { 
      name, phone, email, dentalPlan, planNumber,
      document, birthDate, gender, maritalStatus,
      address, city, state, zipCode
    } = req.body;
    
    await prisma.patient.updateMany({
      where: { id, tenantId: req.tenantId },
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
    
    const updated = await prisma.patient.findFirst({ where: { id, tenantId: req.tenantId } });
    res.json(updated);
  } catch (error) {
    console.error('PUT PATIENT ERROR:', error);
    res.status(500).json({ error: 'Falha ao atualizar paciente' });
  }
});

app.delete('/api/patients/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    await prisma.patient.deleteMany({ 
      where: { id, tenantId: req.tenantId } 
    });
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE PATIENT ERROR:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

// --- TREATMENTS ---
app.get('/api/treatments', async (req: AuthRequest, res) => {
  const treatments = await prisma.treatment.findMany({
    where: { tenantId: req.tenantId },
    include: { procedures: true, patient: true }
  });
  res.json(treatments);
});

app.get('/api/patients/:id/treatments', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const treatments = await prisma.treatment.findMany({
    where: { patientId: id, tenantId: req.tenantId },
    include: { 
      procedures: {
        include: { appointment: true }
      } 
    }
  });
  res.json(treatments);
});

app.post('/api/treatments', async (req: AuthRequest, res) => {
  const { name, description, patientId, procedures } = req.body;
  // procedures is an array of objects
  const treatment = await prisma.treatment.create({
    data: {
      name,
      description,
      patientId,
      tenantId: req.tenantId!,
      procedures: {
        create: procedures.map((p: any) => ({
          name: p.name,
          tooth: p.tooth,
          price: p.price,
          duration: p.duration,
          tenantId: req.tenantId!
        }))
      }
    },
    include: { procedures: true }
  });
  res.json(treatment);
});

app.put('/api/treatments/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, description, status } = req.body;
  try {
    await prisma.treatment.updateMany({
      where: { id, tenantId: req.tenantId },
      data: { name, description, status }
    });
    const updated = await prisma.treatment.findFirst({ where: { id, tenantId: req.tenantId } });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update treatment' });
  }
});

app.patch('/api/treatments/:id/status', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await prisma.treatment.updateMany({
      where: { id, tenantId: req.tenantId },
      data: { status }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update treatment status' });
  }
});

app.delete('/api/treatments/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    await prisma.treatment.deleteMany({
      where: { id, tenantId: req.tenantId }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE TREATMENT ERROR:', error);
    res.status(500).json({ error: 'Failed to delete treatment' });
  }
});

// --- APPOINTMENTS ---
app.get('/api/appointments', async (req: AuthRequest, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { tenantId: req.tenantId },
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

app.post('/api/appointments', async (req: AuthRequest, res) => {
  try {
    const { startTime, endTime, patientId, procedureId, dentistId } = req.body;
    const appointment = await prisma.appointment.create({
      data: {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        patientId,
        procedureId,
        dentistId,
        tenantId: req.tenantId!
      },
      include: { patient: true, procedure: true, dentist: true }
    });
    res.json(appointment);
  } catch (error) {
    console.error('POST APPOINTMENT ERROR:', error);
    res.status(500).json({ error: 'Falha ao agendar consulta' });
  }
});

app.delete('/api/appointments', async (req: AuthRequest, res) => {
  try {
    const result = await prisma.appointment.deleteMany({
      where: { tenantId: req.tenantId }
    });
    res.json({ success: true, count: result.count });
  } catch (error) {
    console.error('DELETE ALL APPOINTMENTS ERROR:', error);
    res.status(500).json({ error: 'Failed to delete appointments' });
  }
});

app.delete('/api/appointments/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    await prisma.appointment.deleteMany({ 
      where: { id, tenantId: req.tenantId } 
    });
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE APPOINTMENT ERROR:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

app.patch('/api/appointments/:id/status', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    // Get the appointment to find the linked procedure
    const appointment = await prisma.appointment.findFirst({ 
      where: { id, tenantId: req.tenantId } 
    });
    if (!appointment) return res.status(404).json({ error: 'Not found' });

    // Update appointment status
    await prisma.appointment.updateMany({
      where: { id, tenantId: req.tenantId },
      data: { status }
    });

    // Sync procedure status if it's linked
    if (appointment.procedureId) {
      await prisma.procedure.updateMany({
        where: { id: appointment.procedureId, tenantId: req.tenantId },
        data: { isCompleted: status === 'COMPLETED' }
      });
    }

    const updated = await prisma.appointment.findFirst({ where: { id, tenantId: req.tenantId } });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// --- CATALOG ---
app.get('/api/catalog', async (req: AuthRequest, res) => {
  const catalog = await prisma.catalogItem.findMany({
    where: { tenantId: req.tenantId },
    orderBy: { name: 'asc' }
  });
  res.json(catalog);
});

app.post('/api/catalog', async (req: AuthRequest, res) => {
  const { type, name, description, price, duration, color } = req.body;
  const item = await prisma.catalogItem.create({
    data: { 
      type, 
      name, 
      description, 
      price, 
      duration, 
      color: color || '#3b82f6',
      tenantId: req.tenantId!
    }
  });
  res.json(item);
});

app.put('/api/catalog/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { type, name, description, price, duration, color } = req.body;
  try {
    await prisma.catalogItem.updateMany({
      where: { id, tenantId: req.tenantId },
      data: { type, name, description, price, duration, color: color || '#3b82f6' }
    });
    const updated = await prisma.catalogItem.findFirst({ where: { id, tenantId: req.tenantId } });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update catalog item' });
  }
});

app.delete('/api/catalog/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    await prisma.catalogItem.deleteMany({ 
      where: { id, tenantId: req.tenantId } 
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete catalog item' });
  }
});

// --- PRONTUARIO (PatientRecord & ClinicalNotes) ---
app.get('/api/patients/:id/record', async (req: AuthRequest, res) => {
  const { id } = req.params;
  let record = await prisma.patientRecord.findFirst({ 
    where: { patientId: id, tenantId: req.tenantId } 
  });
  if (!record) {
    record = await prisma.patientRecord.create({ 
      data: { patientId: id, tenantId: req.tenantId! } 
    });
  }
  res.json(record);
});

app.put('/api/patients/:id/record', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { medicalAlerts, healthHistory, allergies, medications } = req.body;
  try {
    const updated = await prisma.patientRecord.upsert({
      where: { patientId: id },
      update: { medicalAlerts, healthHistory, allergies, medications },
      create: { 
        patientId: id, 
        medicalAlerts, 
        healthHistory, 
        allergies, 
        medications,
        tenantId: req.tenantId!
      }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update record' });
  }
});

app.get('/api/patients/:id/notes', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const notes = await prisma.clinicalNote.findMany({
    where: { patientId: id, tenantId: req.tenantId },
    orderBy: { date: 'desc' }
  });
  res.json(notes);
});

app.post('/api/patients/:id/notes', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { description, dentistName } = req.body;
  const note = await prisma.clinicalNote.create({
    data: { patientId: id, description, dentistName, tenantId: req.tenantId! }
  });
  res.json(note);
});

app.delete('/api/notes/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    await prisma.clinicalNote.deleteMany({ 
      where: { id, tenantId: req.tenantId } 
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// --- PERIODONTAL CHART ---
app.get('/api/patients/:id/periodontal', async (req: AuthRequest, res) => {
  try {
    const charts = await prisma.periodontalChart.findMany({
      where: { patientId: req.params.id, tenantId: req.tenantId },
      orderBy: { date: 'desc' }
    });
    res.json(charts);
  } catch (error) {
    console.error('GET PERIODONTAL ERROR:', error);
    res.status(500).json({ error: 'Erro ao buscar fichas periodontais' });
  }
});

app.post('/api/patients/:id/periodontal', async (req: AuthRequest, res) => {
  try {
    const { data } = req.body;
    const chart = await prisma.periodontalChart.create({
      data: {
        patientId: req.params.id,
        data: JSON.stringify(data),
        tenantId: req.tenantId!
      }
    });
    res.json(chart);
  } catch (error) {
    console.error('POST PERIODONTAL ERROR:', error);
    res.status(500).json({ error: 'Erro ao salvar ficha periodontal' });
  }
});

// --- DENTISTS ---
app.get('/api/dentists', async (req: AuthRequest, res) => {
  try {
    const dentists = await prisma.dentist.findMany({
      where: { tenantId: req.tenantId },
      orderBy: { name: 'asc' }
    });
    res.json(dentists);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dentists' });
  }
});

app.post('/api/dentists', async (req: AuthRequest, res) => {
  try {
    const { name, specialization, color } = req.body;
    const dentist = await prisma.dentist.create({
      data: { name, specialization, color, tenantId: req.tenantId! }
    });
    res.json(dentist);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create dentist' });
  }
});

app.put('/api/dentists/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, specialization, color } = req.body;
  try {
    await prisma.dentist.updateMany({
      where: { id, tenantId: req.tenantId },
      data: { name, specialization, color }
    });
    const updated = await prisma.dentist.findFirst({ where: { id, tenantId: req.tenantId } });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update dentist' });
  }
});

app.delete('/api/dentists/:id', async (req: AuthRequest, res) => {
  try {
    await prisma.dentist.deleteMany({ 
      where: { id: req.params.id, tenantId: req.tenantId } 
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete dentist' });
  }
});

// --- SCHEDULE BLOCKS ---
app.get('/api/schedule-blocks', async (req: AuthRequest, res) => {
  try {
    const blocks = await prisma.scheduleBlock.findMany({
      where: { tenantId: req.tenantId },
      include: { dentist: true }
    });
    res.json(blocks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedule blocks' });
  }
});

app.post('/api/schedule-blocks', async (req: AuthRequest, res) => {
  try {
    const { startTime, endTime, reason, dentistId } = req.body;
    const block = await prisma.scheduleBlock.create({
      data: {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        reason,
        dentistId,
        tenantId: req.tenantId!
      }
    });
    res.json(block);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create schedule block' });
  }
});

app.delete('/api/schedule-blocks/:id', async (req: AuthRequest, res) => {
  try {
    await prisma.scheduleBlock.deleteMany({ 
      where: { id: req.params.id, tenantId: req.tenantId } 
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete block' });
  }
});

// --- TRANSACTIONS & FINANCIAL ---
app.get('/api/transactions', async (req: AuthRequest, res) => {
  const { month, year } = req.query;
  try {
    const where: any = { tenantId: req.tenantId };
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

app.post('/api/transactions', async (req: AuthRequest, res) => {
  const { amount, method, patientId, procedureId, type } = req.body;
  try {
    const transaction = await prisma.transaction.create({
      data: { 
        amount, 
        method, 
        patientId, 
        procedureId, 
        type: type || 'INCOME',
        tenantId: req.tenantId!
      }
    });

    // If it's a payment for a procedure, update the procedure's paidAmount
    if (procedureId && type !== 'EXPENSE') {
      const proc = await prisma.procedure.findFirst({ 
        where: { id: procedureId, tenantId: req.tenantId } 
      });
      if (proc) {
        const newPaidAmount = proc.paidAmount + amount;
        let status = 'PARTIAL';
        if (newPaidAmount >= proc.price) status = 'PAID';
        
        await prisma.procedure.updateMany({
          where: { id: procedureId, tenantId: req.tenantId },
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
app.get('/api/patients/:id/attachments', async (req: AuthRequest, res) => {
  try {
    const attachments = await prisma.attachment.findMany({
      where: { patientId: req.params.id, tenantId: req.tenantId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(attachments);
  } catch (error) {
    console.error('GET ATTACHMENTS ERROR:', error);
    res.status(500).json({ error: 'Erro ao buscar anexos' });
  }
});

app.post('/api/patients/:id/attachments', async (req: AuthRequest, res) => {
  try {
    const { fileName, fileType, url, category } = req.body;
    const attachment = await prisma.attachment.create({
      data: {
        patientId: req.params.id,
        fileName,
        fileType,
        url,
        category,
        tenantId: req.tenantId!
      }
    });
    res.json(attachment);
  } catch (error) {
    console.error('POST ATTACHMENTS ERROR:', error);
    res.status(500).json({ error: 'Erro ao salvar anexo' });
  }
});

app.delete('/api/attachments/:id', async (req: AuthRequest, res) => {
  try {
    await prisma.attachment.deleteMany({
      where: { id: req.params.id, tenantId: req.tenantId }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('DELETE ATTACHMENT ERROR:', error);
    res.status(500).json({ error: 'Erro ao excluir anexo' });
  }
});

// --- SUPER ADMIN API ---
app.get('/api/admin/tenants', async (req: AuthRequest, res) => {
  if (req.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso negado. Apenas para Super Administradores.' });
  }

  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: {
            patients: true,
            appointments: true,
            users: true
          }
        },
        users: {
          where: { role: 'ADMIN' },
          select: { name: true, email: true }
        }
      }
    });
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar clínicas' });
  }
});

app.delete('/api/admin/tenants/:id', async (req: AuthRequest, res) => {
  if (req.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  try {
    await prisma.tenant.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir clínica' });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, async () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
