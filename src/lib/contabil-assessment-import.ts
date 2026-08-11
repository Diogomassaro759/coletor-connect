// Parsing/mapping helpers for bulk-importing "Contábil" diagnostic assessments.
// Mirrors the field set/typing used by the live single-entry form
// (admin.associacoes.$id.diagnostico.novo.tsx — AccountingFields), including
// the accounting_books rows. Pure functions only — no Supabase calls here.

import type { ParsedAreaRow } from "@/components/admin/AreaAssessmentImport";

export type AccountingBookInput = {
  tipo: string;
  implantado: boolean;
  atualizado: boolean;
  nao_possui: boolean;
  observacao: string | null;
};

export type ContabilAssessmentInput = {
  consultant_name: string;
  data_visita: string;
  horario_visita: string;
  estatuto_registrado: string | null;
  alvara_funcionamento: string | null;
  licenca_ambiental_status: string | null;
  avcb: string | null;
  extintores: string | null;
  registro_ocb: string | null;
  empregados_registrados: number;
  empregados_sem_registro: number;
  autonomos: number;
  livro_ficha_trabalho: boolean;
  livro_ficha_trabalho_qual: string | null;
  livro_inspecao_trabalho: boolean;
  filiacao_sindical: boolean;
  filiacao_sindical_qual: string | null;
  contrato_sst: string | null;
  contrato_sst_responsavel: string | null;
  controle_frequencia: string | null;
  controle_frequencia_tipo: string | null;
  possui_contador: string | null;
  contador_tipo: string | null;
  contador_nome: string | null;
  contador_telefone: string | null;
  contador_email: string | null;
  contabilidade_regular: string | null;
  possui_conta_bancaria: string | null;
  possui_maquineta: string | null;
  emite_notas_fiscais: string | null;
  controle_estoque: string | null;
  sistema_financeiro: string | null;
  sistema_financeiro_qual: string | null;
  ano_ultimo_balanco: number | null;
  divisao_resultados_criterio: string | null;
  divisao_resultados_procedimento: string | null;
  pagamento_fixo_mensal: boolean;
  renda_media_cooperado: number | null;
  classificacao_contabil: string | null;
  pendencias_contabeis: string | null;
  evidencia_frente_confirmada: boolean;
  evidencia_reuniao_confirmada: boolean;
  evidencia_entrevista_confirmada: boolean;
  evidencia_administrativo_confirmada: boolean;
  livros: AccountingBookInput[];
};

const BOOKS: { key: string; tipo: string }[] = [
  { key: "matricula", tipo: "Livro de Matrícula de Cooperados" },
  { key: "atas_assembleias", tipo: "Livro de Atas das Assembleias Gerais" },
  { key: "presenca_assembleias", tipo: "Livro de Presença das Assembleias" },
  { key: "atas_diretoria", tipo: "Livro de Atas da Diretoria" },
  { key: "atas_conselho_fiscal", tipo: "Livro de Atas do Conselho Fiscal" },
  { key: "patrimonio", tipo: "Livro de Registro de Patrimônio" },
  { key: "inventario", tipo: "Livro de Registro de Inventário" },
];

export const IMPORT_HEADERS_CONTABIL = [
  "nome_associacao",
  "cnpj",
  "consultor_nome",
  "data_visita",
  "horario_visita",
  "estatuto_registrado",
  "alvara_funcionamento",
  "licenca_ambiental_status",
  "avcb",
  "extintores",
  "registro_ocb",
  "empregados_registrados",
  "empregados_sem_registro",
  "autonomos",
  "livro_ficha_trabalho",
  "livro_ficha_trabalho_qual",
  "livro_inspecao_trabalho",
  "filiacao_sindical",
  "filiacao_sindical_qual",
  "contrato_sst",
  "contrato_sst_responsavel",
  "controle_frequencia",
  "controle_frequencia_tipo",
  "possui_contador",
  "contador_tipo",
  "contador_nome",
  "contador_telefone",
  "contador_email",
  "contabilidade_regular",
  "possui_conta_bancaria",
  "possui_maquineta",
  "emite_notas_fiscais",
  "controle_estoque",
  "sistema_financeiro",
  "sistema_financeiro_qual",
  "ano_ultimo_balanco",
  "divisao_resultados_criterio",
  "divisao_resultados_procedimento",
  "pagamento_fixo_mensal",
  "renda_media_cooperado",
  "classificacao_contabil",
  "pendencias_contabeis",
  "evidencia_frente_confirmada",
  "evidencia_reuniao_confirmada",
  "evidencia_entrevista_confirmada",
  "evidencia_administrativo_confirmada",
  ...BOOKS.flatMap((b) => [
    `livro_${b.key}_implantado`,
    `livro_${b.key}_atualizado`,
    `livro_${b.key}_observacao`,
  ]),
] as const;

