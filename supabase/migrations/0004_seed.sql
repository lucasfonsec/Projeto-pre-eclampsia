-- ============================================================
-- PredGest: 0004_seed.sql
-- Dados iniciais para demo e testes
-- ============================================================

-- ============================================================
-- MODELO ML ativo (v2.4)
-- ============================================================
insert into public.modelos_ml
  (versao, algoritmo, auc, sensibilidade, especificidade, amostra_treino,
   intercepto, escala_logito, coeficientes, ativo)
values (
  'v2.4',
  'regressao_logistica',
  0.910, 0.860, 0.820, 4820,
  -3.6, 0.35,
  '{
    "pas": 3.4,
    "pad": 2.9,
    "proteinuria": 3.8,
    "plaquetas": 2.1,
    "creatinina": 2.0,
    "tgo": 1.6,
    "acido_urico": 1.5,
    "idade_gestacional": 1.1,
    "imc_pre_gestacional": 1.0,
    "idade_materna": 0.8,
    "pe_anterior": 1.4,
    "hipertensao_cronica": 1.2,
    "nuliparidade": 0.7,
    "diabetes": 0.6,
    "gestacao_multipla": 0.9,
    "sintomas": 1.7,
    "sflt_plgf": 2.4
  }'::jsonb,
  true
);

-- ============================================================
-- UNIDADE
-- ============================================================
insert into public.unidades (nome, tipo, municipio, uf)
values ('Maternidade Pública São Lucas', 'alto_risco', 'Curitiba', 'PR');

-- ============================================================
-- GESTANTES (6 gestantes, prontuários únicos)
-- ============================================================
insert into public.gestantes
  (nome, prontuario, data_nascimento, imc_pre_gestacional,
   gesta, para, nuliparidade, pe_gestacao_anterior,
   hipertensao_cronica, diabetes, gestacao_multipla,
   dum, dpp, unidade_id, ativa)
values
  -- 1. Baixo risco
  ('Ana Paula Rodrigues',    'PRN-0001', '1992-03-15', 22.5,
   2, 1, false, false, false, false, false,
   current_date - interval '22 weeks', current_date + interval '18 weeks',
   1, true),

  -- 2. Baixo risco
  ('Beatriz Santos Lima',   'PRN-0002', '1995-07-20', 21.0,
   1, 0, true, false, false, false, false,
   current_date - interval '20 weeks', current_date + interval '20 weeks',
   1, true),

  -- 3. Risco moderado
  ('Carla Mendes Ferreira',  'PRN-0003', '1988-11-30', 27.3,
   3, 2, false, true, false, false, false,
   current_date - interval '28 weeks', current_date + interval '12 weeks',
   1, true),

  -- 4. Risco moderado
  ('Daniela Oliveira Costa', 'PRN-0004', '1990-04-08', 29.5,
   2, 1, false, false, true, true, false,
   current_date - interval '30 weeks', current_date + interval '10 weeks',
   1, true),

  -- 5. Alto risco
  ('Eduarda Pereira Souza',  'PRN-0005', '1985-09-22', 33.2,
   4, 3, false, true, true, false, false,
   current_date - interval '32 weeks', current_date + interval '8 weeks',
   1, true),

  -- 6. Alto risco
  ('Fernanda Castro Alves',  'PRN-0006', '1982-12-05', 35.8,
   2, 1, false, true, true, true, true,
   current_date - interval '34 weeks', current_date + interval '6 weeks',
   1, true);

-- ============================================================
-- AVALIAÇÕES + PREDIÇÕES (via trigger automático)
-- Gestante 1 (Ana Paula) — baixo risco
-- ============================================================
insert into public.avaliacoes
  (gestante_id, data, idade_gestacional, pas, pad, proteinuria,
   plaquetas, creatinina, tgo, tgp, acido_urico, sflt_plgf,
   sintomas, peso)
select
  g.id,
  now() - interval '6 weeks',
  18.0, 118, 76, 0, 210000, 0.7, 22, 18, 4.2, null, '{}', 64.0
from public.gestantes g where g.prontuario = 'PRN-0001';

insert into public.avaliacoes
  (gestante_id, data, idade_gestacional, pas, pad, proteinuria,
   plaquetas, creatinina, tgo, tgp, acido_urico, sflt_plgf,
   sintomas, peso)
select
  g.id,
  now() - interval '2 weeks',
  22.0, 122, 78, 0, 205000, 0.8, 24, 19, 4.5, null, '{}', 65.5
from public.gestantes g where g.prontuario = 'PRN-0001';

-- Gestante 2 (Beatriz) — baixo risco
insert into public.avaliacoes
  (gestante_id, data, idade_gestacional, pas, pad, proteinuria,
   plaquetas, creatinina, tgo, tgp, acido_urico, sflt_plgf,
   sintomas, peso)
select
  g.id,
  now() - interval '4 weeks',
  16.0, 115, 74, 0, 220000, 0.7, 20, 17, 3.8, null, '{}', 58.0
from public.gestantes g where g.prontuario = 'PRN-0002';

insert into public.avaliacoes
  (gestante_id, data, idade_gestacional, pas, pad, proteinuria,
   plaquetas, creatinina, tgo, tgp, acido_urico, sflt_plgf,
   sintomas, peso)
select
  g.id,
  now() - interval '1 week',
  20.0, 118, 76, 0, 218000, 0.8, 22, 18, 4.0, null, '{}', 59.2
from public.gestantes g where g.prontuario = 'PRN-0002';

-- Gestante 3 (Carla) — risco moderado
insert into public.avaliacoes
  (gestante_id, data, idade_gestacional, pas, pad, proteinuria,
   plaquetas, creatinina, tgo, tgp, acido_urico, sflt_plgf,
   sintomas, peso)
