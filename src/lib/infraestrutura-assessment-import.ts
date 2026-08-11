// Parsing/mapping helpers for bulk-importing "Infraestrutura" diagnostic
// assessments. Mirrors the field set used by the live single-entry form
// (admin.associacoes.$id.diagnostico.novo.tsx — InfrastructureFields).
// Unlike juridico/contabil this writes to infrastructure_assessments, whose
// detail fields all live in a single `payload` JSONB column — so instead of
// hand-typing ~50 enum validators, every payload field is passed through as
// trimmed free text (same as what the live form's <select> ultimately
// submits: a plain string). Pure functions only — no Supabase calls here.

import type { ParsedAreaRow } from "@/components/admin/AreaAssessmentImport";

export type InfraAssessmentInput = {
  consultant_name: string;
  data_visita: string;
  horario_visita: string;
  entrevistador: string | null;
  cidade: string | null;
  endereco_sede: string | null;
  regime_ocupacao: string | null;
  pessoas_total: number | null;
  pessoas_homens: number | null;
  pessoas_mulheres: number | null;
  pessoas_especifique: string | null;
  payload: Record<string, string | null>;
};

/** Payload-only keys (everything that lives inside infrastructure_assessments.payload). */
const PAYLOAD_KEYS = [
  "via_acesso",
  "via_acesso_outro",
  "via_estado",
  "via_estado_outro",
  "via_pesados",
  "transporte_coletivo",
  "transporte_coletivo_outro",
  "rotas_ciclaveis",
  "calcadas",
  "calcadas_estado",
  "calcadas_estado_outro",
  "sinalizacao",
  "sinalizacao_estado",
  "sinalizacao_estado_outro",
  "iluminacao",
  "iluminacao_estado",
  "iluminacao_estado_outro",
  "energia",
  "agua",
  "agua_outro",
  "esgoto",
  "esgoto_outro",
  "via_alaga",
  "via_alaga_freq",
  "espaco_alaga",
  "espaco_alaga_freq",
  "piso_suporta_pesados",
  "portoes_largura",
  "espaco_manobra",
  "vagas_estacionamento",
  "muros_estado",
  "muros_patologias",
  "fundacoes_patologias",
  "piso_tipo",
  "piso_estado",
  "piso_nivelamento",
  "piso_resistencia",
  "piso_riscos",
  "pilares_material",
  "pilares_estado",
  "pilares_patologias",
  "paredes_tipo",
  "paredes_material",
  "paredes_estado",
  "paredes_patologias",
  "cobertura_tipo",
  "cobertura_estrutura",
  "cobertura_estado",
  "cobertura_patologias",
  "espaco_refeicao_descanso",
  "agua_potavel",
  "banheiros_vestiarios",
  "mofo_bolor",
  "conforto_termico_inadequado",
  "problemas_externos",
  "pontos_agua_escoamento",
] as const;

export const IMPORT_HEADERS_INFRAESTRUTURA = [
  "nome_associacao",
  "cnpj",
  "consultor_nome",
  "data_visita",
  "horario_visita",
  "entrevistador",
  "cidade",
  "endereco_sede",
  "regime_ocupacao",
  "pessoas_total",
  "pessoas_homens",
  "pessoas_mulheres",
  "pessoas_especifique",
  ...PAYLOAD_KEYS,
] as const;

