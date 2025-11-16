// security-headers.js - Configuração de headers de segurança para Vercel
export default function securityHeaders() {
  return [
    // Content Security Policy (CSP) - Proteção contra XSS
    {
      key: 'Content-Security-Policy',
      value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://apis.google.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https: http:",
        "media-src 'self' blob: data:",
        "connect-src 'self' https://ksmnfhenhppasfcikefd.supabase.co https://api.twilio.com https://api.openpix.com.br https://www.google-analytics.com",
        "frame-src 'self' https://accounts.google.com https://www.facebook.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "upgrade-insecure-requests"
      ].join('; ')
    },
    
    // HTTP Strict Transport Security (HSTS) - Force HTTPS
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload'
    },
    
    // Cross-Origin Opener Policy (COOP) - Isolamento de origem
    {
      key: 'Cross-Origin-Opener-Policy',
      value: 'same-origin-allow-popups'
    },
    
    // Cross-Origin Embedder Policy (COEP) - Isolamento adicional
    {
      key: 'Cross-Origin-Embedder-Policy',
      value: 'credentialless'
    },
    
    // Cross-Origin Resource Policy (CORP)
    {
      key: 'Cross-Origin-Resource-Policy',
      value: 'cross-origin'
    },
    
    // X-Frame-Options - Proteção contra clickjacking
    {
      key: 'X-Frame-Options',
      value: 'DENY'
    },
    
    // X-Content-Type-Options - Previne MIME sniffing
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff'
    },
    
    // X-XSS-Protection - Proteção XSS legacy
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block'
    },
    
    // Referrer Policy - Controla informações de referrer
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin'
    },
    
    // Permissions Policy - Controla APIs do navegador
    {
      key: 'Permissions-Policy',
      value: [
        'camera=(self)',
        'microphone=(self)',
        'geolocation=(self)',
        'interest-cohort=()',
        'payment=(self)',
        'usb=()',
        'bluetooth=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()',
        'ambient-light-sensor=()',
        'autoplay=(self)'
      ].join(', ')
    }
  ];
}