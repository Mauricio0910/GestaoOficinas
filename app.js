/* OficinaPro OS - MVP PWA
   Persistência principal: Firebase Cloud Firestore quando configurado.
   Fallback: localStorage para desenvolvimento sem Firebase.
   Sem integração SENATRAN nesta versão. Estrutura preparada para API futura. */

import { firebaseStore } from './firebase-db.js';

const STORAGE_KEY = 'oficinapro_os_mvp_v1';

const statusLabels = {
  ABERTA: 'Aberta',
  DIAGNOSTICO: 'Em diagnóstico',
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  APROVADA: 'Aprovada',
  EM_EXECUCAO: 'Em execução',
  AGUARDANDO_PECAS: 'Aguardando peças',
  FINALIZADA: 'Finalizada',
  FATURADA: 'Faturada',
  CANCELADA: 'Cancelada'
};

let db = null;
let currentUser = null;
let activeTab = 'dashboard';
let signatureCanvasState = null;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

document.addEventListener('DOMContentLoaded', async () => {
  try {
    $('#loginView')?.classList.remove('hidden');
    db = await loadDb();
    bindGlobalEvents();
    restoreSession();
    registerServiceWorker();
    updateStorageStatus();
  } catch (err) {
    console.error(err);
    toast('Falha ao iniciar a aplicação. Verifique a configuração do Firebase.');
  }
});

function uuid() {
  return 'id-' + crypto.getRandomValues(new Uint32Array(4)).join('-') + '-' + Date.now();
}

function nowIso() {
  return new Date().toISOString();
}

function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('pt-BR');
}

function formatDateShort(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('pt-BR');
}

function money(v) {
  const n = Number(v || 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function number(v) {
  return Number(v || 0);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => el.classList.add('hidden'), 2600);
}

const DEFECT_AREAS = [
  'Dianteira', 'Capô', 'Para-brisa', 'Teto', 'Porta dianteira esquerda',
  'Porta traseira esquerda', 'Lateral esquerda', 'Porta dianteira direita',
  'Porta traseira direita', 'Lateral direita', 'Para-lama dianteiro',
  'Para-lama traseiro', 'Traseira', 'Porta-malas', 'Lanterna/farol',
  'Roda/pneu', 'Interior', 'Motor', 'Suspensão', 'Freios', 'Elétrica'
];

const DEFECT_TYPES = [
  'Risco', 'Amassado', 'Quebrado', 'Pintura descascada', 'Vidro trincado',
  'Pneu danificado', 'Vazamento', 'Barulho', 'Falha elétrica', 'Falha mecânica',
  'Peça ausente', 'Desgaste', 'Folga', 'Superaquecimento', 'Outro'
];

function years(from, to = 2026) {
  const out = [];
  for (let y = to; y >= from; y--) out.push(y);
  return out;
}

function vehicleCatalog() {
  return [
    { id: 'vw-gol', marca: 'Volkswagen', modelo: 'Gol', carroceria: 'Hatch', anos: years(1995, 2023), combustiveis: ['Flex', 'Gasolina'] },
    { id: 'vw-voyage', marca: 'Volkswagen', modelo: 'Voyage', carroceria: 'Sedã', anos: years(2009, 2023), combustiveis: ['Flex'] },
    { id: 'vw-polo', marca: 'Volkswagen', modelo: 'Polo', carroceria: 'Hatch', anos: years(2003, 2026), combustiveis: ['Flex'] },
    { id: 'vw-virtus', marca: 'Volkswagen', modelo: 'Virtus', carroceria: 'Sedã', anos: years(2018, 2026), combustiveis: ['Flex'] },
    { id: 'vw-tcross', marca: 'Volkswagen', modelo: 'T-Cross', carroceria: 'SUV', anos: years(2019, 2026), combustiveis: ['Flex'] },

    { id: 'fiat-uno', marca: 'Fiat', modelo: 'Uno', carroceria: 'Hatch', anos: years(1995, 2021), combustiveis: ['Flex', 'Gasolina'] },
    { id: 'fiat-palio', marca: 'Fiat', modelo: 'Palio', carroceria: 'Hatch', anos: years(1996, 2017), combustiveis: ['Flex', 'Gasolina'] },
    { id: 'fiat-argo', marca: 'Fiat', modelo: 'Argo', carroceria: 'Hatch', anos: years(2018, 2026), combustiveis: ['Flex'] },
    { id: 'fiat-cronos', marca: 'Fiat', modelo: 'Cronos', carroceria: 'Sedã', anos: years(2018, 2026), combustiveis: ['Flex'] },
    { id: 'fiat-strada', marca: 'Fiat', modelo: 'Strada', carroceria: 'Picape', anos: years(1998, 2026), combustiveis: ['Flex', 'Diesel'] },
    { id: 'fiat-toro', marca: 'Fiat', modelo: 'Toro', carroceria: 'Picape', anos: years(2016, 2026), combustiveis: ['Flex', 'Diesel'] },

    { id: 'gm-celta', marca: 'Chevrolet', modelo: 'Celta', carroceria: 'Hatch', anos: years(2001, 2016), combustiveis: ['Flex', 'Gasolina'] },
    { id: 'gm-onix', marca: 'Chevrolet', modelo: 'Onix', carroceria: 'Hatch', anos: years(2013, 2026), combustiveis: ['Flex'] },
    { id: 'gm-onix-plus', marca: 'Chevrolet', modelo: 'Onix Plus', carroceria: 'Sedã', anos: years(2020, 2026), combustiveis: ['Flex'] },
    { id: 'gm-prisma', marca: 'Chevrolet', modelo: 'Prisma', carroceria: 'Sedã', anos: years(2007, 2019), combustiveis: ['Flex'] },
    { id: 'gm-cruze', marca: 'Chevrolet', modelo: 'Cruze', carroceria: 'Sedã/Hatch', anos: years(2012, 2023), combustiveis: ['Flex'] },
    { id: 'gm-s10', marca: 'Chevrolet', modelo: 'S10', carroceria: 'Picape', anos: years(1995, 2026), combustiveis: ['Flex', 'Diesel'] },
    { id: 'gm-tracker', marca: 'Chevrolet', modelo: 'Tracker', carroceria: 'SUV', anos: years(2014, 2026), combustiveis: ['Flex'] },

    { id: 'ford-ka', marca: 'Ford', modelo: 'Ka', carroceria: 'Hatch', anos: years(1997, 2021), combustiveis: ['Flex', 'Gasolina'] },
    { id: 'ford-fiesta', marca: 'Ford', modelo: 'Fiesta', carroceria: 'Hatch/Sedã', anos: years(1996, 2019), combustiveis: ['Flex', 'Gasolina'] },
    { id: 'ford-ecosport', marca: 'Ford', modelo: 'EcoSport', carroceria: 'SUV', anos: years(2003, 2021), combustiveis: ['Flex'] },
    { id: 'ford-ranger', marca: 'Ford', modelo: 'Ranger', carroceria: 'Picape', anos: years(1995, 2026), combustiveis: ['Diesel', 'Flex'] },

    { id: 'toyota-corolla', marca: 'Toyota', modelo: 'Corolla', carroceria: 'Sedã', anos: years(1998, 2026), combustiveis: ['Flex', 'Híbrido', 'Gasolina'] },
    { id: 'toyota-etios', marca: 'Toyota', modelo: 'Etios', carroceria: 'Hatch/Sedã', anos: years(2013, 2021), combustiveis: ['Flex'] },
    { id: 'toyota-yaris', marca: 'Toyota', modelo: 'Yaris', carroceria: 'Hatch/Sedã', anos: years(2018, 2026), combustiveis: ['Flex'] },
    { id: 'toyota-hilux', marca: 'Toyota', modelo: 'Hilux', carroceria: 'Picape', anos: years(1995, 2026), combustiveis: ['Diesel', 'Flex'] },
    { id: 'toyota-sw4', marca: 'Toyota', modelo: 'SW4', carroceria: 'SUV', anos: years(1995, 2026), combustiveis: ['Diesel', 'Flex'] },

    { id: 'honda-civic', marca: 'Honda', modelo: 'Civic', carroceria: 'Sedã', anos: years(1995, 2026), combustiveis: ['Flex', 'Gasolina', 'Híbrido'] },
    { id: 'honda-fit', marca: 'Honda', modelo: 'Fit', carroceria: 'Monovolume/Hatch', anos: years(2004, 2021), combustiveis: ['Flex', 'Gasolina'] },
    { id: 'honda-city', marca: 'Honda', modelo: 'City', carroceria: 'Hatch/Sedã', anos: years(2010, 2026), combustiveis: ['Flex'] },
    { id: 'honda-hrv', marca: 'Honda', modelo: 'HR-V', carroceria: 'SUV', anos: years(2016, 2026), combustiveis: ['Flex'] },

    { id: 'hyundai-hb20', marca: 'Hyundai', modelo: 'HB20', carroceria: 'Hatch', anos: years(2013, 2026), combustiveis: ['Flex'] },
    { id: 'hyundai-hb20s', marca: 'Hyundai', modelo: 'HB20S', carroceria: 'Sedã', anos: years(2013, 2026), combustiveis: ['Flex'] },
    { id: 'hyundai-creta', marca: 'Hyundai', modelo: 'Creta', carroceria: 'SUV', anos: years(2017, 2026), combustiveis: ['Flex'] },
    { id: 'hyundai-tucson', marca: 'Hyundai', modelo: 'Tucson', carroceria: 'SUV', anos: years(2005, 2026), combustiveis: ['Flex', 'Gasolina'] },

    { id: 'renault-kwid', marca: 'Renault', modelo: 'Kwid', carroceria: 'Hatch', anos: years(2018, 2026), combustiveis: ['Flex'] },
    { id: 'renault-sandero', marca: 'Renault', modelo: 'Sandero', carroceria: 'Hatch', anos: years(2008, 2024), combustiveis: ['Flex'] },
    { id: 'renault-logan', marca: 'Renault', modelo: 'Logan', carroceria: 'Sedã', anos: years(2008, 2024), combustiveis: ['Flex'] },
    { id: 'renault-duster', marca: 'Renault', modelo: 'Duster', carroceria: 'SUV', anos: years(2012, 2026), combustiveis: ['Flex'] },
    { id: 'renault-oroch', marca: 'Renault', modelo: 'Oroch', carroceria: 'Picape', anos: years(2016, 2026), combustiveis: ['Flex'] },

    { id: 'jeep-renegade', marca: 'Jeep', modelo: 'Renegade', carroceria: 'SUV', anos: years(2015, 2026), combustiveis: ['Flex', 'Diesel'] },
    { id: 'jeep-compass', marca: 'Jeep', modelo: 'Compass', carroceria: 'SUV', anos: years(2017, 2026), combustiveis: ['Flex', 'Diesel', 'Híbrido'] },
    { id: 'jeep-commander', marca: 'Jeep', modelo: 'Commander', carroceria: 'SUV', anos: years(2022, 2026), combustiveis: ['Flex', 'Diesel'] },

    { id: 'nissan-march', marca: 'Nissan', modelo: 'March', carroceria: 'Hatch', anos: years(2012, 2021), combustiveis: ['Flex'] },
    { id: 'nissan-versa', marca: 'Nissan', modelo: 'Versa', carroceria: 'Sedã', anos: years(2012, 2026), combustiveis: ['Flex'] },
    { id: 'nissan-kicks', marca: 'Nissan', modelo: 'Kicks', carroceria: 'SUV', anos: years(2017, 2026), combustiveis: ['Flex'] },
    { id: 'nissan-frontier', marca: 'Nissan', modelo: 'Frontier', carroceria: 'Picape', anos: years(2003, 2026), combustiveis: ['Diesel'] },

    { id: 'peugeot-208', marca: 'Peugeot', modelo: '208', carroceria: 'Hatch', anos: years(2014, 2026), combustiveis: ['Flex', 'Elétrico'] },
    { id: 'peugeot-2008', marca: 'Peugeot', modelo: '2008', carroceria: 'SUV', anos: years(2016, 2026), combustiveis: ['Flex', 'Elétrico'] },
    { id: 'citroen-c3', marca: 'Citroën', modelo: 'C3', carroceria: 'Hatch', anos: years(2003, 2026), combustiveis: ['Flex'] },
    { id: 'citroen-aircross', marca: 'Citroën', modelo: 'Aircross', carroceria: 'SUV/Minivan', anos: years(2011, 2026), combustiveis: ['Flex'] },

    { id: 'mitsubishi-l200', marca: 'Mitsubishi', modelo: 'L200 Triton', carroceria: 'Picape', anos: years(2003, 2026), combustiveis: ['Diesel'] },
    { id: 'mitsubishi-asx', marca: 'Mitsubishi', modelo: 'ASX', carroceria: 'SUV', anos: years(2011, 2022), combustiveis: ['Gasolina', 'Flex'] },
    { id: 'kia-sportage', marca: 'Kia', modelo: 'Sportage', carroceria: 'SUV', anos: years(1998, 2026), combustiveis: ['Gasolina', 'Flex', 'Híbrido'] }
  ];
}

function normalizeDb(database) {
  const d = database || demoDb();
  d.config = d.config || {};
  d.users = Array.isArray(d.users) ? d.users : [];
  d.clientes = Array.isArray(d.clientes) ? d.clientes : [];
  d.veiculos = Array.isArray(d.veiculos) ? d.veiculos : [];
  d.servicos = Array.isArray(d.servicos) ? d.servicos : [];
  d.pecas = Array.isArray(d.pecas) ? d.pecas : [];
  d.ordens = Array.isArray(d.ordens) ? d.ordens : [];
  d.logs = Array.isArray(d.logs) ? d.logs : [];
  d.catalogoVeiculos = Array.isArray(d.catalogoVeiculos) && d.catalogoVeiculos.length ? d.catalogoVeiculos : vehicleCatalog();

  d.veiculos.forEach(v => {
    v.origemDados = v.origemDados || 'MANUAL';
    v.catalogoId = v.catalogoId || '';
  });

  d.ordens.forEach(o => {
    o.servicos = Array.isArray(o.servicos) ? o.servicos : [];
    o.pecas = Array.isArray(o.pecas) ? o.pecas : [];
    o.checklist = o.checklist || { entrada: null, saida: null };
    if (o.checklist.entrada) {
      o.checklist.entrada.marcacoes = Array.isArray(o.checklist.entrada.marcacoes) ? o.checklist.entrada.marcacoes : [];
      o.checklist.entrada.marcacoes.forEach(m => {
        m.area = m.area || 'Diagrama';
        m.tipo = m.tipo || 'Outro';
        m.gravidade = m.gravidade || 'Leve';
        m.status = m.status || 'Pendente';
        m.fotoUrl = m.fotoUrl || '';
      });
    }
  });

  return d;
}

function getVehicleCatalog() {
  return Array.isArray(db?.catalogoVeiculos) && db.catalogoVeiculos.length ? db.catalogoVeiculos : vehicleCatalog();
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
}

function getCatalogMarcas() {
  return uniqueSorted(getVehicleCatalog().map(v => v.marca));
}

function getCatalogModelos(marca) {
  return getVehicleCatalog()
    .filter(v => !marca || v.marca === marca)
    .sort((a, b) => `${a.marca} ${a.modelo}`.localeCompare(`${b.marca} ${b.modelo}`, 'pt-BR'));
}

function getCatalogItem(id) {
  return getVehicleCatalog().find(v => v.id === id);
}

function buildVehicleName(v) {
  if (!v) return '-';
  const ano = v.anoModelo || v.anoFabricacao || '';
  return `${v.marca || ''} ${v.modelo || ''}${ano ? ` ${ano}` : ''}`.trim() || '-';
}

function detectAreaByPoint(x, y) {
  const nx = Number(x);
  const ny = Number(y);

  if (ny < 24) return 'Teto';
  if (nx < 20 && ny < 65) return 'Dianteira';
  if (nx > 80 && ny < 65) return 'Traseira';
  if (ny > 68 && (nx < 34 || nx > 66)) return 'Roda/pneu';
  if (ny > 68) return 'Suspensão';
  if (nx < 43) return 'Lateral esquerda';
  if (nx > 57) return 'Lateral direita';
  return 'Porta/centro do veículo';
}

function defectSeverityClass(gravidade) {
  const g = String(gravidade || '').toLowerCase();
  if (g.includes('grave')) return 'grave';
  if (g.includes('média') || g.includes('media')) return 'media';
  return 'leve';
}


function demoDb() {
  const adminId = uuid();
  const mecId = uuid();
  const cli1 = uuid();
  const cli2 = uuid();
  const vei1 = uuid();
  const vei2 = uuid();
  const serv1 = uuid();
  const serv2 = uuid();
  const peca1 = uuid();
  const peca2 = uuid();
  const os1 = uuid();

  return {
    config: {
      nomeFantasia: 'Oficina Modelo',
      cnpj: '00000000000000',
      telefone: '(11) 99999-0000',
      email: 'contato@oficina.com',
      endereco: 'Rua Exemplo, 100 - Centro',
      garantiaPadraoDias: 90,
      comissaoPadrao: 10
    },
    session: null,
    catalogoVeiculos: vehicleCatalog(),
    users: [
      { id: adminId, nome: 'Administrador', email: 'admin@oficina.com', senha: 'admin123', perfil: 'ADMIN', ativo: true, criadoEm: nowIso() },
      { id: mecId, nome: 'João Mecânico', email: 'mecanico@oficina.com', senha: '123456', perfil: 'MECANICO', ativo: true, criadoEm: nowIso() }
    ],
    clientes: [
      { id: cli1, tipoPessoa: 'F', nome: 'Carlos Silva', cpfCnpj: '12345678900', telefone: '(11) 98888-1000', whatsapp: '(11) 98888-1000', email: 'carlos@email.com', endereco: 'Rua A, 10', consentimentoLgpd: true, criadoEm: nowIso() },
      { id: cli2, tipoPessoa: 'F', nome: 'Mariana Costa', cpfCnpj: '22233344455', telefone: '(11) 97777-2000', whatsapp: '(11) 97777-2000', email: 'mariana@email.com', endereco: 'Rua B, 20', consentimentoLgpd: true, criadoEm: nowIso() }
    ],
    veiculos: [
      { id: vei1, clienteId: cli1, placa: 'ABC1D23', chassi: '', renavam: '', catalogoId: 'toyota-corolla', marca: 'Toyota', modelo: 'Corolla', anoFabricacao: 2019, anoModelo: 2020, cor: 'Prata', combustivel: 'Flex', kmAtual: 65800, origemDados: 'MANUAL', criadoEm: nowIso() },
      { id: vei2, clienteId: cli2, placa: 'XYZ9A87', chassi: '', renavam: '', catalogoId: 'honda-civic', marca: 'Honda', modelo: 'Civic', anoFabricacao: 2018, anoModelo: 2018, cor: 'Preto', combustivel: 'Flex', kmAtual: 82500, origemDados: 'MANUAL', criadoEm: nowIso() }
    ],
    servicos: [
      { id: serv1, descricao: 'Troca de óleo e filtro', valorPadrao: 120, garantiaDias: 30, comissaoPercentual: 5, ativo: true },
      { id: serv2, descricao: 'Diagnóstico eletrônico', valorPadrao: 180, garantiaDias: 15, comissaoPercentual: 10, ativo: true }
    ],
    pecas: [
      { id: peca1, sku: 'OLEO-5W30', descricao: 'Óleo 5W30 sintético 1L', custo: 32, precoVenda: 52, estoqueAtual: 12, estoqueMinimo: 5, ativo: true },
      { id: peca2, sku: 'FILT-OLEO-001', descricao: 'Filtro de óleo', custo: 25, precoVenda: 45, estoqueAtual: 3, estoqueMinimo: 5, ativo: true }
    ],
    ordens: [
      {
        id: os1,
        numero: 1001,
        clienteId: cli1,
        veiculoId: vei1,
        status: 'AGUARDANDO_APROVACAO',
        kmEntrada: 65820,
        reclamacao: 'Cliente relata barulho na suspensão e solicita revisão geral.',
        diagnostico: 'Necessário verificar buchas, bieletas e amortecedores.',
        previsaoEntrega: '',
        criadoPor: adminId,
        dataAbertura: nowIso(),
        dataFechamento: '',
        servicos: [{ id: uuid(), servicoId: serv2, mecanicoId: mecId, descricao: 'Diagnóstico eletrônico', quantidade: 1, valorUnitario: 180, comissaoPercentual: 10 }],
        pecas: [],
        checklist: { entrada: { combustivel: 50, estepe: true, macaco: true, chaveRoda: true, observacoes: 'Veículo com pequenos riscos laterais.', marcacoes: [{ id: uuid(), area: 'Lateral esquerda', tipo: 'Risco', x: 36, y: 44, obs: 'Risco superficial', fotoUrl: '' }], assinatura: '' }, saida: null },
        garantia: null,
        aprovadoEm: '',
        faturadoEm: ''
      }
    ],
    logs: []
  };
}

async function loadDb() {
  let initialized = false;

  try {
    initialized = await firebaseStore.init();
  } catch (err) {
    console.error('Falha ao inicializar Firebase:', err);
    firebaseStore.enabled = false;
    firebaseStore.permissionError = false;
    toast('Firebase não inicializou. Usando banco local temporário.');
  }

  if (initialized) {
    try {
      const cloudDb = await firebaseStore.loadOrSeed(demoDb());
      cloudDb.session = localStorage.getItem(`${STORAGE_KEY}_session`) || null;
      localStorage.setItem(`${STORAGE_KEY}_cache`, JSON.stringify(cloudDb));
      return normalizeDb(cloudDb);
    } catch (err) {
      console.error('Falha ao carregar Firestore:', err);

      const code = String(err?.code || err?.message || '').toLowerCase();
      firebaseStore.permissionError = code.includes('permission') || code.includes('permission-denied');
      firebaseStore.enabled = false;

      if (firebaseStore.permissionError) {
        toast('Firestore bloqueado por regras. Usando cache/local até publicar as regras de teste.');
      } else {
        toast('Não foi possível ler o Firestore. Usando cache/local temporário.');
      }

      const cached = localStorage.getItem(`${STORAGE_KEY}_cache`) || localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          parsed.session = localStorage.getItem(`${STORAGE_KEY}_session`) || parsed.session || null;
          return normalizeDb(parsed);
        } catch {
          // Continua para recriar a base demo local.
        }
      }

      const d = demoDb();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
      return normalizeDb(d);
    }
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const d = demoDb();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    return normalizeDb(d);
  }
  try {
    return normalizeDb(JSON.parse(raw));
  } catch {
    const d = demoDb();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    return normalizeDb(d);
  }
}

