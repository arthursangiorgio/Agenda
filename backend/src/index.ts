import express, { Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { whatsappService } from './whatsapp';
import authRoutes from './routes/auth';
import licensingRoutes from './routes/licensing';
import webhookRoutes from './routes/webhooks';
import { authMiddleware, AuthRequest } from './middleware/auth';
import { loadEnv } from './config';

// Load environment variables from .env
loadEnv();

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/licensing', licensingRoutes);

// Protected Routes Middleware (Checks JWT for all requests under /api, except public routes)
app.use('/api', (req: any, res, next) => {
  // Skip auth for public webhooks and simulated checkout
  if (req.path.includes('/webhooks/') || req.path.includes('/licensing/mock-gate')) {
    return next();
  }
  authMiddleware(req, res, next);
});

// Licensing Check Middleware for protected routes
const licenseCheckMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.role === 'SUPER_ADMIN') {
    return next(); // Super admins bypass licensing checks
  }
  
  if (!req.tenantId) {
    return next();
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      select: { licenseExpiresAt: true }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const now = new Date();
    if (new Date(tenant.licenseExpiresAt) < now) {
      return res.status(403).json({ error: 'LICENSE_EXPIRED', licenseExpiresAt: tenant.licenseExpiresAt });
    }

    next();
  } catch (err) {
    console.error('License check error:', err);
    res.status(500).json({ error: 'Internal license check error' });
  }
};

// Check license for all protected routes EXCEPT licensing endpoints (status, generate link)
app.use('/api', (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/licensing/')) {
    return next(); // Bypasses licensing endpoints so user can view expiration page and click pay
  }
  licenseCheckMiddleware(req, res, next);
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
        dentist: true,
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

    const updated = await prisma.appointment.findFirst({ 
      where: { id, tenantId: req.tenantId },
      include: { patient: true, dentist: true, procedure: true }
    });
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

app.delete('/api/transactions/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { id, tenantId: req.tenantId }
    });

    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    // If it's linked to a procedure, we might need to adjust the procedure's paidAmount
    if (transaction.procedureId && transaction.type !== 'EXPENSE') {
      const proc = await prisma.procedure.findFirst({
        where: { id: transaction.procedureId, tenantId: req.tenantId }
      });
      if (proc) {
        const newPaidAmount = Math.max(0, proc.paidAmount - transaction.amount);
        let status = 'PENDING';
        if (newPaidAmount > 0 && newPaidAmount < proc.price) status = 'PARTIAL';
        if (newPaidAmount >= proc.price) status = 'PAID';

        await prisma.procedure.updateMany({
          where: { id: transaction.procedureId, tenantId: req.tenantId },
          data: { paidAmount: newPaidAmount, paymentStatus: status }
        });
      }
    }

    await prisma.transaction.deleteMany({
      where: { id, tenantId: req.tenantId }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('DELETE TRANSACTION ERROR:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
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

app.put('/api/admin/tenants/:id/license', async (req: AuthRequest, res) => {
  if (req.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso negado. Apenas para Super Administradores.' });
  }

  const { licenseExpiresAt } = req.body;
  if (!licenseExpiresAt) {
    return res.status(400).json({ error: 'Data de expiração é obrigatória.' });
  }

  try {
    const updatedTenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: {
        licenseExpiresAt: new Date(licenseExpiresAt)
      }
    });

    console.log(`[ADMIN] Expiration date manually updated for tenant ${updatedTenant.name} (${updatedTenant.id}) to ${updatedTenant.licenseExpiresAt}`);
    res.json({ success: true, tenant: updatedTenant });
  } catch (error) {
    console.error('Error manually updating clinic license:', error);
    res.status(500).json({ error: 'Erro ao atualizar vencimento da licença.' });
  }
});

app.get('/api/admin/payments', async (req: AuthRequest, res) => {
  if (req.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso negado. Apenas para Super Administradores.' });
  }

  try {
    const payments = await prisma.processedPayment.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const tenants = await prisma.tenant.findMany({
      select: { id: true, name: true }
    });

    const tenantMap = tenants.reduce((acc, t) => {
      acc[t.id] = t.name;
      return acc;
    }, {} as Record<string, string>);

    const detailedPayments = payments.map(p => ({
      ...p,
      tenantName: tenantMap[p.tenantId] || 'Clínica Excluída'
    }));

    res.json(detailedPayments);
  } catch (error) {
    console.error('Error fetching admin payments:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico de pagamentos.' });
  }
});



// Helper functions for dynamic settings
export async function getSystemSetting(key: string, defaultValue: string): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    return setting ? setting.value : defaultValue;
  } catch (err) {
    return defaultValue;
  }
}

export async function setSystemSetting(key: string, value: string): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
}

// Settings endpoints for Super Admin
app.get('/api/admin/settings', async (req: AuthRequest, res) => {
  if (req.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  try {
    const priceStr = await getSystemSetting('subscription_price', '99.90');
    const daysStr = await getSystemSetting('subscription_days', '30');
    res.json({
      subscriptionPrice: parseFloat(priceStr),
      subscriptionDays: parseInt(daysStr, 10)
    });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao buscar configurações' });
  }
});

app.put('/api/admin/settings', async (req: AuthRequest, res) => {
  if (req.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso negado.' });
  }

  const { subscriptionPrice, subscriptionDays } = req.body;
  try {
    await setSystemSetting('subscription_price', String(subscriptionPrice));
    await setSystemSetting('subscription_days', String(subscriptionDays));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Erro ao salvar configurações' });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, async () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