function str(raw: Record<string, unknown>, key: string): string | null {
  const v = raw[key];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function boolFromSimNao(raw: Record<string, unknown>, key: string): boolean {
  const v = str(raw, key);
  return !!v && v.trim().toLowerCase().startsWith("sim");
}

function num(raw: Record<string, unknown>, key: string): number {
  const v = str(raw, key);
  if (!v) return 0;
  const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function numOrNull(raw: Record<string, unknown>, key: string): number | null {
  const v = str(raw, key);
  if (!v) return null;
  const n = parseFloat(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function parseFlexDate(s: string): string | null {
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad2(Number(m[2]))}-${pad2(Number(m[3]))}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${pad2(Number(m[1]))}-${pad2(Number(m[2]))}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return null;
}

function parseFlexTime(s: string): string | null {
  const m = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return `${pad2(Number(m[1]))}:${m[2]}:${m[3] ?? "00"}`;
}

/** UI shows the long labels but the DB stores the short form — same remap the live form applies. */
function normalizeLicencaAmbiental(v: string | null): string | null {
  if (!v) return null;
  if (v === "Licença ambiental") return "Licença";
  if (v === "Certificado de Dispensa") return "Dispensa";
  return v;
}

export function parseContabilRow(
  raw: Record<string, unknown>,
  rowNumber: number,
): ParsedAreaRow<ContabilAssessmentInput> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nome = str(raw, "nome_associacao");
  if (!nome) errors.push("nome_associacao é obrigatório (deve bater com uma entidade já cadastrada).");

  const cnpj = str(raw, "cnpj");

  const consultantName = str(raw, "consultor_nome");
  if (!consultantName) errors.push("consultor_nome é obrigatório.");

  const dataVisitaRaw = str(raw, "data_visita");
  const dataVisita = dataVisitaRaw ? parseFlexDate(dataVisitaRaw) : null;
  if (!dataVisitaRaw) errors.push("data_visita é obrigatória.");
  else if (!dataVisita) errors.push(`data_visita não reconhecida: "${dataVisitaRaw}".`);

  const horarioVisitaRaw = str(raw, "horario_visita");
  const horarioVisita = horarioVisitaRaw ? parseFlexTime(horarioVisitaRaw) : null;
  if (!horarioVisitaRaw) errors.push("horario_visita é obrigatório.");
  else if (!horarioVisita) errors.push(`horario_visita não reconhecido: "${horarioVisitaRaw}".`);

  const livros: AccountingBookInput[] = [];
  for (const b of BOOKS) {
    const implantadoRaw = str(raw, `livro_${b.key}_implantado`);
    const atualizadoRaw = str(raw, `livro_${b.key}_atualizado`);
    const observacao = str(raw, `livro_${b.key}_observacao`);
    if (!implantadoRaw && !atualizadoRaw && !observacao) continue;
    livros.push({
      tipo: b.tipo,
      implantado: (implantadoRaw ?? "").toLowerCase().startsWith("sim"),
      atualizado: (atualizadoRaw ?? "").toLowerCase().startsWith("sim"),
      nao_possui: (implantadoRaw ?? "").toLowerCase().startsWith("não"),
      observacao,
    });
  }

  const assessment: ContabilAssessmentInput = {
    consultant_name: consultantName ?? "",
    data_visita: dataVisita ?? "",
    horario_visita: horarioVisita ?? "",
    estatuto_registrado: str(raw, "estatuto_registrado"),
    alvara_funcionamento: str(raw, "alvara_funcionamento"),
    licenca_ambiental_status: normalizeLicencaAmbiental(str(raw, "licenca_ambiental_status")),
    avcb: str(raw, "avcb"),
    extintores: str(raw, "extintores"),
    registro_ocb: str(raw, "registro_ocb"),
    empregados_registrados: num(raw, "empregados_registrados"),
    empregados_sem_registro: num(raw, "empregados_sem_registro"),
    autonomos: num(raw, "autonomos"),
    livro_ficha_trabalho: boolFromSimNao(raw, "livro_ficha_trabalho"),
    livro_ficha_trabalho_qual: str(raw, "livro_ficha_trabalho_qual"),
    livro_inspecao_trabalho: boolFromSimNao(raw, "livro_inspecao_trabalho"),
    filiacao_sindical: boolFromSimNao(raw, "filiacao_sindical"),
    filiacao_sindical_qual: str(raw, "filiacao_sindical_qual"),
    contrato_sst: str(raw, "contrato_sst"),
    contrato_sst_responsavel: str(raw, "contrato_sst_responsavel"),
    controle_frequencia: str(raw, "controle_frequencia"),
    controle_frequencia_tipo: str(raw, "controle_frequencia_tipo"),
    possui_contador: str(raw, "possui_contador"),
    contador_tipo: str(raw, "contador_tipo"),
    contador_nome: str(raw, "contador_nome"),
    contador_telefone: str(raw, "contador_telefone"),
    contador_email: str(raw, "contador_email"),
    contabilidade_regular: str(raw, "contabilidade_regular"),
    possui_conta_bancaria: str(raw, "possui_conta_bancaria"),
    possui_maquineta: str(raw, "possui_maquineta"),
    emite_notas_fiscais: str(raw, "emite_notas_fiscais"),
    controle_estoque: str(raw, "controle_estoque"),
    sistema_financeiro: str(raw, "sistema_financeiro"),
    sistema_financeiro_qual: str(raw, "sistema_financeiro_qual"),
    ano_ultimo_balanco: (() => {
      const n = numOrNull(raw, "ano_ultimo_balanco");
      return n === null ? null : Math.trunc(n);
    })(),
    divisao_resultados_criterio: str(raw, "divisao_resultados_criterio"),
    divisao_resultados_procedimento: str(raw, "divisao_resultados_procedimento"),
    pagamento_fixo_mensal: boolFromSimNao(raw, "pagamento_fixo_mensal"),
    renda_media_cooperado: numOrNull(raw, "renda_media_cooperado"),
    classificacao_contabil: str(raw, "classificacao_contabil"),
    pendencias_contabeis: str(raw, "pendencias_contabeis"),
    evidencia_frente_confirmada: boolFromSimNao(raw, "evidencia_frente_confirmada"),
    evidencia_reuniao_confirmada: boolFromSimNao(raw, "evidencia_reuniao_confirmada"),
    evidencia_entrevista_confirmada: boolFromSimNao(raw, "evidencia_entrevista_confirmada"),
    evidencia_administrativo_confirmada: boolFromSimNao(raw, "evidencia_administrativo_confirmada"),
    livros,
  };

  return { rowNumber, raw, nome: nome ?? `(linha ${rowNumber})`, cnpj, assessment, errors, warnings };
}

export async function buildContabilTemplateXLSX(): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Contábil");
  ws.addRow([...IMPORT_HEADERS_CONTABIL]);
  const sampleByHeader: Record<string, string> = {
    nome_associacao: "Associação dos Catadores Exemplo",
    cnpj: "11.222.333/0001-81",
    consultor_nome: "Carla Consultora",
    data_visita: "2026-08-07",
    horario_visita: "11:00",
    estatuto_registrado: "Sim",
    alvara_funcionamento: "Sim",
    licenca_ambiental_status: "Licença",
    avcb: "Sim",
    extintores: "Sim",
    registro_ocb: "Não sabe",
    empregados_registrados: "3",
    empregados_sem_registro: "1",
    autonomos: "2",
    livro_ficha_trabalho: "Sim",
    livro_inspecao_trabalho: "Não",
    filiacao_sindical: "Não",
    contrato_sst: "Não sabe",
    controle_frequencia: "Sim",
    controle_frequencia_tipo: "Livro/ficha",
    possui_contador: "Sim",
    contador_tipo: "Terceirizado",
    contador_nome: "João Contador",
    contador_telefone: "(81) 99999-0000",
    contador_email: "contador@exemplo.com",
    contabilidade_regular: "Sim",
    possui_conta_bancaria: "Sim",
    possui_maquineta: "Não",
    emite_notas_fiscais: "Sim",
    controle_estoque: "Sim",
    sistema_financeiro: "Sim",
    sistema_financeiro_qual: "Sistema X",
    ano_ultimo_balanco: "2025",
    divisao_resultados_criterio: "Divisão igualitária",
    divisao_resultados_procedimento: "Assembleia decide",
    pagamento_fixo_mensal: "Não",
    renda_media_cooperado: "800,00",
    classificacao_contabil: "Regular",
    evidencia_frente_confirmada: "Sim",
    evidencia_reuniao_confirmada: "Sim",
    evidencia_entrevista_confirmada: "Sim",
    evidencia_administrativo_confirmada: "Sim",
    livro_matricula_implantado: "Sim",
    livro_matricula_atualizado: "Sim",
    livro_atas_assembleias_implantado: "Sim",
    livro_atas_assembleias_atualizado: "Sim",
    livro_presenca_assembleias_implantado: "Sim",
    livro_presenca_assembleias_atualizado: "Sim",
    livro_atas_diretoria_implantado: "Não",
    livro_atas_diretoria_atualizado: "Não",
    livro_atas_diretoria_observacao: "Falta implantar",
    livro_atas_conselho_fiscal_implantado: "Não",
    livro_atas_conselho_fiscal_atualizado: "Não",
    livro_atas_conselho_fiscal_observacao: "Falta implantar",
  };
  ws.addRow(IMPORT_HEADERS_CONTABIL.map((h) => sampleByHeader[h] ?? ""));

  const readme = wb.addWorksheet("Instruções");
  readme.addRows([
    ["Campo", "Obrigatório", "Formato / Valores aceitos"],
    ["nome_associacao", "Sim", "Precisa bater com uma entidade já cadastrada (por nome ou CNPJ)"],
    ["cnpj", "Não", "Usado como critério alternativo de busca da entidade"],
    ["consultor_nome", "Sim", "Texto"],
    ["data_visita", "Sim", "AAAA-MM-DD"],
    ["horario_visita", "Sim", "HH:MM"],
    ["estatuto_registrado / alvara_funcionamento / livro_ficha_trabalho / livro_inspecao_trabalho / filiacao_sindical / pagamento_fixo_mensal / evidencia_*", "Não", "Sim | Não"],
    ["licenca_ambiental_status", "Não", "Licença | Dispensa | Nenhum"],
    ["avcb / extintores / registro_ocb / contrato_sst / controle_frequencia / possui_contador / contabilidade_regular / possui_conta_bancaria / possui_maquineta / emite_notas_fiscais / controle_estoque / sistema_financeiro", "Não", "Sim | Não | Não sabe"],
    ["controle_frequencia_tipo", "Não", "Livro/ficha | Eletrônico | Outro | Não se aplica"],
    ["contador_tipo", "Não", "Terceirizado | Voluntário | Empregado | Cooperado | Outro tipo | Não tem contador"],
    ["classificacao_contabil", "Não", "Regular | Parcialmente regular | Irregular"],
    ["empregados_registrados / empregados_sem_registro / autonomos / ano_ultimo_balanco / renda_media_cooperado", "Não", "Número"],
    ["livro_<nome>_implantado / livro_<nome>_atualizado", "Não", "Sim | Não (deixe as 3 colunas do livro em branco para pular esse livro)"],
    ["livro_<nome>_observacao", "Não", "Texto"],
    ["demais campos de texto", "Não", "Texto livre"],
  ]);
  readme.getRow(1).font = { bold: true };
  readme.columns.forEach((c) => (c.width = 45));

  ws.getRow(1).font = { bold: true };
  ws.columns.forEach((c) => (c.width = 22));

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
