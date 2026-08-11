// Parsing/mapping helpers for bulk-importing "Jurídico" diagnostic assessments.
// Mirrors the field set/typing used by the live single-entry form
// (admin.associacoes.$id.diagnostico.novo.tsx — LegalFields), including which
// columns are stored as real booleans vs "Sim"/"Não" text. Pure functions
// only — no Supabase calls here.

import type { ParsedAreaRow } from "@/components/admin/AreaAssessmentImport";

export type JuridicoAssessmentInput = {
  consultant_name: string;
  data_visita: string;
  horario_visita: string;
  diretoria_conselho: boolean;
  diretoria_nomes: string | null;
  mandato_em_dia: string | null;
  conselho_fiscal: string | null;
  cargos_por_eleicao: string | null;
  data_ultima_eleicao: string | null;
  ata_registrada_cartorio: string | null;
  realiza_assembleias: string | null;
  frequencia_assembleias: string | null;
  possui_registro_atas: string | null;
  assessoria_juridica: boolean;
  apoio_instituicoes: boolean;
  apoio_instituicoes_quais: string | null;
  processos_judiciais: boolean;
  processos_judiciais_quais: string | null;
  todos_sao_cooperados: boolean;
  lista_cooperados_atualizada: string | null;
  lista_nao_cooperados_atualizada: string | null;
  regras_entrada: string | null;
  regras_saida_exclusao: string | null;
  fluxo_trabalho_diario: string | null;
  divisao_tarefas: string | null;
  coordenacao_gerencia: string | null;
  controle_jornada: boolean;
  problemas_juridicos_atuais: string | null;
  melhorias_juridicas_necessarias: string | null;
  contrato_tipo: string | null;
  contrato_remunerado: boolean;
  contrato_instituicoes_publicas: string | null;
  contrato_instituicoes_privadas: string | null;
  participa_coleta_seletiva_municipal: boolean;
  apoio_poder_publico: string | null;
  classificacao_juridica: string | null;
  pendencias_juridicas: string | null;
};