function saveDb() {
  if (!db) return;

  if (firebaseStore.enabled) {
    const snapshot = JSON.parse(JSON.stringify({ ...db, session: null }));
    localStorage.setItem(`${STORAGE_KEY}_cache`, JSON.stringify(snapshot));
    firebaseStore.save(snapshot).catch(err => {
      console.error(err);
      toast('Não foi possível salvar no Firebase. Alterações mantidas no cache local.');
    });
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function updateStorageStatus() {
  const el = $('#storageStatus');
  if (!el) return;
  if (firebaseStore.enabled) {
    el.innerHTML = `<b>Banco atual:</b> Firebase Cloud Firestore · Tenant: <code>${escapeHtml(firebaseStore.tenantId)}</code>`;
  } else if (firebaseStore.permissionError) {
    el.innerHTML = `<b>Banco atual:</b> LocalStorage/cache. O Firestore recusou acesso por regras. Publique <code>firebase/firestore.dev.rules</code> para testar.`;
  } else {
    el.innerHTML = `<b>Banco atual:</b> LocalStorage. Configure <code>firebase-config.js</code> para usar Firebase.`;
  }
}

function logAction(entidade, idEntidade, acao, dadosAntes, dadosDepois) {
  db.logs.unshift({
    id: uuid(),
    entidade,
    idEntidade,
    acao,
    usuarioId: currentUser?.id || null,
    usuarioNome: currentUser?.nome || 'Sistema',
    dadosAntes: dadosAntes ? JSON.parse(JSON.stringify(dadosAntes)) : null,
    dadosDepois: dadosDepois ? JSON.parse(JSON.stringify(dadosDepois)) : null,
    data: nowIso()
  });
  saveDb();
}

function restoreSession() {
  const sessionId = firebaseStore.enabled
    ? localStorage.getItem(`${STORAGE_KEY}_session`)
    : db.session;

  if (sessionId) {
    currentUser = db.users.find(u => u.id === sessionId && u.ativo);
  }

  if (currentUser) {
    showMain();
  } else {
    $('#loginView').classList.remove('hidden');
    $('#mainView').classList.add('hidden');
  }
}

function bindGlobalEvents() {
  $('#loginForm').addEventListener('submit', ev => {
    ev.preventDefault();
    const email = $('#loginEmail').value.trim().toLowerCase();
    const senha = $('#loginSenha').value;
    const user = db.users.find(u => u.email.toLowerCase() === email && u.senha === senha && u.ativo);
    if (!user) return toast('Usuário ou senha inválidos.');
    currentUser = user;
    db.session = user.id;
    localStorage.setItem(`${STORAGE_KEY}_session`, user.id);
    saveDb();
    logAction('usuarios', user.id, 'LOGIN', null, { email: user.email });
    showMain();
  });

  $('#btnLogout').addEventListener('click', () => {
    logAction('usuarios', currentUser?.id, 'LOGOUT', null, null);
    currentUser = null;
    db.session = null;
    localStorage.removeItem(`${STORAGE_KEY}_session`);
    saveDb();
    $('#loginView').classList.remove('hidden');
    $('#mainView').classList.add('hidden');
  });

  $('#navTabs').addEventListener('click', ev => {
    const btn = ev.target.closest('button[data-tab]');
    if (btn) selectTab(btn.dataset.tab);
  });

  document.body.addEventListener('click', ev => {
    const shortcut = ev.target.closest('[data-tab-shortcut]');
    if (shortcut) selectTab(shortcut.dataset.tabShortcut);
  });

  $('#mobileMenu').addEventListener('click', () => $('.sidebar').classList.toggle('open'));

  $('#modalClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', ev => {
    if (ev.target.id === 'modal') closeModal();
  });

  bindCrudButtons();
  bindFilters();
  bindConfig();
}

function showMain() {
  $('#loginView').classList.add('hidden');
  $('#mainView').classList.remove('hidden');
  $('#empresaNome').textContent = db.config.nomeFantasia;
  $('#currentUserBadge').textContent = `${currentUser.nome} · ${currentUser.perfil}`;
  selectTab(activeTab);
}

function selectTab(tab) {
  activeTab = tab;
  $$('#navTabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  $$('.tab').forEach(t => t.classList.remove('active'));
  $(`#tab-${tab}`).classList.add('active');
  const titles = {
    dashboard: ['Dashboard', 'Visão geral da oficina'],
    ordens: ['Ordens de Serviço', 'Abertura, orçamento, checklist e faturamento'],
    clientes: ['Clientes', 'Cadastro e histórico'],
    veiculos: ['Veículos', 'Cadastro manual preparado para integração futura'],
    servicos: ['Serviços', 'Tabela de mão de obra e garantias'],
    pecas: ['Peças / Estoque', 'Controle simples de estoque'],
    comissoes: ['Comissões', 'Apuração por mecânico'],
    logs: ['Logs', 'Auditoria de ações do sistema'],
    usuarios: ['Usuários', 'Acessos e perfis'],
    config: ['Configurações', 'Dados da oficina e backup']
  };
  $('#screenTitle').textContent = titles[tab][0];
  $('#screenSubtitle').textContent = titles[tab][1];
  $('.sidebar').classList.remove('open');
  renderAll();
}

function bindFilters() {
  ['filtroOs','filtroCliente','filtroVeiculo','filtroServico','filtroPeca','filtroLog','filtroUsuario'].forEach(id => {
    const el = $('#' + id);
    if (el) el.addEventListener('input', renderAll);
  });
  $('#filtroMesComissao').addEventListener('change', renderComissoes);
}

function bindCrudButtons() {
  $('#btnNovaOs').addEventListener('click', () => openOsForm());
  $('#btnNovoCliente').addEventListener('click', () => openClienteForm());
  $('#btnNovoVeiculo').addEventListener('click', () => openVeiculoForm());
  $('#btnNovoServico').addEventListener('click', () => openServicoForm());
  $('#btnNovaPeca').addEventListener('click', () => openPecaForm());
  $('#btnNovoUsuario').addEventListener('click', () => openUsuarioForm());
  $('#btnLimparLogs').addEventListener('click', () => {
    if (confirm('Deseja limpar todos os logs locais deste MVP?')) {
      db.logs = [];
      saveDb();
      renderLogs();
      toast('Logs limpos.');
    }
  });
  $('#btnExportComissao').addEventListener('click', exportComissoesCsv);
}

function bindConfig() {
  $('#formConfig').addEventListener('submit', ev => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const before = { ...db.config };
    db.config = {
      nomeFantasia: fd.get('nomeFantasia'),
      cnpj: fd.get('cnpj'),
      telefone: fd.get('telefone'),
      email: fd.get('email'),
      endereco: fd.get('endereco'),
      garantiaPadraoDias: Number(fd.get('garantiaPadraoDias') || 0),
      comissaoPadrao: Number(fd.get('comissaoPadrao') || 0)
    };
    saveDb();
    logAction('config', null, 'ALTERAR', before, db.config);
    $('#empresaNome').textContent = db.config.nomeFantasia;
    toast('Configurações salvas.');
  });

  $('#btnExportBackup').addEventListener('click', () => {
    downloadText(`backup-oficinapro-${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(db, null, 2), 'application/json');
  });

  $('#inputImportBackup').addEventListener('change', ev => {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!imported.users || !imported.ordens) throw new Error('Arquivo inválido');
        db = imported;
        saveDb();
        currentUser = db.users.find(u => u.id === db.session) || db.users[0];
        db.session = currentUser?.id || null;
        if (db.session) localStorage.setItem(`${STORAGE_KEY}_session`, db.session);
        saveDb();
        toast('Backup importado.');
        showMain();
      } catch {
        toast('Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
  });

  $('#btnResetDemo').addEventListener('click', () => {
    if (confirm('Restaurar a base demo apagará os dados atuais deste ambiente. Continuar?')) {
      db = demoDb();
      currentUser = null;
      db.session = null;
      localStorage.removeItem(`${STORAGE_KEY}_session`);
      saveDb();
      restoreSession();
      updateStorageStatus();
      toast('Base demo restaurada.');
    }
  });
}

function renderAll() {
  if (!currentUser) return;
  if (activeTab === 'dashboard') renderDashboard();
  if (activeTab === 'ordens') renderOrdens();
  if (activeTab === 'clientes') renderClientes();
  if (activeTab === 'veiculos') renderVeiculos();
  if (activeTab === 'servicos') renderServicos();
  if (activeTab === 'pecas') renderPecas();
  if (activeTab === 'comissoes') renderComissoes();
  if (activeTab === 'logs') renderLogs();
  if (activeTab === 'usuarios') renderUsuarios();
  if (activeTab === 'config') renderConfig();
}

function getCliente(id) { return db.clientes.find(c => c.id === id); }
function getVeiculo(id) { return db.veiculos.find(v => v.id === id); }
function getUser(id) { return db.users.find(u => u.id === id); }
function getServico(id) { return db.servicos.find(s => s.id === id); }
function getPeca(id) { return db.pecas.find(p => p.id === id); }

function calcOs(os) {
  const totalServ = (os.servicos || []).reduce((a, s) => a + number(s.quantidade) * number(s.valorUnitario), 0);
  const totalPecas = (os.pecas || []).reduce((a, p) => a + number(p.quantidade) * number(p.valorUnitario), 0);
  return { totalServ, totalPecas, total: totalServ + totalPecas };
}

function nextOsNumber() {
  return Math.max(1000, ...db.ordens.map(o => Number(o.numero || 0))) + 1;
}

function renderDashboard() {
  const abertas = db.ordens.filter(o => ['ABERTA','DIAGNOSTICO','APROVADA','EM_EXECUCAO','AGUARDANDO_PECAS'].includes(o.status)).length;
  const aguardando = db.ordens.filter(o => o.status === 'AGUARDANDO_APROVACAO').length;
  const execucao = db.ordens.filter(o => o.status === 'EM_EXECUCAO').length;
  const finalizadas = db.ordens.filter(o => ['FINALIZADA','FATURADA'].includes(o.status)).length;
  const today = new Date();
  const mes = today.getMonth();
  const ano = today.getFullYear();
  const faturadasMes = db.ordens.filter(o => o.status === 'FATURADA' && o.faturadoEm && new Date(o.faturadoEm).getMonth() === mes && new Date(o.faturadoEm).getFullYear() === ano);
  const faturamento = faturadasMes.reduce((a,o) => a + calcOs(o).total, 0);
  const ticket = faturadasMes.length ? faturamento / faturadasMes.length : 0;
  const defeitosPendentes = db.ordens.reduce((acc, o) => acc + ((o.checklist?.entrada?.marcacoes || []).filter(m => m.status !== 'Resolvido').length), 0);

  $('#statAbertas').textContent = abertas;
  $('#statAguardando').textContent = aguardando;
  $('#statFaturamento').textContent = money(faturamento);
  $('#statTicket').textContent = money(ticket);
  $('#statExecucao').textContent = execucao;
  $('#statFinalizadas').textContent = finalizadas;
  $('#statVeiculos').textContent = db.veiculos.length;
  $('#statDefeitosPendentes').textContent = defeitosPendentes;

  $('#recentOs').innerHTML = db.ordens.slice(0,5).map(o => {
    const c = getCliente(o.clienteId);
    const v = getVeiculo(o.veiculoId);
    return `<div class="summary-line">
      <div><b>OS #${o.numero}</b><br><span class="hint">${escapeHtml(c?.nome)} · ${escapeHtml(v?.placa || '')} · ${escapeHtml(buildVehicleName(v))}</span></div>
      <span class="pill ${o.status}">${statusLabels[o.status]}</span>
    </div>`;
  }).join('') || '<p class="hint">Nenhuma OS cadastrada.</p>';

  const alerts = db.pecas.filter(p => number(p.estoqueAtual) <= number(p.estoqueMinimo));
  $('#stockAlerts').innerHTML = alerts.map(p => `<div class="summary-line"><div><b>${escapeHtml(p.descricao)}</b><br><span class="hint">SKU ${escapeHtml(p.sku || '-')}</span></div><span class="pill">${number(p.estoqueAtual)} un.</span></div>`).join('') || '<p class="hint">Nenhum item abaixo do mínimo.</p>';

  const statusCounts = Object.entries(statusLabels).map(([status, label]) => ({
    status, label, qtd: db.ordens.filter(o => o.status === status).length
  })).filter(x => x.qtd > 0);
  const maxStatus = Math.max(1, ...statusCounts.map(x => x.qtd));
  $('#statusChart').innerHTML = statusCounts.map(x => `
    <div class="bar-row">
      <span>${escapeHtml(x.label)}</span>
      <div class="bar"><i style="width:${Math.max(8, x.qtd / maxStatus * 100)}%"></i></div>
      <b>${x.qtd}</b>
    </div>`).join('') || '<p class="hint">Sem OS para montar gráfico.</p>';

  const servAgg = new Map();
  db.ordens.forEach(o => (o.servicos || []).forEach(s => servAgg.set(s.descricao, (servAgg.get(s.descricao) || 0) + Number(s.quantidade || 1))));
  const topServicos = [...servAgg.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
  $('#topServicos').innerHTML = topServicos.map(([nome, qtd]) => `<div class="summary-line"><span>${escapeHtml(nome)}</span><b>${qtd}</b></div>`).join('') || '<p class="hint">Nenhum serviço lançado.</p>';

  const defeitos = db.ordens.flatMap(o => (o.checklist?.entrada?.marcacoes || []).map(m => ({ ...m, osNumero: o.numero, veiculo: getVeiculo(o.veiculoId) }))).slice(-6).reverse();
  $('#defeitosRecentes').innerHTML = defeitos.map(m => `
    <div class="summary-line">
      <div><b>${escapeHtml(m.area || '-')} · ${escapeHtml(m.tipo || '-')}</b><br><span class="hint">OS #${m.osNumero} · ${escapeHtml(buildVehicleName(m.veiculo))}</span></div>
      <span class="pill ${defectSeverityClass(m.gravidade)}">${escapeHtml(m.gravidade || 'Leve')}</span>
    </div>`).join('') || '<p class="hint">Nenhum defeito marcado no checklist.</p>';
}


function renderOrdens() {
  const filtro = ($('#filtroOs').value || '').toLowerCase();
  let ordens = [...db.ordens].sort((a,b) => Number(b.numero) - Number(a.numero));
  if (filtro) {
    ordens = ordens.filter(o => {
      const c = getCliente(o.clienteId);
      const v = getVeiculo(o.veiculoId);
      return [o.numero, c?.nome, v?.placa, v?.modelo, o.status].some(x => String(x || '').toLowerCase().includes(filtro));
    });
  }
  $('#listaOs').innerHTML = ordens.map(o => renderOsCard(o)).join('') || '<div class="card"><p class="hint">Nenhuma OS encontrada.</p></div>';
  $$('#listaOs [data-action]').forEach(btn => btn.addEventListener('click', handleOsAction));
}

function renderOsCard(o) {
  const c = getCliente(o.clienteId);
  const v = getVeiculo(o.veiculoId);
  const totals = calcOs(o);
  return `<article class="os-card">
    <div class="os-head">
      <div>
        <h3 class="os-title">OS #${o.numero} · ${escapeHtml(c?.nome || 'Cliente não encontrado')}</h3>
        <div class="os-meta">
          <span>${escapeHtml(v?.marca || '')} ${escapeHtml(v?.modelo || '')}</span>
          <span>Placa: <b>${escapeHtml(v?.placa || '-')}</b></span>
          <span>Abertura: ${formatDateShort(o.dataAbertura)}</span>
          <span>Total: <b>${money(totals.total)}</b></span>
        </div>
      </div>
      <span class="pill ${o.status}">${statusLabels[o.status]}</span>
    </div>
    <p class="hint">${escapeHtml(o.reclamacao || 'Sem reclamação informada.')}</p>
    <div class="actions">
      <button class="btn small" data-action="view" data-id="${o.id}">Abrir</button>
      <button class="btn small" data-action="status" data-id="${o.id}">Alterar status</button>
      <button class="btn small" data-action="pdf" data-id="${o.id}">PDF</button>
      <button class="btn small" data-action="garantia" data-id="${o.id}">Garantia</button>
      <button class="btn small danger" data-action="delete" data-id="${o.id}">Excluir</button>
    </div>
  </article>`;
}

function handleOsAction(ev) {
  const { action, id } = ev.currentTarget.dataset;
  const os = db.ordens.find(o => o.id === id);
  if (!os) return;
  if (action === 'view') openOsDetails(os);
  if (action === 'status') openStatusForm(os);
  if (action === 'pdf') gerarPdfOs(os);
  if (action === 'garantia') gerarGarantia(os);
  if (action === 'delete') {
    if (confirm(`Excluir OS #${os.numero}?`)) {
      const before = { ...os };
      db.ordens = db.ordens.filter(o => o.id !== id);
      saveDb();
      logAction('ordens_servico', id, 'EXCLUIR', before, null);
      renderOrdens();
      toast('OS excluída.');
    }
  }
}

function openModal(title, html, afterRender) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = html;
  $('#modal').classList.remove('hidden');
  if (afterRender) afterRender();
}

function closeModal() {
  $('#modal').classList.add('hidden');
  $('#modalBody').innerHTML = '';
  signatureCanvasState = null;
}

function openOsForm(existing = null) {
  const isEdit = !!existing;
  const clientesOpts = db.clientes.map(c => `<option value="${c.id}" ${existing?.clienteId === c.id ? 'selected' : ''}>${escapeHtml(c.nome)}</option>`).join('');
  const veiculosOpts = db.veiculos.map(v => {
    const c = getCliente(v.clienteId);
    return `<option data-cliente="${v.clienteId}" value="${v.id}" ${existing?.veiculoId === v.id ? 'selected' : ''}>${escapeHtml(v.placa || '-') } · ${escapeHtml(v.marca)} ${escapeHtml(v.modelo)} · ${escapeHtml(c?.nome || '')}</option>`;
  }).join('');
  openModal(isEdit ? `Editar OS #${existing.numero}` : 'Nova Ordem de Serviço', `
    <form id="formOs" class="form-grid">
      <label>Cliente
        <select name="clienteId" required>${clientesOpts}</select>
      </label>
      <label>Veículo
        <select name="veiculoId" required>${veiculosOpts}</select>
      </label>
      <label>KM de entrada
        <input name="kmEntrada" type="number" min="0" value="${existing?.kmEntrada || ''}">
      </label>
      <label>Previsão de entrega
        <input name="previsaoEntrega" type="datetime-local" value="${existing?.previsaoEntrega || ''}">
      </label>
      <label class="full">Reclamação do cliente
        <textarea name="reclamacao" required>${escapeHtml(existing?.reclamacao || '')}</textarea>
      </label>
      <label class="full">Diagnóstico técnico
        <textarea name="diagnostico">${escapeHtml(existing?.diagnostico || '')}</textarea>
      </label>
      <button class="btn primary" type="submit">${isEdit ? 'Salvar' : 'Criar OS'}</button>
    </form>
  `, () => {
    const form = $('#formOs');
    form.clienteId.addEventListener('change', () => filterVehicleOptions(form));
    filterVehicleOptions(form);
    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const fd = new FormData(form);
      if (isEdit) {
        const before = JSON.parse(JSON.stringify(existing));
        existing.clienteId = fd.get('clienteId');
        existing.veiculoId = fd.get('veiculoId');
        existing.kmEntrada = Number(fd.get('kmEntrada') || 0);
        existing.previsaoEntrega = fd.get('previsaoEntrega');
        existing.reclamacao = fd.get('reclamacao');
        existing.diagnostico = fd.get('diagnostico');
        saveDb();
        logAction('ordens_servico', existing.id, 'ALTERAR', before, existing);
        toast('OS atualizada.');
      } else {
        const os = {
          id: uuid(),
          numero: nextOsNumber(),
          clienteId: fd.get('clienteId'),
          veiculoId: fd.get('veiculoId'),
          status: 'ABERTA',
          kmEntrada: Number(fd.get('kmEntrada') || 0),
          reclamacao: fd.get('reclamacao'),
          diagnostico: fd.get('diagnostico'),
          previsaoEntrega: fd.get('previsaoEntrega'),
          criadoPor: currentUser.id,
          dataAbertura: nowIso(),
          dataFechamento: '',
          servicos: [],
          pecas: [],
          checklist: { entrada: null, saida: null },
          garantia: null,
          aprovadoEm: '',
          faturadoEm: ''
        };
        db.ordens.unshift(os);
        saveDb();
        logAction('ordens_servico', os.id, 'CRIAR', null, os);
        toast(`OS #${os.numero} criada.`);
      }
      closeModal();
      renderAll();
    });
  });
}

