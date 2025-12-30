import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { hasPermission } from '../utils/permissions';
import { FiPlus, FiRefreshCw, FiEdit2, FiTrash, FiFileText, FiDownload } from 'react-icons/fi';
import { createClient } from '@supabase/supabase-js';
import MapaChuvas from '../pages/MapaChuvas';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


// ✅ Função para obter o nome do usuário logado
const getUsuarioLogado = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (!userStr) return 'Usuário não identificado';
    const user = JSON.parse(userStr);
    return user.name || 'Usuário';
  } catch (e) {
    console.warn('Erro ao ler usuário', e);
    return 'Usuário';
  }
};

// ✅ Cliente Supabase para upload
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!
);

interface DiarioObra {
  id: number;
  obra_id: number;
  data: string; // ✅ Campo essencial para o PDF
  atividades: string[];
  observacoes: string;
  turnos: {
    manha: string;
    tarde: string;
    noite: string;
  };
  efetivos: string[];
  imagens: string[];
  status: string;
  created_at: string;
  elaborado_por?: string;
  dias_improdutivos?: number[];
}

interface Obra {
  id: number;
  nome: string;
  endereco?: string;
  "A R T"?: string | null;
  cno?: string | null;
  eng_responsavel?: string;
  proprietario?: string;
  data_inicio?: string | null;
  previsao_termino?: string | null;
  valor_previsto?: number;
  valor_realizado?: number;
}

