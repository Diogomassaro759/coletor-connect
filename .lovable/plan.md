# Plano — Demandas 03/07/2026

Escopo grande e com impacto de banco. Preciso confirmar algumas decisões antes de aplicar.

## 1. Renomeações de nomenclatura (UI apenas)

Trocar rótulos onde aparecem, mantendo os papéis internos (`consultor`, `admin`) intocados no banco:

- Onde hoje aparece **"Consultor"** (menu, badges, textos) → mostrar **"Associações / Cooperativas / Coletivos"**.
- Onde aparece **"Administrador"** → mostrar **"Entidades"**.

Arquivos afetados: `AdminShell.tsx`, telas de usuários (`admin.usuarios.*`), `auth.tsx`, `route.tsx` (labels), `admin.perfil.tsx`, `admin.index.tsx`.

> Observação: rótulos longos como "Associações / Cooperativas / Coletivos" ficam ruins em badges/menu. Sugiro usar esse texto na descrição do papel e manter um rótulo curto tipo **"Consultor de campo"** no chip. **Confirma?**

## 2. Tela principal do Consultor (pag. 3 do desenho)

Substituir o painel atual do consultor por uma **lista tabular** de associações/cooperativas com colunas. Como não tenho o desenho anexado neste chat, **preciso que você confirme as colunas**. Minha proposta:

| Nome | Tipo (Assoc./Coop./Coletivo) | Município | Situação | Último cadastro | Status | Ações |

Se você tiver a imagem, cole aqui — implemento fiel ao desenho.

## 3. Subtipos de Consultor e Coordenador

Novos subtipos por área: **Social | Jurídico | Contábil | Infraestrutura**.

Mudanças de banco necessárias:

- Novo enum `app_role`: adicionar `coordenador`.
- Nova coluna `user_roles.area` (`social | juridico | contabil | infraestrutura | null`).
- Função `has_area(_user_id, _area)` para RLS.
- Ajustar `is_field_consultant` para considerar apenas consultores; criar `is_coordenador`.

Regras:

- **Consultor + área X** → vê apenas o formulário/dados da área X.
- **Coordenador + área X** → vê todos os cadastros feitos por qualquer consultor da mesma área X.
- Cadastro de usuário (`admin.usuarios.novo` / `editar`) ganha campo "Área" quando papel = consultor ou coordenador.

## 4. Fichas por perfil (elimina tela de seleção)

Hoje o consultor entra numa tela com 3 cards (Social/Jurídico/Contábil) antes do formulário. Passará a:

- Ir **direto** ao formulário da área dele.
- Se for **Infraestrutura**, precisamos definir os campos — **hoje não existe formulário de Infraestrutura**. **Você quer que eu crie um esqueleto agora ou deixamos "em breve"?**
- Coordenador vê a lista de cadastros da área (nova aba/rota).

Remover a seção "Escolha um dos 3 tipos de cadastro" em `admin.associacoes.$id.index.tsx` para consultor (mantida só se admin).

## 5. Novos campos no Cadastro Social

Após "Nome completo da associação e CNPJ", acrescentar:

- **TIPO**: `Associação | Cooperativa | Coletivo` (substitui o atual `formal | informal` da tabela `associations.tipo`).
- **SITUAÇÃO**: **precisamos definir as opções**. Exemplos comuns: `Ativa | Inativa | Em regularização | Suspensa`. **Me confirma as opções.**

Impacto de banco:

- Alterar enum `association_type` (ou coluna) para os 3 novos valores. Como já existem registros com `formal/informal`, faço migração de dados:
  - `formal` → `Cooperativa` (default) — **você precisa confirmar o mapeamento, ou prefere marcar tudo como "Associação" e revisar manualmente?**
- Adicionar coluna `associations.situacao` (enum novo `association_situation`).

## Perguntas que preciso responder antes de implementar

1. **Desenho da tela do consultor (pag. 3)**: quais colunas exatas?
2. **Rótulo curto** para o papel "Associações/Cooperativas/Coletivos" em badges/menu? (sugestão: "Consultor de campo")
3. **Formulário Infraestrutura**: criar esqueleto agora ou "em breve"?
4. **Opções de SITUAÇÃO**?
5. **Migração formal→Cooperativa vs Associação**?
6. Coordenador deve **poder editar** cadastros da área ou **só visualizar**?

Confirma esses 6 pontos que eu já saio implementando na sequência (1→5→3→4→2).
