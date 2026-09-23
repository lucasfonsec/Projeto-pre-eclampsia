-- ============================================================
-- PredGest: 0002_rls.sql
-- Políticas de Row Level Security
-- ============================================================

-- ============================================================
-- FUNÇÃO AUXILIAR: has_role (security definer, sem recursão)
-- ============================================================
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- ============================================================
-- POLÍTICAS: profiles
-- ============================================================

-- Cada usuário lê/atualiza o próprio perfil; admin lê todos
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- POLÍTICAS: user_roles
-- ============================================================

-- Cada usuário lê o próprio papel; admin lê todos
create policy "user_roles_select"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Somente admin pode alterar papéis
create policy "user_roles_insert_admin"
  on public.user_roles for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "user_roles_update_admin"
  on public.user_roles for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "user_roles_delete_admin"
  on public.user_roles for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- POLÍTICAS: unidades
-- ============================================================

-- Membros da unidade ou admin podem ver
create policy "unidades_select"
  on public.unidades for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or exists (
      select 1 from public.unidade_membros um
      where um.unidade_id = unidades.id and um.user_id = auth.uid()
    )
  );

create policy "unidades_insert_admin"
  on public.unidades for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "unidades_update_admin"
  on public.unidades for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "unidades_delete_admin"
  on public.unidades for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- POLÍTICAS: unidade_membros
-- ============================================================

create policy "unidade_membros_select"
  on public.unidade_membros for select
  to authenticated
  using (
    user_id = auth.uid() or public.has_role(auth.uid(), 'admin')
  );

create policy "unidade_membros_insert_admin"
  on public.unidade_membros for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "unidade_membros_delete_admin"
  on public.unidade_membros for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- POLÍTICAS: gestantes
-- ============================================================

-- Helper: usuário pertence à unidade da gestante ou é admin
create policy "gestantes_select"
  on public.gestantes for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or exists (
      select 1 from public.unidade_membros um
      where um.unidade_id = gestantes.unidade_id and um.user_id = auth.uid()
    )
  );

create policy "gestantes_insert"
  on public.gestantes for insert
  to authenticated
  with check (
    public.has_role(auth.uid(), 'admin')
    or exists (
      select 1 from public.unidade_membros um
      where um.unidade_id = gestantes.unidade_id and um.user_id = auth.uid()
    )
  );

create policy "gestantes_update"
  on public.gestantes for update
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or exists (
      select 1 from public.unidade_membros um
      where um.unidade_id = gestantes.unidade_id and um.user_id = auth.uid()
    )
  );

-- enfermagem e pesquisa não podem excluir gestantes
create policy "gestantes_delete_admin_obstetra"
  on public.gestantes for delete
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'obstetra')
  );

-- ============================================================
-- POLÍTICAS: avaliacoes
-- ============================================================

create policy "avaliacoes_select"
  on public.avaliacoes for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or exists (
      select 1 from public.gestantes g
      join public.unidade_membros um on um.unidade_id = g.unidade_id
      where g.id = avaliacoes.gestante_id and um.user_id = auth.uid()
    )
  );

create policy "avaliacoes_insert"
  on public.avaliacoes for insert
  to authenticated
  with check (
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'obstetra')
    or public.has_role(auth.uid(), 'enfermagem')
  );

create policy "avaliacoes_update"
  on public.avaliacoes for update
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'obstetra')
  );

create policy "avaliacoes_delete"
  on public.avaliacoes for delete
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'obstetra')
  );

-- ============================================================
-- POLÍTICAS: predicoes
-- ============================================================

create policy "predicoes_select"
  on public.predicoes for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or exists (
      select 1 from public.avaliacoes av
      join public.gestantes g on g.id = av.gestante_id
      join public.unidade_membros um on um.unidade_id = g.unidade_id
      where av.id = predicoes.avaliacao_id and um.user_id = auth.uid()
    )
  );

create policy "predicoes_insert"
  on public.predicoes for insert
  to authenticated
  with check (true);

create policy "predicoes_update"
  on public.predicoes for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- POLÍTICAS: alertas
-- ============================================================

create policy "alertas_select"
  on public.alertas for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or exists (
      select 1 from public.gestantes g
      join public.unidade_membros um on um.unidade_id = g.unidade_id
      where g.id = alertas.gestante_id and um.user_id = auth.uid()
    )
  );

create policy "alertas_insert"
  on public.alertas for insert
  to authenticated
  with check (true);

create policy "alertas_update"
  on public.alertas for update
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'obstetra')
    or public.has_role(auth.uid(), 'enfermagem')
  );

-- ============================================================
-- POLÍTICAS: condutas
-- ============================================================

create policy "condutas_select"
  on public.condutas for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or exists (
      select 1 from public.gestantes g
      join public.unidade_membros um on um.unidade_id = g.unidade_id
      where g.id = condutas.gestante_id and um.user_id = auth.uid()
    )
  );

create policy "condutas_insert"
  on public.condutas for insert
  to authenticated
  with check (
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'obstetra')
    or public.has_role(auth.uid(), 'enfermagem')
  );

create policy "condutas_update"
  on public.condutas for update
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'obstetra')
  );

create policy "condutas_delete"
  on public.condutas for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- POLÍTICAS: modelos_ml
-- ============================================================

create policy "modelos_ml_select"
  on public.modelos_ml for select
  to authenticated
  using (true);

create policy "modelos_ml_insert_admin"
  on public.modelos_ml for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "modelos_ml_update_admin"
  on public.modelos_ml for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- POLÍTICAS: auditoria
-- ============================================================

create policy "auditoria_insert"
  on public.auditoria for insert
  to authenticated
  with check (usuario_id = auth.uid());

create policy "auditoria_select_admin"
  on public.auditoria for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));
