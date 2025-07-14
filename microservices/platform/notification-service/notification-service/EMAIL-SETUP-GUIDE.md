# 📧 UltraMarket Email Service - Setup Guide

Professional email configuration uchun to'liq qo'llanma.

## 🎯 **Quick Start**

### 1. **Gmail bilan tez setup (Development uchun)**

```bash
# 1. .env faylini yarating
cp .env.example .env

# 2. Gmail credentials qo'shing
EMAIL_PROVIDER=gmail
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=xxxx_xxxx_xxxx_xxxx

# 3. Serviceni ishga tushiring
npm run dev

# 4. Connection test qiling
curl http://localhost:3008/api/email/test-connection
```

---

## 📋 **Email Providers**

### **Option 1: Gmail (Development)**

✅ **Afzalliklari:**
- Bepul
- Tez setup
- Reliable delivery

❌ **Kamchiliklari:**  
- Kunlik limit (500 email/day)
- Gmail branding

**Setup:**

1. **2FA enable qiling:**
   - Gmail Settings → Security → 2-Step Verification

2. **App Password yarating:**
   - Google Account → Security → App passwords
   - Select "Mail" → Generate
   - 16 ta belgili parolni copy qiling

3. **Environment variables:**
   ```bash
   EMAIL_PROVIDER=gmail
   GMAIL_USER=your_email@gmail.com
   GMAIL_APP_PASSWORD=abcd_efgh_ijkl_mnop
   ```

### **Option 2: SendGrid (Production)**

✅ **Afzalliklari:**
- Professional service
- Good analytics
- High delivery rate
- 100 emails/day free

**Setup:**

1. **SendGrid account yarating:**
   - https://sendgrid.com/pricing/
   - Free plan yetarli development uchun

2. **API Key yarating:**
   - Dashboard → API Keys → Create API Key
   - Full Access bergan key yarating

3. **Environment variables:**
   ```bash
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=SG.your_api_key_here
   ```

### **Option 3: Mailgun (Production)**

✅ **Afzalliklari:**
- Reliable delivery
- Good documentation
- Uzbekistan supported

**Setup:**

1. **Mailgun account:**
   - https://www.mailgun.com/
   - Domain verification required

2. **Credentials oling:**
   - Dashboard → Domains → Your domain
   - API Key va Domain name copy qiling

3. **Environment variables:**
   ```bash
   EMAIL_PROVIDER=mailgun
   MAILGUN_DOMAIN=yourdomain.com
   MAILGUN_API_KEY=your_api_key
   ```

### **Option 4: Custom SMTP**

Har qanday SMTP provider uchun:

```bash
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_username
SMTP_PASSWORD=your_password
```

---

## 🔧 **Configuration**

### **1. Basic Configuration**

```bash
# Provider selection
EMAIL_PROVIDER=gmail

# From address configuration
EMAIL_FROM_NAME=UltraMarket
EMAIL_FROM_ADDRESS=noreply@ultramarket.uz
EMAIL_REPLY_TO=support@ultramarket.uz

# Language for templates
DEFAULT_LANGUAGE=uz
```

### **2. Templates Configuration**

Built-in templates:
- `welcome` - Yangi user registration
- `orderConfirmation` - Order tasdiqlash
- `passwordReset` - Parol tiklash

Custom template qo'shish uchun `EmailService.renderTemplate()` methodini o'zgartiring.

---

## 🧪 **Testing**

### **1. Connection Test**

```bash
curl http://localhost:3008/api/email/test-connection
```

Response:
```json
{
  "success": true,
  "data": {
    "provider": "gmail",
    "from": "UltraMarket <noreply@ultramarket.uz>",
    "status": "connected",
    "lastTest": "2024-01-15T10:30:00.000Z"
  }
}
```

### **2. Test Email Yuborish**

```bash
curl -X POST http://localhost:3008/api/email/test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "message": "Bu test email"
  }'
```

### **3. Welcome Email Test**

```bash
curl -X POST http://localhost:3008/api/email/welcome \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "name": "John Doe",
    "verificationUrl": "https://ultramarket.uz/verify/123"
  }'
```

### **4. Order Confirmation Test**

```bash
curl -X POST http://localhost:3008/api/email/order-confirmation \
  -H "Content-Type: application/json" \
  -d '{
    "to": "customer@example.com",
    "customerName": "Ali Valiyev",
    "orderNumber": "UM-2024-001",
    "totalAmount": 150000,
    "deliveryAddress": "Toshkent, Chilonzor tumani"
  }'
```

---

## 📊 **Monitoring**

### **Email Statistics**

```bash
curl http://localhost:3008/api/email/stats
```

Response:
```json
{
  "success": true,
  "data": {
    "totalSent": 1500,
    "delivered": 1450,
    "bounced": 30,
    "failed": 20,
    "deliveryRate": 96.7
  }
}
```

### **Templates List**

```bash
curl http://localhost:3008/api/email/templates
```

---

## 🔐 **Security Best Practices**

### **1. Environment Variables**

```bash
# ❌ NEVER commit these to git:
GMAIL_APP_PASSWORD=real_password
SENDGRID_API_KEY=real_api_key

# ✅ Add to .gitignore:
.env
.env.local
.env.production
```

### **2. Rate Limiting**

Built-in rate limiting:
- Gmail: 5 emails/second
- SendGrid: Default provider limits
- Bulk emails: 10 per batch with delays

### **3. Error Handling**

```javascript
try {
  await emailService.sendEmail(options);
} catch (error) {
  // Errors are logged automatically
  // Handle gracefully in your app
  console.error('Email failed:', error.message);
}
```

---

## 🚀 **Production Setup**

### **1. Domain Setup**

```bash
# Custom domain for emails
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_REPLY_TO=support@yourdomain.com
```

### **2. DNS Configuration**

SendGrid/Mailgun uchun DNS records:
- SPF record
- DKIM record  
- DMARC record

### **3. Monitoring**

Production monitoring:
- Email delivery rates
- Bounce rates
- Complaint rates
- Response times

---

## 🐛 **Troubleshooting**

### **Gmail Issues**

**Error: "Invalid credentials"**
- 2FA enabled ekanligini check qiling
- App Password ishlatayotganingizni tasdiqlang (regular password emas)
- Gmail account blocked bo'lmaganligini check qiling

**Error: "Less secure app access"**
- App Password ishlatish kerak, "Less secure apps" emas

### **SendGrid Issues**

**Error: "API key not found"**
- API key to'g'ri copy qilinganligini check qiling
- Full Access permission berilganligini tasdiqlang

### **SMTP Issues**

**Error: "Connection timeout"**
- Host va port to'g'riligini check qiling
- Firewall/proxy muammolari
- TLS/SSL configuration

### **General Issues**

**Emails not delivered:**
- Spam folder check qiling
- Email provider limits
- DNS configuration (production)

**Connection test fails:**
- Environment variables to'g'riligini check qiling
- Network connectivity
- Service provider status

---

## 📞 **Support**

Issues bo'lsa:

1. **Logs check qiling:**
   ```bash
   tail -f logs/combined.log
   ```

2. **Connection test:**
   ```bash
   curl http://localhost:3008/api/email/test-connection
   ```

3. **Environment check:**
   ```bash
   echo $EMAIL_PROVIDER
   echo $GMAIL_USER  # yoki boshqa provider
   ```

4. **Service restart:**
   ```bash
   npm run dev
   ```

---

**Email service endi to'liq professional va production-ready!** 📧✅