function str(raw: Record<string, unknown>, key: string): string | null {
  const v = raw[key];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
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

export function parseInfraestruturaRow(
  raw: Record<string, unknown>,
  rowNumber: number,
): ParsedAreaRow<InfraAssessmentInput> {
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

  const payload: Record<string, string | null> = {};
  for (const key of PAYLOAD_KEYS) payload[key] = str(raw, key);

  const assessment: InfraAssessmentInput = {
    consultant_name: consultantName ?? "",
    data_visita: dataVisita ?? "",
    horario_visita: horarioVisita ?? "",
    entrevistador: str(raw, "entrevistador"),
    cidade: str(raw, "cidade"),
    endereco_sede: str(raw, "endereco_sede"),
    regime_ocupacao: str(raw, "regime_ocupacao"),
    pessoas_total: numOrNull(raw, "pessoas_total"),
    pessoas_homens: numOrNull(raw, "pessoas_homens"),
    pessoas_mulheres: numOrNull(raw, "pessoas_mulheres"),
    pessoas_especifique: str(raw, "pessoas_especifique"),
    payload,
  };

  return { rowNumber, raw, nome: nome ?? `(linha ${rowNumber})`, cnpj, assessment, errors, warnings };
}

export async function buildInfraestruturaTemplateXLSX(): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Infraestrutura");
  ws.addRow([...IMPORT_HEADERS_INFRAESTRUTURA]);

  const sampleByHeader: Record<string, string> = {
    nome_associacao: "Associação dos Catadores Exemplo",
    cnpj: "11.222.333/0001-81",
    consultor_nome: "Carla Consultora",
    data_visita: "2026-08-07",
    horario_visita: "14:00",
    entrevistador: "Carla Consultora",
    cidade: "Recife",
    endereco_sede: "Rua Exemplo, 123 - Bairro, Recife/PE",
    regime_ocupacao: "CEDIDA",
    pessoas_total: "12",
    pessoas_homens: "5",
    pessoas_mulheres: "7",
    via_acesso: "ASFALTO",
    via_estado: "BOM",
    via_pesados: "Sim",
    transporte_coletivo: "ÔNIBUS",
    rotas_ciclaveis: "NÃO",
    calcadas: "Sim",
    calcadas_estado: "BOM",
    sinalizacao: "Sim",
    sinalizacao_estado: "BOM",
    iluminacao: "Sim",
    iluminacao_estado: "BOM",
    energia: "CONCESSÃO PÚBLICA",
    agua: "CONCESSÃO PÚBLICA",
    esgoto: "SANEAMENTO PÚBLICO",
    via_alaga: "Não",
    espaco_alaga: "Não",
  };
  ws.addRow(IMPORT_HEADERS_INFRAESTRUTURA.map((h) => sampleByHeader[h] ?? ""));

  const readme = wb.addWorksheet("Instruções");
  readme.addRows([
    ["Campo", "Obrigatório", "Formato / Valores aceitos"],
    ["nome_associacao", "Sim", "Precisa bater com uma entidade já cadastrada (por nome ou CNPJ)"],
    ["cnpj", "Não", "Usado como critério alternativo de busca da entidade"],
    ["consultor_nome", "Sim", "Texto"],
    ["data_visita", "Sim", "AAAA-MM-DD"],
    ["horario_visita", "Sim", "HH:MM"],
    ["regime_ocupacao", "Não", "PRÓPRIA | CEDIDA | ALUGADA"],
    ["pessoas_total / pessoas_homens / pessoas_mulheres", "Não", "Número"],
    ["via_acesso", "Não", "ASFALTO | PLACAS CONCRETO | BLOCOS | INTERTRAVADO | SEM PAVIMENTAÇÃO | Outro (detalhe em via_acesso_outro)"],
    ["via_estado / calcadas_estado / sinalizacao_estado / iluminacao_estado", "Não", "BOM | REGULAR | RUIM | CRÍTICO | Outro"],
    ["via_pesados / calcadas / sinalizacao / iluminacao / via_alaga / espaco_alaga / piso_suporta_pesados / portoes_largura / espaco_manobra / vagas_estacionamento / piso_nivelamento / piso_resistencia / piso_riscos / agua_potavel / banheiros_vestiarios / mofo_bolor / conforto_termico_inadequado / pontos_agua_escoamento", "Não", "Sim | Não"],
    ["transporte_coletivo", "Não", "NÃO | ÔNIBUS | MICRO-ÔNIBUS | ALTERNATIVO LEGALIZADO | METRÔ | Outro"],
    ["rotas_ciclaveis", "Não", "NÃO | SIM NÃO-SEGREGADO | SIM SEGREGADO"],
    ["energia", "Não", "CONCESSÃO PÚBLICA | ALTERNATIVO | INADEQUADO (gatos) | SEM ENERGIA"],
    ["agua", "Não", "SEM ABASTECIMENTO | CONCESSÃO PÚBLICA | POÇO ARTESIANO | CAMINHÃO PIPA | Outro"],
    ["esgoto", "Não", "SANEAMENTO PÚBLICO | FOSSA SÉPTICA | SEM DESTINAÇÃO ADEQUADA | Outro"],
    ["via_alaga_freq / espaco_alaga_freq", "Não", "FREQUENTEMENTE | MUITAS VEZES | ALGUMAS VEZES | POUCAS VEZES"],
    ["muros_estado / piso_estado / pilares_estado / paredes_estado / cobertura_estado", "Não", "BOM | REGULAR | RUIM"],
    ["muros_patologias", "Não", "NENHUMA | RACHADURAS | INCLINADO | FERRUGEM"],
    ["fundacoes_patologias", "Não", "NENHUM | RECALQUES | TRINCAS | EROSÃO | UMIDADE CAPILARIDADE"],
    ["piso_tipo", "Não", "GRANILITE | CONCRETO DESEMPENADO | CONCRETO SIMPLES | CERÂMICO | ROCHAS"],
    ["pilares_material", "Não", "CONCRETADO LOCAL | PRÉ-FABRICADO | METÁLICO | MADEIRA | MISTO"],
    ["pilares_patologias", "Não", "NENHUMA | FISSURAS | FERRAGENS EXPOSTAS | CORROSÃO | FORA DE PRUMO | UMIDADE | IMPACTO"],
    ["paredes_tipo", "Não", "ESTRUTURAL | VEDAÇÃO | MISTO"],
    ["paredes_material", "Não", "BLOCOS CONCRETO | BLOCOS CERÂMICOS | TIJOLO MACIÇO | ECOLÓGICO"],
    ["paredes_patologias", "Não", "NENHUMA | FISSURAS | FORA DE PRUMO | UMIDADE | MOFO | REVESTIMENTO SOLTO | IMPACTO"],
    ["cobertura_tipo", "Não", "TELHA CERÂMICA | FIBROCIMENTO | METÁLICA | FIBRA | LAJE"],
    ["cobertura_estrutura", "Não", "MADEIRA | METÁLICA | CONCRETO"],
    ["cobertura_patologias", "Não", "NENHUMA | GOTEIRAS | TELHAS QUEBRADAS | ESTRUTURA DANIFICADA | CALHAS ENTUPIDAS"],
    ["espaco_refeicao_descanso", "Não", "Não | Sim ambos | Sim parcial"],
    ["problemas_externos", "Não", "Nenhum | Acúmulo de material | Vetores | Mau cheiro"],
    ["campos *_outro", "Não", "Texto livre — preencha quando a opção escolhida for 'Outro'"],
  ]);
  readme.getRow(1).font = { bold: true };
  readme.columns.forEach((c) => (c.width = 55));

  ws.getRow(1).font = { bold: true };
  ws.columns.forEach((c) => (c.width = 20));

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