export default function Diario() {
  const [diarios, setDiarios] = useState<DiarioObra[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroObra, setFiltroObra] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentDiario, setCurrentDiario] = useState<DiarioObra | null>(null);
  const [mostrarMapaChuvas, setMostrarMapaChuvas] = useState(false);
  const [mapaChuvasPreenchido, setMapaChuvasPreenchido] = useState(false);
  const [mapaChuvasId, setMapaChuvasId] = useState<number | null>(null); 
  const [diasImprodutivos, setDiasImprodutivos] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    obra_id: '',
    turno_manha: '',
    turno_tarde: '',
    turno_noite: '',
    observacoes: ''
  });

  const [registroDate, setRegistroDate] = useState(new Date().toISOString().split('T')[0]);

  const [atividades, setAtividades] = useState<string[]>(['']);
  const [ocorrencias, setOcorrencias] = useState<string[]>(['']);
  const [equipes, setEquipes] = useState<string[]>(['']);
  const [status, setStatus] = useState('Revisar');
  const [imagens, setImagens] = useState<File[]>([]);
  const [imagensPreview, setImagensPreview] = useState<string[]>([]);
  const [imagensExistentes, setImagensExistentes] = useState<string[]>([]); 
  const navigate = useNavigate();

  const carregarDiarios = useCallback(async () => {
  setLoading(true);
  try {
    let url = 'https://erp-minhas-obras-backend.onrender.com/diarios-obras?';
    const params = [];
    if (filtroObra) params.push(`obra_id=${filtroObra}`);
    if (filtroStatus) params.push(`status=${filtroStatus}`);
    if (params.length > 0) url += params.join('&');

    const resposta = await axios.get<DiarioObra[]>(url);
    console.log('Diários carregados:', resposta.data.map(d => d.id));
    setDiarios(resposta.data);
  } catch (falha) {
    if (falha instanceof Error) {
      alert('Falha ao carregar diários: ' + falha.message);
    } else {
      alert('Falha ao carregar diários: Erro desconhecido');
    }
  } finally {
    setLoading(false);
  }
}, [filtroObra, filtroStatus]); // ← dependências estáveis

  const carregarObras = useCallback(async () => {
  try {
    const resposta = await axios.get<Obra[]>('https://erp-minhas-obras-backend.onrender.com/obras');
    setObras(resposta.data);
  } catch (falha) {
    if (falha instanceof Error) {
      alert('Falha ao carregar obras: ' + falha.message);
    } else {
      alert('Falha ao carregar obras: Erro desconhecido');
    }
  }
}, []); // ← sem dependências

  const handleCreate = () => {
    setCurrentDiario(null);
    setMapaChuvasPreenchido(false); 
    setMostrarMapaChuvas(false);   
    setDiasImprodutivos([]); 
    setFormData({
      obra_id: '',
      turno_manha: '',
      turno_tarde: '',
      turno_noite: '',
      observacoes: ''
    });
    setRegistroDate(new Date().toISOString().split('T')[0]);
    setAtividades(['']);
    setOcorrencias(['']);
    setEquipes(['']);
    setStatus('Revisar');
    setImagens([]);
    setImagensPreview([]);
    setShowModal(true);
  };

  

  const handleEdit = async (diario: DiarioObra) => {
  setCurrentDiario(diario);
  setImagensExistentes(diario.imagens || []);
  setFormData({
    obra_id: diario.obra_id.toString(),
    turno_manha: diario.turnos?.manha || '',
    turno_tarde: diario.turnos?.tarde || '',
    turno_noite: diario.turnos?.noite || '',
    observacoes: diario.observacoes
  });

  setRegistroDate(diario.data);
  setAtividades(diario.atividades || ['']);
  setOcorrencias([]); // ⚠️ removido: agora tudo vai em "atividades"
  setEquipes(diario.efetivos || ['']);
  setStatus(diario.status);
  setImagensPreview(diario.imagens || []);
  setShowModal(true);
};

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja deletar este diário?')) return;

    try {
      await axios.delete(`https://erp-minhas-obras-backend.onrender.com/diarios-obras/${id}`);
      alert('Diário deletado com sucesso!');
      carregarDiarios();
    } catch (falha) {
      if (falha instanceof Error) {
        alert('Falha ao deletar diário: ' + falha.message);
      } else {
        alert('Falha ao deletar diário: Erro desconhecido');
      }
    }
  };

  const handleAddAtividade = () => {
    setAtividades([...atividades, '']);
  };

  const handleRemoveAtividade = (index: number) => {
    if (atividades.length > 1) {
      setAtividades(atividades.filter((_, i) => i !== index));
    }
  };

  const handleAtividadeChange = (index: number, value: string) => {
    const newAtividades = [...atividades];
    newAtividades[index] = value;
    setAtividades(newAtividades);
  };

  const handleAddOcorrencia = () => {
    setOcorrencias([...ocorrencias, '']);
  };

  const handleRemoveOcorrencia = (index: number) => {
    if (ocorrencias.length > 1) {
      setOcorrencias(ocorrencias.filter((_, i) => i !== index));
    }
  };

  const handleOcorrenciaChange = (index: number, value: string) => {
    const newOcorrencias = [...ocorrencias];
    newOcorrencias[index] = value;
    setOcorrencias(newOcorrencias);
  };

  const handleAddEquipe = () => {
    setEquipes([...equipes, '']);
  };

  const handleRemoveEquipe = (index: number) => {
    if (equipes.length > 1) {
      setEquipes(equipes.filter((_, i) => i !== index));
    }
  };

  const handleEquipeChange = (index: number, value: string) => {
    const newEquipes = [...equipes];
    newEquipes[index] = value;
    setEquipes(newEquipes);
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // 🔒 TRAVA: impede salvar sem preencher o mapa de chuvas
  if (!mapaChuvasPreenchido) {
    alert('⚠️ O Mapa de Chuvas é obrigatório. Por favor, preencha antes de salvar.');
    return;
  }
  try {
    // Junta atividades e ocorrências em um único array
    const todasAtividades = [
      ...atividades.filter(item => item.trim() !== ''),
      ...ocorrencias.filter(item => item.trim() !== '')
    ].filter(Boolean);



// Fazer upload das imagens para o Supabase Storage
let urlsImagens: string[] = [];

if (imagens.length > 0) {
  // ✅ Upload de novas imagens
  const uploads = imagens.map(async (file) => {
    const fileName = `diario-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase
      .storage
      .from('diario-obras')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = await supabase
      .storage
      .from('diario-obras')
      .getPublicUrl(fileName);

    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error('Falha ao gerar URL pública');
    return publicUrl;
  });

  urlsImagens = await Promise.all(uploads);
} else if (currentDiario) {
  // ✅ É edição e não há novas imagens → manter as existentes
  urlsImagens = imagensExistentes;
} else {
  // ✅ É criação e não há imagens → array vazio
  urlsImagens = [];
}
    const payload = {
  obra_id: parseInt(formData.obra_id),
  data: registroDate,
  turno_manha: formData.turno_manha,
  turno_tarde: formData.turno_tarde,
  turno_noite: formData.turno_noite,
  atividades: todasAtividades,
  equipes: equipes.filter(item => item.trim() !== ''),
  observacoes: formData.observacoes,
  imagens: urlsImagens,
  status,
  dias_improdutivos: mapaChuvasPreenchido ? diasImprodutivos : [], // ✅ agora funciona!
  elaborado_por: getUsuarioLogado(), // ✅ Corrigido
};

    if (currentDiario) {
      await axios.put(`https://erp-minhas-obras-backend.onrender.com/diarios-obras/${currentDiario.id}`, payload);
      alert('Diário atualizado com sucesso!');
    } else {
      await axios.post('https://erp-minhas-obras-backend.onrender.com/diarios-obras', payload);
      alert('Diário criado com sucesso!');
    }

    setShowModal(false);
    carregarDiarios();
  } catch (falha: any) {
    console.error('Erro detalhado:', falha.response?.data || falha.message);
    alert('Erro ao salvar: ' + (falha.response?.data?.error || falha.message));
  }
};

  // ✅ Mantém previews locais para o modal
  const handleImagensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 6);
      setImagens(files);
      const previews = files.map(file => URL.createObjectURL(file));
      setImagensPreview(previews);
    }
  };

