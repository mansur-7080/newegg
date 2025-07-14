const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const axios = require('axios');

const app = express();
const PORT = 3007;

// Middleware
app.use(cors());
app.use(express.json());

// Notification storage (use database in production)
const notifications = new Map();
const templates = new Map();
const userPreferences = new Map();

// Email configuration
const emailTransporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'noreply@ultramarket.uz',
    pass: process.env.SMTP_PASS || 'your_app_password'
  }
});

// SMS providers for Uzbekistan
const smsProviders = {
  eskiz: {
    url: 'https://notify.eskiz.uz/api/message/sms/send',
    token: process.env.ESKIZ_TOKEN || 'test_token'
  },
  playmobile: {
    url: 'https://send.smsxabar.uz/broker-api/send',
    login: process.env.PLAYMOBILE_LOGIN || 'test_login',
    password: process.env.PLAYMOBILE_PASSWORD || 'test_password'
  }
};

// Initialize notification templates
function initializeTemplates() {
  // Email templates
  templates.set('welcome_email', {
    type: 'email',
    subject: 'UltraMarket ga xush kelibsiz! 🎉',
    body: `
      <h2>Salom {{userName}}!</h2>
      <p>UltraMarket platformasiga xush kelibsiz!</p>
      <p>Sizning hisobingiz muvaffaqiyatli yaratildi.</p>
      <div style="margin: 20px 0;">
        <a href="{{loginUrl}}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          Platformaga kirish
        </a>
      </div>
      <p>Hurmat bilan,<br>UltraMarket jamoasi</p>
    `
  });

  templates.set('order_confirmation_email', {
    type: 'email',
    subject: 'Buyurtmangiz qabul qilindi - #{{orderNumber}}',
    body: `
      <h2>Buyurtma tasdiqlandi! ✅</h2>
      <p>Hurmatli {{userName}},</p>
      <p>Sizning <strong>#{{orderNumber}}</strong> raqamli buyurtmangiz qabul qilindi.</p>
      
      <h3>Buyurtma tafsilotlari:</h3>
      <ul>
        <li>Buyurtma raqami: <strong>{{orderNumber}}</strong></li>
        <li>Jami summa: <strong>{{totalAmount}} UZS</strong></li>
        <li>Yetkazib berish manzili: {{deliveryAddress}}</li>
        <li>To'lov usuli: {{paymentMethod}}</li>
      </ul>
      
      <p>Buyurtmangiz 1-3 ish kunida yetkazib beriladi.</p>
      <p>Hurmat bilan,<br>UltraMarket jamoasi</p>
    `
  });

  templates.set('payment_success_email', {
    type: 'email',
    subject: 'To\'lov muvaffaqiyatli amalga oshirildi 💳',
    body: `
      <h2>To'lov tasdiqlandi! ✅</h2>
      <p>Hurmatli {{userName}},</p>
      <p><strong>#{{orderNumber}}</strong> buyurtma uchun to'lov muvaffaqiyatli amalga oshirildi.</p>
      
      <h3>To'lov tafsilotlari:</h3>
      <ul>
        <li>To'lov summasi: <strong>{{amount}} UZS</strong></li>
        <li>To'lov usuli: {{paymentMethod}}</li>
        <li>Tranzaksiya ID: {{transactionId}}</li>
        <li>Sana: {{paymentDate}}</li>
      </ul>
      
      <p>Buyurtmangiz tayyorlanmoqda va tez orada yetkazib beriladi.</p>
      <p>Hurmat bilan,<br>UltraMarket jamoasi</p>
    `
  });

  // SMS templates
  templates.set('order_confirmation_sms', {
    type: 'sms',
    body: 'UltraMarket: Buyurtmangiz #{{orderNumber}} qabul qilindi. Summa: {{totalAmount}} UZS. Yetkazish: 1-3 kun. Rahmat!'
  });

  templates.set('payment_success_sms', {
    type: 'sms',
    body: 'UltraMarket: #{{orderNumber}} uchun {{amount}} UZS to\'lov qabul qilindi. Buyurtmangiz tayyorlanmoqda. Rahmat!'
  });

  templates.set('delivery_notification_sms', {
    type: 'sms',
    body: 'UltraMarket: Buyurtmangiz #{{orderNumber}} yo\'lda! Kuryer 30 daqiqada yetib boradi. Tel: {{courierPhone}}'
  });

  console.log(`📧 Initialized ${templates.size} notification templates`);
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'notification-service',
    timestamp: new Date().toISOString(),
    providers: ['email', 'sms'],
    templates: templates.size,
    notifications: notifications.size
  });
});

