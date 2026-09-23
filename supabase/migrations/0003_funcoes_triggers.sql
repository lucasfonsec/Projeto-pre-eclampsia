-- ============================================================
-- PredGest: 0003_funcoes_triggers.sql
-- Funções, triggers e views
-- ============================================================

-- ============================================================
-- TRIGGER: set_atualizado_em
-- ============================================================
create or replace function public.set_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger trg_profiles_atualizado_em
  before update on public.profiles
  for each row execute function public.set_atualizado_em();

create trigger trg_gestantes_atualizado_em
  before update on public.gestantes
  for each row execute function public.set_atualizado_em();

create trigger trg_condutas_atualizado_em
  before update on public.condutas
  for each row execute function public.set_atualizado_em();

create trigger trg_unidades_atualizado_em
  before update on public.unidades
  for each row execute function public.set_atualizado_em();

-- ============================================================
-- TRIGGER: criar profile + papel padrão ao cadastrar usuário
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'obstetra')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create trigger trg_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- FUNÇÃO: calcular predição SQL
-- Equivalente a src/lib/predict.ts
-- ============================================================
create or replace function public.calcular_predicao(p_avaliacao_id uuid)
returns uuid language plpgsql security definer
set search_path = public
as $$
declare
  v_modelo record;
  v_av     record;
  v_gest   record;
  v_logito numeric;
  v_prob   numeric;
  v_nivel  public.nivel_risco;
  v_contribuicoes jsonb;
  v_pred_id uuid;
  -- variáveis normalizadas
  n_pas numeric; n_pad numeric; n_prot numeric;
  n_plaq numeric; n_creat numeric; n_tgo numeric;
  n_acido numeric; n_ig numeric; n_imc numeric;
  n_idade numeric; n_sflt numeric;
  n_pe_ant numeric; n_hcron numeric; n_nulip numeric;
  n_diab numeric; n_gestmult numeric; n_sint numeric;
  -- soma de contribuições
  sum_contrib numeric;
