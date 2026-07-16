
# Atualizações de Perfis — 16/07/2026

Plano de implementação organizado por tela/perfil. Confirme antes que eu execute.

## 1. Login (`src/routes/index.tsx` e `src/routes/auth.tsx`)
- Fazer a rota `/` redirecionar direto para `/auth` (ou tornar `/auth` a home) para eliminar a tela intermediária pós-login/landing.
- Confirmar que após login o usuário vai direto para o dashboard sem passo intermediário.

## 2. Perfil Administrador
- `admin.index.tsx`: remover o card/campo "IDENTIFICAÇÃO PROFISSIONAL" do dashboard.
- Renomear labels de papéis em toda a UI (badges, seletores, listagens):
  - "Recenseador (cadastra catadores)" → "Recenseador"
  - "Administrador UCPI (acesso total)" → "Administrador"
- `admin.associacoes.index.tsx`: quando `isAdmin`, título passa a ser "Entidades" (em vez de "ASSOC./COOP./COLETIVOS – ADMINISTRADOR").
- Trocar "Exportar Excel" → "Exportar planilha" (botão e labels correlatos).

## 3. Perfis Consultores (Social, Jurídico, Contábil, Infraestrutura)
- Em `admin.associacoes.index.tsx`, adicionar item **"Abrir formulário"** no menu de Ações de cada linha (para consultores).
- Ao clicar, navegar direto para o formulário da área do consultor na entidade selecionada.
- Adicionar seletor/placeholder "Escolha entidade" no card de destaque superior; ao selecionar, habilita botão que abre o formulário da área.
- Regras de bloqueio (server + UI):
  - Consultor Social pode iniciar cadastro em qualquer entidade.
  - Jurídico/Contábil/Infraestrutura: bloquear abertura do formulário se não existir `association_assessments` (Social) para a entidade. Mostrar mensagem "Aguardando cadastro Social".

## 4. Perfil Coordenador
- Dashboard: reaproveitar layout do Administrador (mesmas seções/estatísticas).
- Permissões (UI + policies):
  - Pode **editar** (não excluir) formulários da própria `area`.
  - Não pode editar formulários de outras áreas — botão "Editar" oculto quando `area` do registro ≠ `area` do coordenador.
  - Nenhum botão de exclusão exposto.

## 5. Perfil Recenseador
- `admin.index.tsx` (visão recenseador): remover botão "Escolhe entidade".
- Renomear botão "+ Cadastrar" → "+ Novo catador".
- Adicionar botão/ícone **"Editar"** ao lado de cada catador na listagem, apontando para `admin/$id/editar`.

## 6. Novo Perfil — Coordenador Recenseador
- Adicionar novo valor de enum `app_role`: `coordenador_recenseador`.
- Migration: enum + função helper `is_coordenador_recenseador(_user_id)` + policies em `catadores` permitindo UPDATE (não DELETE) independentemente de `created_by`.
- Atualizar `_authenticated/route.tsx` para reconhecer o novo papel e expor `isCoordenadorRecenseador` no contexto.
- Formulários de criação/edição de usuário: incluir opção "Coordenador Recenseador" no seletor de tipo.
- UI: dashboard igual ao recenseador, com edição habilitada em qualquer catador.

## Detalhes técnicos
- Enum: `ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'coordenador_recenseador';` (migration isolada, pois Postgres exige commit antes do uso).
- Policies novas para `association_assessments`, `infrastructure_assessments`, `catadores` conforme itens 4 e 6 (UPDATE via `has_area` + role check; nunca DELETE).
- Router context: adicionar flags `isCoordenadorRecenseador` e continuar expondo `area` para gating.
- Sem alterações em Stripe/pagamentos.

## Fora de escopo (confirmar se quer incluir)
- Reescrita de dashboards separados por área do coordenador (assumindo: reaproveitar o do Administrador em modo somente-leitura das áreas alheias).
- Ajustes visuais adicionais nos formulários de campo.

Se aprovar, começo pela migration (enum + policies) e depois avanço nas telas.
