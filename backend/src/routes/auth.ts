import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { emailService } from '../services/emailService';
import { whatsappService } from '../whatsapp';

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-123';

// Register a new Tenant + Admin User
router.post('/register', async (req, res) => {
  const { companyName, slug, name, email, password } = req.body;

  try {
    // Check if slug is already taken
    const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      return res.status(400).json({ error: 'Company slug already in use' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Tenant and User in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const licenseExpiresAt = new Date();
      licenseExpiresAt.setDate(licenseExpiresAt.getDate() + 30);

      const tenant = await tx.tenant.create({
        data: {
          name: companyName,
          slug: slug.toLowerCase().replace(/\s+/g, '-'),
          licenseExpiresAt
        }
      });

      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          tenantId: tenant.id,
          role: 'ADMIN'
        }
      });

      return { tenant, user };
    });
    
    // Async Notifications
    (async () => {
      try {
        const adminEmail = await prisma.systemSetting.findUnique({ where: { key: 'admin_notification_email' } });
        const adminPhone = await prisma.systemSetting.findUnique({ where: { key: 'admin_notification_phone' } });
        
        const notificationText = `Novo cadastro no AgendaPro!\n\nClínica: ${result.tenant.name}\nResponsável: ${result.user.name}\nE-mail: ${result.user.email}`;
        
        if (adminEmail && adminEmail.value) {
          const htmlContent = `<h2>Novo cadastro no AgendaPro!</h2>
            <p><strong>Clínica:</strong> ${result.tenant.name}</p>
            <p><strong>Responsável:</strong> ${result.user.name}</p>
            <p><strong>E-mail:</strong> ${result.user.email}</p>`;
          await emailService.sendNotification(adminEmail.value, 'Novo Cadastro no Sistema', htmlContent);
        }
        
        if (adminPhone && adminPhone.value) {
          try {
            await whatsappService.sendMessage(adminPhone.value, notificationText);
          } catch(e) {
            console.log('[WHATSAPP] Falha ao notificar admin:', e);
          }
        }
      } catch (err) {
        console.error('Falha ao enviar notificações de cadastro:', err);
      }
    })();

    res.json({ success: true, company: result.tenant.name });
  } catch (error: any) {
    console.error('Registration error:', error);
    if (error.code === 'P2002') {
      const target = error.meta?.target as string[];
      if (target?.includes('email')) {
        return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
      }
      if (target?.includes('slug')) {
        return res.status(400).json({ error: 'Este identificador já está em uso.' });
      }
    }
    res.status(500).json({ error: 'Falha ao registrar clínica.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, tenantId: user.tenantId, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        companyName: user.tenant.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
