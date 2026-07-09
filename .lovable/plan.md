# Plano — Demandas 06/07/2026

## Bloco A — Consultor Social (tela de Associações)

**A1. Remover "Cadastrar" do dropdown de Ações**
- Arquivo: `src/routes/_authenticated/admin.associacoes.index.tsx`
- Estado atual: dropdown já tem só "Ver detalhes" e "Editar" — **verificar e confirmar** que não há resquício de "Cadastrar". Se houver, remover.

**A2. Botão "Abrir formulário"**
- Já existe hoje na coluna de ações para consultor. Vou **movê-lo para posição mais visível** (antes do dropdown, com destaque `variant="default"` em vez de `secondary`) e garantir que abre direto o formulário da área do consultor (`?modulo=social` para Consultor Social).

**A3. Separar colunas Status e Situação**
- Hoje estão **fundidas** em uma única coluna "Situação" (feito na demanda anterior a pedido do usuário).
- Reverter para **duas colunas distintas**:
  - `Situação` → resultado do diagnóstico (Regular / Parcialmente regular / Irregular / Sem diagnóstico)
  - `Status` → Ativa / Inativa
- Ajustar também o export Excel.

**A4. Formato do formulário Social (Página 2 do PDF)**
- Preciso da imagem/PDF da "Página 2" para reproduzir fiel. **Sem o anexo não implemento este item** — vou pedir na resposta final.

---

## Bloco B — Formulário de Infraestrutura

**B1. Remover todos os valores pré-preenchidos**
- Arquivo: `src/routes/_authenticated/admin.associacoes.$id.diagnostico.novo.tsx` (bloco Infraestrutura)
- Auditar todos os `defaultValues` / `useState('...')` do formulário de infra e trocar por `""` / `undefined` para radios, selects e checkboxes.
- Manter apenas os campos "cabeçalho" (Consultor, Data, Hora) pré-preenchidos — esses foram pedidos explicitamente antes.

**B2. Campo texto ao lado de "Outro"**
- Para cada grupo (radio/checkbox) que tenha opção "Outro", renderizar um `<Input>` condicional quando "Outro" estiver selecionado, salvando o valor livre em `payload.<campo>_outro`.
- Aplicar em todos os grupos do formulário de infra que tenham "Outro".

**B3. Reorganizar em 3 seções visuais**
- Reagrupar os campos existentes em:
  1. **Identificação Inicial** (nome da entidade, CNPJ auto, consultor, data, hora)
  2. **Acesso / Mobilidade / Serviços Públicos** (via de acesso, transporte, água, energia, esgoto, coleta, internet)
  3. **Estrutura Física** (área, cobertura, piso, ventilação, banheiros, refeitório, EPI, etc.)
- Usar `<Card>` + `<CardHeader>` para cada seção, mantendo o mesmo padrão visual do formulário Social/Jurídico/Contábil.

**B4. Conferência com o Google Forms de referência**
- Vou abrir o link do Google Forms para conferir campos existentes vs. faltantes e adicionar os que estiverem faltando.

---

## Ordem de execução

1. Bloco A1, A2, A3 (rápido, sem dependência externa) → entregar
2. Bloco B1, B2, B3, B4 (formulário de infra) → entregar
3. Bloco A4 fica pendente até receber a imagem da Página 2

## O que preciso de você antes de começar

- **Anexo da "Página 2"** com o layout do formulário Social (para A4). Sem ele, faço só A1–A3 do Bloco A.
- Confirmação de que posso seguir com **Bloco B inteiro** com base no Google Forms + reorganização em 3 seções.

Confirma que sigo com A1–A3 + Bloco B agora, e A4 fica aguardando a imagem?