export const IMPORT_HEADERS_JURIDICO = [
  "nome_associacao",
  "cnpj",
  "consultor_nome",
  "data_visita",
  "horario_visita",
  "diretoria_conselho",
  "diretoria_nomes",
  "mandato_em_dia",
  "conselho_fiscal",
  "cargos_por_eleicao",
  "data_ultima_eleicao",
  "ata_registrada_cartorio",
  "realiza_assembleias",
  "frequencia_assembleias",
  "possui_registro_atas",
  "assessoria_juridica",
  "apoio_instituicoes",
  "apoio_instituicoes_quais",
  "processos_judiciais",
  "processos_judiciais_quais",
  "todos_sao_cooperados",
  "lista_cooperados_atualizada",
  "lista_nao_cooperados_atualizada",
  "regras_entrada",
  "regras_saida_exclusao",
  "fluxo_trabalho_diario",
  "divisao_tarefas",
  "coordenacao_gerencia",
  "controle_jornada",
  "problemas_juridicos_atuais",
  "melhorias_juridicas_necessarias",
  "contrato_tipo",
  "contrato_instituicoes_publicas",
  "contrato_instituicoes_privadas",
  "participa_coleta_seletiva_municipal",
  "apoio_poder_publico",
  "classificacao_juridica",
  "pendencias_juridicas",
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

export function parseJuridicoRow(
  raw: Record<string, unknown>,
  rowNumber: number,
): ParsedAreaRow<JuridicoAssessmentInput> {
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

  const contratoTipo = str(raw, "contrato_tipo");

  const assessment: JuridicoAssessmentInput = {
    consultant_name: consultantName ?? "",
    data_visita: dataVisita ?? "",
    horario_visita: horarioVisita ?? "",
    diretoria_conselho: boolFromSimNao(raw, "diretoria_conselho"),
    diretoria_nomes: str(raw, "diretoria_nomes"),
    mandato_em_dia: str(raw, "mandato_em_dia"),
    conselho_fiscal: str(raw, "conselho_fiscal"),
    cargos_por_eleicao: str(raw, "cargos_por_eleicao"),
    data_ultima_eleicao: (() => {
      const v = str(raw, "data_ultima_eleicao");
      return v ? parseFlexDate(v) : null;
    })(),
    ata_registrada_cartorio: str(raw, "ata_registrada_cartorio"),
    realiza_assembleias: str(raw, "realiza_assembleias"),
    frequencia_assembleias: str(raw, "frequencia_assembleias"),
    possui_registro_atas: str(raw, "possui_registro_atas"),
    assessoria_juridica: boolFromSimNao(raw, "assessoria_juridica"),
    apoio_instituicoes: boolFromSimNao(raw, "apoio_instituicoes"),
    apoio_instituicoes_quais: str(raw, "apoio_instituicoes_quais"),
    processos_judiciais: boolFromSimNao(raw, "processos_judiciais"),
    processos_judiciais_quais: str(raw, "processos_judiciais_quais"),
    todos_sao_cooperados: boolFromSimNao(raw, "todos_sao_cooperados"),
    lista_cooperados_atualizada: str(raw, "lista_cooperados_atualizada"),
    lista_nao_cooperados_atualizada: str(raw, "lista_nao_cooperados_atualizada"),
    regras_entrada: str(raw, "regras_entrada"),
    regras_saida_exclusao: str(raw, "regras_saida_exclusao"),
    fluxo_trabalho_diario: str(raw, "fluxo_trabalho_diario"),
    divisao_tarefas: str(raw, "divisao_tarefas"),
    coordenacao_gerencia: str(raw, "coordenacao_gerencia"),
    controle_jornada: boolFromSimNao(raw, "controle_jornada"),
    problemas_juridicos_atuais: str(raw, "problemas_juridicos_atuais"),
    melhorias_juridicas_necessarias: str(raw, "melhorias_juridicas_necessarias"),
    contrato_tipo: contratoTipo,
    contrato_remunerado: !!contratoTipo && contratoTipo !== "Não",
    contrato_instituicoes_publicas: str(raw, "contrato_instituicoes_publicas"),
    contrato_instituicoes_privadas: str(raw, "contrato_instituicoes_privadas"),
    participa_coleta_seletiva_municipal: boolFromSimNao(raw, "participa_coleta_seletiva_municipal"),
    apoio_poder_publico: str(raw, "apoio_poder_publico"),
    classificacao_juridica: str(raw, "classificacao_juridica"),
    pendencias_juridicas: str(raw, "pendencias_juridicas"),
  };

  return { rowNumber, raw, nome: nome ?? `(linha ${rowNumber})`, cnpj, assessment, errors, warnings };
}

export async function buildJuridicoTemplateXLSX(): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Jurídico");
  ws.addRow([...IMPORT_HEADERS_JURIDICO]);
  const sampleByHeader: Record<string, string> = {
    nome_associacao: "Associação dos Catadores Exemplo",
    cnpj: "11.222.333/0001-81",
    consultor_nome: "Carla Consultora",
    data_visita: "2026-08-07",
    horario_visita: "10:30",
    diretoria_conselho: "Sim",
    diretoria_nomes: "Maria (presidente), João (tesoureiro)",
    mandato_em_dia: "Sim",
    conselho_fiscal: "Não sabe",
    cargos_por_eleicao: "Sim",
    data_ultima_eleicao: "2025-03-10",
    ata_registrada_cartorio: "Sim",
    realiza_assembleias: "Sim",
    frequencia_assembleias: "Mensal",
    possui_registro_atas: "Sim",
    assessoria_juridica: "Não",
    apoio_instituicoes: "Sim",
    apoio_instituicoes_quais: "Assessoria da prefeitura",
    processos_judiciais: "Não",
    todos_sao_cooperados: "Sim",
    lista_cooperados_atualizada: "Sim",
    lista_nao_cooperados_atualizada: "Não sabe",
    regras_entrada: "Sim",
    regras_saida_exclusao: "Sim",
    fluxo_trabalho_diario: "Divisão por turnos",
    divisao_tarefas: "Sim",
    coordenacao_gerencia: "Sim",
    controle_jornada: "Não",
    problemas_juridicos_atuais: "Falta de estatuto atualizado",
    melhorias_juridicas_necessarias: "Atualizar estatuto",
    contrato_tipo: "Sim, prefeitura",
    contrato_instituicoes_publicas: "Coleta seletiva do bairro X",
    participa_coleta_seletiva_municipal: "Sim",
    apoio_poder_publico: "Sim",
    classificacao_juridica: "Parcialmente regular",
    pendencias_juridicas: "Falta registrar ata em cartório",
  };
  ws.addRow(IMPORT_HEADERS_JURIDICO.map((h) => sampleByHeader[h] ?? ""));

  const readme = wb.addWorksheet("Instruções");
  readme.addRows([
    ["Campo", "Obrigatório", "Formato / Valores aceitos"],
    ["nome_associacao", "Sim", "Precisa bater com uma entidade já cadastrada (por nome ou CNPJ)"],
    ["cnpj", "Não", "Usado como critério alternativo de busca da entidade"],
    ["consultor_nome", "Sim", "Texto"],
    ["data_visita", "Sim", "AAAA-MM-DD"],
    ["horario_visita", "Sim", "HH:MM"],
    ["diretoria_conselho / assessoria_juridica / apoio_instituicoes / processos_judiciais / todos_sao_cooperados / controle_jornada / participa_coleta_seletiva_municipal", "Não", "Sim | Não"],
    ["mandato_em_dia / ata_registrada_cartorio / possui_registro_atas / regras_entrada / regras_saida_exclusao / divisao_tarefas / coordenacao_gerencia", "Não", "Sim | Não"],
    ["conselho_fiscal / cargos_por_eleicao / realiza_assembleias / lista_cooperados_atualizada / lista_nao_cooperados_atualizada / apoio_poder_publico", "Não", "Sim | Não | Não sabe"],
    ["contrato_tipo", "Não", "Sim, prefeitura | Sim, outra instituição pública | Sim, instituição privada | Não"],
    ["classificacao_juridica", "Não", "Regular | Parcialmente regular | Irregular"],
    ["data_ultima_eleicao", "Não", "AAAA-MM-DD"],
    ["demais campos de texto", "Não", "Texto livre"],
  ]);
  readme.getRow(1).font = { bold: true };
  readme.columns.forEach((c) => (c.width = 45));

  ws.getRow(1).font = { bold: true };
  ws.columns.forEach((c) => (c.width = 24));

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
