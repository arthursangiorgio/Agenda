import express from 'express';
import prisma from '../db';

const router = express.Router();

// Helper to get settings dynamically
async function getSetting(key: string, defaultValue: string): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key } });
    return setting ? setting.value : defaultValue;
  } catch (err) {
    return defaultValue;
  }
}

// POST /api/webhooks/asaas - public webhook receiver
router.post('/asaas', async (req, res) => {
  const { event, payment } = req.body;

  console.log(`[ASAAS WEBHOOK] Event received: ${event}`, payment);

  if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
    const paymentLinkId = payment.paymentLink;
    const paymentId = payment.id;
    const amount = payment.value;

    if (!paymentLinkId) {
      return res.json({ success: true, message: 'No paymentLink associated' });
    }

    try {
      // Prevent double processing
      const alreadyProcessed = await prisma.processedPayment.findUnique({
        where: { id: paymentId }
      });

      if (alreadyProcessed) {
        return res.json({ success: true, message: 'Payment already processed' });
      }

      // Find tenant with this paymentLinkId
      const tenant = await prisma.tenant.findFirst({
        where: { lastPaymentLinkId: paymentLinkId }
      });

      if (!tenant) {
        console.warn(`[ASAAS WEBHOOK] Tenant not found for paymentLink ${paymentLinkId}`);
        return res.status(404).json({ error: 'Tenant not found for this payment link' });
      }

      // Calculate new expiration date
      const now = new Date();
      let newExpiresAt = new Date(tenant.licenseExpiresAt);
      
      // If the current license is already expired, extend starting from now
      if (newExpiresAt < now) {
        newExpiresAt = now;
      }
      
      // Add dynamic days from system settings
      const daysStr = await getSetting('subscription_days', '30');
      const days = parseInt(daysStr, 10);
      newExpiresAt.setDate(newExpiresAt.getDate() + days);

      // Perform transaction to extend license and record payment
      await prisma.$transaction([
        prisma.tenant.update({
          where: { id: tenant.id },
          data: { licenseExpiresAt: newExpiresAt }
        }),
        prisma.processedPayment.create({
          data: {
            id: paymentId,
            tenantId: tenant.id,
            amount: amount
          }
        })
      ]);

      console.log(`[ASAAS WEBHOOK] Extended license for Tenant ${tenant.name} (${tenant.id}) to ${newExpiresAt}`);
      res.json({ success: true, message: 'License extended successfully' });
    } catch (error) {
      console.error('[ASAAS WEBHOOK] Error processing payment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.json({ success: true, message: 'Event ignored' });
  }
});

export default router;
