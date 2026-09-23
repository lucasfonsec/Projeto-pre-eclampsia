-- ============================================================
-- PredGest: 0001_schema.sql
-- Tipos, tabelas e índices
-- ============================================================

-- Extensões necessárias
create extension if not exists "pgcrypto";

-- ============================================================
-- TIPOS ENUMERADOS
-- ============================================================
create type public.app_role as enum ('admin','obstetra','enfermagem','pesquisa');
create type public.nivel_risco as enum ('baixo','moderado','alto');
create type public.severidade as enum ('informativo','atencao','grave');

-- ============================================================
-- TABELA: profiles
-- ============================================================
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  nome            text not null,
  email           text not null,
  registro_conselho text,
  telefone        text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;

enable row level security on public.profiles;

-- ============================================================
-- TABELA: user_roles
-- ============================================================
create table public.user_roles (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references auth.users(id) on delete cascade,
  role     public.app_role not null default 'obstetra',
  unique(user_id, role)
);

grant select, insert, update, delete on public.user_roles to authenticated;

enable row level security on public.user_roles;

-- ============================================================
-- TABELA: unidades
-- ============================================================
create table public.unidades (
  id        bigint generated always as identity primary key,
  nome      text not null,
  tipo      text not null check (tipo in ('alto_risco','rotina')),
  municipio text not null,
  uf        char(2) not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

grant select, insert, update, delete on public.unidades to authenticated;

enable row level security on public.unidades;

-- ============================================================
-- TABELA: unidade_membros
-- ============================================================
create table public.unidade_membros (
  id          bigint generated always as identity primary key,
  unidade_id  bigint not null references public.unidades(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  unique(unidade_id, user_id)
);

grant select, insert, update, delete on public.unidade_membros to authenticated;

enable row level security on public.unidade_membros;

-- ============================================================
-- TABELA: gestantes
-- ============================================================
create table public.gestantes (
  id                      uuid primary key default gen_random_uuid(),
  nome                    text not null,
  prontuario              text not null unique,
  data_nascimento         date not null,
  imc_pre_gestacional     numeric(5,2),
  gesta                   int not null default 1,
  para                    int not null default 0,
  nuliparidade            boolean not null default false,
  pe_gestacao_anterior    boolean not null default false,
  hipertensao_cronica     boolean not null default false,
  diabetes                boolean not null default false,
  gestacao_multipla       boolean not null default false,
  dum                     date,
  dpp                     date,
  unidade_id              bigint not null references public.unidades(id),
  responsavel_id          uuid references public.profiles(id),
  ativa                   boolean not null default true,
  criado_em               timestamptz not null default now(),
  atualizado_em           timestamptz not null default now()
);

grant select, insert, update, delete on public.gestantes to authenticated;

enable row level security on public.gestantes;

create index idx_gestantes_unidade_id  on public.gestantes(unidade_id);
create index idx_gestantes_prontuario  on public.gestantes(prontuario);

-- ============================================================
-- TABELA: avaliacoes
-- ============================================================
create table public.avaliacoes (
  id                  uuid primary key default gen_random_uuid(),
  gestante_id         uuid not null references public.gestantes(id) on delete cascade,
  data                timestamptz not null default now(),
  idade_gestacional   numeric(4,1) not null,
  pas                 int not null,
  pad                 int not null,
  proteinuria         smallint not null default 0 check (proteinuria between 0 and 3),
  plaquetas           int,
  creatinina          numeric(4,2),
  tgo                 int,
  tgp                 int,
  acido_urico         numeric(4,1),
  sflt_plgf           numeric null,
  sintomas            text[] not null default '{}',
  peso                numeric(5,2),
  nota                text,
  registrado_por      uuid references public.profiles(id),
  criado_em           timestamptz not null default now()
);

grant select, insert, update, delete on public.avaliacoes to authenticated;

enable row level security on public.avaliacoes;

create index idx_avaliacoes_gestante_data on public.avaliacoes(gestante_id, data desc);

-- ============================================================
-- TABELA: modelos_ml
-- ============================================================
create table public.modelos_ml (
  id              bigint generated always as identity primary key,
  versao          text not null unique,
  algoritmo       text not null,
  auc             numeric(4,3),
  sensibilidade   numeric(4,3),
  especificidade  numeric(4,3),
  amostra_treino  int,
  intercepto      numeric not null default -3.6,
  escala_logito   numeric not null default 0.35,
  coeficientes    jsonb not null,
  ativo           boolean not null default false,
  criado_em       timestamptz not null default now()
);

grant select on public.modelos_ml to authenticated;
grant insert, update, delete on public.modelos_ml to authenticated;

enable row level security on public.modelos_ml;

-- ============================================================
-- TABELA: predicoes
-- ============================================================
create table public.predicoes (
  id              uuid primary key default gen_random_uuid(),
  avaliacao_id    uuid not null unique references public.avaliacoes(id) on delete cascade,
  modelo_id       bigint references public.modelos_ml(id),
  probabilidade   numeric not null check (probabilidade between 0 and 1),
  nivel           public.nivel_risco not null,
  contribuicoes   jsonb not null default '{}',
  gerado_em       timestamptz not null default now()
);

grant select, insert, update, delete on public.predicoes to authenticated;

enable row level security on public.predicoes;

create index idx_predicoes_avaliacao on public.predicoes(avaliacao_id);

-- ============================================================
-- TABELA: alertas
-- ============================================================
create table public.alertas (
  id              uuid primary key default gen_random_uuid(),
  avaliacao_id    uuid references public.avaliacoes(id) on delete cascade,
  gestante_id     uuid not null references public.gestantes(id) on delete cascade,
  tipo            text not null,
  descricao       text not null,
  severidade      public.severidade not null,
  resolvido       boolean not null default false,
  resolvido_por   uuid references public.profiles(id),
  resolvido_em    timestamptz,
  criado_em       timestamptz not null default now()
);

grant select, insert, update, delete on public.alertas to authenticated;

enable row level security on public.alertas;

create index idx_alertas_gestante_resolvido on public.alertas(gestante_id, resolvido);

-- ============================================================
-- TABELA: condutas
-- ============================================================
create table public.condutas (
  id              uuid primary key default gen_random_uuid(),
  gestante_id     uuid not null references public.gestantes(id) on delete cascade,
  avaliacao_id    uuid references public.avaliacoes(id),
  descricao       text not null,
  tipo            text not null check (tipo in ('observacao','medicacao','internacao','encaminhamento','retorno')),
  autor_id        uuid references public.profiles(id),
  data            timestamptz not null default now(),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

grant select, insert, update, delete on public.condutas to authenticated;

enable row level security on public.condutas;

-- ============================================================
-- TABELA: auditoria
-- ============================================================
create table public.auditoria (
  id              bigint generated always as identity primary key,
  usuario_id      uuid references auth.users(id),
  acao            text not null,
  tabela          text not null,
  registro_id     text,
  dados           jsonb,
  ip              text,
  criado_em       timestamptz not null default now()
);

grant insert on public.auditoria to authenticated;
grant select on public.auditoria to authenticated;

enable row level security on public.auditoria;
