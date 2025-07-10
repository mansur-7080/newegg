import nodemailer from 'nodemailer';
import { config } from '../config/database';
import { logger } from '../utils/logger';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: config.email.auth,
    });
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(email: string, token: string): Promise<void> {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
      
      const mailOptions = {
        from: `"UltraMarket" <${config.email.auth.user}>`,
        to: email,
        subject: 'Verify Your Email - UltraMarket',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">UltraMarket</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Welcome to UltraMarket!</p>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #333; margin-bottom: 20px;">Verify Your Email Address</h2>
              <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                Thank you for registering with UltraMarket! To complete your registration, please verify your email address by clicking the button below.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 5px; 
                          display: inline-block; 
                          font-weight: bold;">
                  Verify Email Address
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 25px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #667eea; font-size: 14px; word-break: break-all;">
                ${verificationUrl}
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px;">
                  This link will expire in 24 hours. If you didn't create an account with UltraMarket, you can safely ignore this email.
                </p>
              </div>
            </div>
            
            <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
              <p>&copy; 2024 UltraMarket. All rights reserved.</p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info('Verification email sent successfully', { email });
    } catch (error) {
      logger.error('Failed to send verification email', { error: error instanceof Error ? error.message : error, email });
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
      
      const mailOptions = {
        from: `"UltraMarket" <${config.email.auth.user}>`,
        to: email,
        subject: 'Reset Your Password - UltraMarket',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">UltraMarket</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Password Reset Request</p>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #333; margin-bottom: 20px;">Reset Your Password</h2>
              <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                We received a request to reset your password. Click the button below to create a new password.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 5px; 
                          display: inline-block; 
                          font-weight: bold;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 25px;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #667eea; font-size: 14px; word-break: break-all;">
                ${resetUrl}
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px;">
                  This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
                </p>
              </div>
            </div>
            
            <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
              <p>&copy; 2024 UltraMarket. All rights reserved.</p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info('Password reset email sent successfully', { email });
    } catch (error) {
      logger.error('Failed to send password reset email', { error: error instanceof Error ? error.message : error, email });
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    try {
      const mailOptions = {
        from: `"UltraMarket" <${config.email.auth.user}>`,
        to: email,
        subject: 'Welcome to UltraMarket!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">UltraMarket</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Welcome aboard!</p>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #333; margin-bottom: 20px;">Welcome, ${firstName}!</h2>
              <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                Thank you for joining UltraMarket! We're excited to have you as part of our community.
              </p>
              
              <div style="background: #e8f4fd; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #333; margin-top: 0;">What's next?</h3>
                <ul style="color: #666; line-height: 1.6;">
                  <li>Complete your profile</li>
                  <li>Add your shipping addresses</li>
                  <li>Browse our products</li>
                  <li>Set up your preferences</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" 
                   style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 5px; 
                          display: inline-block; 
                          font-weight: bold;">
                  Go to Dashboard
                </a>
              </div>
            </div>
            
            <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
              <p>&copy; 2024 UltraMarket. All rights reserved.</p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info('Welcome email sent successfully', { email });
    } catch (error) {
      logger.error('Failed to send welcome email', { error: error instanceof Error ? error.message : error, email });
      throw new Error('Failed to send welcome email');
    }
  }

  /**
   * Send account deactivation email
   */
  async sendDeactivationEmail(email: string, firstName: string, reason?: string): Promise<void> {
    try {
      const mailOptions = {
        from: `"UltraMarket" <${config.email.auth.user}>`,
        to: email,
        subject: 'Account Deactivated - UltraMarket',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #ff6b6b; color: white; padding: 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">UltraMarket</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px;">Account Deactivated</p>
            </div>
            
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #333; margin-bottom: 20px;">Hello, ${firstName}</h2>
              <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
                Your UltraMarket account has been deactivated as requested.
              </p>
              
              ${reason ? `
                <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <strong>Reason:</strong> ${reason}
                </div>
              ` : ''}
              
              <p style="color: #666; line-height: 1.6;">
                If you change your mind, you can reactivate your account at any time by logging in to your account.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" 
                   style="background: #667eea; 
                          color: white; 
                          padding: 15px 30px; 
                          text-decoration: none; 
                          border-radius: 5px; 
                          display: inline-block; 
                          font-weight: bold;">
                  Reactivate Account
                </a>
              </div>
            </div>
            
            <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
              <p>&copy; 2024 UltraMarket. All rights reserved.</p>
            </div>
          </div>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info('Deactivation email sent successfully', { email });
    } catch (error) {
      logger.error('Failed to send deactivation email', { error: error instanceof Error ? error.message : error, email });
      throw new Error('Failed to send deactivation email');
    }
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email service connection successful');
      return true;
    } catch (error) {
      logger.error('Email service connection failed', { error: error instanceof Error ? error.message : error });
      return false;
    }
  }
}