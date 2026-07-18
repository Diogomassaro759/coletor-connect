import {
  GENERO_OPTIONS,
  RACA_OPTIONS,
  ESCOLARIDADE_OPTIONS,
  MATERIAIS_OPTIONS,
  NIVEL_GOV_BR_OPTIONS,
  isValidCPF,
} from "./catador-constants";


export type ImportRow = {
  rowNumber: number;
  raw: Record<string, unknown>;
  data?: CatadorImportPayload;
  errors: string[];
};

export type CatadorImportPayload = {
  nome_completo: string;
  cpf: string;
  rg_cin: string;
  genero: "feminino" | "masculino" | "lgbtqia" | "nao_responder";
  autodeclaracao_racial: string;
  escolaridade: string;
  endereco_completo: string;
  email: string | null;
  telefone: string | null;
  nome_cooperativa: string | null;
  area_atuacao: string | null;
  titulo_eleitor: string | null;
  ctps: string | null;
  nis: string | null;
  renda_media_mensal: number;
  contribui_inss: boolean;
  inscrito_cadunico: boolean;
  possui_bolsa_familia: boolean;
  conta_bancaria_digital: string | null;
  cadastro_gov_br: boolean;
  nivel_cadastro_gov_br: string | null;
  materiais_coletados: string[];
  possui_carroca: boolean;
  tipo_carroca: string | null;
  status: "pendente" | "ativo" | "inativo";
  association_id: string;
};

export const IMPORT_HEADERS = [
  "nome_completo",
  "cpf",
  "rg_cin",
  "genero",
  "autodeclaracao_racial",
  "escolaridade",
  "endereco_completo",
  "email",
  "telefone",
  "nome_cooperativa",
  "area_atuacao",
  "titulo_eleitor",
  "ctps",
  "nis",
  "renda_media_mensal",
  "contribui_inss",
  "inscrito_cadunico",
  "possui_bolsa_familia",
  "conta_bancaria_digital",
  "cadastro_gov_br",
  "nivel_cadastro_gov_br",
  "materiais_coletados",
  "possui_carroca",
  "tipo_carroca",
  "status",
] as const;

const GENERO_MAP: Record<string, CatadorImportPayload["genero"]> = {};
GENERO_OPTIONS.forEach((g) => {
  GENERO_MAP[g.value.toLowerCase()] = g.value;
  GENERO_MAP[g.label.toLowerCase()] = g.value;
});

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function toBool(v: unknown): boolean {
  const s = toStr(v).toLowerCase();
  return ["sim", "s", "true", "1", "yes", "y", "verdadeiro"].includes(s);
}

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[R$\s.]/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function toList(v: unknown): string[] {
  const s = toStr(v);
  if (!s) return [];
  return s
    .split(/[;,|]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function caseInsensitiveMatch(value: string, options: readonly string[]): string | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  return options.find((o) => o.toLowerCase() === lower) ?? null;
}

export function validateRow(
  raw: Record<string, unknown>,
  rowNumber: number,
  associationId: string,
): ImportRow {
  const errors: string[] = [];
  const get = (k: string) => raw[k] ?? raw[k.toLowerCase()] ?? raw[k.toUpperCase()];

  const nome = toStr(get("nome_completo"));
  if (!nome) errors.push("nome_completo obrigatório");

  const cpfRaw = toStr(get("cpf")).replace(/\D/g, "");
  if (!cpfRaw) errors.push("cpf obrigatório");
  else if (!isValidCPF(cpfRaw)) errors.push("cpf inválido");
  const cpfFormatted = cpfRaw
    ? cpfRaw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    : "";

  const rg = toStr(get("rg_cin"));
  if (!rg) errors.push("rg_cin obrigatório");

  const generoRaw = toStr(get("genero")).toLowerCase();
  const genero = GENERO_MAP[generoRaw];
  if (!genero) errors.push("genero inválido (use: feminino, masculino, lgbtqia, nao_responder)");

  const raca = caseInsensitiveMatch(toStr(get("autodeclaracao_racial")), RACA_OPTIONS);
  if (!raca) errors.push(`autodeclaracao_racial inválida (${RACA_OPTIONS.join(", ")})`);

  const escolaridade = caseInsensitiveMatch(toStr(get("escolaridade")), ESCOLARIDADE_OPTIONS);
  if (!escolaridade) errors.push("escolaridade inválida");

  const endereco = toStr(get("endereco_completo"));
  if (!endereco) errors.push("endereco_completo obrigatório");

  const materiaisInput = toList(get("materiais_coletados"));
  const materiais: string[] = [];
  materiaisInput.forEach((m) => {
    const match = caseInsensitiveMatch(m, MATERIAIS_OPTIONS);
    if (match) materiais.push(match);
    else errors.push(`material desconhecido: "${m}"`);
  });

  const nivelGov = toStr(get("nivel_cadastro_gov_br"));
  let nivelGovMatched: string | null = null;
  if (nivelGov) {
    nivelGovMatched = caseInsensitiveMatch(nivelGov, NIVEL_GOV_BR_OPTIONS);
    if (!nivelGovMatched) errors.push(`nivel_cadastro_gov_br inválido (${NIVEL_GOV_BR_OPTIONS.join(", ")})`);
  }




  const emailRaw = toStr(get("email"));
  if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw))
    errors.push("email inválido");

  const data: CatadorImportPayload | undefined = errors.length
    ? undefined
    : {
        nome_completo: nome,
        cpf: cpfFormatted,
        rg_cin: rg,
        genero: genero!,
        autodeclaracao_racial: raca!,
        escolaridade: escolaridade!,
        endereco_completo: endereco,
        email: emailRaw || null,
        telefone: toStr(get("telefone")) || null,
        nome_cooperativa: toStr(get("nome_cooperativa")) || null,
        area_atuacao: toStr(get("area_atuacao")) || null,
        titulo_eleitor: toStr(get("titulo_eleitor")) || null,
        ctps: toStr(get("ctps")) || null,
        nis: toStr(get("nis")) || null,
        renda_media_mensal: toNum(get("renda_media_mensal")),
        contribui_inss: toBool(get("contribui_inss")),
        inscrito_cadunico: toBool(get("inscrito_cadunico")),
        possui_bolsa_familia: toBool(get("possui_bolsa_familia")),
        conta_bancaria_digital: toStr(get("conta_bancaria_digital")) || null,
        cadastro_gov_br: toBool(get("cadastro_gov_br")),
        nivel_cadastro_gov_br: nivelGovMatched,
        materiais_coletados: materiais,
        possui_carroca: toBool(get("possui_carroca")),
        tipo_carroca: toStr(get("tipo_carroca")) || null,
        status: "pendente",
        association_id: associationId,
      };

  return { rowNumber, raw, data, errors };
}