begin
  -- Buscar modelo ativo
  select * into v_modelo from public.modelos_ml where ativo = true limit 1;
  if not found then
    raise exception 'Nenhum modelo ativo encontrado';
  end if;

  -- Buscar avaliação
  select * into v_av from public.avaliacoes where id = p_avaliacao_id;
  if not found then
    raise exception 'Avaliação não encontrada';
  end if;

  -- Buscar gestante
  select * into v_gest from public.gestantes where id = v_av.gestante_id;

  -- Calcular idade materna em anos
  declare
    v_idade_anos numeric := extract(year from age(now(), v_gest.data_nascimento));
  begin
    -- Normalização: clamp01((v - min) / (max - min))
    n_pas    := greatest(0, least(1, (v_av.pas - 120.0)       / (175.0 - 120.0)));
    n_pad    := greatest(0, least(1, (v_av.pad - 75.0)        / (115.0 - 75.0)));
    n_prot   := greatest(0, least(1, v_av.proteinuria / 3.0));
    n_plaq   := greatest(0, least(1, 1.0 - (coalesce(v_av.plaquetas, 150)::numeric - 90.0) / (220.0 - 90.0)));
    n_creat  := greatest(0, least(1, (coalesce(v_av.creatinina, 0.7) - 0.6) / (1.4 - 0.6)));
    n_tgo    := greatest(0, least(1, (coalesce(v_av.tgo, 25) - 20.0) / (90.0 - 20.0)));
    n_acido  := greatest(0, least(1, (coalesce(v_av.acido_urico, 4.0) - 3.5) / (9.0 - 3.5)));
    n_ig     := greatest(0, least(1, (v_av.idade_gestacional - 20.0) / (38.0 - 20.0)));
    n_imc    := greatest(0, least(1, (coalesce(v_gest.imc_pre_gestacional, 22.0) - 20.0) / (38.0 - 20.0)));
    n_idade  := greatest(0, least(1, (v_idade_anos - 20.0) / (42.0 - 20.0)));
    n_sflt   := case when v_av.sflt_plgf is not null
                     then greatest(0, least(1, (v_av.sflt_plgf - 10.0) / (85.0 - 10.0)))
                     else null end;
    n_pe_ant   := case when v_gest.pe_gestacao_anterior   then 1.0 else 0.0 end;
    n_hcron    := case when v_gest.hipertensao_cronica    then 1.0 else 0.0 end;
    n_nulip    := case when v_gest.nuliparidade           then 1.0 else 0.0 end;
    n_diab     := case when v_gest.diabetes               then 1.0 else 0.0 end;
    n_gestmult := case when v_gest.gestacao_multipla      then 1.0 else 0.0 end;

    -- Sintomas graves
    declare
      v_sint_graves int := 0;
    begin
      if 'cefaleia'          = any(v_av.sintomas) then v_sint_graves := v_sint_graves + 1; end if;
      if 'disturbios_visuais'= any(v_av.sintomas) then v_sint_graves := v_sint_graves + 1; end if;
      if 'dor_epigastrica'   = any(v_av.sintomas) then v_sint_graves := v_sint_graves + 1; end if;
      n_sint := greatest(0, least(1, v_sint_graves / 2.0));
    end;

    -- Calcular logito e probabilidade
    v_logito :=
      v_modelo.intercepto + v_modelo.escala_logito * (
        (v_modelo.coeficientes->>'pas')::numeric       * n_pas    +
        (v_modelo.coeficientes->>'pad')::numeric       * n_pad    +
        (v_modelo.coeficientes->>'proteinuria')::numeric * n_prot +
        (v_modelo.coeficientes->>'plaquetas')::numeric * n_plaq   +
        (v_modelo.coeficientes->>'creatinina')::numeric * n_creat +
        (v_modelo.coeficientes->>'tgo')::numeric       * n_tgo    +
        (v_modelo.coeficientes->>'acido_urico')::numeric * n_acido +
        (v_modelo.coeficientes->>'idade_gestacional')::numeric * n_ig +
        (v_modelo.coeficientes->>'imc_pre_gestacional')::numeric * n_imc +
        (v_modelo.coeficientes->>'idade_materna')::numeric * n_idade +
        (v_modelo.coeficientes->>'pe_anterior')::numeric * n_pe_ant +
        (v_modelo.coeficientes->>'hipertensao_cronica')::numeric * n_hcron +
        (v_modelo.coeficientes->>'nuliparidade')::numeric * n_nulip +
        (v_modelo.coeficientes->>'diabetes')::numeric * n_diab +
        (v_modelo.coeficientes->>'gestacao_multipla')::numeric * n_gestmult +
        (v_modelo.coeficientes->>'sintomas')::numeric * n_sint +
        coalesce((v_modelo.coeficientes->>'sflt_plgf')::numeric * n_sflt, 0)
      );

    v_prob := 1.0 / (1.0 + exp(-v_logito));

    -- Nível de risco
    v_nivel := case
      when v_prob >= 0.60 then 'alto'::public.nivel_risco
      when v_prob >= 0.30 then 'moderado'::public.nivel_risco
      else 'baixo'::public.nivel_risco
    end;

    -- Contribuições relativas
    declare
      c_pas    numeric := (v_modelo.coeficientes->>'pas')::numeric * n_pas;
      c_pad    numeric := (v_modelo.coeficientes->>'pad')::numeric * n_pad;
      c_prot   numeric := (v_modelo.coeficientes->>'proteinuria')::numeric * n_prot;
      c_plaq   numeric := (v_modelo.coeficientes->>'plaquetas')::numeric * n_plaq;
      c_creat  numeric := (v_modelo.coeficientes->>'creatinina')::numeric * n_creat;
      c_tgo    numeric := (v_modelo.coeficientes->>'tgo')::numeric * n_tgo;
      c_acido  numeric := (v_modelo.coeficientes->>'acido_urico')::numeric * n_acido;
      c_ig     numeric := (v_modelo.coeficientes->>'idade_gestacional')::numeric * n_ig;
      c_imc    numeric := (v_modelo.coeficientes->>'imc_pre_gestacional')::numeric * n_imc;
      c_idade  numeric := (v_modelo.coeficientes->>'idade_materna')::numeric * n_idade;
      c_pe_ant numeric := (v_modelo.coeficientes->>'pe_anterior')::numeric * n_pe_ant;
      c_hcron  numeric := (v_modelo.coeficientes->>'hipertensao_cronica')::numeric * n_hcron;
      c_nulip  numeric := (v_modelo.coeficientes->>'nuliparidade')::numeric * n_nulip;
      c_diab   numeric := (v_modelo.coeficientes->>'diabetes')::numeric * n_diab;
      c_gmult  numeric := (v_modelo.coeficientes->>'gestacao_multipla')::numeric * n_gestmult;
      c_sint   numeric := (v_modelo.coeficientes->>'sintomas')::numeric * n_sint;
      c_sflt   numeric := coalesce((v_modelo.coeficientes->>'sflt_plgf')::numeric * n_sflt, 0);
    begin
      sum_contrib := greatest(0.0001,
        c_pas + c_pad + c_prot + c_plaq + c_creat + c_tgo +
        c_acido + c_ig + c_imc + c_idade + c_pe_ant +
        c_hcron + c_nulip + c_diab + c_gmult + c_sint + c_sflt
      );

      v_contribuicoes := jsonb_build_object(
        'pas',                  round((c_pas    / sum_contrib * 100)::numeric, 1),
        'pad',                  round((c_pad    / sum_contrib * 100)::numeric, 1),
        'proteinuria',          round((c_prot   / sum_contrib * 100)::numeric, 1),
        'plaquetas',            round((c_plaq   / sum_contrib * 100)::numeric, 1),
        'creatinina',           round((c_creat  / sum_contrib * 100)::numeric, 1),
        'tgo',                  round((c_tgo    / sum_contrib * 100)::numeric, 1),
        'acido_urico',          round((c_acido  / sum_contrib * 100)::numeric, 1),
        'idade_gestacional',    round((c_ig     / sum_contrib * 100)::numeric, 1),
        'imc_pre_gestacional',  round((c_imc    / sum_contrib * 100)::numeric, 1),
        'idade_materna',        round((c_idade  / sum_contrib * 100)::numeric, 1),
        'pe_anterior',          round((c_pe_ant / sum_contrib * 100)::numeric, 1),
        'hipertensao_cronica',  round((c_hcron  / sum_contrib * 100)::numeric, 1),
        'nuliparidade',         round((c_nulip  / sum_contrib * 100)::numeric, 1),
        'diabetes',             round((c_diab   / sum_contrib * 100)::numeric, 1),
        'gestacao_multipla',    round((c_gmult  / sum_contrib * 100)::numeric, 1),
        'sintomas',             round((c_sint   / sum_contrib * 100)::numeric, 1),
        'sflt_plgf',            round((c_sflt   / sum_contrib * 100)::numeric, 1)
      );
    end;

    -- Inserir/atualizar predicao
    insert into public.predicoes (avaliacao_id, modelo_id, probabilidade, nivel, contribuicoes)
    values (p_avaliacao_id, v_modelo.id, round(v_prob::numeric, 4), v_nivel, v_contribuicoes)
    on conflict (avaliacao_id) do update
      set probabilidade = round(v_prob::numeric, 4),
          nivel = v_nivel,
          contribuicoes = v_contribuicoes,
          modelo_id = v_modelo.id,
          gerado_em = now()
    returning id into v_pred_id;
  end;

  return v_pred_id;