function filterVehicleOptions(form) {
  const clienteId = form.clienteId.value;
  Array.from(form.veiculoId.options).forEach(opt => {
    opt.hidden = opt.dataset.cliente !== clienteId;
  });
  const first = Array.from(form.veiculoId.options).find(opt => !opt.hidden);
  if (first && form.veiculoId.selectedOptions[0]?.hidden) form.veiculoId.value = first.value;
}

function openOsDetails(os) {
  const c = getCliente(os.clienteId);
  const v = getVeiculo(os.veiculoId);
  openModal(`OS #${os.numero}`, `
    <div class="tabs-mini">
      <button class="btn small primary" data-mini="resumo">Resumo</button>
      <button class="btn small" data-mini="itens">Serviços/Peças</button>
      <button class="btn small" data-mini="checklist">Checklist</button>
      <button class="btn small" data-mini="assinatura">Assinatura</button>
      <button class="btn small" data-mini="garantia">Garantia</button>
    </div>

    <div id="mini-resumo" class="mini-tab active">
      <div class="grid two">
        <article class="card">
          <h3>Dados principais</h3>
          <div class="summary-line"><span>Cliente</span><b>${escapeHtml(c?.nome)}</b></div>
          <div class="summary-line"><span>Veículo</span><b>${escapeHtml(buildVehicleName(v))} · ${escapeHtml(v?.placa)}</b></div>
          <div class="summary-line"><span>Status</span><span class="pill ${os.status}">${statusLabels[os.status]}</span></div>
          <div class="summary-line"><span>KM entrada</span><b>${number(os.kmEntrada)}</b></div>
          <div class="summary-line"><span>Abertura</span><b>${formatDate(os.dataAbertura)}</b></div>
          <div class="summary-line"><span>Total</span><b>${money(calcOs(os).total)}</b></div>
        </article>
        <article class="card">
          <h3>Relato e diagnóstico</h3>
          <p><b>Reclamação:</b><br>${escapeHtml(os.reclamacao || '-')}</p>
          <p><b>Diagnóstico:</b><br>${escapeHtml(os.diagnostico || '-')}</p>
          <div class="actions">
            <button class="btn small" id="btnEditarOs">Editar dados</button>
            <button class="btn small" id="btnStatusOs">Alterar status</button>
            <button class="btn small primary" id="btnPdfOs">Gerar PDF</button>
          </div>
        </article>
      </div>
    </div>

    <div id="mini-itens" class="mini-tab">
      <div class="grid two">
        <article class="card">
          <h3>Adicionar serviço</h3>
          <form id="formAddServico" class="form-grid">
            <label class="full">Serviço
              <select name="servicoId">${db.servicos.filter(s=>s.ativo).map(s => `<option value="${s.id}">${escapeHtml(s.descricao)} · ${money(s.valorPadrao)}</option>`).join('')}</select>
            </label>
            <label>Mecânico
              <select name="mecanicoId">${db.users.filter(u=>u.ativo).map(u => `<option value="${u.id}">${escapeHtml(u.nome)} · ${escapeHtml(u.perfil)}</option>`).join('')}</select>
            </label>
            <label>Qtd
              <input name="quantidade" type="number" min="0.001" step="0.001" value="1">
            </label>
            <button class="btn primary" type="submit">Adicionar serviço</button>
          </form>
        </article>
        <article class="card">
          <h3>Adicionar peça</h3>
          <form id="formAddPeca" class="form-grid">
            <label class="full">Peça
              <select name="pecaId">${db.pecas.filter(p=>p.ativo).map(p => `<option value="${p.id}">${escapeHtml(p.descricao)} · ${money(p.precoVenda)} · Estoque ${number(p.estoqueAtual)}</option>`).join('')}</select>
            </label>
            <label>Qtd
              <input name="quantidade" type="number" min="0.001" step="0.001" value="1">
            </label>
            <button class="btn primary" type="submit">Adicionar peça</button>
          </form>
        </article>
      </div>
      <div class="card" style="margin-top:14px">
        <h3>Itens da OS</h3>
        <div id="itensOsTable"></div>
      </div>
    </div>

    <div id="mini-checklist" class="mini-tab">
      ${renderChecklistHtml(os)}
    </div>

    <div id="mini-assinatura" class="mini-tab">
      <article class="card">
        <h3>Assinatura digital do cliente</h3>
        <p class="hint">A assinatura fica armazenada localmente em base64 nesta versão MVP.</p>
        <canvas id="signaturePad" class="signature-pad"></canvas>
        <div class="row" style="margin-top:10px">
          <button class="btn" id="btnLimparAssinatura">Limpar</button>
          <button class="btn primary" id="btnSalvarAssinatura">Salvar assinatura na OS</button>
        </div>
        ${os.assinaturaCliente ? `<p><b>Assinatura salva:</b></p><img src="${os.assinaturaCliente}" style="max-width:340px;border:1px solid #ddd;border-radius:12px">` : ''}
      </article>
    </div>

    <div id="mini-garantia" class="mini-tab">
      <article class="card">
        <h3>Termo de garantia</h3>
        <p class="hint">Gere o termo após finalizar a execução. O texto pode ser ajustado nas próximas versões.</p>
        <button class="btn primary" id="btnGerarGarantia">Gerar termo de garantia</button>
        <div id="garantiaPreview" style="margin-top:14px">${os.garantia ? garantiaHtml(os) : '<p class="hint">Nenhuma garantia emitida.</p>'}</div>
      </article>
    </div>
  `, () => {
    $$('.tabs-mini button').forEach(btn => btn.addEventListener('click', () => {
      $$('.tabs-mini button').forEach(b => b.classList.remove('primary'));
      btn.classList.add('primary');
      $$('.mini-tab').forEach(t => t.classList.remove('active'));
      $(`#mini-${btn.dataset.mini}`).classList.add('active');
      if (btn.dataset.mini === 'assinatura') initSignaturePad(os);
    }));
    $('#btnEditarOs').addEventListener('click', () => openOsForm(os));
    $('#btnStatusOs').addEventListener('click', () => openStatusForm(os));
    $('#btnPdfOs').addEventListener('click', () => gerarPdfOs(os));
    $('#btnGerarGarantia').addEventListener('click', () => {
      gerarGarantia(os, false);
      $('#garantiaPreview').innerHTML = garantiaHtml(os);
    });
    bindItensOs(os);
    bindChecklist(os);
  });
}

