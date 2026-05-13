import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class WhatsAppService {
  private client: Client;
  private qrCode: string | null = null;
  private status: 'INITIALIZING' | 'CONNECTED' | 'DISCONNECTED' = 'DISCONNECTED';

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
      }),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        handleSIGINT: false,
      }
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.client.on('qr', async (qr) => {
      console.log('WhatsApp QR Code generated');
      try {
        this.qrCode = await qrcode.toDataURL(qr);
        this.status = 'DISCONNECTED';
      } catch (err) {
        console.error('Failed to generate QR code data URL', err);
      }
    });

    this.client.on('ready', () => {
      console.log('WhatsApp Client is READY and Message Listener is active');
      this.qrCode = null;
      this.status = 'CONNECTED';
    });

    this.client.on('authenticated', () => {
      console.log('WhatsApp Authenticated');
      this.status = 'INITIALIZING';
    });

    this.client.on('auth_failure', () => {
      console.error('WhatsApp Auth Failure');
      this.status = 'DISCONNECTED';
    });

    this.client.on('disconnected', (reason) => {
      console.log('WhatsApp Disconnected:', reason);
      this.status = 'DISCONNECTED';
      this.qrCode = null;
      // Re-initialize if disconnected
      this.client.initialize();
    });

    this.client.on('message', async (msg) => {
      try {
        const text = msg.body.toLowerCase().trim();
        const from = msg.from;
        
        console.log(`[WHATSAPP-DEBUG] Mensagem recebida de ${from}: "${msg.body}"`);

        // Robust regex
        const confirmationRegex = /^(sim|ok|confirmar|confirmado|confirmada|positivo|pode marcar|com certeza|agendado)([\s!.,]|$)/i;
        const isConfirmation = confirmationRegex.test(text);

        if (isConfirmation) {
          const contact = await msg.getContact();
          console.log('[WHATSAPP-DEBUG] Detalhes do Contato:', {
            id: contact.id._serialized,
            number: contact.number,
            name: contact.name,
            pushname: contact.pushname,
            isUser: contact.isUser,
            isGroup: contact.isGroup
          });

          // In some cases, contact.number might be the LID. 
          // Let's try to get the number from the chat if it's a 1:1 chat
          const chat = await msg.getChat();
          console.log('[WHATSAPP-DEBUG] Detalhes do Chat:', {
            id: chat.id._serialized,
            isGroup: chat.isGroup,
            name: chat.name
          });

          // Try to get a number from any available string
          const possibleNumbers = [contact.number, contact.id.user, from.split('@')[0]];
          let foundAppointment = false;

          for (const num of possibleNumbers) {
            if (!num || num.length < 8) continue;
            const cleanNum = num.replace(/\D/g, '');
            const suffix8 = cleanNum.slice(-8);

            console.log(`[WHATSAPP-DEBUG] Tentando sufixo: ${suffix8} (origem: ${num})`);

            const patients = await prisma.patient.findMany({
              where: { phone: { contains: suffix8 } },
              select: { id: true, name: true }
            });

            if (patients.length > 0) {
              const patientIds = patients.map(p => p.id);
              const appointment = await prisma.appointment.findFirst({
                where: {
                  patientId: { in: patientIds },
                  status: 'SCHEDULED',
                  startTime: { gte: new Date(new Date().setHours(0, 0, 0, 0) - 1000 * 60 * 60 * 24) }
                },
                include: { patient: true },
                orderBy: { startTime: 'asc' }
              });

              if (appointment) {
                await prisma.appointment.update({
                  where: { id: appointment.id },
                  data: { status: 'CONFIRMED' }
                });
                console.log(`[WHATSAPP-SUCCESS] Consulta ${appointment.id} CONFIRMADA.`);
                await msg.reply(`Obrigado, ${appointment.patient.name.split(' ')[0]}! Sua consulta para o dia ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(appointment.startTime)} foi confirmada com sucesso! ✅`);
                foundAppointment = true;
                break;
              }
            }
          }

          if (!foundAppointment) {
            console.log('[WHATSAPP-DEBUG] Não foi possível encontrar um agendamento correspondente para nenhum dos números/IDs detectados.');
          }
        }
      } catch (err) {
        console.error('[WHATSAPP-ERROR] Erro:', err);
      }
    });
  }

  public initialize() {
    if (this.status === 'DISCONNECTED') {
      this.status = 'INITIALIZING';
      this.client.initialize().catch(err => {
        console.error('Failed to initialize WhatsApp client', err);
        this.status = 'DISCONNECTED';
      });
    }
  }

  public getStatus() {
    return this.status;
  }

  public getQrCode() {
    return this.qrCode;
  }

  public async logout() {
    try {
      await this.client.logout();
      this.status = 'DISCONNECTED';
      this.qrCode = null;
    } catch (err) {
      console.error('Logout failed', err);
    }
  }

  public async sendMessage(phone: string, message: string) {
    if (this.status !== 'CONNECTED') {
      throw new Error('WhatsApp not connected');
    }

    // Format phone: ensure it has 55 (Brazil) and remove non-digits
    let cleanPhone = phone.replace(/\D/g, '');
    
    // If it doesn't start with 55 and looks like a Brazilian number (10 or 11 digits)
    if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    }

    const chatId = `${cleanPhone}@c.us`;
    console.log(`Enviando mensagem para: ${chatId}`);
    
    return await this.client.sendMessage(chatId, message);
  }
}

export const whatsappService = new WhatsAppService();
