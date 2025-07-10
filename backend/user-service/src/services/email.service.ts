import nodemailer from 'nodemailer';
import { logger } from '@newegg/common';

interface EmailData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

const emailTemplates: Record<string, EmailTemplate> = {
  'email-verification': {
    subject: 'Verify your email address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Hello {{username}}!</h2>
        <p>Thank you for registering with our platform. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{verificationUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">{{verificationUrl}}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
    text: `
      Hello {{username}}!
      
      Thank you for registering with our platform. Please verify your email address by visiting this link:
      
      {{verificationUrl}}
      
      This link will expire in 24 hours.
      
      If you didn't create an account, you can safely ignore this email.
    `
  },
  'password-reset': {
    subject: 'Reset your password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Hello {{username}}!</h2>
        <p>You requested to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{resetUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">{{resetUrl}}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
      </div>
    `,
    text: `
      Hello {{username}}!
      
      You requested to reset your password. Visit this link to create a new password:
      
      {{resetUrl}}
      
      This link will expire in 1 hour.
      
      If you didn't request a password reset, you can safely ignore this email.
    `
  },
  'welcome': {
    subject: 'Welcome to our platform!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome {{username}}!</h2>
        <p>Thank you for joining our platform. We're excited to have you on board!</p>
        <p>Here are some things you can do to get started:</p>
        <ul>
          <li>Complete your profile</li>
          <li>Browse our products</li>
          <li>Add items to your wishlist</li>
          <li>Explore our features</li>
        </ul>
        <p>If you have any questions, feel free to contact our support team.</p>
        <p>Happy shopping!</p>
      </div>
    `,
    text: `
      Welcome {{username}}!
      
      Thank you for joining our platform. We're excited to have you on board!
      
      Here are some things you can do to get started:
      - Complete your profile
      - Browse our products
      - Add items to your wishlist
      - Explore our features
      
      If you have any questions, feel free to contact our support team.
      
      Happy shopping!
    `
  }
};

// Create transporter
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // Production: Use SMTP service (Gmail, SendGrid, etc.)
    return nodemailer.createTransporter({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  } else {
    // Development: Use Ethereal for testing
    return nodemailer.createTransporter({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.ETHEREAL_USER || 'test@example.com',
        pass: process.env.ETHEREAL_PASS || 'test123'
      }
    });
  }
};

// Replace template variables
const replaceTemplateVariables = (template: string, data: Record<string, any>): string => {
  let result = template;
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, data[key]);
  });
  return result;
};

// Send email
export const sendEmail = async (emailData: EmailData): Promise<void> => {
  try {
    const { to, subject, template, data } = emailData;
    
    // Get template
    const emailTemplate = emailTemplates[template];
    if (!emailTemplate) {
      throw new Error(`Email template '${template}' not found`);
    }

    // Replace variables in template
    const htmlContent = replaceTemplateVariables(emailTemplate.html, data);
    const textContent = replaceTemplateVariables(emailTemplate.text, data);

    // Create transporter
    const transporter = createTransporter();

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@example.com',
      to,
      subject: emailTemplate.subject,
      html: htmlContent,
      text: textContent
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info('Email sent successfully', {
      messageId: info.messageId,
      to,
      template
    });

    // Log preview URL for development
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
  } catch (error) {
    logger.error('Failed to send email:', error);
    throw error;
  }
};

// Send bulk emails
export const sendBulkEmail = async (emails: EmailData[]): Promise<void> => {
  try {
    const transporter = createTransporter();
    
    for (const emailData of emails) {
      const { to, template, data } = emailData;
      
      const emailTemplate = emailTemplates[template];
      if (!emailTemplate) {
        logger.warn(`Email template '${template}' not found, skipping email to ${to}`);
        continue;
      }

      const htmlContent = replaceTemplateVariables(emailTemplate.html, data);
      const textContent = replaceTemplateVariables(emailTemplate.text, data);

      const mailOptions = {
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        to,
        subject: emailTemplate.subject,
        html: htmlContent,
        text: textContent
      };

      await transporter.sendMail(mailOptions);
      logger.info(`Bulk email sent to ${to}`);
    }
  } catch (error) {
    logger.error('Failed to send bulk emails:', error);
    throw error;
  }
};

// Verify email configuration
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    logger.info('Email configuration is valid');
    return true;
  } catch (error) {
    logger.error('Email configuration is invalid:', error);
    return false;
  }
};