function bindItensOs(os) {
  renderItensOsTable(os);
  $('#formAddServico').addEventListener('submit', ev => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const serv = getServico(fd.get('servicoId'));
    if (!serv) return;
    const before = JSON.parse(JSON.stringify(os));
    os.servicos.push({
      id: uuid(),
      servicoId: serv.id,
      mecanicoId: fd.get('mecanicoId'),
      descricao: serv.descricao,
      quantidade: Number(fd.get('quantidade') || 1),
      valorUnitario: Number(serv.valorPadrao),
      comissaoPercentual: Number(serv.comissaoPercentual || db.config.comissaoPadrao || 0)
    });
    saveDb();
    logAction('ordens_servico', os.id, 'ADICIONAR_SERVICO', before, os);
    renderItensOsTable(os);
    toast('Serviço adicionado.');
  });

  $('#formAddPeca').addEventListener('submit', ev => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const peca = getPeca(fd.get('pecaId'));
    const qtd = Number(fd.get('quantidade') || 1);
    if (!peca) return;
    if (qtd > Number(peca.estoqueAtual)) {
      if (!confirm('Quantidade maior que o estoque. Deseja adicionar mesmo assim?')) return;
    }
    const beforeOs = JSON.parse(JSON.stringify(os));
    const beforePeca = JSON.parse(JSON.stringify(peca));
    os.pecas.push({
      id: uuid(),
      pecaId: peca.id,
      descricao: peca.descricao,
      quantidade: qtd,
      valorUnitario: Number(peca.precoVenda)
    });
    peca.estoqueAtual = Number(peca.estoqueAtual) - qtd;
    saveDb();
    logAction('ordens_servico', os.id, 'ADICIONAR_PECA', beforeOs, os);
    logAction('pecas', peca.id, 'BAIXA_ESTOQUE_OS', beforePeca, peca);
    renderItensOsTable(os);
    toast('Peça adicionada e estoque baixado.');
  });
}