// ... dentro do componente Diario ...

  const handleExportPDF = async (id: number) => {
  try {
    // 1. Buscar dados do diário
    const resDiario = await axios.get<DiarioObra>(`https://erp-minhas-obras-backend.onrender.com/diarios-obras/${id}`);
    const diario = resDiario.data;

    // 2. Buscar obra
    const resObra = await axios.get<Obra>(`https://erp-minhas-obras-backend.onrender.com/obras/${diario.obra_id}`);
    const obra = resObra.data;

    // 3. Preparar dados
    const atividades = Array.isArray(diario.atividades) ? diario.atividades : [];
    const efetivos = Array.isArray(diario.efetivos) ? diario.efetivos : [];
    const turnos = diario.turnos || { manha: '', tarde: '', noite: '' };
    const observacoes = diario.observacoes || '';
    const status = diario.status || 'Revisar';
    const dataFormatada = diario.data ? new Date(diario.data).toLocaleDateString('pt-BR') : '—';
    const elaboradoPor = diario.elaborado_por || '—';
    
    // Dados da obra com fallbacks
    const enderecoObra = obra.endereco || '—';
    const artObra = obra['A R T'] || '—';
    const cnoObra = obra.cno || '—';
    const engResp = obra.eng_responsavel || '–';
    
    // Dias improdutivos seguros
    const diasImprodutivos = Array.isArray(diario.dias_improdutivos) 
      ? diario.dias_improdutivos 
      : [];

    // 4. Função para gerar SVG do Mapa de Chuvas Circular
    const gerarSvgCircular = (diasImprodutivos: number[], totalDias: number) => {
      const r = 140; // raio
      const cx = 150;
      const cy = 150;
      const anguloTotal = 360;
      const anguloPorDia = anguloTotal / totalDias;
      const setores = [];
      for (let i = 0; i < totalDias; i++) {
        const dia = i + 1;
        const startAngle = (i * anguloPorDia - 90) * (Math.PI / 180);
        const endAngle = ((i + 1) * anguloPorDia - 90) * (Math.PI / 180);
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const cor = diasImprodutivos.includes(dia) ? '#ef4444' : '#10b981'; // vermelho ou verde
        const textoCor = diasImprodutivos.includes(dia) ? 'white' : 'white';
        const largeArcFlag = anguloPorDia > 180 ? 1 : 0;
        const pathData = [
          `M ${cx} ${cy}`,
          `L ${x1} ${y1}`,
          `A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
          'Z'
        ].join(' ');
        const textX = cx + (r - 25) * Math.cos((startAngle + endAngle) / 2);
        const textY = cy + (r - 25) * Math.sin((startAngle + endAngle) / 2);
        setores.push(`
          <path d="${pathData}" fill="${cor}" stroke="#e5e7eb" stroke-width="1"/>
          <text x="${textX}" y="${textY}" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="bold" fill="${textoCor}">${dia}</text>
        `);
      }
      return `
        <svg width="300" height="300" viewBox="0 0 300 300" style="margin: 10px auto;">
          ${setores.join('')}
        </svg>
      `;
    };

    // Calcular total de dias do mês
    const totalDiasMes = diario.data 
      ? new Date(parseInt(diario.data.substring(0, 4)), parseInt(diario.data.substring(5, 7)), 0).getDate()
      : 30;

    // 5. Criar elemento temporário
    const printArea = document.createElement('div');
    printArea.style.width = '210mm';
    printArea.style.padding = '15mm';
    printArea.style.boxSizing = 'border-box';
    printArea.style.fontFamily = 'Arial, sans-serif';
    printArea.style.fontSize = '10pt';
    printArea.style.color = '#333';
    printArea.innerHTML = `
      <div style="text-align:center; margin-bottom:20px; padding-bottom:15px; border-bottom:3px solid #1e40af;">
        <h1 style="font-size:18pt; margin:5px 0; color:#1e3a8a; font-weight:700;">ERP MINHAS OBRAS</h1>
      </div>
      <div style="text-align:center; font-weight:bold; font-size:14pt; margin:20px 0 25px; color:#1e3a8a; text-decoration:underline;">
        RELATÓRIO DIÁRIO DE OBRA (RDO)
      </div>
      
      <div style="margin:18px 0;">
        <strong>OBRA:</strong> ${obra.nome}<br>
        <strong>ENDEREÇO:</strong> ${enderecoObra}<br>
        <strong>ART:</strong> ${artObra}<br>
        <strong>CNO:</strong> ${cnoObra}<br>
        <strong>RESP. TÉCNICO:</strong> ${engResp}<br>
        <strong>DATA:</strong> ${dataFormatada}
      </div>

      <div style="margin:18px 0;">
  <div style="font-weight:bold; margin-bottom:10px; font-size:11pt; color:#1e3a8a;">• MAPA DE CHUVAS</div>
  <table style="width:100%; border-collapse:collapse; margin-top:6px;">
    <thead>
      <tr>
        <th style="border:1px solid #cbd5e1; padding:8px; background-color:#dbeafe; font-weight:bold; color:#1e40af;">Dias Improdutivos (Chuvosos)</th>
        <th style="border:1px solid #cbd5e1; padding:8px; background-color:#dbeafe; font-weight:bold; color:#1e40af;">Total de Dias Úteis</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border:1px solid #cbd5e1; padding:8px;">
          ${(diasImprodutivos.length > 0
            ? diasImprodutivos.map(d => d.toString().padStart(2, '0')).join(', ')
            : 'Nenhum')}
        </td>
        <td style="border:1px solid #cbd5e1; padding:8px;">
          ${(function() {
            if (!diario.data) return '—';
            const ano = parseInt(diario.data.substring(0, 4), 10);
            const mes = parseInt(diario.data.substring(5, 7), 10) - 1;
            const totalDias = new Date(ano, mes + 1, 0).getDate();
            const diasUteis = totalDias - diasImprodutivos.length;
            return `${diasUteis} / ${totalDias}`;
          })()}
        </td>
      </tr>
    </tbody>
  </table>
</div>

      <div style="margin:18px 0;">
        <div style="font-weight:bold; margin-bottom:10px; font-size:11pt; color:#1e3a8a;">• TURNOS</div>
        <div style="background:white; border:1px solid #94a3b8; border-radius:6px; padding:10px; margin:8px 0; min-height:30px; font-size:9.5pt;">
          <strong>Manhã:</strong> ${turnos.manha || '—'}
        </div>
        <div style="background:white; border:1px solid #94a3b8; border-radius:6px; padding:10px; margin:8px 0; min-height:30px; font-size:9.5pt;">
          <strong>Tarde:</strong> ${turnos.tarde || '—'}
        </div>
        <div style="background:white; border:1px solid #94a3b8; border-radius:6px; padding:10px; margin:8px 0; min-height:30px; font-size:9.5pt;">
          <strong>Noite:</strong> ${turnos.noite || '—'}
        </div>
      </div>

      <div style="margin:18px 0;">
        <div style="font-weight:bold; margin-bottom:10px; font-size:11pt; color:#1e3a8a;">• EQUIPES (EFETIVOS)</div>
        <table style="width:100%; border-collapse:collapse; margin-top:6px;">
          <thead><tr><th style="border:1px solid #cbd5e1; padding:8px; background-color:#dbeafe; font-weight:bold; color:#1e40af;">Função / Nome</th></tr></thead>
          <tbody>
            ${(efetivos.length > 0 ? efetivos.map(e => `<tr><td style="border:1px solid #cbd5e1; padding:8px;">${e}</td></tr>`).join('') : '<tr><td style="border:1px solid #cbd5e1; padding:8px;">—</td></tr>')}
          </tbody>
        </table>
      </div>

      <div style="margin:18px 0;">
        <div style="font-weight:bold; margin-bottom:10px; font-size:11pt; color:#1e3a8a;">• TAREFAS REALIZADAS</div>
        <table style="width:100%; border-collapse:collapse; margin-top:6px;">
          <thead><tr><th style="border:1px solid #cbd5e1; padding:8px; background-color:#dbeafe; font-weight:bold; color:#1e40af;">Descrição</th></tr></thead>
          <tbody>
            ${(atividades.length > 0 ? atividades.map(a => `<tr><td style="border:1px solid #cbd5e1; padding:8px;">${a}</td></tr>`).join('') : '<tr><td style="border:1px solid #cbd5e1; padding:8px;">—</td></tr>')}
          </tbody>
        </table>
      </div>

      <div style="margin:18px 0;">
        <div style="font-weight:bold; margin-bottom:10px; font-size:11pt; color:#1e3a8a;">• OCORRÊNCIAS</div>
        <table style="width:100%; border-collapse:collapse; margin-top:6px;">
          <thead><tr><th style="border:1px solid #cbd5e1; padding:8px; background-color:#dbeafe; font-weight:bold; color:#1e40af;">Descrição</th></tr></thead>
          <tbody>
            <tr><td style="border:1px solid #cbd5e1; padding:8px;">${observacoes || '—'}</td></tr>
          </tbody>
        </table>
      </div>

      <div style="margin:18px 0;">
        <div style="font-weight:bold; margin-bottom:10px; font-size:11pt; color:#1e3a8a;">• ELABORADO POR</div>
        <p><strong>Usuário:</strong> ${elaboradoPor}</p>
      </div>

      ${(Array.isArray(diario.imagens) && diario.imagens.length > 0) ? `
        <div style="margin-top:25px; page-break-before:always;">
          <div style="font-weight:bold; margin-bottom:10px; font-size:11pt; color:#1e3a8a; page-break-after:avoid;">• IMAGENS DA OBRA</div>
          <div style="display:flex; flex-wrap:wrap; gap:12px; margin-top:20px;">
            ${diario.imagens.map(url => url ? `<div style="width:calc((210mm - 30mm - 24px) / 3); height:80mm; display:flex; justify-content:center; align-items:center; box-sizing:border-box;">
              <img src="${url}" alt="Imagem da Obra" style="max-width:100%; max-height:100%; object-fit:contain; border:1px solid #ddd; border-radius:4px;">
            </div>` : '').join('')}
          </div>
        </div>
      ` : `
        <div style="margin-top:25px;">
          <div style="font-weight:bold; margin-bottom:10px; font-size:11pt; color:#1e3a8a;">• IMAGENS DA OBRA</div>
          <p style="color:#64748b; font-style:italic;">Nenhuma imagem anexada.</p>
        </div>
      `}

      <div style="text-align:center; font-weight:bold; margin-top:25px; padding:12px; 
        background-color: ${status === 'Aprovado' ? '#ecfdf5' : status === 'Reprovado' ? '#fef2f2' : '#fffbeb'};
        border:2px solid ${status === 'Aprovado' ? '#10b981' : status === 'Reprovado' ? '#ef4444' : '#f59e0b'};
        border-radius:8px; color: ${status === 'Aprovado' ? '#065f46' : status === 'Reprovado' ? '#b91c1c' : '#975a05'};
        font-size:12pt;">
        STATUS: ${status.toUpperCase()}
      </div>
    `;

    document.body.appendChild(printArea);

    const canvas = await html2canvas(printArea, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    });

    document.body.removeChild(printArea);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`diario-obra-${id}.pdf`);
  } catch (falha: any) {
    console.error('Erro ao exportar PDF:', falha);
    alert('Erro ao exportar PDF: ' + (falha.message || 'Verifique o console.'));
  }
};

// Função para exportar Mapa de Chuvas como PDF (frontend)
const exportarMapaChuvasPDF = async () => {
  if (!filtroObra) {
    alert('Selecione uma obra nos filtros primeiro.');
    return;
  }

  try {
    const resObra = await axios.get<Obra>(`https://erp-minhas-obras-backend.onrender.com/obras/${filtroObra}`);
    const obra = resObra.data;

    const hoje = new Date();
    const mesRef = hoje.toISOString().slice(0, 7);
    const ano = hoje.getFullYear();
    const mesNum = hoje.getMonth();
    const totalDias = new Date(ano, mesNum + 1, 0).getDate();

    const resDiarios = await axios.get<DiarioObra[]>(
      `https://erp-minhas-obras-backend.onrender.com/diarios-obras?obra_id=${filtroObra}`
    );

    const todosDiasImprodutivos = new Set<number>();
    resDiarios.data.forEach((diario) => {
      if (diario.data?.startsWith(mesRef) && Array.isArray(diario.dias_improdutivos)) {
        diario.dias_improdutivos.forEach((dia) => {
          if (typeof dia === 'number' && dia >= 1 && dia <= totalDias) {
            todosDiasImprodutivos.add(dia);
          }
        });
      }
    });

    // ✅ SVG com tamanho AUMENTADO
    const gerarSvg = (diasImprodutivos: Set<number>, totalDias: number) => {
      const r = 240; // ✅ Aumentado (era 140)
      const cx = 180; // ✅ Ajustado para centralizar com novo raio
      const cy = 180;
      let paths = '';
      for (let i = 0; i < totalDias; i++) {
        const dia = i + 1;
        const startAngle = (i / totalDias) * 360 - 90;
        const endAngle = ((i + 1) / totalDias) * 360 - 90;
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;

        const fill = diasImprodutivos.has(dia) ? '#3b82f6' : '#ffffff';
        const textFill = diasImprodutivos.has(dia) ? '#ffffff' : '#000000';

        const pathData = [
          `M ${cx} ${cy}`,
          `L ${x1} ${y1}`,
          `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
          'Z'
        ].join(' ');

        const textX = cx + (r - 32) * Math.cos((startRad + endRad) / 2);
        const textY = cy + (r - 32) * Math.sin((startRad + endRad) / 2);

        paths += `
          <path d="${pathData}" fill="${fill}" stroke="#e5e7eb" stroke-width="0.5"/>
          <text x="${textX}" y="${textY}" fill="${textFill}" font-size="16" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${dia}</text>
        `;
      }
      return `<svg width="380" height="380" viewBox="0 0 360 360">${paths}</svg>`;
    };

    // ✅ HTML com fontes maiores e margens ajustadas
    const html = `
      <div style="
        width: 210mm;
        min-height: 297mm;
        padding: 20mm 12mm; /* ✅ menos padding lateral para mais espaço */
        box-sizing: border-box;
        font-family: Arial, sans-serif;
        font-size: 14pt; /* ✅ aumentado */
        color: #333;
      ">
        <div style="text-align: center; margin-bottom: 25px; padding-bottom: 12px; border-bottom: 2px solid #1e40af;">
          <h1 style="font-size: 20pt; color: #1e3a8a; margin: 0;">MAPA DE CHUVAS</h1>
          <p style="font-size: 14pt;">${obra.nome} • ${mesRef}</p>
        </div>

        <div style="
          display: flex;
          justify-content: center;
          align-items: flex-start;
          margin: 20px 0 30px;
          min-height: 400px; /* ✅ mais altura */
        ">
          ${gerarSvg(todosDiasImprodutivos, totalDias)}
        </div>

        <div style="
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
          font-size: 14pt; /* ✅ aumentado */
        ">
          <p><strong>Período:</strong> ${mesRef}</p>
          <p><strong>Dias impraticáveis:</strong> ${todosDiasImprodutivos.size > 0 ? Array.from(todosDiasImprodutivos).join(', ') : 'Nenhum'}</p>
          <p><strong>Dias úteis:</strong> ${totalDias - todosDiasImprodutivos.size} / ${totalDias}</p>
        </div>

        <div style="
          text-align: center;
          margin-top: 30px;
          color: #64748b;
          font-size: 12pt; /* ✅ aumentado */
        ">
          Relatório gerado automaticamente pelo ERP Minhas Obras
        </div>
      </div>
    `;

    const printDiv = document.createElement('div');
    printDiv.innerHTML = html;
    document.body.appendChild(printDiv);

    const canvas = await html2canvas(printDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false
    });

    document.body.removeChild(printDiv);

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`mapa-chuvas-${obra.nome.replace(/\s+/g, '-')}-${mesRef}.pdf`);
  } catch (err) {
    console.error('Erro ao exportar Mapa de Chuvas:', err);
    alert('Erro ao gerar PDF. Verifique o console.');
  }
};
  const handleViewPDF = (diario: DiarioObra) => {
    navigate(`/diario/${diario.id}`);
  };

  useEffect(() => {
    if (!hasPermission('obras:read')) {
      alert('Você não tem permissão para acessar esta página.');
      navigate('/dashboard');
    }
    carregarDiarios();
    carregarObras();
  }, [navigate, carregarDiarios, carregarObras]);

  useEffect(() => {
    carregarDiarios();
  }, [filtroObra, filtroStatus, carregarDiarios]);

  const condicoesClimaticas = [
    { value: '', label: 'Selecione...' },
    { value: 'Ensolarado', label: 'Ensolarado' },
    { value: 'Chuvoso', label: 'Chuvoso' },
    { value: 'Nublado', label: 'Nublado' },
    { value: 'Praticável', label: 'Praticável' },
    { value: 'Impraticável', label: 'Impraticável' }
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Diário de Obra</h1>
        <div className="flex flex-wrap gap-3">
          {hasPermission('obras:write') && (
            <button
              onClick={handleCreate}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              <FiPlus className="mr-2" /> Novo Registro
            </button>
          )}
          <button
            onClick={carregarDiarios}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            <FiRefreshCw className={`mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Carregando...' : 'Atualizar'}
          </button>
          {/* Botão Exportar Mapa de Chuvas */}
<button
  onClick={exportarMapaChuvasPDF}
  disabled={!filtroObra}
  className={`flex items-center px-4 py-2 rounded-lg transition ${
    filtroObra
      ? 'bg-purple-600 text-white hover:bg-purple-700'
      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
  }`}
  title={!filtroObra ? 'Selecione uma obra primeiro' : 'Exportar Mapa de Chuvas do mês atual'}
>
  <FiDownload className="mr-2" /> Mapa de Chuvas
</button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Obra</label>
            <select
              value={filtroObra}
              onChange={(e) => setFiltroObra(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas as obras</option>
              {obras.map((obra) => (
                <option key={obra.id} value={obra.id}>{obra.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Status</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os status</option>
              <option value="Revisar">Revisar</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Reprovado">Reprovado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Diários */}
      {diarios.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow text-center">
          <FiFileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">Nenhum registro de diário encontrado.</p>
          {hasPermission('obras:write') && (
            <button
              onClick={handleCreate}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <FiPlus className="mr-2 inline" /> Criar Primeiro Registro
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
{diarios.map((diario) => (
   <div key={diario.id} className="bg-white py-2 mb-[-15px]">
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm px-3">
      <div className="flex items-center flex-1 min-w-0">
        <span className="text-gray-500 mr-2 whitespace-nowrap">
          {new Date(diario.created_at).toLocaleDateString('pt-BR')}
        </span>
        <span className="text-gray-900 truncate">
          {obras.find(o => o.id === diario.obra_id)?.nome || 'Obra não encontrada'}
        </span>
      </div>
      <span className={`inline-block px-1.5 py-0.5 text-xs rounded whitespace-nowrap ${
        diario.status === 'Aprovado' ? 'bg-green-100 text-green-800' :
        diario.status === 'Reprovado' ? 'bg-red-100 text-red-800' :
        'bg-yellow-100 text-yellow-800'
      }`}>
        {diario.status}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => handleViewPDF(diario)}
          className="p-1 text-gray-500 hover:text-blue-700 rounded"
          title="Ver Relatório"
        >
          <FiFileText className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleExportPDF(diario.id)}
          className="p-1 text-gray-500 hover:text-green-700 rounded"
          title="Exportar PDF"
        >
          <FiDownload className="w-3.5 h-3.5" />  
        </button>
        {hasPermission('obras:write') && (
          <>
            <button
              onClick={() => handleEdit(diario)}
              className="p-1 text-gray-500 hover:text-blue-700 rounded"
              title="Editar"
            >
              <FiEdit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleDelete(diario.id)}
              className="p-1 text-gray-500 hover:text-red-700 rounded"
              title="Deletar"
            >
              <FiTrash className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
    
  </div>
))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                {currentDiario ? 'Editar Diário de Obra' : 'Novo Registro Diário de Obra'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Obra *</label>
                    <select
                      name="obra_id"
                      value={formData.obra_id}
                      onChange={(e) => setFormData({ ...formData, obra_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Selecione uma obra</option>
                      {obras.map((obra) => (
                        <option key={obra.id} value={obra.id}>{obra.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                    <input
                      type="date"
                      value={registroDate}
                      onChange={(e) => setRegistroDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* === Mapa de Chuvas (Obrigatório) === */}
                  <div className="pt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🌧️ Mapa de Chuvas Mensal <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setMostrarMapaChuvas(true)}
                      className={`w-full py-2 px-3 text-left rounded-lg border ${
                        mapaChuvasPreenchido
                          ? 'border-green-500 bg-green-50 text-green-800'
                          : 'border-red-300 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {mapaChuvasPreenchido
                        ? '✅ Mapa de Chuvas preenchido'
                        : '📝 Clique para preencher o Mapa de Chuvas (obrigatório)'}
                    </button>
                  </div>

                {/* Turnos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Manhã</label>
                    <select
                      value={formData.turno_manha}
                      onChange={(e) => setFormData({ ...formData, turno_manha: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {condicoesClimaticas.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tarde</label>
                    <select
                      value={formData.turno_tarde}
                      onChange={(e) => setFormData({ ...formData, turno_tarde: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {condicoesClimaticas.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Noite</label>
                    <select
                      value={formData.turno_noite}
                      onChange={(e) => setFormData({ ...formData, turno_noite: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {condicoesClimaticas.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Equipes */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Equipes</label>
                    <button
                      type="button"
                      onClick={handleAddEquipe}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                    >
                      + Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {equipes.map((equipe, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={equipe}
                          onChange={(e) => handleEquipeChange(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Nome da equipe"
                        />
                        {equipes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveEquipe(index)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Atividades */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Atividades</label>
                    <button
                      type="button"
                      onClick={handleAddAtividade}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                    >
                      + Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {atividades.map((atividade, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={atividade}
                          onChange={(e) => handleAtividadeChange(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Descreva a atividade"
                        />
                        {atividades.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAtividade(index)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ocorrências */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Ocorrências</label>
                    <button
                      type="button"
                      onClick={handleAddOcorrencia}
                      className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                    >
                      + Adicionar
                    </button>
                  </div>
                  <div className="space-y-2">
                    {ocorrencias.map((ocorrencia, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={ocorrencia}
                          onChange={(e) => handleOcorrenciaChange(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Descreva a ocorrência"
                        />
                        {ocorrencias.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOcorrencia(index)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                  <textarea
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Revisar">Revisar</option>
                    <option value="Aprovado">Aprovado</option>
                    <option value="Reprovado">Reprovado</option>
                  </select>
                </div>

                {/* Upload de Fotos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">📸 Fotos (máximo 6)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImagensChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {imagensPreview.length > 0 && (
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                      {imagensPreview.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-20 object-cover rounded border"
                        />
                      ))}
                    </div>
                  )}

                  {/* ✅ Exibe o nome do preenchedor no rodapé, abaixo das fotos */}
{(currentDiario?.elaborado_por || (!currentDiario && getUsuarioLogado())) && (
  <div style={{
    marginTop: '15px',
    padding: '8px',
    backgroundColor: '#f0f4f8',
    borderRadius: '4px',
    fontSize: '14px',
    textAlign: 'left',
    border: '1px solid #ccc'
  }}>
    <strong>Elaborado por:</strong> {currentDiario?.elaborado_por || getUsuarioLogado()}
  </div>
)}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                  >
                    {currentDiario ? 'Atualizar' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal do Mapa de Chuvas */}
        {mostrarMapaChuvas && (
  <MapaChuvas
    obraNome={obras.find(o => o.id === parseInt(formData.obra_id))?.nome}
    dataReferencia={registroDate.slice(0, 7)}
    diasImprodutivosIniciais={diasImprodutivos} // opcional: para edição futura
    onConfirmar={(dias) => {
      setDiasImprodutivos(dias); // ← salva no estado do Diario.tsx
      setMapaChuvasPreenchido(true);
      setMostrarMapaChuvas(false);
    }}
    onCancel={() => setMostrarMapaChuvas(false)}
  />
)}
    </div>
  );
}