// Parsing/mapping helpers for bulk-creating bare entidade records — the same
// required fields as the "Nova entidade" form (nome, tipo, municipio,
// endereco_sede), nothing else. Separate from social-assessment-import.ts:
// that one imports the full Formulário de Campo diagnostic (many more
// required fields); this one is just quick entity registration. Pure
// functions only — no Supabase calls here.

export type EntidadeImportPayload = {
  nome: string;
  tipo: "associacao" | "cooperativa" | "coletivo";
  cnpj: string | null;
  municipio: string;
  inscricao_municipal: string | null;
  inscricao_estadual: string | null;
  endereco_sede: string;
  telefone: string | null;
  email: string | null;
  numero_associados_inicial: number;
  numero_associados_atual: number;
  consultor_nome: string | null;
  data_visita: string | null;
  horario_visita: string | null;
};

export type EntidadeImportRow = {
  rowNumber: number;
  raw: Record<string, unknown>;
  data?: EntidadeImportPayload;
  errors: string[];
};

export const IMPORT_HEADERS_ENTIDADE = [
  "nome",
  "tipo",
  "cnpj",
  "municipio",
  "inscricao_municipal",
  "inscricao_estadual",
  "endereco_sede",
  "telefone",
  "email",
  "numero_associados_inicial",
  "numero_associados_atual",
  "consultor_nome",
  "data_visita",
  "horario_visita",
] as const;

const TIPO_OPTIONS = [
  { value: "associacao", label: "Associação" },
  { value: "cooperativa", label: "Cooperativa" },
  { value: "coletivo", label: "Coletivo" },
] as const;

const TIPO_MAP: Record<string, EntidadeImportPayload["tipo"]> = {};
TIPO_OPTIONS.forEach((t) => {
  TIPO_MAP[t.value] = t.value;
  TIPO_MAP[t.label.toLowerCase()] = t.value;
});

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[^\d,.-]/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function maskCnpjDigits(digits: string): string {
  return digits
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function validateEntidadeRow(raw: Record<string, unknown>, rowNumber: number): EntidadeImportRow {
  const errors: string[] = [];
  const get = (k: string) => raw[k] ?? raw[k.toLowerCase()] ?? raw[k.toUpperCase()];

  const nome = toStr(get("nome"));
  if (!nome) errors.push("nome obrigatório");
  else if (nome.length < 2) errors.push("nome muito curto");

  const tipoRaw = toStr(get("tipo")).toLowerCase();
  const tipo = TIPO_MAP[tipoRaw];
  if (!tipo) errors.push("tipo inválido (use: associacao, cooperativa ou coletivo)");

  const municipio = toStr(get("municipio"));
  if (!municipio) errors.push("municipio obrigatório");

  const endereco = toStr(get("endereco_sede"));
  if (!endereco) errors.push("endereco_sede obrigatório");
  else if (endereco.length < 5) errors.push("endereco_sede muito curto");

  const cnpjDigits = toStr(get("cnpj")).replace(/\D/g, "");
  let cnpjFormatted: string | null = null;
  if (cnpjDigits) {
    if (cnpjDigits.length !== 14) errors.push("cnpj deve ter 14 dígitos");
    else cnpjFormatted = maskCnpjDigits(cnpjDigits);
  }

  const emailRaw = toStr(get("email"));
  if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) errors.push("email inválido");

  const inicial = toNum(get("numero_associados_inicial"));
  const atualRaw = toStr(get("numero_associados_atual"));
  const atual = atualRaw ? toNum(get("numero_associados_atual")) : inicial;

  const data: EntidadeImportPayload | undefined = errors.length
    ? undefined
    : {
        nome,
        tipo: tipo!,
        cnpj: cnpjFormatted,
        municipio,
        inscricao_municipal: toStr(get("inscricao_municipal")) || null,
        inscricao_estadual: toStr(get("inscricao_estadual")) || null,
        endereco_sede: endereco,
        telefone: toStr(get("telefone")) || null,
        email: emailRaw || null,
        numero_associados_inicial: inicial,
        numero_associados_atual: atual,
        consultor_nome: toStr(get("consultor_nome")) || null,
        data_visita: toStr(get("data_visita")) || null,
        horario_visita: toStr(get("horario_visita")) || null,
      };

  return { rowNumber, raw, data, errors };
}

export async function buildEntidadeTemplateXLSX(): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Entidades");
  ws.addRow([...IMPORT_HEADERS_ENTIDADE]);
  ws.addRow([
    "Associação dos Catadores Exemplo",
    "associacao",
    "11.222.333/0001-81",
    "Belo Horizonte",
    "",
    "",
    "Rua Exemplo, 123 - Bairro, Belo Horizonte/MG",
    "(31) 99999-0000",
    "contato@exemplo.org",
    "20",
    "18",
    "Maria Consultora",
    "2026-08-07",
    "09:30",
  ]);

  const readme = wb.addWorksheet("Instruções");
  readme.addRows([
    ["Campo", "Obrigatório", "Formato / Valores aceitos"],
    ["nome", "Sim", "Texto (mín. 2 caracteres)"],
    ["tipo", "Sim", "associacao | cooperativa | coletivo"],
    ["cnpj", "Não", "14 dígitos, com ou sem máscara"],
    ["municipio", "Sim", "Texto"],
    ["inscricao_municipal", "Não", "Texto"],
    ["inscricao_estadual", "Não", "Texto"],
    ["endereco_sede", "Sim", "Texto (mín. 5 caracteres)"],
    ["telefone", "Não", "Texto"],
    ["email", "Não", "email@dominio.com"],
    ["numero_associados_inicial", "Não", "Número (padrão 0)"],
    ["numero_associados_atual", "Não", "Número (padrão = associados no início)"],
    ["consultor_nome", "Não", "Texto"],
    ["data_visita", "Não", "AAAA-MM-DD"],
    ["horario_visita", "Não", "HH:MM"],
  ]);
  readme.getRow(1).font = { bold: true };
  readme.columns.forEach((c) => (c.width = 40));

  ws.getRow(1).font = { bold: true };
  ws.columns.forEach((c) => (c.width = 24));

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