function renderItensOsTable(os) {
  const servRows = (os.servicos || []).map(s => `
    <tr>
      <td>Serviço</td><td>${escapeHtml(s.descricao)}</td><td>${number(s.quantidade)}</td><td>${money(s.valorUnitario)}</td><td>${money(number(s.quantidade)*number(s.valorUnitario))}</td>
      <td>${escapeHtml(getUser(s.mecanicoId)?.nome || '-')}</td>
      <td><button class="btn small danger" data-remove-serv="${s.id}">Remover</button></td>
    </tr>`).join('');
  const pecaRows = (os.pecas || []).map(p => `
    <tr>
      <td>Peça</td><td>${escapeHtml(p.descricao)}</td><td>${number(p.quantidade)}</td><td>${money(p.valorUnitario)}</td><td>${money(number(p.quantidade)*number(p.valorUnitario))}</td>
      <td>-</td>
      <td><button class="btn small danger" data-remove-peca="${p.id}">Remover</button></td>
    </tr>`).join('');
  const total = calcOs(os);
  $('#itensOsTable').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Tipo</th><th>Descrição</th><th>Qtd</th><th>Unitário</th><th>Total</th><th>Mecânico</th><th>Ações</th></tr></thead>
        <tbody>${servRows}${pecaRows || ''}</tbody>
        <tfoot><tr><th colspan="4">Total geral</th><th>${money(total.total)}</th><th colspan="2"></th></tr></tfoot>
      </table>
    </div>`;
  $$('[data-remove-serv]').forEach(btn => btn.addEventListener('click', () => {
    const before = JSON.parse(JSON.stringify(os));
    os.servicos = os.servicos.filter(s => s.id !== btn.dataset.removeServ);
    saveDb();
    logAction('ordens_servico', os.id, 'REMOVER_SERVICO', before, os);
    renderItensOsTable(os);
  }));
  $$('[data-remove-peca]').forEach(btn => btn.addEventListener('click', () => {
    const item = os.pecas.find(p => p.id === btn.dataset.removePeca);
    const peca = getPeca(item?.pecaId);
    const beforeOs = JSON.parse(JSON.stringify(os));
    const beforePeca = peca ? JSON.parse(JSON.stringify(peca)) : null;
    os.pecas = os.pecas.filter(p => p.id !== btn.dataset.removePeca);
    if (peca && item) peca.estoqueAtual = Number(peca.estoqueAtual) + Number(item.quantidade);
    saveDb();
    logAction('ordens_servico', os.id, 'REMOVER_PECA', beforeOs, os);
    if (peca) logAction('pecas', peca.id, 'ESTORNO_ESTOQUE_OS', beforePeca, peca);
    renderItensOsTable(os);
  }));
}

function renderChecklistHtml(os) {
  const entrada = os.checklist?.entrada || { combustivel: 50, estepe: true, macaco: true, chaveRoda: true, observacoes: '', marcacoes: [], assinatura: '' };
  const areaOpts = DEFECT_AREAS.map(a => `<option>${escapeHtml(a)}</option>`).join('');
  const tipoOpts = DEFECT_TYPES.map(t => `<option>${escapeHtml(t)}</option>`).join('');
  return `
    <article class="card">
      <div class="card-head">
        <div>
          <h3>Checklist visual de entrada</h3>
          <p class="hint">Clique no desenho para registrar a posição. O mecânico informa área, tipo, gravidade e observação do defeito.</p>
        </div>
      </div>
      <form id="formChecklist" class="form-grid">
        <label>Combustível %
          <input name="combustivel" type="number" min="0" max="100" value="${entrada.combustivel ?? 50}">
        </label>
        <label>Área do veículo
          <select name="areaAvaria">
            <option value="AUTO">Detectar pelo clique</option>
            ${areaOpts}
          </select>
        </label>
        <label>Tipo de defeito/avaria
          <select name="tipoAvaria">${tipoOpts}</select>
        </label>
        <label>Gravidade
          <select name="gravidadeAvaria">
            <option>Leve</option>
            <option>Média</option>
            <option>Grave</option>
          </select>
        </label>
        <label>Status do defeito
          <select name="statusAvaria">
            <option>Pendente</option>
            <option>Em análise</option>
            <option>Aprovado para reparo</option>
            <option>Resolvido</option>
          </select>
        </label>
        <label>Foto/URL opcional
          <input name="fotoAvaria" placeholder="Cole link da foto, se houver">
        </label>
        <label class="full">Observação da próxima marcação
          <input name="obsAvaria" placeholder="Ex.: risco profundo próximo à porta">
        </label>
        <label><input type="checkbox" name="estepe" ${entrada.estepe ? 'checked' : ''}> Possui estepe</label>
        <label><input type="checkbox" name="macaco" ${entrada.macaco ? 'checked' : ''}> Possui macaco</label>
        <label><input type="checkbox" name="chaveRoda" ${entrada.chaveRoda ? 'checked' : ''}> Possui chave de roda</label>
        <label class="full">Observações gerais do checklist
          <textarea name="observacoes">${escapeHtml(entrada.observacoes || '')}</textarea>
        </label>
      </form>
      <div class="vehicle-canvas-wrap">
        <div id="vehicleDiagram" class="vehicle-diagram">
          <div class="car-zone zone-front">Dianteira</div>
          <div class="car-zone zone-roof">Teto/vidros</div>
          <div class="car-zone zone-rear">Traseira</div>
          <div class="car-body"></div>
          <div class="car-window"></div>
          <div class="car-wheel w1"></div>
          <div class="car-wheel w2"></div>
          ${(entrada.marcacoes || []).map((m, idx) => `<div class="marker ${defectSeverityClass(m.gravidade)}" title="${escapeHtml(m.area || '')} · ${escapeHtml(m.tipo)} - ${escapeHtml(m.obs || '')}" style="left:${m.x}%;top:${m.y}%">${idx+1}</div>`).join('')}
        </div>
      </div>
      <div class="row" style="margin-top:12px">
        <button class="btn primary" id="btnSalvarChecklist">Salvar checklist</button>
        <button class="btn danger" id="btnLimparMarcacoes">Limpar marcações</button>
      </div>
      <div id="listaMarcacoes" style="margin-top:12px"></div>
    </article>`;
}

function bindChecklist(os) {
  const form = $('#formChecklist');
  const entrada = os.checklist.entrada || { combustivel: 50, estepe: true, macaco: true, chaveRoda: true, observacoes: '', marcacoes: [], assinatura: '' };
  os.checklist.entrada = entrada;
  renderMarcacoes(entrada);

  $('#vehicleDiagram').addEventListener('click', ev => {
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width * 100).toFixed(2);
    const y = ((ev.clientY - rect.top) / rect.height * 100).toFixed(2);
    const tipo = form.tipoAvaria.value;
    const area = form.areaAvaria.value === 'AUTO' ? detectAreaByPoint(x, y) : form.areaAvaria.value;
    const gravidade = form.gravidadeAvaria.value;
    const status = form.statusAvaria.value;
    const obs = form.obsAvaria.value || `${tipo} em ${area}`;
    const fotoUrl = form.fotoAvaria.value || '';

    const before = JSON.parse(JSON.stringify(os));
    entrada.marcacoes.push({
      id: uuid(),
      area,
      tipo,
      gravidade,
      status,
      x: Number(x),
      y: Number(y),
      obs,
      fotoUrl,
      criadoEm: nowIso(),
      criadoPor: currentUser?.id || ''
    });
    saveDb();
    logAction('checklist_os', os.id, 'ADICIONAR_DEFEITO', before, os);
    openOsDetails(os);
    setTimeout(() => {
      const btn = $$('.tabs-mini button').find(b => b.dataset.mini === 'checklist');
      if (btn) btn.click();
    }, 0);
  });

  $('#listaMarcacoes').addEventListener('click', ev => {
    const btn = ev.target.closest('[data-del-marcacao]');
    if (!btn) return;
    const before = JSON.parse(JSON.stringify(os));
    entrada.marcacoes = entrada.marcacoes.filter(m => m.id !== btn.dataset.delMarcacao);
    saveDb();
    logAction('checklist_os', os.id, 'REMOVER_DEFEITO', before, os);
    openOsDetails(os);
    setTimeout(() => {
      const tab = $$('.tabs-mini button').find(b => b.dataset.mini === 'checklist');
      if (tab) tab.click();
    }, 0);
  });

  $('#btnSalvarChecklist').addEventListener('click', ev => {
    ev.preventDefault();
    const before = JSON.parse(JSON.stringify(os));
    entrada.combustivel = Number(form.combustivel.value || 0);
    entrada.estepe = form.estepe.checked;
    entrada.macaco = form.macaco.checked;
    entrada.chaveRoda = form.chaveRoda.checked;
    entrada.observacoes = form.observacoes.value;
    saveDb();
    logAction('checklist_os', os.id, 'SALVAR_CHECKLIST', before, os);
    toast('Checklist salvo.');
  });

  $('#btnLimparMarcacoes').addEventListener('click', ev => {
    ev.preventDefault();
    if (!confirm('Limpar marcações do checklist?')) return;
    const before = JSON.parse(JSON.stringify(os));
    entrada.marcacoes = [];
    saveDb();
    logAction('checklist_os', os.id, 'LIMPAR_MARCACOES', before, os);
    openOsDetails(os);
  });
}

function renderMarcacoes(entrada) {
  $('#listaMarcacoes').innerHTML = (entrada.marcacoes || []).map((m, i) => `
    <div class="defect-line">
      <div class="defect-index">${i+1}</div>
      <div>
        <b>${escapeHtml(m.area || '-')} · ${escapeHtml(m.tipo || '-')}</b>
        <p>${escapeHtml(m.obs || '')}</p>
        <span class="hint">Posição ${m.x}% / ${m.y}%${m.fotoUrl ? ` · Foto: ${escapeHtml(m.fotoUrl)}` : ''}</span>
      </div>
      <div class="defect-actions">
        <span class="pill ${defectSeverityClass(m.gravidade)}">${escapeHtml(m.gravidade || 'Leve')}</span>
        <span class="pill">${escapeHtml(m.status || 'Pendente')}</span>
        <button class="btn small danger" data-del-marcacao="${m.id}">Excluir</button>
      </div>
    </div>`).join('') || '<p class="hint">Clique no desenho do veículo para adicionar defeitos/avarias.</p>';
}


function initSignaturePad(os) {
  const canvas = $('#signaturePad');
  if (!canvas || signatureCanvasState) return;
  const ctx = canvas.getContext('2d');
  const resize = () => {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
  };
  resize();
  let drawing = false;
  const pos = e => {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches?.[0] || e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  };
  const start = e => { drawing = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); e.preventDefault(); };
  const move = e => { if (!drawing) return; const p = pos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); e.preventDefault(); };
  const end = () => { drawing = false; };
  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('mouseleave', end);
  canvas.addEventListener('touchstart', start, { passive:false });
  canvas.addEventListener('touchmove', move, { passive:false });
  canvas.addEventListener('touchend', end);
  $('#btnLimparAssinatura').addEventListener('click', () => ctx.clearRect(0,0,canvas.width,canvas.height));
  $('#btnSalvarAssinatura').addEventListener('click', () => {
    const before = JSON.parse(JSON.stringify(os));
    os.assinaturaCliente = canvas.toDataURL('image/png');
    saveDb();
    logAction('ordens_servico', os.id, 'ASSINATURA_CLIENTE', before, os);
    toast('Assinatura salva.');
    openOsDetails(os);
  });
  signatureCanvasState = { canvas, ctx };
}

function openStatusForm(os) {
  openModal(`Alterar status da OS #${os.numero}`, `
    <form id="formStatus" class="form-grid">
      <label class="full">Status
        <select name="status">
          ${Object.entries(statusLabels).map(([key,label]) => `<option value="${key}" ${os.status === key ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </label>
      <label class="full">Motivo/observação
        <textarea name="motivo" placeholder="Obrigatório para cancelamento e recomendado para mudanças críticas"></textarea>
      </label>
      <button class="btn primary" type="submit">Salvar status</button>
    </form>
  `, () => {
    $('#formStatus').addEventListener('submit', ev => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const novo = fd.get('status');
      const motivo = fd.get('motivo');
      if (novo === 'CANCELADA' && !motivo.trim()) return toast('Informe o motivo do cancelamento.');
      const before = JSON.parse(JSON.stringify(os));
      os.status = novo;
      os.statusMotivo = motivo;
      if (novo === 'FINALIZADA') os.dataFechamento = nowIso();
      if (novo === 'FATURADA') os.faturadoEm = nowIso();
      if (novo === 'APROVADA') os.aprovadoEm = nowIso();
      saveDb();
      logAction('ordens_servico', os.id, 'ALTERAR_STATUS', before, os);
      closeModal();
      renderAll();
      toast('Status alterado.');
    });
  });
}

