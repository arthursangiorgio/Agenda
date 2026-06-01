import express from 'express';
import prisma from '../db';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import https from 'https';

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

// Helper to make Asaas API requests using native Node https module
function makeAsaasRequest(method: string, path: string, body?: any): Promise<any> {
  const token = process.env.ASAAS_API_KEY;
  const isSandbox = process.env.ASAAS_ENV !== 'production';
  const host = isSandbox ? 'sandbox.asaas.com' : 'api.asaas.com';

  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : '';
    const options = {
      hostname: host,
      port: 443,
      path: `/v3${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'access_token': token || '',
        'User-Agent': 'AgendaPro',
        ...(body ? { 'Content-Length': Buffer.byteLength(dataString) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          resolve(parsed);
        } catch (e) {
          resolve({ error: 'Failed to parse Asaas response', raw: responseBody });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(dataString);
    }
    req.end();
  });
}

// GET /api/licensing/status - Fetch current license details
router.get('/status', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.tenantId) {
    return res.status(400).json({ error: 'Tenant ID required' });
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId },
      select: {
        licenseExpiresAt: true,
        lastPaymentLinkUrl: true,
        lastPaymentLinkId: true,
        name: true
      }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const now = new Date();
    const expiresAt = new Date(tenant.licenseExpiresAt);
    const isExpired = expiresAt < now;
    const diffTime = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    const priceStr = await getSetting('subscription_price', '99.90');
    const daysStr = await getSetting('subscription_days', '30');

    res.json({
      licenseExpiresAt: tenant.licenseExpiresAt,
      isExpired,
      daysRemaining,
      lastPaymentLinkUrl: tenant.lastPaymentLinkUrl,
      lastPaymentLinkId: tenant.lastPaymentLinkId,
      companyName: tenant.name,
      subscriptionPrice: parseFloat(priceStr),
      subscriptionDays: parseInt(daysStr, 10)
    });
  } catch (error) {
    console.error('Error fetching license status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/licensing/generate-link - Generate a payment link on Asaas or mock portal
router.post('/generate-link', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.tenantId) {
    return res.status(400).json({ error: 'Tenant ID required' });
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.tenantId }
    });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Determine if we have a real Asaas token configured
    const hasApiKey = process.env.ASAAS_API_KEY && 
                      process.env.ASAAS_API_KEY !== 'your_asaas_api_key_here' && 
                      process.env.ASAAS_API_KEY.trim() !== '';
    
    let paymentLinkId = '';
    let paymentLinkUrl = '';

    // Fetch dynamic pricing settings
    const priceStr = await getSetting('subscription_price', '99.90');
    const daysStr = await getSetting('subscription_days', '30');
    const price = parseFloat(priceStr);
    const days = parseInt(daysStr, 10);

    if (hasApiKey) {
      // Create real Asaas payment link
      const response = await makeAsaasRequest('POST', '/paymentLinks', {
        name: `Licença de ${days} dias - ${tenant.name}`,
        chargeType: 'DETACHED',
        billingType: 'UNDEFINED',
        value: price,
        notificationEnabled: true,
        dueDateLimitDays: 15
      });

      if (response.errors || response.error || !response.id) {
        console.error('Asaas API Error:', response);
        return res.status(500).json({ error: 'Failed to generate payment link via Asaas', details: response });
      }

      paymentLinkId = response.id;
      paymentLinkUrl = response.url;
    } else {
      // Mock mode
      paymentLinkId = 'mock_link_' + Math.random().toString(36).substring(2, 11);
      paymentLinkUrl = `http://localhost:3002/api/licensing/mock-gate?tenantId=${tenant.id}&paymentLinkId=${paymentLinkId}`;
    }

    // Save to database
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        lastPaymentLinkId: paymentLinkId,
        lastPaymentLinkUrl: paymentLinkUrl
      }
    });

    res.json({
      success: true,
      paymentLinkId,
      paymentLinkUrl
    });
  } catch (error) {
    console.error('Error generating payment link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/licensing/mock-gate - Serves a public HTML page to simulate Asaas Checkout
router.get('/mock-gate', async (req, res) => {
  const { tenantId, paymentLinkId } = req.query;

  let tenantName = 'Clínica';
  if (tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId as string },
      select: { name: true }
    });
    if (tenant) tenantName = tenant.name;
  }

  // Fetch dynamic settings
  const priceStr = await getSetting('subscription_price', '99.90');
  const daysStr = await getSetting('subscription_days', '30');
  const price = parseFloat(priceStr);
  const days = parseInt(daysStr, 10);

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Simulador de Pagamento Asaas</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      color: #f8fafc;
      padding: 1rem;
    }
    .card {
      background: rgba(30, 41, 59, 0.7);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 2.5rem;
      border-radius: 1.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    .logo-container {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }
    .logo-box {
      background: #3b82f6;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: white;
    }
    .logo-text {
      font-weight: 800;
      font-size: 1.25rem;
      color: #3b82f6;
      letter-spacing: -0.025em;
    }
    .badge {
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #60a5fa;
      padding: 0.35rem 1rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      display: inline-block;
      margin-bottom: 1.5rem;
      letter-spacing: 0.05em;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 800;
      color: white;
      margin: 0 0 0.5rem 0;
      letter-spacing: -0.025em;
    }
    p {
      color: #94a3b8;
      font-size: 0.95rem;
      line-height: 1.6;
      margin: 0 0 2rem 0;
    }
    .info {
      background: rgba(15, 23, 42, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 1.25rem;
      border-radius: 1rem;
      text-align: left;
      margin-bottom: 2rem;
      font-size: 0.9rem;
      color: #cbd5e1;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }
    .info-row:last-child {
      margin-bottom: 0;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    .info-label {
      color: #64748b;
      font-weight: 500;
    }
    .info-value {
      font-weight: 600;
      color: #f8fafc;
    }
    .price-value {
      color: #10b981;
      font-weight: 700;
      font-size: 1.1rem;
    }
    .btn {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      border: none;
      padding: 0.85rem 1.5rem;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 0.75rem;
      cursor: pointer;
      width: 100%;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(37, 99, 235, 0.3);
    }
    .btn:active {
      transform: translateY(0);
    }
    .btn:disabled {
      background: #475569;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
    .success-text {
      color: #34d399;
      font-weight: 600;
      display: none;
      margin-top: 1.5rem;
      font-size: 1rem;
      animation: fadeIn 0.5s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-container">
      <div class="logo-box">A</div>
      <div class="logo-text">asaas</div>
    </div>
    <br>
    <span class="badge">Simulador de Checkout</span>
    <h1>Confirmar Pagamento</h1>
    <p>Simule a aprovação da assinatura do sistema AgendaPro para liberar sua clínica.</p>
    
    <div class="info">
      <div class="info-row">
        <span class="info-label">Produto</span>
        <span class="info-value">Assinatura ${days} dias - AgendaPro</span>
      </div>
      <div class="info-row">
        <span class="info-label">Clínica</span>
        <span class="info-value">${tenantName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Link ID</span>
        <span class="info-value">${paymentLinkId || 'N/A'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Total</span>
        <span class="price-value">R$ ${price.toFixed(2)}</span>
      </div>
    </div>
    
    <button class="btn" id="pay-btn">Confirmar Pagamento Simulador</button>
    <div class="success-text" id="success-msg">
      ✅ Pagamento processado com sucesso!<br>
      Redirecionando de volta ao sistema...
    </div>
  </div>
  
  <script>
    const tenantId = "${tenantId || ''}";
    const paymentLinkId = "${paymentLinkId || ''}";
    
    document.getElementById('pay-btn').addEventListener('click', async () => {
      document.getElementById('pay-btn').disabled = true;
      document.getElementById('pay-btn').innerText = 'Processando pagamento...';
      
      try {
        const response = await fetch('/api/webhooks/asaas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            event: 'PAYMENT_RECEIVED',
            payment: {
              id: 'mock_pay_' + Math.random().toString(36).substring(2, 11),
              value: ${price},
              paymentLink: paymentLinkId
            }
          })
        });
        
        const result = await response.json();
        if (result.success) {
          document.getElementById('pay-btn').style.display = 'none';
          document.getElementById('success-msg').style.display = 'block';
          setTimeout(() => {
            window.location.href = 'http://localhost:5173/settings';
          }, 2000);
        } else {
          alert('Erro ao processar simulação de pagamento: ' + JSON.stringify(result));
          document.getElementById('pay-btn').disabled = false;
          document.getElementById('pay-btn').innerText = 'Confirmar Pagamento Simulador';
        }
      } catch (err) {
        alert('Erro ao conectar com o backend: ' + err.message);
        document.getElementById('pay-btn').disabled = false;
        document.getElementById('pay-btn').innerText = 'Confirmar Pagamento Simulador';
      }
    });
  </script>
</body>
</html>
  `;
  res.send(html);
});

export default router;
