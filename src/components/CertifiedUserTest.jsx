/**
 * ========================================
 * TESTE DE FLUXO DE USUÁRIO CERTIFICADO
 * ========================================
 * 
 * Componente para testar todo o fluxo de verificação e OCR
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Camera, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  User,
  Settings,
  Award,
  Eye,
  Download,
  Upload
} from 'lucide-react';
import { Button } from '@/features/shared/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/features/shared/components/ui/use-toast';
import CertifiedUserService from '@/services/CertifiedUserService';

const CertifiedUserTest = () => {
  const { user } = useAuth();
  const [currentTest, setCurrentTest] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [isCertified, setIsCertified] = useState(false);
  const [certificationData, setCertificationData] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  // Verificar certificação do usuário atual
  useEffect(() => {
    if (user?.id) {
      checkUserCertification();
    }
  }, [user]);

  const checkUserCertification = async () => {
    try {
      const certified = await CertifiedUserService.isCertified(user.id);
      setIsCertified(certified);

      if (certified) {
        const data = await CertifiedUserService.getCertificationData(user.id);
        setCertificationData(data);
      }
    } catch (error) {
      console.error('Erro ao verificar certificação:', error);
    }
  };

  // Lista de testes do fluxo de certificação
  const tests = [
    {
      id: 'ocr-api',
      name: 'API OCR Google Vision',
      description: 'Testa a conectividade com Google Vision API',
      endpoint: '/api/test-ocr',
      icon: Eye,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'upload-document',
      name: 'Upload de Documentos',
      description: 'Testa o upload para Supabase Storage',
      endpoint: '/api/upload-verification-document',
      icon: Upload,
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'cpf-verification',
      name: 'Verificação de CPF',
      description: 'Testa extração e validação de CPF',
      endpoint: '/api/verify-cpf-document',
      icon: ShieldCheck,
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'user-certification',
      name: 'Status de Certificação',
      description: 'Verifica dados de usuário certificado',
      action: 'checkCertification',
      icon: Award,
      color: 'from-yellow-500 to-orange-500'
    }
  ];

  // Executar teste específico
  const runTest = async (test) => {
    setCurrentTest(test.id);
    setIsRunning(true);

    try {
      let result;

      if (test.action === 'checkCertification') {
        // Teste interno de certificação
        result = await testUserCertification();
      } else {
        // Teste de API
        const response = await fetch(test.endpoint, {
          method: test.endpoint.includes('upload') ? 'POST' : 'GET',
          headers: test.endpoint.includes('upload') ? {} : {
            'Content-Type': 'application/json'
          }
        });

        result = await response.json();
        result.success = response.ok;
      }

      setTestResults(prev => ({
        ...prev,
        [test.id]: {
          success: result.success,
          message: result.message || result.error || 'Teste concluído',
          details: result,
          timestamp: new Date().toISOString()
        }
      }));

      if (result.success) {
        toast({
          title: `✅ ${test.name}`,
          description: result.message || 'Teste passou com sucesso!',
        });
      } else {
        toast({
          variant: "destructive",
          title: `❌ ${test.name}`,
          description: result.message || result.error || 'Teste falhou',
        });
      }

    } catch (error) {
      console.error('Erro no teste:', error);
      
      setTestResults(prev => ({
        ...prev,
        [test.id]: {
          success: false,
          message: error.message,
          details: { error: error.toString() },
          timestamp: new Date().toISOString()
        }
      }));

      toast({
        variant: "destructive",
        title: `❌ ${test.name}`,
        description: error.message,
      });
    } finally {
      setIsRunning(false);
      setCurrentTest(null);
    }
  };

  // Teste interno de certificação
  const testUserCertification = async () => {
    if (!user?.id) {
      return {
        success: false,
        message: 'Usuário não autenticado'
      };
    }

    const certified = await CertifiedUserService.isCertified(user.id);
    const data = certified ? await CertifiedUserService.getCertificationData(user.id) : null;

    return {
      success: true,
      message: certified ? 'Usuário certificado encontrado!' : 'Usuário não certificado',
      user_certified: certified,
      certification_data: data,
      trust_score: data?.trust_score || 0
    };
  };

  // Executar todos os testes
  const runAllTests = async () => {
    for (const test of tests) {
      await runTest(test);
      // Pequena pausa entre testes
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-white mb-8"
        >
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Teste de Usuário Certificado</h1>
          <p className="text-white/80">Validação completa do fluxo de verificação e OCR</p>
        </motion.div>

        {/* Status do Usuário */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8"
        >
          <h2 className="text-xl font-bold text-white mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Status Atual do Usuário
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${isCertified ? 'bg-green-500/20 border border-green-500/30' : 'bg-gray-500/20 border border-gray-500/30'}`}>
              <div className="flex items-center justify-between">
                <span className="text-white/80">Certificado</span>
                {isCertified ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <p className="text-lg font-bold text-white mt-1">
                {isCertified ? 'SIM' : 'NÃO'}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-blue-500/20 border border-blue-500/30">
              <div className="flex items-center justify-between">
                <span className="text-white/80">Score de Confiança</span>
                <Award className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-lg font-bold text-white mt-1">
                {certificationData?.trust_score || 0}/100
              </p>
            </div>

            <div className="p-4 rounded-lg bg-purple-500/20 border border-purple-500/30">
              <div className="flex items-center justify-between">
                <span className="text-white/80">Data Verificação</span>
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-sm font-bold text-white mt-1">
                {certificationData?.verification_date ? 
                  new Date(certificationData.verification_date).toLocaleDateString('pt-BR') : 
                  'N/A'
                }
              </p>
            </div>
          </div>
        </motion.div>

        {/* Controles */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-4 mb-8"
        >
          <Button
            onClick={runAllTests}
            disabled={isRunning}
            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          >
            {isRunning ? 'Executando...' : 'Executar Todos os Testes'}
          </Button>
          
          <Button
            onClick={checkUserCertification}
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Settings className="w-4 h-4 mr-2" />
            Atualizar Status
          </Button>
        </motion.div>

        {/* Lista de Testes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tests.map((test, index) => (
            <motion.div
              key={test.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/10"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${test.color} flex items-center justify-center`}>
                    <test.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{test.name}</h3>
                    <p className="text-sm text-white/60">{test.description}</p>
                  </div>
                </div>
                
                {testResults[test.id] && (
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    testResults[test.id].success ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                  }`}>
                    {testResults[test.id].success ? 'PASSOU' : 'FALHOU'}
                  </div>
                )}
              </div>

              {testResults[test.id] && (
                <div className="mb-4 p-3 rounded-lg bg-black/20">
                  <p className="text-sm text-white/80">
                    {testResults[test.id].message}
                  </p>
                  <p className="text-xs text-white/60 mt-1">
                    {new Date(testResults[test.id].timestamp).toLocaleString('pt-BR')}
                  </p>
                </div>
              )}

              <Button
                onClick={() => runTest(test)}
                disabled={isRunning}
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                {currentTest === test.id ? 'Executando...' : 'Executar Teste'}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CertifiedUserTest;