function gerarGarantia(os, openAfter = true) {
  const before = JSON.parse(JSON.stringify(os));
  const dias = Math.max(...(os.servicos || []).map(s => number(getServico(s.servicoId)?.garantiaDias || db.config.garantiaPadraoDias)), db.config.garantiaPadraoDias);
  const inicio = new Date();
  const fim = new Date();
  fim.setDate(fim.getDate() + dias);
  os.garantia = {
    id: uuid(),
    emitidaEm: nowIso(),
    validadeInicio: inicio.toISOString().slice(0,10),
    validadeFim: fim.toISOString().slice(0,10),
    dias,
    termo: termoGarantiaTexto(os, dias, fim)
  };
  saveDb();
  logAction('garantias', os.id, 'EMITIR_TERMO', before, os);
  toast('Termo de garantia gerado.');
  if (openAfter) {
    openModal(`Garantia OS #${os.numero}`, garantiaHtml(os), () => {});
  }
}

function termoGarantiaTexto(os, dias, fim) {
  const c = getCliente(os.clienteId);
  const v = getVeiculo(os.veiculoId);
  return `A ${db.config.nomeFantasia} concede garantia dos serviços executados na OS #${os.numero} pelo prazo de ${dias} dias, com validade até ${fim.toLocaleDateString('pt-BR')}. A garantia cobre exclusivamente defeitos relacionados à execução dos serviços descritos nesta ordem de serviço. A garantia não cobre mau uso, colisões, alterações por terceiros, falta de manutenção preventiva, uso de peças fornecidas pelo cliente sem validação técnica ou defeitos não relacionados aos serviços executados. Cliente: ${c?.nome || ''}. Veículo: ${v?.marca || ''} ${v?.modelo || ''}, placa ${v?.placa || ''}.`;
}

function garantiaHtml(os) {
  return `<div class="notice"><b>Validade:</b> ${formatDateShort(os.garantia.validadeInicio)} até ${formatDateShort(os.garantia.validadeFim)}</div>
    <p style="line-height:1.7">${escapeHtml(os.garantia.termo)}</p>
    <button class="btn" onclick="window.print()">Imprimir termo</button>`;
}

function gerarPdfOs(os) {
  const c = getCliente(os.clienteId);
  const v = getVeiculo(os.veiculoId);
  const totals = calcOs(os);
  const servRows = (os.servicos || []).map(s => `<tr><td>Serviço</td><td>${escapeHtml(s.descricao)}</td><td>${number(s.quantidade)}</td><td>${money(s.valorUnitario)}</td><td>${money(number(s.quantidade)*number(s.valorUnitario))}</td></tr>`).join('');
  const pecaRows = (os.pecas || []).map(p => `<tr><td>Peça</td><td>${escapeHtml(p.descricao)}</td><td>${number(p.quantidade)}</td><td>${money(p.valorUnitario)}</td><td>${money(number(p.quantidade)*number(p.valorUnitario))}</td></tr>`).join('');
  const marks = os.checklist?.entrada?.marcacoes || [];
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>OS ${os.numero}</title><style>${document.querySelector('style')?.innerHTML || ''} body{background:#fff}.print-doc table{width:100%;border-collapse:collapse}.print-doc th,.print-doc td{padding:8px;border:1px solid #ddd;text-align:left}.sign{height:70px;border-bottom:1px solid #000;width:300px}</style></head>
  <body><div class="print-doc">
    <h1>${escapeHtml(db.config.nomeFantasia)} - Ordem de Serviço #${os.numero}</h1>
    <p>${escapeHtml(db.config.endereco || '')} · ${escapeHtml(db.config.telefone || '')} · ${escapeHtml(db.config.email || '')}</p>
    <hr>
    <h2>Cliente e veículo</h2>
    <p><b>Cliente:</b> ${escapeHtml(c?.nome)} · <b>Telefone:</b> ${escapeHtml(c?.telefone || '')}</p>
    <p><b>Veículo:</b> ${escapeHtml(buildVehicleName(v))} · <b>Placa:</b> ${escapeHtml(v?.placa || '')} · <b>KM:</b> ${number(os.kmEntrada)}</p>
    <p><b>Status:</b> ${statusLabels[os.status]} · <b>Abertura:</b> ${formatDate(os.dataAbertura)}</p>
    <h2>Relato e diagnóstico</h2>
    <p><b>Reclamação:</b> ${escapeHtml(os.reclamacao || '-')}</p>
    <p><b>Diagnóstico:</b> ${escapeHtml(os.diagnostico || '-')}</p>
    <h2>Serviços e peças</h2>
    <table><thead><tr><th>Tipo</th><th>Descrição</th><th>Qtd</th><th>Unitário</th><th>Total</th></tr></thead><tbody>${servRows}${pecaRows}</tbody><tfoot><tr><th colspan="4">Total</th><th>${money(totals.total)}</th></tr></tfoot></table>
    <h2>Checklist</h2>
    <p><b>Combustível:</b> ${os.checklist?.entrada?.combustivel ?? '-'}% · <b>Estepe:</b> ${os.checklist?.entrada?.estepe ? 'Sim' : 'Não'} · <b>Macaco:</b> ${os.checklist?.entrada?.macaco ? 'Sim' : 'Não'} · <b>Chave de roda:</b> ${os.checklist?.entrada?.chaveRoda ? 'Sim' : 'Não'}</p>
    <p><b>Observações:</b> ${escapeHtml(os.checklist?.entrada?.observacoes || '-')}</p>
    <ul>${marks.map((m,i) => `<li>${i+1}. ${escapeHtml(m.area || '-')} · ${escapeHtml(m.tipo)} · ${escapeHtml(m.gravidade || 'Leve')} · ${escapeHtml(m.status || 'Pendente')} - ${escapeHtml(m.obs || '')}</li>`).join('')}</ul>
    ${os.garantia ? `<h2>Garantia</h2><p>${escapeHtml(os.garantia.termo)}</p>` : ''}
    ${os.assinaturaCliente ? `<h2>Assinatura digital</h2><img src="${os.assinaturaCliente}" style="max-width:300px;border:1px solid #ccc">` : '<br><br><div class="sign"></div><p>Assinatura do cliente</p>'}
  </div><script>window.onload=()=>window.print();<\/script></body></html>`;
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  logAction('ordens_servico', os.id, 'GERAR_PDF', null, { numero: os.numero });
}

function renderClientes() {
  const filtro = ($('#filtroCliente').value || '').toLowerCase();
  const rows = db.clientes.filter(c => !filtro || [c.nome,c.cpfCnpj,c.telefone,c.email].some(x => String(x||'').toLowerCase().includes(filtro))).map(c => `
    <tr>
      <td>${escapeHtml(c.nome)}</td><td>${c.tipoPessoa}</td><td>${maskDoc(c.cpfCnpj)}</td><td>${escapeHtml(c.telefone || '')}</td><td>${escapeHtml(c.email || '')}</td>
      <td>${c.consentimentoLgpd ? 'Sim' : 'Não'}</td>
      <td class="actions"><button class="btn small" data-edit-cliente="${c.id}">Editar</button><button class="btn small danger" data-del-cliente="${c.id}">Excluir</button></td>
    </tr>`).join('');
  $('#listaClientes').innerHTML = `<table><thead><tr><th>Nome</th><th>Tipo</th><th>CPF/CNPJ</th><th>Telefone</th><th>E-mail</th><th>LGPD</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table>`;
  $$('[data-edit-cliente]').forEach(b => b.addEventListener('click', () => openClienteForm(db.clientes.find(c=>c.id===b.dataset.editCliente))));
  $$('[data-del-cliente]').forEach(b => b.addEventListener('click', () => deleteEntity('clientes', b.dataset.delCliente, renderClientes)));
}

function openClienteForm(c = null) {
  openModal(c ? 'Editar cliente' : 'Novo cliente', `
    <form id="formCliente" class="form-grid">
      <label>Tipo pessoa<select name="tipoPessoa"><option value="F" ${c?.tipoPessoa==='F'?'selected':''}>Física</option><option value="J" ${c?.tipoPessoa==='J'?'selected':''}>Jurídica</option></select></label>
      <label>CPF/CNPJ<input name="cpfCnpj" value="${escapeHtml(c?.cpfCnpj || '')}"></label>
      <label class="full">Nome/Razão social<input name="nome" required value="${escapeHtml(c?.nome || '')}"></label>
      <label>Telefone<input name="telefone" value="${escapeHtml(c?.telefone || '')}"></label>
      <label>WhatsApp<input name="whatsapp" value="${escapeHtml(c?.whatsapp || '')}"></label>
      <label>E-mail<input name="email" type="email" value="${escapeHtml(c?.email || '')}"></label>
      <label class="full">Endereço<input name="endereco" value="${escapeHtml(c?.endereco || '')}"></label>
      <label class="full"><input type="checkbox" name="consentimentoLgpd" ${c?.consentimentoLgpd ? 'checked' : ''}> Cliente autorizou armazenamento dos dados e contato</label>
      <button class="btn primary" type="submit">Salvar</button>
    </form>`, () => {
    $('#formCliente').addEventListener('submit', ev => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const obj = {
        tipoPessoa: fd.get('tipoPessoa'),
        cpfCnpj: onlyDigits(fd.get('cpfCnpj')),
        nome: fd.get('nome'),
        telefone: fd.get('telefone'),
        whatsapp: fd.get('whatsapp'),
        email: fd.get('email'),
        endereco: fd.get('endereco'),
        consentimentoLgpd: fd.get('consentimentoLgpd') === 'on'
      };
      if (c) {
        const before = JSON.parse(JSON.stringify(c));
        Object.assign(c, obj);
        logAction('clientes', c.id, 'ALTERAR', before, c);
      } else {
        obj.id = uuid(); obj.criadoEm = nowIso();
        db.clientes.push(obj);
        logAction('clientes', obj.id, 'CRIAR', null, obj);
      }
      saveDb(); closeModal(); renderAll(); toast('Cliente salvo.');
    });
  });
}

function renderVeiculos() {
  renderVehicleLookup();
  const filtro = ($('#filtroVeiculo').value || '').toLowerCase();
  const rows = db.veiculos.filter(v => {
    const c = getCliente(v.clienteId);
    return !filtro || [v.placa,v.marca,v.modelo,c?.nome,v.chassi,v.renavam,v.anoModelo,v.anoFabricacao].some(x => String(x||'').toLowerCase().includes(filtro));
  }).map(v => {
    const c = getCliente(v.clienteId);
    return `<tr><td><b>${escapeHtml(v.placa || '-')}</b></td><td>${escapeHtml(buildVehicleName(v))}</td><td>${escapeHtml(v.cor || '')}</td><td>${escapeHtml(c?.nome || '')}</td><td>${number(v.kmAtual)}</td><td>${escapeHtml(v.origemDados || 'MANUAL')}</td><td class="actions"><button class="btn small" data-edit-veiculo="${v.id}">Editar</button><button class="btn small danger" data-del-veiculo="${v.id}">Excluir</button></td></tr>`;
  }).join('');
  $('#listaVeiculos').innerHTML = `<table><thead><tr><th>Placa</th><th>Marca / modelo / ano</th><th>Cor</th><th>Cliente</th><th>KM</th><th>Origem</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table>`;
  $$('[data-edit-veiculo]').forEach(b => b.addEventListener('click', () => openVeiculoForm(db.veiculos.find(v=>v.id===b.dataset.editVeiculo))));
  $$('[data-del-veiculo]').forEach(b => b.addEventListener('click', () => deleteEntity('veiculos', b.dataset.delVeiculo, renderVeiculos)));
}

function renderVehicleLookup() {
  const form = $('#formIdentificaVeiculo');
  if (!form || form.dataset.bound === '1') {
    if (form) updateVehicleLookupPreview(form);
    return;
  }

  form.dataset.bound = '1';
  const marcas = getCatalogMarcas();
  form.marca.innerHTML = marcas.map(m => `<option>${escapeHtml(m)}</option>`).join('');
  updateVehicleLookupModelos(form);

  form.marca.addEventListener('change', () => {
    updateVehicleLookupModelos(form);
    updateVehicleLookupPreview(form);
  });
  form.modelo.addEventListener('change', () => {
    updateVehicleLookupAnos(form);
    updateVehicleLookupPreview(form);
  });
  form.anoModelo.addEventListener('change', () => updateVehicleLookupPreview(form));
  ['placa','cor','kmAtual'].forEach(name => form[name].addEventListener('input', () => updateVehicleLookupPreview(form)));

  $('#btnUsarIdentificacaoVeiculo').addEventListener('click', () => {
    const item = getCatalogItem(form.modelo.value);
    openVeiculoForm(null, {
      placa: form.placa.value,
      marca: item?.marca || form.marca.value,
      modelo: item?.modelo || '',
      anoFabricacao: Number(form.anoModelo.value || 0),
      anoModelo: Number(form.anoModelo.value || 0),
      cor: form.cor.value,
      combustivel: item?.combustiveis?.[0] || 'Flex',
      kmAtual: Number(form.kmAtual.value || 0),
      catalogoId: item?.id || '',
      origemDados: 'CATALOGO_LOCAL'
    });
  });

  updateVehicleLookupPreview(form);
}

function updateVehicleLookupModelos(form) {
  const modelos = getCatalogModelos(form.marca.value);
  form.modelo.innerHTML = modelos.map(m => `<option value="${m.id}">${escapeHtml(m.modelo)} · ${escapeHtml(m.carroceria || '')}</option>`).join('');
  updateVehicleLookupAnos(form);
}

function updateVehicleLookupAnos(form) {
  const item = getCatalogItem(form.modelo.value);
  const anos = item?.anos?.length ? item.anos : years(2000, 2026);
  form.anoModelo.innerHTML = anos.map(a => `<option>${a}</option>`).join('');
}

function updateVehicleLookupPreview(form) {
  const item = getCatalogItem(form.modelo.value);
  const placa = String(form.placa.value || '').toUpperCase().replace(/[^A-Z0-9]/g,'');
  const ano = form.anoModelo.value || '';
  const nome = item ? `${item.marca} ${item.modelo} ${ano}` : 'Selecione marca/modelo';
  $('#vehicleLookupPreview').innerHTML = `
    <div class="vehicle-preview">
      <div><span class="hint">Identificação</span><strong>${escapeHtml(nome)}</strong></div>
      <div><span class="hint">Placa</span><strong>${escapeHtml(placa || '-')}</strong></div>
      <div><span class="hint">Combustível base</span><strong>${escapeHtml(item?.combustiveis?.join(' / ') || '-')}</strong></div>
      <div><span class="hint">Carroceria</span><strong>${escapeHtml(item?.carroceria || '-')}</strong></div>
    </div>`;
}

function openVeiculoForm(v = null, prefill = null) {
  const data = { ...(prefill || {}), ...(v || {}) };
  const opts = db.clientes.map(c => `<option value="${c.id}" ${data?.clienteId===c.id?'selected':''}>${escapeHtml(c.nome)}</option>`).join('');
  const marcas = getCatalogMarcas();
  const selectedMarca = data.marca || marcas[0] || '';
  const modelos = getCatalogModelos(selectedMarca);
  const selectedCatalogId = data.catalogoId || modelos.find(m => m.modelo === data.modelo)?.id || modelos[0]?.id || '';
  const selectedCatalog = getCatalogItem(selectedCatalogId);
  const anos = selectedCatalog?.anos?.length ? selectedCatalog.anos : years(2000, 2026);

  openModal(v ? 'Editar veículo' : 'Novo veículo', `
    <form id="formVeiculo" class="form-grid">
      <label class="full">Cliente<select name="clienteId" required>${opts}</select></label>
      <label>Placa<input name="placa" maxlength="8" value="${escapeHtml(data?.placa || '')}"></label>
      <label>Renavam<input name="renavam" value="${escapeHtml(data?.renavam || '')}"></label>
      <label class="full">Chassi<input name="chassi" value="${escapeHtml(data?.chassi || '')}"></label>

      <label>Marca
        <select name="marcaCatalogo">${marcas.map(m => `<option ${m === selectedMarca ? 'selected' : ''}>${escapeHtml(m)}</option>`).join('')}</select>
      </label>
      <label>Modelo
        <select name="catalogoId">${modelos.map(m => `<option value="${m.id}" ${m.id === selectedCatalogId ? 'selected' : ''}>${escapeHtml(m.modelo)} · ${escapeHtml(m.carroceria || '')}</option>`).join('')}</select>
      </label>
      <label>Ano fabricação
        <input name="anoFabricacao" type="number" value="${data?.anoFabricacao || data?.anoModelo || ''}">
      </label>
      <label>Ano modelo
        <select name="anoModelo">${anos.map(a => `<option ${Number(data?.anoModelo || data?.anoFabricacao || anos[0]) === Number(a) ? 'selected' : ''}>${a}</option>`).join('')}</select>
      </label>
      <label>Marca manual / ajuste
        <input name="marca" value="${escapeHtml(data?.marca || selectedCatalog?.marca || '')}">
      </label>
      <label>Modelo manual / ajuste
        <input name="modelo" value="${escapeHtml(data?.modelo || selectedCatalog?.modelo || '')}">
      </label>
      <label>Cor<input name="cor" value="${escapeHtml(data?.cor || '')}"></label>
      <label>Combustível<input name="combustivel" value="${escapeHtml(data?.combustivel || selectedCatalog?.combustiveis?.[0] || '')}"></label>
      <label>KM atual<input name="kmAtual" type="number" value="${data?.kmAtual || ''}"></label>
      <label class="full">Prévia do veículo
        <div id="formVeiculoPreview" class="notice"></div>
      </label>
      <button class="btn primary" type="submit">Salvar</button>
    </form>`, () => {
    const form = $('#formVeiculo');

    function syncCatalogFields() {
      const item = getCatalogItem(form.catalogoId.value);
      if (!item) return;
      form.marca.value = item.marca;
      form.modelo.value = item.modelo;
      if (!form.combustivel.value) form.combustivel.value = item.combustiveis?.[0] || '';
      $('#formVeiculoPreview').innerHTML = `<b>${escapeHtml(item.marca)} ${escapeHtml(item.modelo)} ${escapeHtml(form.anoModelo.value || '')}</b> · ${escapeHtml(item.carroceria || '-')} · ${escapeHtml(item.combustiveis?.join(' / ') || '-')}`;
    }

    function reloadModelos() {
      const modelos = getCatalogModelos(form.marcaCatalogo.value);
      form.catalogoId.innerHTML = modelos.map(m => `<option value="${m.id}">${escapeHtml(m.modelo)} · ${escapeHtml(m.carroceria || '')}</option>`).join('');
      reloadAnos();
      syncCatalogFields();
    }

    function reloadAnos() {
      const item = getCatalogItem(form.catalogoId.value);
      const anos = item?.anos?.length ? item.anos : years(2000, 2026);
      const current = form.anoModelo.value;
      form.anoModelo.innerHTML = anos.map(a => `<option ${String(current || data?.anoModelo || data?.anoFabricacao || anos[0]) === String(a) ? 'selected' : ''}>${a}</option>`).join('');
    }

    form.marcaCatalogo.addEventListener('change', reloadModelos);
    form.catalogoId.addEventListener('change', () => { reloadAnos(); syncCatalogFields(); });
    form.anoModelo.addEventListener('change', syncCatalogFields);
    syncCatalogFields();

    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const cat = getCatalogItem(fd.get('catalogoId'));
      const obj = {
        clienteId: fd.get('clienteId'),
        placa: String(fd.get('placa') || '').toUpperCase().replace(/[^A-Z0-9]/g,''),
        renavam: onlyDigits(fd.get('renavam')),
        chassi: String(fd.get('chassi') || '').toUpperCase(),
        catalogoId: fd.get('catalogoId') || '',
        marca: fd.get('marca') || cat?.marca || '',
        modelo: fd.get('modelo') || cat?.modelo || '',
        anoFabricacao: Number(fd.get('anoFabricacao') || fd.get('anoModelo') || 0),
        anoModelo: Number(fd.get('anoModelo') || 0),
        cor: fd.get('cor'),
        combustivel: fd.get('combustivel'),
        kmAtual: Number(fd.get('kmAtual') || 0),
        origemDados: cat ? 'CATALOGO_LOCAL' : 'MANUAL'
      };
      if (v) {
        const before = JSON.parse(JSON.stringify(v));
        Object.assign(v, obj);
        logAction('veiculos', v.id, 'ALTERAR', before, v);
      } else {
        obj.id = uuid(); obj.criadoEm = nowIso();
        db.veiculos.push(obj);
        logAction('veiculos', obj.id, 'CRIAR', null, obj);
      }
      saveDb(); closeModal(); renderAll(); toast('Veículo salvo.');
    });
  });
}


function renderServicos() {
  const filtro = ($('#filtroServico').value || '').toLowerCase();
  const rows = db.servicos.filter(s => !filtro || s.descricao.toLowerCase().includes(filtro)).map(s => `
    <tr><td>${escapeHtml(s.descricao)}</td><td>${money(s.valorPadrao)}</td><td>${s.garantiaDias} dias</td><td>${number(s.comissaoPercentual)}%</td><td>${s.ativo?'Ativo':'Inativo'}</td><td class="actions"><button class="btn small" data-edit-servico="${s.id}">Editar</button><button class="btn small danger" data-del-servico="${s.id}">Excluir</button></td></tr>`).join('');
  $('#listaServicos').innerHTML = `<table><thead><tr><th>Descrição</th><th>Valor</th><th>Garantia</th><th>Comissão</th><th>Status</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table>`;
  $$('[data-edit-servico]').forEach(b => b.addEventListener('click', () => openServicoForm(db.servicos.find(s=>s.id===b.dataset.editServico))));
  $$('[data-del-servico]').forEach(b => b.addEventListener('click', () => deleteEntity('servicos', b.dataset.delServico, renderServicos)));
}

function openServicoForm(s = null) {
  openModal(s ? 'Editar serviço' : 'Novo serviço', `
    <form id="formServico" class="form-grid">
      <label class="full">Descrição<input name="descricao" required value="${escapeHtml(s?.descricao || '')}"></label>
      <label>Valor padrão<input name="valorPadrao" type="number" step="0.01" min="0" value="${s?.valorPadrao || 0}"></label>
      <label>Garantia dias<input name="garantiaDias" type="number" min="0" value="${s?.garantiaDias || db.config.garantiaPadraoDias}"></label>
      <label>Comissão %<input name="comissaoPercentual" type="number" step="0.01" min="0" value="${s?.comissaoPercentual ?? db.config.comissaoPadrao}"></label>
      <label><input type="checkbox" name="ativo" ${s?.ativo !== false ? 'checked' : ''}> Ativo</label>
      <button class="btn primary" type="submit">Salvar</button>
    </form>`, () => {
    $('#formServico').addEventListener('submit', ev => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const obj = { descricao: fd.get('descricao'), valorPadrao: Number(fd.get('valorPadrao')||0), garantiaDias: Number(fd.get('garantiaDias')||0), comissaoPercentual: Number(fd.get('comissaoPercentual')||0), ativo: fd.get('ativo') === 'on' };
      if (s) { const before = JSON.parse(JSON.stringify(s)); Object.assign(s,obj); logAction('servicos',s.id,'ALTERAR',before,s); }
      else { obj.id=uuid(); db.servicos.push(obj); logAction('servicos',obj.id,'CRIAR',null,obj); }
      saveDb(); closeModal(); renderAll(); toast('Serviço salvo.');
    });
  });
}

function renderPecas() {
  const filtro = ($('#filtroPeca').value || '').toLowerCase();
  const rows = db.pecas.filter(p => !filtro || [p.descricao,p.sku].some(x => String(x||'').toLowerCase().includes(filtro))).map(p => `
    <tr><td>${escapeHtml(p.sku || '')}</td><td>${escapeHtml(p.descricao)}</td><td>${money(p.custo)}</td><td>${money(p.precoVenda)}</td><td>${number(p.estoqueAtual)}</td><td>${number(p.estoqueMinimo)}</td><td>${number(p.estoqueAtual)<=number(p.estoqueMinimo)?'<span class="pill CANCELADA">Baixo</span>':'<span class="pill APROVADA">OK</span>'}</td><td class="actions"><button class="btn small" data-edit-peca="${p.id}">Editar</button><button class="btn small danger" data-del-peca="${p.id}">Excluir</button></td></tr>`).join('');
  $('#listaPecas').innerHTML = `<table><thead><tr><th>SKU</th><th>Descrição</th><th>Custo</th><th>Venda</th><th>Estoque</th><th>Mínimo</th><th>Alerta</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table>`;
  $$('[data-edit-peca]').forEach(b => b.addEventListener('click', () => openPecaForm(db.pecas.find(p=>p.id===b.dataset.editPeca))));
  $$('[data-del-peca]').forEach(b => b.addEventListener('click', () => deleteEntity('pecas', b.dataset.delPeca, renderPecas)));
}

function openPecaForm(p = null) {
  openModal(p ? 'Editar peça' : 'Nova peça', `
    <form id="formPeca" class="form-grid">
      <label>SKU<input name="sku" value="${escapeHtml(p?.sku || '')}"></label>
      <label class="full">Descrição<input name="descricao" required value="${escapeHtml(p?.descricao || '')}"></label>
      <label>Custo<input name="custo" type="number" step="0.01" min="0" value="${p?.custo || 0}"></label>
      <label>Preço venda<input name="precoVenda" type="number" step="0.01" min="0" value="${p?.precoVenda || 0}"></label>
      <label>Estoque atual<input name="estoqueAtual" type="number" step="0.001" value="${p?.estoqueAtual || 0}"></label>
      <label>Estoque mínimo<input name="estoqueMinimo" type="number" step="0.001" value="${p?.estoqueMinimo || 0}"></label>
      <label><input type="checkbox" name="ativo" ${p?.ativo !== false ? 'checked' : ''}> Ativo</label>
      <button class="btn primary" type="submit">Salvar</button>
    </form>`, () => {
    $('#formPeca').addEventListener('submit', ev => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const obj = { sku: fd.get('sku'), descricao: fd.get('descricao'), custo: Number(fd.get('custo')||0), precoVenda: Number(fd.get('precoVenda')||0), estoqueAtual: Number(fd.get('estoqueAtual')||0), estoqueMinimo: Number(fd.get('estoqueMinimo')||0), ativo: fd.get('ativo') === 'on' };
      if (p) { const before = JSON.parse(JSON.stringify(p)); Object.assign(p,obj); logAction('pecas',p.id,'ALTERAR',before,p); }
      else { obj.id=uuid(); db.pecas.push(obj); logAction('pecas',obj.id,'CRIAR',null,obj); }
      saveDb(); closeModal(); renderAll(); toast('Peça salva.');
    });
  });
}

function renderUsuarios() {
  const filtro = ($('#filtroUsuario').value || '').toLowerCase();
  const rows = db.users.filter(u => !filtro || [u.nome,u.email,u.perfil].some(x => String(x||'').toLowerCase().includes(filtro))).map(u => `
    <tr><td>${escapeHtml(u.nome)}</td><td>${escapeHtml(u.email)}</td><td>${escapeHtml(u.perfil)}</td><td>${u.ativo?'Ativo':'Inativo'}</td><td>${formatDateShort(u.criadoEm)}</td><td class="actions"><button class="btn small" data-edit-usuario="${u.id}">Editar</button><button class="btn small danger" data-del-usuario="${u.id}">Excluir</button></td></tr>`).join('');
  $('#listaUsuarios').innerHTML = `<table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Criado em</th><th>Ações</th></tr></thead><tbody>${rows}</tbody></table>`;
  $$('[data-edit-usuario]').forEach(b => b.addEventListener('click', () => openUsuarioForm(db.users.find(u=>u.id===b.dataset.editUsuario))));
  $$('[data-del-usuario]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.delUsuario === currentUser.id) return toast('Não é possível excluir o usuário logado.');
    deleteEntity('users', b.dataset.delUsuario, renderUsuarios, 'usuarios');
  }));
}

function openUsuarioForm(u = null) {
  openModal(u ? 'Editar usuário' : 'Novo usuário', `
    <form id="formUsuario" class="form-grid">
      <label>Nome<input name="nome" required value="${escapeHtml(u?.nome || '')}"></label>
      <label>E-mail<input name="email" type="email" required value="${escapeHtml(u?.email || '')}"></label>
      <label>Senha<input name="senha" type="password" ${u ? '' : 'required'} placeholder="${u ? 'Deixe vazio para manter' : ''}"></label>
      <label>Perfil<select name="perfil">
        ${['ADMIN','ATENDENTE','MECANICO','FINANCEIRO','GERENTE'].map(p => `<option ${u?.perfil===p?'selected':''}>${p}</option>`).join('')}
      </select></label>
      <label><input type="checkbox" name="ativo" ${u?.ativo !== false ? 'checked' : ''}> Ativo</label>
      <button class="btn primary" type="submit">Salvar</button>
    </form>`, () => {
    $('#formUsuario').addEventListener('submit', ev => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const obj = { nome: fd.get('nome'), email: fd.get('email'), perfil: fd.get('perfil'), ativo: fd.get('ativo') === 'on' };
      const senha = fd.get('senha');
      if (senha) obj.senha = senha;
      if (u) { const before = JSON.parse(JSON.stringify(u)); Object.assign(u,obj); logAction('usuarios',u.id,'ALTERAR',before,u); }
      else { obj.id=uuid(); obj.criadoEm=nowIso(); db.users.push(obj); logAction('usuarios',obj.id,'CRIAR',null,obj); }
      saveDb(); closeModal(); renderAll(); toast('Usuário salvo.');
    });
  });
}

function renderComissoes() {
  fillMesComissao();
  const mesFiltro = $('#filtroMesComissao').value || new Date().toISOString().slice(0,7);
  const linhas = [];
  db.ordens.forEach(os => {
    if (!['FINALIZADA','FATURADA'].includes(os.status)) return;
    const dataBase = (os.faturadoEm || os.dataFechamento || os.dataAbertura || '').slice(0,7);
    if (dataBase !== mesFiltro) return;
    (os.servicos || []).forEach(s => {
      const bruto = number(s.quantidade) * number(s.valorUnitario);
      const valor = bruto * number(s.comissaoPercentual) / 100;
      linhas.push({ os: os.numero, mecanico: getUser(s.mecanicoId)?.nome || '-', servico: s.descricao, bruto, percentual: number(s.comissaoPercentual), valor });
    });
  });
  const total = linhas.reduce((a,l)=>a+l.valor,0);
  const rows = linhas.map(l => `<tr><td>#${l.os}</td><td>${escapeHtml(l.mecanico)}</td><td>${escapeHtml(l.servico)}</td><td>${money(l.bruto)}</td><td>${l.percentual}%</td><td>${money(l.valor)}</td></tr>`).join('');
  $('#relatorioComissoes').innerHTML = `<table><thead><tr><th>OS</th><th>Mecânico</th><th>Serviço</th><th>Base</th><th>%</th><th>Comissão</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th colspan="5">Total</th><th>${money(total)}</th></tr></tfoot></table>`;
}

function fillMesComissao() {
  const sel = $('#filtroMesComissao');
  if (sel.options.length) return;
  const months = new Set([new Date().toISOString().slice(0,7)]);
  db.ordens.forEach(o => months.add((o.faturadoEm || o.dataFechamento || o.dataAbertura || '').slice(0,7)));
  sel.innerHTML = Array.from(months).filter(Boolean).sort().reverse().map(m => `<option value="${m}">${m.split('-').reverse().join('/')}</option>`).join('');
}

function exportComissoesCsv() {
  const table = $('#relatorioComissoes table');
  if (!table) return;
  const rows = $$('tr', table).map(tr => $$('th,td', tr).map(td => `"${td.textContent.replace(/"/g,'""')}"`).join(';')).join('\n');
  downloadText('comissoes.csv', rows, 'text/csv;charset=utf-8');
}

function renderLogs() {
  const filtro = ($('#filtroLog').value || '').toLowerCase();
  const rows = db.logs.filter(l => !filtro || [l.acao,l.entidade,l.usuarioNome,l.idEntidade].some(x => String(x||'').toLowerCase().includes(filtro))).slice(0,300).map(l => `
    <tr><td>${formatDate(l.data)}</td><td>${escapeHtml(l.usuarioNome)}</td><td>${escapeHtml(l.entidade)}</td><td>${escapeHtml(l.acao)}</td><td><code>${escapeHtml(l.idEntidade || '-')}</code></td></tr>`).join('');
  $('#listaLogs').innerHTML = `<table><thead><tr><th>Data</th><th>Usuário</th><th>Entidade</th><th>Ação</th><th>ID</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderConfig() {
  const f = $('#formConfig');
  Object.keys(db.config).forEach(k => {
    if (f[k]) f[k].value = db.config[k];
  });
}

function deleteEntity(collection, id, callback, logEntity = collection) {
  if (!confirm('Confirma exclusão?')) return;
  const list = db[collection];
  const item = list.find(x => x.id === id);
  if (!item) return;
  db[collection] = list.filter(x => x.id !== id);
  saveDb();
  logAction(logEntity, id, 'EXCLUIR', item, null);
  callback();
  toast('Registro excluído.');
}

function maskDoc(v) {
  const d = onlyDigits(v);
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$4');
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.***.***/****-$5');
  return escapeHtml(v || '');
}

function onlyDigits(v) {
  return String(v || '').replace(/\D/g, '');
}

function downloadText(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}