select
  g.id,
  now() - interval '8 weeks',
  20.0, 135, 85, 1, 180000, 0.85, 30, 28, 5.0, null, '{}', 75.0
from public.gestantes g where g.prontuario = 'PRN-0003';

insert into public.avaliacoes
  (gestante_id, data, idade_gestacional, pas, pad, proteinuria,
   plaquetas, creatinina, tgo, tgp, acido_urico, sflt_plgf,
   sintomas, peso)
select
  g.id,
  now() - interval '4 weeks',
  24.0, 140, 90, 1, 170000, 0.90, 35, 32, 5.5, null, '{}', 76.5
from public.gestantes g where g.prontuario = 'PRN-0003';

insert into public.avaliacoes
  (gestante_id, data, idade_gestacional, pas, pad, proteinuria,
   plaquetas, creatinina, tgo, tgp, acido_urico, sflt_plgf,
   sintomas, peso)
select
  g.id,
  now() - interval '1 week',
  28.0, 142, 92, 1, 165000, 0.92, 38, 35, 5.8, null, '{}', 78.0
from public.gestantes g where g.prontuario = 'PRN-0003';

-- Gestante 4 (Daniela) — risco moderado
insert into public.avaliacoes
  (gestante_id, data, idade_gestacional, pas, pad, proteinuria,
   plaquetas, creatinina, tgo, tgp, acido_urico, sflt_plgf,
   sintomas, peso)
select
  g.id,
  now() - interval '6 weeks',
  24.0, 138, 88, 1, 175000, 0.88, 32, 28, 5.2, null, '{}', 80.0
from public.gestantes g where g.prontuario = 'PRN-0004';

insert into public.avaliacoes
  (gestante_id, data, idade_gestacional, pas, pad, proteinuria,
   plaquetas, creatinina, tgo, tgp, acido_urico, sflt_plgf,
   sintomas, peso)
select
  g.id,
  now() - interval '2 weeks',
  30.0, 142, 92, 2, 162000, 0.95, 42, 38, 6.0, null, '{}', 82.0
from public.gestantes g where g.prontuario = 'PRN-0004';

-- Gestante 5 (Eduarda) — alto risco
insert into public.avaliacoes
  (gestante_id, data, idade_gestacional, pas, pad, proteinuria,
   plaquetas, creatinina, tgo, tgp, acido_urico, sflt_plgf,
   sintomas, peso)
select
  g.id,
  now() - interval '6 weeks',
  26.0, 150, 98, 2, 145000, 1.0, 52, 48, 6.5, 42.0,
  '{"cefaleia"}', 85.0
from public.gestantes g where g.prontuario = 'PRN-0005';

insert into public.avaliacoes
  (gestante_id, data, idade_gestacional, pas, pad, proteinuria,
   plaquetas, creatinina, tgo, tgp, acido_urico, sflt_plgf,
   sintomas, peso)
select
  g.id,
  now() - interval '3 weeks',
  30.0, 155, 102, 2, 130000, 1.05, 58, 54, 7.0, 55.0,
  '{"cefaleia","disturbios_visuais"}', 86.5
from public.gestantes g where g.prontuario = 'PRN-0005';

insert into public.avaliacoes
  (gestante_id, data, idade_gestacional, pas, pad, proteinuria,
   plaquetas, creatinina, tgo, tgp, acido_urico, sflt_plgf,
   sintomas, peso)
select
  g.id,
  now() - interval '1 week',
  32.0, 158, 105, 3, 115000, 1.08, 65, 60, 7.5, 68.0,
  '{"cefaleia","disturbios_visuais","dor_epigastrica"}', 87.0
from public.gestantes g where g.prontuario = 'PRN-0005';

-- Gestante 6 (Fernanda) — alto risco máximo
insert into public.avaliacoes
  (gestante_id, data, idade_gestacional, pas, pad, proteinuria,
   plaquetas, creatinina, tgo, tgp, acido_urico, sflt_plgf,
   sintomas, peso)
select
  g.id,
  now() - interval '8 weeks',
  26.0, 148, 96, 2, 150000, 0.98, 50, 46, 6.8, 40.0,
  '{"cefaleia"}', 90.0
from public.gestantes g where g.prontuario = 'PRN-0006';

insert into public.avaliacoes
  (gestante_id, data, idade_gestacional, pas, pad, proteinuria,
   plaquetas, creatinina, tgo, tgp, acido_urico, sflt_plgf,
   sintomas, peso)
select
  g.id,
  now() - interval '4 weeks',
  30.0, 160, 108, 3, 105000, 1.15, 78, 72, 8.0, 72.0,
  '{"cefaleia","disturbios_visuais","dor_epigastrica"}', 92.0
from public.gestantes g where g.prontuario = 'PRN-0006';

insert into public.avaliacoes
  (gestante_id, data, idade_gestacional, pas, pad, proteinuria,
   plaquetas, creatinina, tgo, tgp, acido_urico, sflt_plgf,
   sintomas, peso)
select
  g.id,
  now() - interval '2 weeks',
  32.0, 165, 112, 3, 95000, 1.20, 85, 80, 8.5, 80.0,
  '{"cefaleia","disturbios_visuais","dor_epigastrica"}', 93.5
from public.gestantes g where g.prontuario = 'PRN-0006';

insert into public.avaliacoes
  (gestante_id, data, idade_gestacional, pas, pad, proteinuria,
   plaquetas, creatinina, tgo, tgp, acido_urico, sflt_plgf,
   sintomas, peso)
select
  g.id,
  now(),
  34.0, 168, 114, 3, 90000, 1.22, 88, 83, 8.8, 82.0,
  '{"cefaleia","disturbios_visuais","dor_epigastrica"}', 94.0
from public.gestantes g where g.prontuario = 'PRN-0006';
