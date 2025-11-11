/**
 * ========================================
 * COMPONENTE DE TESTE - FLUXO DE VERIFICAÇÃO
 * ========================================
 * 
 * Componente temporário para testar o sistema de verificação
 */

import React, { useState } from 'react';
import { Button } from '@/features/shared/components/ui/button';
import { 
  Monitor, 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  Clock,
  QrCode,
  Camera
} from 'lucide-react';

const TestVerificationFlow = () => {
  const [testResults, setTestResults] = useState({});
  const [currentTest, setCurrentTest] = useState(null);

  // Teste 1: Detecção de dispositivo
  const testDeviceDetection = () => {
    setCurrentTest('device');
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const device = isMobile ? 'Mobile' : 'Desktop';
    
    setTestResults(prev => ({
      ...prev,
      device: {
        success: true,
        result: device,
        details: `Detectado como: ${device}`,
        icon: isMobile ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />
      }
    }));
    setCurrentTest(null);
  };

  // Teste 2: Validação de CPF
  const testCPFValidation = () => {
    setCurrentTest('cpf');
    
    const testCPFs = [
      { cpf: '12345678909', expected: true },
      { cpf: '11111111111', expected: false },
      { cpf: '123456789', expected: false }
    ];
    
    const results = testCPFs.map(({ cpf, expected }) => {
      const isValid = validateCPF(cpf);
      return {
        cpf,
        expected,
        actual: isValid,
        passed: isValid === expected
      };
    });
    
    const allPassed = results.every(r => r.passed);
    
    setTestResults(prev => ({
      ...prev,
      cpf: {
        success: allPassed,
        result: `${results.filter(r => r.passed).length}/${results.length} testes passaram`,
        details: results.map(r => `${r.cpf}: ${r.passed ? '✅' : '❌'}`).join(', '),
        icon: allPassed ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />
      }
    }));
    setCurrentTest(null);
  };

  // Teste 3: APIs disponíveis
  const testAPIs = async () => {
    setCurrentTest('apis');
    
    const apis = [
      '/api/upload-verification-document',
      '/api/verify-cpf-document'
    ];
    
    const results = [];
    
    for (const api of apis) {
      try {
        // Teste HEAD request para verificar se a API responde
        const response = await fetch(api, { method: 'HEAD' });
        results.push({
          api,
          available: response.status !== 404,
          status: response.status
        });
      } catch (error) {
        results.push({
          api,
          available: false,
          error: error.message
        });
      }
    }
    
    const allAvailable = results.every(r => r.available);
    
    setTestResults(prev => ({
      ...prev,
      apis: {
        success: allAvailable,
        result: `${results.filter(r => r.available).length}/${results.length} APIs disponíveis`,
        details: results.map(r => `${r.api}: ${r.available ? '✅' : '❌'}`).join(', '),
        icon: allAvailable ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />
      }
    }));
    setCurrentTest(null);
  };

  // Teste 4: QR Code generation
  const testQRGeneration = async () => {
    setCurrentTest('qr');
    
    try {
      const QRCode = await import('qrcode');
      const testUrl = `${window.location.origin}/verify-mobile?userId=test&sessionId=test123`;
      
      const qrDataURL = await QRCode.toDataURL(testUrl, {
        width: 100,
        margin: 1
      });
      
      setTestResults(prev => ({
        ...prev,
        qr: {
          success: true,
          result: 'QR Code gerado com sucesso',
          details: `URL: ${testUrl}`,
          icon: <QrCode className="w-4 h-4" />,
          qrCode: qrDataURL
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        qr: {
          success: false,
          result: 'Erro ao gerar QR Code',
          details: error.message,
          icon: <XCircle className="w-4 h-4" />
        }
      }));
    }
    setCurrentTest(null);
  };

  // Validação de CPF
  const validateCPF = (cpf) => {
    const numbers = cpf.replace(/\D/g, '');
    
    if (numbers.length !== 11 || /^(\d)\1+$/.test(numbers)) {
      return false;
    }
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(numbers[i]) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(numbers[9])) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(numbers[i]) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(numbers[10])) return false;
    
    return true;
  };

  // Executar todos os testes
  const runAllTests = async () => {
    testDeviceDetection();
    await new Promise(resolve => setTimeout(resolve, 500));
    testCPFValidation();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testAPIs();
    await new Promise(resolve => setTimeout(resolve, 500));
    await testQRGeneration();
  };

  const tests = [
    { id: 'device', name: 'Detecção de Dispositivo', func: testDeviceDetection },
    { id: 'cpf', name: 'Validação de CPF', func: testCPFValidation },
    { id: 'apis', name: 'APIs Disponíveis', func: testAPIs },
    { id: 'qr', name: 'Geração de QR Code', func: testQRGeneration }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🧪 Teste do Sistema de Verificação
        </h1>
        <p className="text-gray-600">
          Validação dos componentes do fluxo de verificação de identidade
        </p>
      </div>

      {/* Controles */}
      <div className="flex gap-4 mb-8 justify-center">
        <Button 
          onClick={runAllTests}
          className="bg-blue-600 hover:bg-blue-700"
          disabled={currentTest !== null}
        >
          Executar Todos os Testes
        </Button>
        <Button 
          onClick={() => setTestResults({})}
          variant="outline"
        >
          Limpar Resultados
        </Button>
      </div>

      {/* Grid de Testes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {tests.map(test => {
          const result = testResults[test.id];
          const isRunning = currentTest === test.id;
          
          return (
            <div key={test.id} className="p-4 bg-white border rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{test.name}</h3>
                {result && result.icon}
              </div>
              
              <div className="space-y-2">
                {isRunning && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                    <Clock className="w-3 h-3 mr-1" />
                    Executando...
                  </span>
                )}
                
                {result && (
                  <>
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {result.result}
                    </span>
                    <p className="text-xs text-gray-600">{result.details}</p>
                    {result.qrCode && (
                      <img 
                        src={result.qrCode} 
                        alt="QR Test" 
                        className="w-16 h-16 mx-auto"
                      />
                    )}
                  </>
                )}
                
                <Button 
                  onClick={test.func}
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={currentTest !== null}
                >
                  Testar
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumo dos Resultados */}
      {Object.keys(testResults).length > 0 && (
        <div className="p-6 bg-white border rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">📊 Resumo dos Testes</h3>
          <div className="space-y-2">
            {Object.entries(testResults).map(([testId, result]) => (
              <div key={testId} className="flex items-center justify-between">
                <span className="text-sm">{tests.find(t => t.id === testId)?.name}</span>
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {result.success ? 'Passou' : 'Falhou'}
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">
              <strong>Próximos passos:</strong> Configure as credenciais do Google Vision API e teste o fluxo completo desktop → mobile.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestVerificationFlow;