-- OficinaPro OS - Schema PostgreSQL inicial
-- Versão sem integração SENATRAN ativa, mas com estrutura preparada para consulta futura.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE empresas (
    id_empresa UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    razao_social VARCHAR(150) NOT NULL,
    nome_fantasia VARCHAR(150) NOT NULL,
    cnpj VARCHAR(14) NOT NULL UNIQUE,
    email VARCHAR(120),
    telefone VARCHAR(20),
    endereco TEXT,
    garantia_padrao_dias INTEGER NOT NULL DEFAULT 90,
    comissao_padrao NUMERIC(5,2) NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE filiais (
    id_filial UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa UUID NOT NULL REFERENCES empresas(id_empresa),
    nome VARCHAR(100) NOT NULL,
    cidade VARCHAR(100),
    uf CHAR(2),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE usuarios (
    id_usuario UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa UUID NOT NULL REFERENCES empresas(id_empresa),
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL,
    senha_hash TEXT NOT NULL,
    perfil VARCHAR(30) NOT NULL CHECK (perfil IN ('ADMIN','ATENDENTE','MECANICO','FINANCEIRO','GERENTE')),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (id_empresa, email)
);

CREATE TABLE clientes (
    id_cliente UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa UUID NOT NULL REFERENCES empresas(id_empresa),
    tipo_pessoa CHAR(1) NOT NULL CHECK (tipo_pessoa IN ('F','J')),
    nome_razao VARCHAR(150) NOT NULL,
    cpf_cnpj VARCHAR(14),
    telefone VARCHAR(20),
    whatsapp VARCHAR(20),
    email VARCHAR(120),
    endereco TEXT,
    consentimento_lgpd BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMP NOT NULL DEFAULT now()
);


CREATE TABLE catalogo_veiculos (
    id_catalogo UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa UUID REFERENCES empresas(id_empresa),
    codigo VARCHAR(80) NOT NULL,
    marca VARCHAR(80) NOT NULL,
    modelo VARCHAR(100) NOT NULL,
    carroceria VARCHAR(50),
    ano_inicial INTEGER,
    ano_final INTEGER,
    combustiveis TEXT[],
    origem VARCHAR(30) NOT NULL DEFAULT 'CATALOGO_LOCAL',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (id_empresa, codigo)
);

CREATE TABLE veiculos (
    id_veiculo UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa UUID NOT NULL REFERENCES empresas(id_empresa),
    id_cliente UUID NOT NULL REFERENCES clientes(id_cliente),
    id_catalogo UUID REFERENCES catalogo_veiculos(id_catalogo),
    placa VARCHAR(8),
    chassi VARCHAR(30),
    renavam VARCHAR(20),
    marca VARCHAR(80),
    modelo VARCHAR(100),
    ano_fabricacao INTEGER,
    ano_modelo INTEGER,
    cor VARCHAR(40),
    combustivel VARCHAR(40),
    km_atual INTEGER,
    origem_dados VARCHAR(30) NOT NULL DEFAULT 'MANUAL',
    atualizado_em TIMESTAMP,
    criado_em TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (id_empresa, placa)
);

CREATE TABLE servicos (
    id_servico UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa UUID NOT NULL REFERENCES empresas(id_empresa),
    descricao VARCHAR(150) NOT NULL,
    valor_padrao NUMERIC(12,2) NOT NULL DEFAULT 0,
    garantia_dias INTEGER NOT NULL DEFAULT 90,
    comissao_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE pecas (
    id_peca UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa UUID NOT NULL REFERENCES empresas(id_empresa),
    sku VARCHAR(60),
    descricao VARCHAR(150) NOT NULL,
    custo NUMERIC(12,2) NOT NULL DEFAULT 0,
    preco_venda NUMERIC(12,2) NOT NULL DEFAULT 0,
    estoque_atual NUMERIC(12,3) NOT NULL DEFAULT 0,
    estoque_minimo NUMERIC(12,3) NOT NULL DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE ordens_servico (
    id_os UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa UUID NOT NULL REFERENCES empresas(id_empresa),
    id_filial UUID NOT NULL REFERENCES filiais(id_filial),
    id_cliente UUID NOT NULL REFERENCES clientes(id_cliente),
    id_veiculo UUID NOT NULL REFERENCES veiculos(id_veiculo),
    numero BIGSERIAL,
    status VARCHAR(30) NOT NULL DEFAULT 'ABERTA'
        CHECK (status IN ('ABERTA','DIAGNOSTICO','AGUARDANDO_APROVACAO','APROVADA','EM_EXECUCAO','AGUARDANDO_PECAS','FINALIZADA','FATURADA','CANCELADA')),
    km_entrada INTEGER,
    reclamacao_cliente TEXT,
    diagnostico_tecnico TEXT,
    previsao_entrega TIMESTAMP,
    data_abertura TIMESTAMP NOT NULL DEFAULT now(),
    data_fechamento TIMESTAMP,
    aprovado_em TIMESTAMP,
    faturado_em TIMESTAMP,
    criado_por UUID REFERENCES usuarios(id_usuario)
);

CREATE TABLE os_servicos (
    id_os_servico UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_os UUID NOT NULL REFERENCES ordens_servico(id_os) ON DELETE CASCADE,
    id_servico UUID NOT NULL REFERENCES servicos(id_servico),
    id_mecanico UUID REFERENCES usuarios(id_usuario),
    descricao VARCHAR(150) NOT NULL,
    quantidade NUMERIC(12,3) NOT NULL DEFAULT 1,
    valor_unitario NUMERIC(12,2) NOT NULL,
    valor_total NUMERIC(12,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    comissao_percentual NUMERIC(5,2) NOT NULL DEFAULT 0
);

CREATE TABLE os_pecas (
    id_os_peca UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_os UUID NOT NULL REFERENCES ordens_servico(id_os) ON DELETE CASCADE,
    id_peca UUID NOT NULL REFERENCES pecas(id_peca),
    descricao VARCHAR(150) NOT NULL,
    quantidade NUMERIC(12,3) NOT NULL DEFAULT 1,
    valor_unitario NUMERIC(12,2) NOT NULL,
    valor_total NUMERIC(12,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED
);

CREATE TABLE checklist_os (
    id_checklist UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_os UUID NOT NULL REFERENCES ordens_servico(id_os) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ENTRADA','SAIDA')),
    combustivel_percentual INTEGER CHECK (combustivel_percentual BETWEEN 0 AND 100),
    possui_estepe BOOLEAN,
    possui_macaco BOOLEAN,
    possui_chave_roda BOOLEAN,
    observacoes TEXT,
    assinatura_cliente_url TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE checklist_marcacoes (
    id_marcacao UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_checklist UUID NOT NULL REFERENCES checklist_os(id_checklist) ON DELETE CASCADE,
    area_veiculo VARCHAR(60) NOT NULL,
    tipo_avaria VARCHAR(60) NOT NULL,
    gravidade VARCHAR(20) NOT NULL DEFAULT 'Leve' CHECK (gravidade IN ('Leve','Média','Grave')),
    status VARCHAR(30) NOT NULL DEFAULT 'Pendente',
    pos_x NUMERIC(8,4) NOT NULL,
    pos_y NUMERIC(8,4) NOT NULL,
    observacao TEXT,
    foto_url TEXT,
    criado_por UUID REFERENCES usuarios(id_usuario),
    criado_em TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE garantias (
    id_garantia UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_os UUID NOT NULL REFERENCES ordens_servico(id_os),
    termo TEXT NOT NULL,
    validade_inicio DATE NOT NULL,
    validade_fim DATE NOT NULL,
    pdf_url TEXT,
    assinatura_cliente_url TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE logs_auditoria (
    id_log UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa UUID REFERENCES empresas(id_empresa),
    id_usuario UUID REFERENCES usuarios(id_usuario),
    entidade VARCHAR(80) NOT NULL,
    id_entidade UUID,
    acao VARCHAR(40) NOT NULL,
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip VARCHAR(45),
    user_agent TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT now()
);

-- Tabela reservada para integração futura SENATRAN/SERPRO.
CREATE TABLE consultas_veiculares (
    id_consulta UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_empresa UUID NOT NULL REFERENCES empresas(id_empresa),
    id_usuario UUID REFERENCES usuarios(id_usuario),
    id_veiculo UUID REFERENCES veiculos(id_veiculo),
    provedor VARCHAR(30) NOT NULL DEFAULT 'SENATRAN',
    tipo_consulta VARCHAR(30) NOT NULL CHECK (tipo_consulta IN ('PLACA','CHASSI','RENAVAM')),
    parametro_consulta VARCHAR(80) NOT NULL,
    finalidade TEXT NOT NULL,
    sucesso BOOLEAN NOT NULL DEFAULT FALSE,
    status_http INTEGER,
    resposta_resumida JSONB,
    erro TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_os_empresa_status_data ON ordens_servico (id_empresa, status, data_abertura DESC);
CREATE INDEX idx_os_cliente ON ordens_servico (id_cliente, data_abertura DESC);
CREATE INDEX idx_os_veiculo ON ordens_servico (id_veiculo, data_abertura DESC);
CREATE INDEX idx_veiculos_empresa_placa ON veiculos (id_empresa, placa);
CREATE INDEX idx_veiculos_empresa_modelo ON veiculos (id_empresa, marca, modelo, ano_modelo);
CREATE INDEX idx_catalogo_veiculos_marca_modelo ON catalogo_veiculos (marca, modelo, ano_inicial, ano_final);
CREATE INDEX idx_checklist_marcacoes_tipo ON checklist_marcacoes (area_veiculo, tipo_avaria, gravidade, status);
CREATE INDEX idx_clientes_empresa_nome ON clientes (id_empresa, nome_razao);
CREATE INDEX idx_logs_empresa_data ON logs_auditoria (id_empresa, criado_em DESC);
CREATE INDEX idx_consultas_veiculares_empresa_data ON consultas_veiculares (id_empresa, criado_em DESC);