end;
$$;

-- ============================================================
-- FUNÇÃO: gerar alertas clínicos após avaliação
-- Regras ISSHP/FEBRASGO
-- ============================================================
create or replace function public.gerar_alertas(p_avaliacao_id uuid)
returns void language plpgsql security definer
set search_path = public
as $$
declare
  v_av record;
begin
  select * into v_av from public.avaliacoes where id = p_avaliacao_id;
  if not found then return; end if;

  -- PAS >= 160 ou PAD >= 110 → GRAVE
  if v_av.pas >= 160 or v_av.pad >= 110 then
    insert into public.alertas (avaliacao_id, gestante_id, tipo, descricao, severidade)
    values (p_avaliacao_id, v_av.gestante_id,
      'hipertensao_grave',
      format('Hipertensão grave confirmada (PA %s/%s ≥ 160/110 mmHg). Risco iminente de eclâmpsia.', v_av.pas, v_av.pad),
      'grave');

  -- PAS >= 140 ou PAD >= 90 → ATENÇÃO (apenas se não gerou grave)
  elsif v_av.pas >= 140 or v_av.pad >= 90 then
    insert into public.alertas (avaliacao_id, gestante_id, tipo, descricao, severidade)
    values (p_avaliacao_id, v_av.gestante_id,
      'hipertensao_confirmada',
      format('Hipertensão confirmada (PA %s/%s ≥ 140/90 mmHg). Monitoramento intensivo indicado.', v_av.pas, v_av.pad),
      'atencao');
  end if;

  -- Proteinúria >= +2 → ATENÇÃO
  if v_av.proteinuria >= 2 then
    insert into public.alertas (avaliacao_id, gestante_id, tipo, descricao, severidade)
    values (p_avaliacao_id, v_av.gestante_id,
      'proteinuria_elevada',
      format('Proteinúria %s+. Investigar disfunção renal.', v_av.proteinuria),
      'atencao');
  end if;

  -- Plaquetas < 100.000 → GRAVE (HELLP)
  if v_av.plaquetas is not null and v_av.plaquetas < 100000 then
    insert into public.alertas (avaliacao_id, gestante_id, tipo, descricao, severidade)
    values (p_avaliacao_id, v_av.gestante_id,
      'trombocitopenia_grave',
      format('Trombocitopenia grave (plaquetas %s mil/µL). Suspeita de síndrome HELLP.', v_av.plaquetas / 1000),
      'grave');
  end if;

  -- Creatinina > 1.1 → GRAVE
  if v_av.creatinina is not null and v_av.creatinina > 1.1 then
    insert into public.alertas (avaliacao_id, gestante_id, tipo, descricao, severidade)
    values (p_avaliacao_id, v_av.gestante_id,
      'disfuncao_renal',
      format('Disfunção renal (creatinina %.2f mg/dL > 1,1). Avaliação nefrologica urgente.', v_av.creatinina),
      'grave');
  end if;

  -- TGO > 70 → GRAVE
  if v_av.tgo is not null and v_av.tgo > 70 then
    insert into public.alertas (avaliacao_id, gestante_id, tipo, descricao, severidade)
    values (p_avaliacao_id, v_av.gestante_id,
      'disfuncao_hepatica',
      format('Disfunção hepática (TGO %s U/L > 70). Suspeita de HELLP.', v_av.tgo),
      'grave');
  end if;

  -- Sintomas de iminência de eclâmpsia → GRAVE
  if 'cefaleia' = any(v_av.sintomas) or
     'disturbios_visuais' = any(v_av.sintomas) or
     'dor_epigastrica' = any(v_av.sintomas) then
    insert into public.alertas (avaliacao_id, gestante_id, tipo, descricao, severidade)
    values (p_avaliacao_id, v_av.gestante_id,
      'iminencia_eclampsia',
      'Sintomas de iminência de eclâmpsia: ' ||
        array_to_string(
          array_remove(
            array[
              case when 'cefaleia' = any(v_av.sintomas) then 'cefaleia' else null end,
              case when 'disturbios_visuais' = any(v_av.sintomas) then 'distúrbios visuais' else null end,
              case when 'dor_epigastrica' = any(v_av.sintomas) then 'dor epigástrica' else null end
            ],
            null
          ),
          ', '
        ) || '. Conduta imediata necessária.',
      'grave');
  end if;
