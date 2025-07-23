import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Componente Dashboard
const Dashboard = ({ stats, onRefresh }) => {
  const ocupacaoPercentual = stats.total_vagas > 0 ? 
    Math.round((stats.vagas_ocupadas / stats.total_vagas) * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <button 
          onClick={onRefresh}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          Atualizar
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800">Total de Vagas</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.total_vagas}</p>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800">Ocupadas</h3>
          <p className="text-3xl font-bold text-red-600">{stats.vagas_ocupadas}</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800">Livres</h3>
          <p className="text-3xl font-bold text-green-600">{stats.vagas_livres}</p>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800">Manutenção</h3>
          <p className="text-3xl font-bold text-yellow-600">{stats.vagas_manutencao}</p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-800">Sessões Ativas</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.sessoes_ativas}</p>
        </div>
        
        <div className="bg-emerald-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-emerald-800">Receita Hoje</h3>
          <p className="text-3xl font-bold text-emerald-600">R$ {stats.receita_hoje.toFixed(2)}</p>
        </div>
      </div>
      
      <div className="mt-4 bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-700 font-medium">Ocupação do Estacionamento</span>
          <span className="text-xl font-bold text-gray-800">{ocupacaoPercentual}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="bg-blue-500 h-4 rounded-full transition-all duration-300"
            style={{ width: `${ocupacaoPercentual}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

// Componente Modal para Cadastro de Vaga
const ModalCadastroVaga = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    numero: '',
    andar: '',
    tipo_veiculo: 'carro'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setFormData({ numero: '', andar: '', tipo_veiculo: 'carro' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Cadastrar Nova Vaga</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número da Vaga
            </label>
            <input
              type="text"
              value={formData.numero}
              onChange={(e) => setFormData({...formData, numero: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Andar
            </label>
            <input
              type="text"
              value={formData.andar}
              onChange={(e) => setFormData({...formData, andar: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Veículo
            </label>
            <select
              value={formData.tipo_veiculo}
              onChange={(e) => setFormData({...formData, tipo_veiculo: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="carro">Carro</option>
              <option value="moto">Moto</option>
              <option value="caminhao">Caminhão</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente Modal para Cadastro de Veículo
const ModalCadastroVeiculo = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    placa: '',
    modelo: '',
    cor: '',
    tipo: 'carro',
    proprietario: '',
    telefone: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setFormData({ placa: '', modelo: '', cor: '', tipo: 'carro', proprietario: '', telefone: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">Cadastrar Novo Veículo</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Placa
            </label>
            <input
              type="text"
              value={formData.placa}
              onChange={(e) => setFormData({...formData, placa: e.target.value.toUpperCase()})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ABC-1234"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Modelo
            </label>
            <input
              type="text"
              value={formData.modelo}
              onChange={(e) => setFormData({...formData, modelo: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cor
            </label>
            <input
              type="text"
              value={formData.cor}
              onChange={(e) => setFormData({...formData, cor: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({...formData, tipo: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="carro">Carro</option>
              <option value="moto">Moto</option>
              <option value="caminhao">Caminhão</option>
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proprietário
            </label>
            <input
              type="text"
              value={formData.proprietario}
              onChange={(e) => setFormData({...formData, proprietario: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone
            </label>
            <input
              type="text"
              value={formData.telefone}
              onChange={(e) => setFormData({...formData, telefone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente Principal
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    total_vagas: 0,
    vagas_ocupadas: 0,
    vagas_livres: 0,
    vagas_manutencao: 0,
    sessoes_ativas: 0,
    receita_hoje: 0
  });
  const [vagas, setVagas] = useState([]);
  const [veiculos, setVeiculos] = useState([]);
  const [sessoesAtivas, setSessoesAtivas] = useState([]);
  const [showModalVaga, setShowModalVaga] = useState(false);
  const [showModalVeiculo, setShowModalVeiculo] = useState(false);
  const [loading, setLoading] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    loadDashboardStats();
    loadVagas();
    loadVeiculos();
    loadSessoesAtivas();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`);
      setStats(response.data);
    } catch (error) {
      console.error('Erro ao carregar stats:', error);
    }
  };

  const loadVagas = async () => {
    try {
      const response = await axios.get(`${API}/vagas`);
      setVagas(response.data);
    } catch (error) {
      console.error('Erro ao carregar vagas:', error);
    }
  };

  const loadVeiculos = async () => {
    try {
      const response = await axios.get(`${API}/veiculos`);
      setVeiculos(response.data);
    } catch (error) {
      console.error('Erro ao carregar veículos:', error);
    }
  };

  const loadSessoesAtivas = async () => {
    try {
      const response = await axios.get(`${API}/sessoes/ativas`);
      setSessoesAtivas(response.data);
    } catch (error) {
      console.error('Erro ao carregar sessões ativas:', error);
    }
  };

  const refreshAll = () => {
    loadDashboardStats();
    loadVagas();
    loadVeiculos();
    loadSessoesAtivas();
  };

  const handleCadastroVaga = async (vagaData) => {
    try {
      await axios.post(`${API}/vagas`, vagaData);
      setShowModalVaga(false);
      refreshAll();
      alert('Vaga cadastrada com sucesso!');
    } catch (error) {
      alert('Erro ao cadastrar vaga: ' + (error.response?.data?.detail || 'Erro desconhecido'));
    }
  };

  const handleCadastroVeiculo = async (veiculoData) => {
    try {
      await axios.post(`${API}/veiculos`, veiculoData);
      setShowModalVeiculo(false);
      refreshAll();
      alert('Veículo cadastrado com sucesso!');
    } catch (error) {
      alert('Erro ao cadastrar veículo: ' + (error.response?.data?.detail || 'Erro desconhecido'));
    }
  };

  const iniciarSessao = async (veiculoId, vagaId) => {
    try {
      await axios.post(`${API}/sessoes`, {
        veiculo_id: veiculoId,
        vaga_id: vagaId
      });
      refreshAll();
      alert('Sessão iniciada com sucesso!');
    } catch (error) {
      alert('Erro ao iniciar sessão: ' + (error.response?.data?.detail || 'Erro desconhecido'));
    }
  };

  const finalizarSessao = async (sessaoId) => {
    if (!window.confirm('Deseja finalizar esta sessão?')) return;
    
    try {
      const response = await axios.post(`${API}/sessoes/${sessaoId}/finalizar`, {});
      refreshAll();
      alert(`Sessão finalizada! Valor total: R$ ${response.data.valor_total.toFixed(2)}`);
    } catch (error) {
      alert('Erro ao finalizar sessão: ' + (error.response?.data?.detail || 'Erro desconhecido'));
    }
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'livre': return 'bg-green-100 text-green-800';
      case 'ocupado': return 'bg-red-100 text-red-800';
      case 'manutencao': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoColor = (tipo) => {
    switch (tipo) {
      case 'carro': return 'bg-blue-100 text-blue-800';
      case 'moto': return 'bg-purple-100 text-purple-800';
      case 'caminhao': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-3xl font-bold text-gray-900">
              🅿️ ParkingSystemPro
            </h1>
            <div className="text-sm text-gray-500">
              Sistema de Gerenciamento de Estacionamento
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'vagas', label: 'Vagas', icon: '🅿️' },
              { id: 'veiculos', label: 'Veículos', icon: '🚗' },
              { id: 'sessoes', label: 'Sessões Ativas', icon: '⏱️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === 'dashboard' && (
          <Dashboard stats={stats} onRefresh={refreshAll} />
        )}

        {activeTab === 'vagas' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Gerenciar Vagas</h2>
              <button
                onClick={() => setShowModalVaga(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                + Nova Vaga
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Número
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Andar
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vagas.map((vaga) => (
                    <tr key={vaga.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {vaga.numero}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {vaga.andar}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTipoColor(vaga.tipo_veiculo)}`}>
                          {vaga.tipo_veiculo}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vaga.status)}`}>
                          {vaga.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {vaga.status === 'livre' && (
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                iniciarSessao(e.target.value, vaga.id);
                                e.target.value = '';
                              }
                            }}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            <option value="">Iniciar Sessão</option>
                            {veiculos
                              .filter(v => v.tipo === vaga.tipo_veiculo)
                              .map(veiculo => (
                                <option key={veiculo.id} value={veiculo.id}>
                                  {veiculo.placa} - {veiculo.modelo}
                                </option>
                              ))
                            }
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'veiculos' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Gerenciar Veículos</h2>
              <button
                onClick={() => setShowModalVeiculo(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                + Novo Veículo
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Placa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Modelo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proprietário
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Telefone
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {veiculos.map((veiculo) => (
                    <tr key={veiculo.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {veiculo.placa}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {veiculo.modelo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {veiculo.cor}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTipoColor(veiculo.tipo)}`}>
                          {veiculo.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {veiculo.proprietario}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {veiculo.telefone || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'sessoes' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Sessões Ativas</h2>
              <button
                onClick={refreshAll}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                Atualizar
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Veículo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vaga
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entrada
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sessoesAtivas.map((sessao) => {
                    const veiculo = veiculos.find(v => v.id === sessao.veiculo_id);
                    const vaga = vagas.find(v => v.id === sessao.vaga_id);
                    
                    return (
                      <tr key={sessao.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {veiculo ? `${veiculo.placa} - ${veiculo.modelo}` : 'Veículo não encontrado'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {vaga ? `${vaga.numero} (${vaga.andar})` : 'Vaga não encontrada'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(sessao.entrada)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          R$ {sessao.valor_hora.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => finalizarSessao(sessao.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                          >
                            Finalizar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <ModalCadastroVaga
        isOpen={showModalVaga}
        onClose={() => setShowModalVaga(false)}
        onSave={handleCadastroVaga}
      />
      
      <ModalCadastroVeiculo
        isOpen={showModalVeiculo}
        onClose={() => setShowModalVeiculo(false)}
        onSave={handleCadastroVeiculo}
      />
    </div>
  );
}

export default App;