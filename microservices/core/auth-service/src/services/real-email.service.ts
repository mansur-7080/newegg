import * as nodemailer from 'nodemailer';
import { logger } from '../../../../../libs/shared/src/logging/logger';
import { JWTService } from './jwt.service';

export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent: string;
}

export interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export class RealEmailService {
  private transporter: nodemailer.Transporter;
  private jwtService: JWTService;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.jwtService = new JWTService();
    this.fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@ultramarket.uz';
    this.fromName = process.env.SMTP_FROM_NAME || 'UltraMarket';

    // Configure SMTP transporter
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // Verify SMTP connection
    this.verifyConnection();
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully');
    } catch (error) {
      logger.error('SMTP connection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
      });
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, firstName: string): Promise<void> {
    try {
      const verificationToken = await this.jwtService.generateEmailVerificationToken(
        email,
        { firstName }
      );

      const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

      const template = this.getVerificationEmailTemplate(firstName, verificationLink);

      await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.htmlContent,
        text: template.textContent,
      });

      logger.info('Verification email sent successfully', {
        email,
        firstName,
      });
    } catch (error) {
      logger.error('Failed to send verification email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    firstName: string,
    resetToken: string
  ): Promise<void> {
    try {
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

      const template = this.getPasswordResetEmailTemplate(firstName, resetLink);

      await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.htmlContent,
        text: template.textContent,
      });

      logger.info('Password reset email sent successfully', {
        email,
        firstName,
      });
    } catch (error) {
      logger.error('Failed to send password reset email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    try {
      const template = this.getWelcomeEmailTemplate(firstName);

      await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.htmlContent,
        text: template.textContent,
      });

      logger.info('Welcome email sent successfully', {
        email,
        firstName,
      });
    } catch (error) {
      logger.error('Failed to send welcome email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
      });
      throw error;
    }
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmationEmail(
    email: string,
    firstName: string,
    orderId: string,
    orderTotal: number
  ): Promise<void> {
    try {
      const template = this.getOrderConfirmationTemplate(firstName, orderId, orderTotal);

      await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.htmlContent,
        text: template.textContent,
      });

      logger.info('Order confirmation email sent successfully', {
        email,
        orderId,
      });
    } catch (error) {
      logger.error('Failed to send order confirmation email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
        orderId,
      });
      throw error;
    }
  }

  /**
   * Send notification email
   */
  async sendNotificationEmail(
    email: string,
    subject: string,
    message: string,
    firstName?: string
  ): Promise<void> {
    try {
      const template = this.getNotificationEmailTemplate(
        firstName || 'Foydalanuvchi',
        subject,
        message
      );

      await this.sendEmail({
        to: email,
        subject: template.subject,
        html: template.htmlContent,
        text: template.textContent,
      });

      logger.info('Notification email sent successfully', {
        email,
        subject,
      });
    } catch (error) {
      logger.error('Failed to send notification email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email,
        subject,
      });
      throw error;
    }
  }

  /**
   * Core email sending function
   */
  private async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        messageId: result.messageId,
        to: options.to,
        subject: options.subject,
      });
    } catch (error) {
      logger.error('Failed to send email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        to: options.to,
        subject: options.subject,
      });
      throw error;
    }
  }

  // Email Templates
  private getVerificationEmailTemplate(firstName: string, verificationLink: string): EmailTemplate {
    const subject = 'Email manzilingizni tasdiqlang - UltraMarket';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>UltraMarket</h1>
          </div>
          <div class="content">
            <h2>Salom ${firstName}!</h2>
            <p>UltraMarket platformasida ro'yxatdan o'tganingiz uchun rahmat!</p>
            <p>Email manzilingizni tasdiqlash uchun quyidagi tugmani bosing:</p>
            <p style="text-align: center;">
              <a href="${verificationLink}" class="button">Email ni tasdiqlash</a>
            </p>
            <p>Agar tugma ishlamasa, quyidagi havolani brauzeringizga nusxalang:</p>
            <p><a href="${verificationLink}">${verificationLink}</a></p>
            <p>Bu havola 24 soat davomida amal qiladi.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 UltraMarket. Barcha huquqlar himoyalangan.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Salom ${firstName}!
      
      UltraMarket platformasida ro'yxatdan o'tganingiz uchun rahmat!
      
      Email manzilingizni tasdiqlash uchun quyidagi havolaga o'ting:
      ${verificationLink}
      
      Bu havola 24 soat davomida amal qiladi.
      
      UltraMarket jamoasi
    `;

    return { subject, htmlContent, textContent };
  }

  private getPasswordResetEmailTemplate(firstName: string, resetLink: string): EmailTemplate {
    const subject = 'Parolni tiklash - UltraMarket';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Parolni tiklash</h1>
          </div>
          <div class="content">
            <h2>Salom ${firstName}!</h2>
            <p>Parolni tiklash so'rovi qabul qilindi.</p>
            <p>Yangi parol o'rnatish uchun quyidagi tugmani bosing:</p>
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Parolni tiklash</a>
            </p>
            <p>Agar tugma ishlamasa, quyidagi havolani brauzeringizga nusxalang:</p>
            <p><a href="${resetLink}">${resetLink}</a></p>
            <p>Bu havola 1 soat davomida amal qiladi.</p>
            <p><strong>Eslatma:</strong> Agar siz bu so'rovni yubormagan bo'lsangiz, bu xabarni e'tiborga olmang.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 UltraMarket. Barcha huquqlar himoyalangan.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Salom ${firstName}!
      
      Parolni tiklash so'rovi qabul qilindi.
      
      Yangi parol o'rnatish uchun quyidagi havolaga o'ting:
      ${resetLink}
      
      Bu havola 1 soat davomida amal qiladi.
      
      Agar siz bu so'rovni yubormagan bo'lsangiz, bu xabarni e'tiborga olmang.
      
      UltraMarket jamoasi
    `;

    return { subject, htmlContent, textContent };
  }

  private getWelcomeEmailTemplate(firstName: string): EmailTemplate {
    const subject = 'UltraMarket ga xush kelibsiz!';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Xush kelibsiz!</h1>
          </div>
          <div class="content">
            <h2>Salom ${firstName}!</h2>
            <p>UltraMarket oilasiga qo'shilganingiz uchun rahmat!</p>
            <p>Bizning platformamizda siz:</p>
            <ul>
              <li>Minglab mahsulotlarni ko'rishingiz</li>
              <li>Tez va xavfsiz xarid qilishingiz</li>
              <li>O'zbekiston bo'ylab yetkazib berishdan foydalanishingiz</li>
              <li>Maxsus chegirmalar va takliflardan bahramand bo'lishingiz mumkin</li>
            </ul>
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">Xarid qilishni boshlash</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; 2024 UltraMarket. Barcha huquqlar himoyalangan.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Salom ${firstName}!
      
      UltraMarket oilasiga qo'shilganingiz uchun rahmat!
      
      Bizning platformamizda siz minglab mahsulotlarni ko'rishingiz, tez va xavfsiz xarid qilishingiz, O'zbekiston bo'ylab yetkazib berishdan foydalanishingiz va maxsus chegirmalardan bahramand bo'lishingiz mumkin.
      
      Xarid qilishni boshlash: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
      
      UltraMarket jamoasi
    `;

    return { subject, htmlContent, textContent };
  }

  private getOrderConfirmationTemplate(firstName: string, orderId: string, orderTotal: number): EmailTemplate {
    const subject = `Buyurtma tasdiqlandi #${orderId} - UltraMarket`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #17a2b8; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .order-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Buyurtma tasdiqlandi!</h1>
          </div>
          <div class="content">
            <h2>Salom ${firstName}!</h2>
            <p>Buyurtmangiz muvaffaqiyatli qabul qilindi va to'lov amalga oshirildi.</p>
            <div class="order-info">
              <h3>Buyurtma ma'lumotlari:</h3>
              <p><strong>Buyurtma raqami:</strong> #${orderId}</p>
              <p><strong>Jami summa:</strong> ${orderTotal.toLocaleString()} so'm</p>
              <p><strong>To'lov holati:</strong> To'langan</p>
            </div>
            <p>Buyurtmangiz tez orada qayta ishlanadi va yetkazib beriladi.</p>
            <p>Buyurtma holatini kuzatish uchun shaxsiy kabinetingizga kiring.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 UltraMarket. Barcha huquqlar himoyalangan.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Salom ${firstName}!
      
      Buyurtmangiz muvaffaqiyatli qabul qilindi va to'lov amalga oshirildi.
      
      Buyurtma ma'lumotlari:
      - Buyurtma raqami: #${orderId}
      - Jami summa: ${orderTotal.toLocaleString()} so'm
      - To'lov holati: To'langan
      
      Buyurtmangiz tez orada qayta ishlanadi va yetkazib beriladi.
      
      UltraMarket jamoasi
    `;

    return { subject, htmlContent, textContent };
  }

  private getNotificationEmailTemplate(firstName: string, subject: string, message: string): EmailTemplate {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #6c757d; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>UltraMarket</h1>
          </div>
          <div class="content">
            <h2>Salom ${firstName}!</h2>
            <p>${message}</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 UltraMarket. Barcha huquqlar himoyalangan.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
      Salom ${firstName}!
      
      ${message}
      
      UltraMarket jamoasi
    `;

    return { subject, htmlContent, textContent };
  }
}