import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import apiClient from '../../lib/api';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/api/auth/login', formData);
      
      if (response.data.success) {
        // Token va user ma'lumotlarini localStorage ga saqlash
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
        
        // Homepage ga yo'naltirish
        router.push('/');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Xatolik yuz berdi';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Kirish - UltraMarket</title>
        <meta name="description" content="UltraMarket ga kirish" />
      </Head>

      <div className="auth-container">
        <div className="auth-header">
          <Link href="/">
            <div className="logo">UltraMarket</div>
          </Link>
          <h2 className="auth-title">Hisobingizga kiring</h2>
          <p className="auth-subtitle">
            Yoki{' '}
            <Link href="/auth/register" style={{color: '#2563eb'}}>
              yangi hisob oching
            </Link>
          </p>
        </div>

        <div className="auth-form">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="error-alert">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email manzili
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="example@gmail.com"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Parol
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="••••••••"
              />
            </div>

            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem'}}>
              <label style={{display: 'flex', alignItems: 'center', fontSize: '0.875rem'}}>
                <input type="checkbox" style={{marginRight: '0.5rem'}} />
                Eslab qolish
              </label>
              <a href="#" style={{fontSize: '0.875rem', color: '#2563eb'}}>
                Parolni unutdingizmi?
              </a>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary btn-full"
            >
              {isLoading ? (
                <div style={{display: 'flex', alignItems: 'center'}}>
                  <div className="loading-spinner"></div>
                  Kirilmoqda...
                </div>
              ) : (
                'Kirish'
              )}
            </button>
          </form>

          <div style={{marginTop: '2rem'}}>
            <div style={{position: 'relative', textAlign: 'center', marginBottom: '1rem'}}>
              <div style={{borderTop: '1px solid #d1d5db', position: 'absolute', width: '100%', top: '50%'}}></div>
              <span style={{background: 'white', padding: '0 1rem', color: '#6b7280', fontSize: '0.875rem'}}>Yoki</span>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem'}}>
              <button className="btn btn-secondary">Google</button>
              <button className="btn btn-secondary">Telegram</button>
            </div>
          </div>
        </div>

        {/* Demo user info */}
        <div className="info-box">
          <h3 style={{fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem'}}>Demo hisob:</h3>
          <p style={{fontSize: '0.875rem'}}>
            Email: aziza@example.com<br />
            Parol: 123456
          </p>
        </div>
      </div>
    </>
  );
};

export default LoginPage;