end;
$$;

-- ============================================================
-- TRIGGER: após inserção de avaliação → predição + alertas
-- ============================================================
create or replace function public.handle_nova_avaliacao()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  perform public.calcular_predicao(new.id);
  perform public.gerar_alertas(new.id);
  return new;
end;
$$;

create trigger trg_nova_avaliacao
  after insert on public.avaliacoes
  for each row execute function public.handle_nova_avaliacao();

-- ============================================================
-- VIEW: vw_risco_atual
-- Uma linha por gestante, última avaliação + predição + alertas abertos
-- ============================================================
create or replace view public.vw_risco_atual as
select distinct on (g.id)
  g.id                    as gestante_id,
  g.nome,
  g.prontuario,
  g.data_nascimento,
  g.nuliparidade,
  g.pe_gestacao_anterior,
  g.hipertensao_cronica,
  g.diabetes,
  g.gestacao_multipla,
  g.unidade_id,
  g.responsavel_id,
  g.ativa,
  av.id                   as avaliacao_id,
  av.data                 as data_avaliacao,
  av.idade_gestacional,
  av.pas,
  av.pad,
  av.proteinuria,
  av.plaquetas,
  av.creatinina,
  av.tgo,
  av.acido_urico,
  av.sflt_plgf,
  av.sintomas,
  pr.probabilidade,
  pr.nivel,
  pr.contribuicoes,
  (
    select count(*) from public.alertas al
    where al.gestante_id = g.id and al.resolvido = false
  )                       as alertas_abertos
from public.gestantes g
left join public.avaliacoes av on av.gestante_id = g.id
left join public.predicoes pr  on pr.avaliacao_id = av.id
order by g.id, av.data desc nulls last;

grant select on public.vw_risco_atual to authenticated;

-- ============================================================
-- VIEW: vw_estatisticas
-- Totais para o painel de relatórios
-- ============================================================
create or replace view public.vw_estatisticas as
select
  (select count(*) from public.gestantes where ativa = true)                  as total_gestantes,
  (select count(*) from public.vw_risco_atual where nivel = 'baixo')          as risco_baixo,
  (select count(*) from public.vw_risco_atual where nivel = 'moderado')       as risco_moderado,
  (select count(*) from public.vw_risco_atual where nivel = 'alto')           as risco_alto,
  (select count(*) from public.alertas where resolvido = false)               as alertas_abertos,
  (select count(*) from public.avaliacoes)                                    as total_avaliacoes,
  (select round(avg(idade_gestacional)::numeric, 1) from (
    select distinct on (gestante_id) idade_gestacional
    from public.avaliacoes order by gestante_id, data desc
  ) x)                                                                        as media_ig;

grant select on public.vw_estatisticas to authenticated;
