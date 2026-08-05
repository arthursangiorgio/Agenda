import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function testEmail() {
  console.log('Testing SMTP with:');
  console.log('User:', process.env.SMTP_USER);
  console.log('Pass:', process.env.SMTP_PASS ? '********' : 'NOT SET');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"AgendaPro" <${process.env.SMTP_USER}>`,
      to: 'arthursangiorgio@gmail.com',
      subject: 'Teste de Email AgendaPro',
      text: 'Se você recebeu isso, o envio está funcionando!',
    });
    console.log('Sucesso! Message ID:', info.messageId);
  } catch (err) {
    console.error('Erro ao enviar e-mail:');
    console.error(err);
  }
}

testEmail();