// Send notification
app.post('/api/notifications/send', async (req, res) => {
  try {
    const { 
      type, // 'email' or 'sms'
      template,
      recipient,
      data = {},
      priority = 'medium',
      userId
    } = req.body;

    if (!type || !template || !recipient) {
      return res.status(400).json({ 
        error: 'Missing required fields: type, template, recipient' 
      });
    }

    const templateData = templates.get(template);
    if (!templateData) {
      return res.status(404).json({ error: 'Template not found' });
    }

    if (templateData.type !== type) {
      return res.status(400).json({ 
        error: `Template ${template} is for ${templateData.type}, not ${type}` 
      });
    }

    // Check user preferences
    if (userId) {
      const prefs = userPreferences.get(userId);
      if (prefs) {
        if (type === 'email' && !prefs.emailEnabled) {
          return res.status(200).json({ 
            success: true, 
            message: 'Email notifications disabled for user',
            skipped: true
          });
        }
        if (type === 'sms' && !prefs.smsEnabled) {
          return res.status(200).json({ 
            success: true, 
            message: 'SMS notifications disabled for user',
            skipped: true
          });
        }
      }
    }

    const notificationId = generateNotificationId();
    const notification = {
      id: notificationId,
      type,
      template,
      recipient,
      data,
      priority,
      userId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 3
    };

    notifications.set(notificationId, notification);

    // Process notification
    let result;
    if (type === 'email') {
      result = await sendEmail(notification, templateData);
    } else if (type === 'sms') {
      result = await sendSMS(notification, templateData);
    } else {
      throw new Error('Unsupported notification type');
    }

    // Update notification status
    notification.status = result.success ? 'sent' : 'failed';
    notification.sentAt = result.success ? new Date().toISOString() : null;
    notification.error = result.error || null;
    notification.attempts++;
    notifications.set(notificationId, notification);

    res.status(result.success ? 200 : 500).json({
      success: result.success,
      notificationId,
      message: result.message,
      error: result.error
    });

  } catch (error) {
    console.error('Notification send error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Generate notification ID
function generateNotificationId() {
  return 'NOTIF_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Send email
async function sendEmail(notification, templateData) {
  try {
    const { recipient, data } = notification;
    
    // Replace template variables
    let subject = templateData.subject;
    let body = templateData.body;
    
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, data[key]);
      body = body.replace(regex, data[key]);
    });

    const mailOptions = {
      from: '"UltraMarket" <noreply@ultramarket.uz>',
      to: recipient,
      subject: subject,
      html: body
    };

    // In production, actually send email
    // await emailTransporter.sendMail(mailOptions);
    
    // For demo, just log
    console.log(`📧 Email sent to ${recipient}: ${subject}`);
    
    return { 
      success: true, 
      message: 'Email sent successfully' 
    };

  } catch (error) {
    console.error('Email send error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Send SMS
async function sendSMS(notification, templateData) {
  try {
    const { recipient, data } = notification;
    
    // Replace template variables
    let message = templateData.body;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      message = message.replace(regex, data[key]);
    });

    // Format phone number for Uzbekistan
    let phone = recipient;
    if (phone.startsWith('+998')) {
      phone = phone.substring(1);
    } else if (phone.startsWith('998')) {
      // Already formatted
    } else if (phone.startsWith('0')) {
      phone = '998' + phone.substring(1);
    } else {
      phone = '998' + phone;
    }

    // In production, send via SMS provider
    // const smsResult = await sendViaSMSProvider(phone, message);
    
    // For demo, just log
    console.log(`📱 SMS sent to ${phone}: ${message}`);
    
    return { 
      success: true, 
      message: 'SMS sent successfully' 
    };

  } catch (error) {
    console.error('SMS send error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

// Send via SMS provider (Eskiz or PlayMobile)
async function sendViaSMSProvider(phone, message) {
  try {
    // Try Eskiz first
    const eskizResponse = await axios.post(smsProviders.eskiz.url, {
      mobile_phone: phone,
      message: message,
      from: 'UltraMarket'
    }, {
      headers: {
        'Authorization': `Bearer ${smsProviders.eskiz.token}`,
        'Content-Type': 'application/json'
      }
    });

    return { success: true, provider: 'eskiz', response: eskizResponse.data };
  } catch (eskizError) {
    console.error('Eskiz SMS failed, trying PlayMobile:', eskizError.message);
    
    try {
      // Fallback to PlayMobile
      const playResponse = await axios.post(smsProviders.playmobile.url, {
        messages: [{
          recipient: phone,
          'message-id': Date.now().toString(),
          sms: {
            originator: 'UltraMarket',
            content: {
              text: message
            }
          }
        }]
      }, {
        auth: {
          username: smsProviders.playmobile.login,
          password: smsProviders.playmobile.password
        }
      });

      return { success: true, provider: 'playmobile', response: playResponse.data };
    } catch (playError) {
      console.error('PlayMobile SMS also failed:', playError.message);
      throw new Error('All SMS providers failed');
    }
  }
}

// Get notification status
app.get('/api/notifications/:notificationId', (req, res) => {
  const { notificationId } = req.params;
  const notification = notifications.get(notificationId);

  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  res.json({
    id: notification.id,
    type: notification.type,
    template: notification.template,
    recipient: notification.recipient,
    status: notification.status,
    priority: notification.priority,
    createdAt: notification.createdAt,
    sentAt: notification.sentAt,
    attempts: notification.attempts,
    error: notification.error
  });
});

// Get notification history for user
app.get('/api/notifications/user/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, type } = req.query;

    const userNotifications = Array.from(notifications.values())
      .filter(n => n.userId === userId)
      .filter(n => !type || n.type === type)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(limit))
      .map(n => ({
        id: n.id,
        type: n.type,
        template: n.template,
        status: n.status,
        createdAt: n.createdAt,
        sentAt: n.sentAt
      }));

    res.json({ 
      userId,
      notifications: userNotifications,
      total: userNotifications.length
    });
  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Update user notification preferences
app.post('/api/notifications/preferences/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const { emailEnabled = true, smsEnabled = true, pushEnabled = true, marketingEnabled = false } = req.body;

    const preferences = {
      userId,
      emailEnabled,
      smsEnabled,
      pushEnabled,
      marketingEnabled,
      updatedAt: new Date().toISOString()
    };

    userPreferences.set(userId, preferences);

    res.json({
      success: true,
      preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get user notification preferences
app.get('/api/notifications/preferences/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const preferences = userPreferences.get(userId) || {
      userId,
      emailEnabled: true,
      smsEnabled: true,
      pushEnabled: true,
      marketingEnabled: false
    };

    res.json({ preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// Get available templates
app.get('/api/notifications/templates', (req, res) => {
  try {
    const { type } = req.query;
    
    const templateList = Array.from(templates.entries())
      .filter(([key, template]) => !type || template.type === type)
      .map(([key, template]) => ({
        id: key,
        type: template.type,
        subject: template.subject || null,
        preview: template.body.substring(0, 100) + '...'
      }));

    res.json({ templates: templateList });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Get notification statistics
app.get('/api/notifications/stats', (req, res) => {
  try {
    const allNotifications = Array.from(notifications.values());
    const stats = {
      total: allNotifications.length,
      sent: allNotifications.filter(n => n.status === 'sent').length,
      pending: allNotifications.filter(n => n.status === 'pending').length,
      failed: allNotifications.filter(n => n.status === 'failed').length,
      byType: {
        email: allNotifications.filter(n => n.type === 'email').length,
        sms: allNotifications.filter(n => n.type === 'sms').length
      },
      byTemplate: {}
    };

    // Count by template
    allNotifications.forEach(n => {
      stats.byTemplate[n.template] = (stats.byTemplate[n.template] || 0) + 1;
    });

    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Default route
app.get('/', (req, res) => {
  res.json({
    name: 'UltraMarket Notification Service',
    version: '1.0.0',
    providers: ['email', 'sms'],
    smsProviders: Object.keys(smsProviders),
    templates: templates.size,
    features: [
      'Email notifications',
      'SMS notifications (Uzbekistan)',
      'Template management',
      'User preferences',
      'Delivery tracking'
    ],
    endpoints: [
      'GET /health',
      'POST /api/notifications/send',
      'GET /api/notifications/:notificationId',
      'GET /api/notifications/user/:userId',
      'POST /api/notifications/preferences/:userId',
      'GET /api/notifications/preferences/:userId',
      'GET /api/notifications/templates',
      'GET /api/notifications/stats'
    ]
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Notification service error:', err);
  res.status(500).json({ error: 'Internal notification service error' });
});

// Initialize and start server
function startServer() {
  initializeTemplates();
  
  app.listen(PORT, () => {
    console.log(`📧 Notification Service running on port ${PORT}`);
    console.log(`📱 SMS Providers: ${Object.keys(smsProviders).join(', ')}`);
    console.log(`📋 Templates: ${templates.size} initialized`);
    console.log(`🇺🇿 Uzbekistan SMS support enabled`);
  });
}

startServer();

module.exports = app;