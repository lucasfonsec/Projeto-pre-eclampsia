# PredGest — Apoio à Decisão Clínica (Pré-eclâmpsia)

Sistema web de apoio à decisão clínica para prever a progressão de hipertensão gestacional para pré-eclâmpsia (PE), utilizando modelos de regressão logística explicáveis e regras clínicas da ISSHP/FEBRASGO.

## Stack de Tecnologias

- **Front-end**: React 18, TypeScript, Vite
- **Estilização**: Tailwind CSS v4 (Tema Escuro Clínico)
- **Roteamento**: React Router v6
- **Acesso a Dados & Estado**: TanStack Query (React Query) v5
- **Formulários & Validação**: React Hook Form + Zod
- **Gráficos**: Recharts
- **Testes**: Vitest
- **Back-end & Banco de Dados**: Supabase (PostgreSQL, Auth, RLS)

## Configuração do Projeto

### 1. Requisitos
- Node.js v18 ou superior
- Projeto no [Supabase](https://supabase.com/) configurado

### 2. Configuração do Supabase

1. Crie um novo projeto no Supabase
2. Obtenha a URL do projeto e a Anon Key no painel do Supabase (`Project Settings` > `API`)
3. Copie o arquivo de exemplo e configure suas chaves:
   ```bash
   cp .env.example .env
   ```
4. Edite o `.env` com suas credenciais.

### 3. Migrações do Banco de Dados

O banco de dados precisa ser configurado executando os scripts SQL na pasta `supabase/migrations/` na ordem correta, diretamente no SQL Editor do seu projeto Supabase:

1. Executar `0001_schema.sql` (Cria as tabelas, tipos e índices)
2. Executar `0002_rls.sql` (Aplica políticas de segurança Row Level Security)
3. Executar `0003_funcoes_triggers.sql` (Cria funções de predição, alertas e triggers automáticos)
4. Executar `0004_seed.sql` (Insere dados de exemplo: modelo ativo, 1 unidade, 6 gestantes e avaliações)

### 4. Instalação e Execução Local

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```
O sistema estará disponível em `http://localhost:5173`.

### 5. Criação do Primeiro Administrador

Como o sistema utiliza Row Level Security estrito, você precisará de um administrador para criar outras unidades ou promover outros perfis.
Para criar o primeiro admin, siga os passos:

1. Acesse o sistema e clique em **Cadastre-se**.
2. Preencha seus dados para criar a conta.
3. No SQL Editor do Supabase, promova sua conta executando:
   ```sql
   UPDATE public.user_roles 
   SET role = 'admin' 
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'seu@email.com');
   ```
4. Faça logout e login novamente para aplicar as permissões de admin.
5. Agora você verá o menu **Administração**, onde pode associar-se a uma unidade para ver suas gestantes.

## Testes

O modelo preditivo de regressão logística é coberto por testes para garantir sua monotonicidade e corretude. Para executar os testes:

```bash
npm run test
```

## Licença

Projeto desenvolvido para fins educacionais e de pesquisa. Não constitui dispositivo médico para diagnóstico final sem supervisão de profissional habilitado.
