import nodemailer from 'nodemailer';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  public async sendNotification(to: string, subject: string, html: string) {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !to) {
      console.log('[EMAIL] Missing SMTP config or destination email, skipping email notification.');
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"AgendaPro" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
      });
      console.log(`[EMAIL] Notification sent to ${to}. Message ID: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('[EMAIL] Failed to send email:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