export async function buildTemplateXLSX(): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Catadores");
  ws.addRow([...IMPORT_HEADERS]);
  ws.addRow([
    "Maria da Silva",
    "123.456.789-09",
    "MG-12.345.678",
    "feminino",
    "Parda",
    "Fundamental completo",
    "Rua Exemplo, 123 - Bairro, Cidade/UF",
    "maria@exemplo.com",
    "(31) 99999-0000",
    "Coocares",
    "Centro",
    "",
    "",
    "",
    "1500,00",
    "Sim",
    "Sim",
    "Não",
    "Banco Digital X",
    "Sim",
    "Prata",
    "Papelão; Plástico PET; Alumínio (latinha)",
    "Não",
    "",
    "pendente",
  ]);

  // README sheet
  const readme = wb.addWorksheet("Instruções");
  readme.addRows([
    ["Campo", "Obrigatório", "Formato / Valores aceitos"],
    ["nome_completo", "Sim", "Texto"],
    ["cpf", "Sim", "11 dígitos (com ou sem máscara)"],
    ["rg_cin", "Sim", "Texto"],
    ["genero", "Sim", "feminino | masculino | lgbtqia | nao_responder"],
    ["autodeclaracao_racial", "Sim", RACA_OPTIONS.join(" | ")],
    ["escolaridade", "Sim", ESCOLARIDADE_OPTIONS.join(" | ")],
    ["endereco_completo", "Sim", "Texto"],
    ["email", "Não", "email@dominio.com"],
    ["telefone", "Não", "Texto"],
    ["nome_cooperativa", "Não", "Texto"],
    ["area_atuacao", "Não", "Texto"],
    ["titulo_eleitor / ctps / nis", "Não", "Texto"],
    ["renda_media_mensal", "Não", "Número (ex.: 1500,00)"],
    ["contribui_inss / inscrito_cadunico / possui_bolsa_familia / cadastro_gov_br / possui_carroca", "Não", "Sim | Não"],
    ["nivel_cadastro_gov_br", "Não", NIVEL_GOV_BR_OPTIONS.join(" | ")],
    ["materiais_coletados", "Não", "Lista separada por ; (use exatamente os nomes oficiais)"],
    ["status", "Não", "pendente | ativo | inativo (padrão: pendente)"],
  ]);
  readme.getRow(1).font = { bold: true };
  readme.columns.forEach((c) => (c.width = 40));

  ws.getRow(1).font = { bold: true };
  ws.columns.forEach((c) => (c.width = 22));

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function parseImportFile(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    raw: false,
  });
  return rows;
}
