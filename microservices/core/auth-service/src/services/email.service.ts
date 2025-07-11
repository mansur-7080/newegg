/**
 * Email Service
 * Professional email sending with templates and queue management
 */

import { logger } from '@ultramarket/shared/logging/logger';
import { generateEmailVerificationToken } from './jwt.service';

/**
 * Email template interface
 */
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

/**
 * Email data interface
 */
export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(email: string, firstName: string): Promise<void> {
  try {
    const template = getWelcomeEmailTemplate(firstName);
    
    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    logger.info('Welcome email sent successfully', {
      email,
      operation: 'welcome_email_sent'
    });
  } catch (error) {
    logger.error('Failed to send welcome email', {
      email,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // Don't throw error to avoid blocking registration
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
  try {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const template = getPasswordResetEmailTemplate(resetUrl);
    
    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    logger.info('Password reset email sent successfully', {
      email,
      operation: 'password_reset_email_sent'
    });
  } catch (error) {
    logger.error('Failed to send password reset email', {
      email,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Send email verification
 */
export async function sendEmailVerification(email: string, userId: string): Promise<void> {
  try {
    const verificationToken = generateEmailVerificationToken(userId);
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const template = getEmailVerificationTemplate(verificationUrl);
    
    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    logger.info('Email verification sent successfully', {
      email,
      userId,
      operation: 'email_verification_sent'
    });
  } catch (error) {
    logger.error('Failed to send email verification', {
      email,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // Don't throw error to avoid blocking registration
  }
}

/**
 * Send account security alert
 */
export async function sendSecurityAlert(email: string, alertType: string, details: any): Promise<void> {
  try {
    const template = getSecurityAlertTemplate(alertType, details);
    
    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    logger.info('Security alert email sent successfully', {
      email,
      alertType,
      operation: 'security_alert_sent'
    });
  } catch (error) {
    logger.error('Failed to send security alert email', {
      email,
      alertType,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Send email (placeholder for actual email service integration)
 */
async function sendEmail(emailData: EmailData): Promise<void> {
  // In production, integrate with actual email service like SendGrid, AWS SES, etc.
  // For now, we'll log the email data
  logger.info('Email would be sent', {
    to: emailData.to,
    subject: emailData.subject,
    operation: 'email_send_simulation'
  });

  // Simulate email sending delay
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * Get welcome email template
 */
function getWelcomeEmailTemplate(firstName: string): EmailTemplate {
  const subject = 'Welcome to UltraMarket! 🎉';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to UltraMarket</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to UltraMarket! 🎉</h1>
        </div>
        <div class="content">
          <h2>Hello ${firstName}!</h2>
          <p>Thank you for joining UltraMarket, your premier destination for all things tech and electronics.</p>
          
          <h3>What's next?</h3>
          <ul>
            <li>Complete your profile</li>
            <li>Browse our extensive product catalog</li>
            <li>Set up your payment methods</li>
            <li>Start shopping!</li>
          </ul>
          
          <a href="${process.env.FRONTEND_URL}/dashboard" class="button">Go to Dashboard</a>
          
          <p>If you have any questions, our support team is here to help!</p>
        </div>
        <div class="footer">
          <p>© 2024 UltraMarket. All rights reserved.</p>
          <p>This email was sent to you because you registered for an UltraMarket account.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Welcome to UltraMarket!
    
    Hello ${firstName}!
    
    Thank you for joining UltraMarket, your premier destination for all things tech and electronics.
    
    What's next?
    - Complete your profile
    - Browse our extensive product catalog
    - Set up your payment methods
    - Start shopping!
    
    Visit your dashboard: ${process.env.FRONTEND_URL}/dashboard
    
    If you have any questions, our support team is here to help!
    
    © 2024 UltraMarket. All rights reserved.
  `;

  return { subject, html, text };
}

/**
 * Get password reset email template
 */
function getPasswordResetEmailTemplate(resetUrl: string): EmailTemplate {
  const subject = 'Reset Your UltraMarket Password';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reset Your Password</h1>
        </div>
        <div class="content">
          <p>We received a request to reset your UltraMarket account password.</p>
          
          <a href="${resetUrl}" class="button">Reset Password</a>
          
          <div class="warning">
            <strong>Important:</strong>
            <ul>
              <li>This link will expire in 1 hour</li>
              <li>If you didn't request this, please ignore this email</li>
              <li>For security, this link can only be used once</li>
            </ul>
          </div>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p>${resetUrl}</p>
        </div>
        <div class="footer">
          <p>© 2024 UltraMarket. All rights reserved.</p>
          <p>This email was sent to you because you requested a password reset.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Reset Your UltraMarket Password
    
    We received a request to reset your UltraMarket account password.
    
    Reset your password: ${resetUrl}
    
    Important:
    - This link will expire in 1 hour
    - If you didn't request this, please ignore this email
    - For security, this link can only be used once
    
    If the link doesn't work, copy and paste this URL into your browser:
    ${resetUrl}
    
    © 2024 UltraMarket. All rights reserved.
  `;

  return { subject, html, text };
}

/**
 * Get email verification template
 */
function getEmailVerificationTemplate(verificationUrl: string): EmailTemplate {
  const subject = 'Verify Your UltraMarket Email Address';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verify Your Email Address</h1>
        </div>
        <div class="content">
          <p>Please verify your email address to complete your UltraMarket account setup.</p>
          
          <a href="${verificationUrl}" class="button">Verify Email Address</a>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p>${verificationUrl}</p>
          
          <p>This verification link will expire in 24 hours.</p>
        </div>
        <div class="footer">
          <p>© 2024 UltraMarket. All rights reserved.</p>
          <p>This email was sent to you because you registered for an UltraMarket account.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Verify Your UltraMarket Email Address
    
    Please verify your email address to complete your UltraMarket account setup.
    
    Verify your email: ${verificationUrl}
    
    If the link doesn't work, copy and paste this URL into your browser:
    ${verificationUrl}
    
    This verification link will expire in 24 hours.
    
    © 2024 UltraMarket. All rights reserved.
  `;

  return { subject, html, text };
}

/**
 * Get security alert template
 */
function getSecurityAlertTemplate(alertType: string, details: any): EmailTemplate {
  const subject = `Security Alert - ${alertType}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Security Alert</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .alert { background: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #e74c3c; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Security Alert</h1>
        </div>
        <div class="content">
          <div class="alert">
            <h3>${alertType}</h3>
            <p>We detected suspicious activity on your account.</p>
          </div>
          
          <h3>Details:</h3>
          <ul>
            <li>Time: ${details.timestamp || new Date().toISOString()}</li>
            <li>IP Address: ${details.ipAddress || 'Unknown'}</li>
            <li>Location: ${details.location || 'Unknown'}</li>
            <li>Device: ${details.userAgent || 'Unknown'}</li>
          </ul>
          
          <a href="${process.env.FRONTEND_URL}/security" class="button">Review Account Security</a>
          
          <p>If this wasn't you, please change your password immediately and contact support.</p>
        </div>
        <div class="footer">
          <p>© 2024 UltraMarket. All rights reserved.</p>
          <p>This email was sent to you because we detected suspicious activity on your account.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    Security Alert - ${alertType}
    
    We detected suspicious activity on your account.
    
    Details:
    - Time: ${details.timestamp || new Date().toISOString()}
    - IP Address: ${details.ipAddress || 'Unknown'}
    - Location: ${details.location || 'Unknown'}
    - Device: ${details.userAgent || 'Unknown'}
    
    Review your account security: ${process.env.FRONTEND_URL}/security
    
    If this wasn't you, please change your password immediately and contact support.
    
    © 2024 UltraMarket. All rights reserved.
  `;

  return { subject, html, text };
}