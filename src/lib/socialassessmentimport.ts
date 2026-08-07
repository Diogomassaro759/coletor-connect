// Parsing/mapping helpers for bulk-importing "Formulário de Campo" (Google Forms)
// spreadsheets into association_assessments (area = "social") + associations +
// material_prices. Pure functions only — no Supabase calls here.

export type ParsedAssociationInput = {
  nome: string;
  cnpj: string | null;
  municipio: string;
  inscricao_municipal: string | null;
  inscricao_estadual: string | null;
  endereco_sede: string;
  telefone: string | null;
  email: string | null;
  numero_associados_inicial: number;
  numero_associados_atual: number;
};

export type ParsedAssessmentInput = {
  consultant_name: string;
  data_visita: string;
  horario_visita: string;
  homens: number;
  mulheres: number;
  possui_pessoas_trans: boolean;
  pessoas_trans_detalhes: string | null;
  autodeclaracao_racial: string | null;
  presidente_nome: string | null;
  presidente_telefone: string | null;
  presidente_email: string | null;
  vice_presidente_nome: string | null;
  vice_presidente_telefone: string | null;
  vice_presidente_email: string | null;
  diretoria_conselho: boolean;
  diretoria_nomes: string | null;
  estatuto_registrado: string | null;
  mandato_em_dia: string | null;
  ata_registrada_cartorio: string | null;
  alvara_funcionamento: string | null;
  licenca_ambiental_status: string | null;
  faixa_etaria_predominante: string | null;
  escolaridade_predominante: string | null;
  media_moradores_casa: number | null;
  criancas_adolescentes_dependentes: boolean;
  contribuicao_inss: string | null;
  inscritos_cadunico: string | null;
  uso_epis: string | null;
  cooperativa_fornece_epis: boolean;
  acidentes_ultimo_ano: boolean;
  acidentes_tipo: string | null;
  problemas_saude: string | null;
  media_horas_trabalhadas: string | null;
  aumento_trabalho_festividades: boolean;
  necessita_documentos: boolean;
  documentos_necessarios: string | null;
  recebe_beneficios: boolean;
  quantidade_beneficiarios: number | null;
  reconhecimento_sociedade: string | null;
  relatos_preconceito: boolean;
  preconceito_detalhes: string | null;
  motivos_entrada_reciclagem: string | null;
  historico_trabalho_infantil: boolean;
  interesse_capacitacao: boolean;
  capacitacoes_interesse: string | null;
  contrato_remunerado: boolean;
  contrato_instituicoes_publicas: string | null;
  contrato_instituicoes_privadas: string | null;
  tipo_coleta: string | null;
  realiza_triagem: boolean;
  volumetria_toneladas_mes: number | null;
  renda_media_mensal: number | null;
  possui_parcerias: string | null;
  destino_venda: string | null;
  tipo_galpao: string | null;
  possui_veiculos_maquinas: boolean;
  equipamentos_outros: string | null;
  recebeu_apoio_programas: boolean;
  participa_movimentos: boolean;
  movimento_qual: string | null;
};

export type ParsedMaterialPriceInput = {
  material: string;
  comprador: string | null;
  preco_por_kg: number | null;
};

export type ParsedSocialRow = {
  rowNumber: number;
  raw: Record<string, unknown>;
  association: ParsedAssociationInput;
  assessment: ParsedAssessmentInput;
  materialPrices: ParsedMaterialPriceInput[];
  errors: string[];
  warnings: string[];
};

const H = {
  timestamp: "Carimbo de data/hora",
  assocNome: "Nome completo da associação/cooperativa:",
  assocCnpj: "CNPJ (se tiver):",
  assocInscMun: "Inscrição Municipal (se tiver):",
  assocInscEst: "Inscrição Estadual (se tiver):",
  assocMunicipio: "Município:",
  assocEndereco: "Endereço completo da sede:",
  assocTelefone: "Telefone:",
  assocEmail: "E-mail:",
  assocNumInicial: "Número inicial de associados/cooperados:",
  assocNumAtual: "Número atual de associados/cooperados:",
  homens: "Quantos homens?",
  mulheres: "Quantas mulheres?",
  possuiTrans: "Possui pessoas trans? ",
  transDetalhes: "Se sim, quantas e quais suas identidades:",
  racial: "Relação da autodeclaração racial dos associados:",
  presidenteNome: "Nome do Presidente atual:",
  presidenteTelefone: "Telefone: 2",
  presidenteEmail: "E-mail: 2",
  viceNome: "Nome do Vice-Presidente (se houver): ",
  viceTelefone: "Telefone: 3",
  viceEmail: "E-mail: 3",
  diretoria: "Existe diretoria ou conselho de administração?",
  diretoriaNomes: "Se sim, informar nomes dos principais responsáveis:",
  estatuto: "A organização possui Estatuto registrado na Junta Comercial do Estado?",
  mandato: "A diretoria está com o mandato em dia?",
  ataCartorio: "A ata foi registrada em cartório?",
  alvara: "A organização possui alvará de funcionamento/localização?",
  licencaAmbiental: "A organização possui licença ambiental ou certificado de dispensa?",
  faixaEtaria: "Qual a faixa etária predominante dos catadores?",
  escolaridade: "Qual o nível de escolaridade predominante?",
  moradoresCasa: "Em média, quantas pessoas moram na casa dos catadores? (resposta curta)",
  criancasDependentes: "Há crianças ou adolescentes dependentes da renda?",
  inss: "Os catadores contribuem com o INSS?",
  cadunico: "Estão inscritos no CadÚnico?",
  epis: "Utilizam Equipamentos de Proteção Individual (EPIs)?",
  cooperativaForneceEpis: "A cooperativa fornece esses equipamentos?",
  acidentes: "Houve acidentes de trabalho no último ano?",
  acidentesTipo: "Se sim, qual o tipo de acidente?",
  problemasSaude: "Principais problemas de saúde identificados: (resposta aberta)",
  horasTrabalhadas: "Quantas horas por dia, em média, trabalham? (resposta curta)",
  aumentoFestividades: "O trabalho aumenta em períodos como Carnaval, São João, festas?",
  necessitaDocs: "Algum associado precisa de atualização ou emissão de documentos?",
  docsNecessarios: "Se sim, quais?",
  recebeBeneficios: "Algum associado possui bolsa família ou outro benefício",
  qtdBeneficiarios: "Se sim,  quantos?",
  reconhecimento: "Os catadores se sentem reconhecidos pela sociedade?",
  preconceito: "Relatam situações de preconceito?",
  preconceitoDetalhes: "Se sim, quais? 2",
  motivosEntrada: "Principais motivos de entrada na reciclagem: (resposta aberta)",
  trabalhoInfantil: "Há histórico de trabalho infantil entre os catadores?",
  interesseCapacitacao: "Há interesse em capacitação ou cursos?",
  capacitacoesInteresse: "Se sim, quais? ",
  contratoRemunerado:
    "A cooperativa tem contrato remunerado com a prefeitura ou outra instituição pública ou privada?",
  contratoPublicas: "Se sim, quais são as públicas?",
  contratoPrivadas: "Se sim, quais são as privadas?",
  tipoColeta: "A cooperativa faz coleta nas ruas ou em domicílios?",
  volumetria: "Qual a quantidade de materiais recicláveis coletada (em toneladas/mês)?",
  volumetria2: "Qual a quantidade de materiais recicláveis coletada (em toneladas/mês)? 2",
  renda: "Qual a renda média mensal dos catadores(as)?",
  parcerias: "A associação/cooperativa possui parceria com alguma empresa ou instituição",
  destinoVenda: "Associação/cooperativa vende os materiais recicláveis para quem?",
  galpao: "A associação/cooperativa possui galpão:",
  veiculosMaquinas: "A associação/cooperativa possui veículos, máquinas e equipamentos?",
  equipamentosQuais: "Se sim, quais? 3",
  apoioProgramas: "A associação/cooperativa já recebeu apoio dos programas Pró-catador ou Cataforte?",
  movimentos: "A associação/cooperativa participa dos movimentos nacionais, MNRC ou MESC?",
  movimentoQual: "Se sim, qual?",
  consultorNome: "Nome do consultor",
  dataVisita: "Data da realização da pesquisa",
  horarioVisita: "Horário da visita",
  triagem: "Há separação/triagem (ex.: separação dos tipos de plástico/tipos de vidro)?",
} as const;

const MATERIALS: { key: string; compradorHeader: string; precoHeader: string }[] = [
  { key: "Vidro", compradorHeader: "Compradores de Vidro:", precoHeader: "Vidro:" },
  { key: "Plástico PET", compradorHeader: "Compradores de plástico PET:", precoHeader: "Plástico PET:" },
  { key: "Outros plásticos", compradorHeader: "Compradores de outros plásticos:", precoHeader: "Outros Plásticos:" },
  { key: "Ferro", compradorHeader: "Compradores de ferro:", precoHeader: "Ferro:" },
  { key: "Alumínio", compradorHeader: "Compradores de alumínio:", precoHeader: "Alumínio:" },
  { key: "Papelão", compradorHeader: "Compradores de papelão:", precoHeader: "Papelão:" },
  { key: "Papel", compradorHeader: "Compradores de papel:", precoHeader: "Papel:" },
  { key: "Outros materiais", compradorHeader: "Compradores de outros materiais (descrever):", precoHeader: "Outros materiais:" },
];

function str(raw: Record<string, unknown>, key: string): string | null {
  const v = raw[key];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function boolFromSimNao(raw: Record<string, unknown>, key: string): boolean {
  const v = str(raw, key);
  if (!v) return false;
  return v.trim().toLowerCase().startsWith("sim");
}

const pad2 = (n: number) => String(n).padStart(2, "0");

function firstNumberToken(s: string): string | null {
  const m = s.match(/\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?/);
  return m ? m[0] : null;
}

function ptBrTokenToFloat(token: string): number | null {
  let clean = token;
  if (clean.includes(",")) clean = clean.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : null;
}

/** Extracts a loose number from messy free text (handles "13 homens", "0,5 o Kg", plain numbers). */
function looseNumber(raw: Record<string, unknown>, key: string): number | null {
  const v = raw[key];
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const token = firstNumberToken(s);
  return token ? ptBrTokenToFloat(token) : null;
}

/** Income needs special handling: skip "salários mínimos" multipliers and "não sabe" answers,
 * average simple ranges like "300,00 a 600,00". */
function parseRendaMensal(raw: Record<string, unknown>, key: string): number | null {
  const v = raw[key];
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower.includes("sabe") || lower.includes("salário") || lower.includes("salario")) return null;
  const matches = s.match(/\d{1,3}(?:\.\d{3})*(?:,\d+)?|\d+(?:,\d+)?/g);
  if (!matches || matches.length === 0) return null;
  if (lower.includes(" a ") && matches.length >= 2) {
    const a = ptBrTokenToFloat(matches[0]);
    const b = ptBrTokenToFloat(matches[1]);
    if (a !== null && b !== null) return (a + b) / 2;
  }
  return ptBrTokenToFloat(matches[0]);
}

function parseBrDateString(s: string): string | null {
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${pad2(Number(m[1]))}-${pad2(Number(m[2]))}`;
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${pad2(Number(m[2]))}-${pad2(Number(m[3]))}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  return null;
}

function parseBrTimeString(s: string): string | null {
  const m = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  return `${pad2(Number(m[1]))}:${m[2]}:${m[3] ?? "00"}`;
}

/** Resolves date_visita/horario_visita, falling back to the form's submission timestamp
 * when the dedicated "Data da realização"/"Horário da visita" columns are blank. */
function resolveDateTime(raw: Record<string, unknown>): { date: string | null; time: string | null } {
  const dateStr = str(raw, H.dataVisita);
  const timeStr = str(raw, H.horarioVisita);
  let date = dateStr ? parseBrDateString(dateStr) : null;
  let time = timeStr ? parseBrTimeString(timeStr) : null;
  if (date && time) return { date, time };

  const ts = str(raw, H.timestamp);
  if (ts) {
    if (!date) date = parseBrDateString(ts);
    if (!time) time = parseBrTimeString(ts);
  }
  return { date, time };
}

export function parseSocialAssessmentRow(raw: Record<string, unknown>, rowNumber: number): ParsedSocialRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nome = str(raw, H.assocNome);
  if (!nome) errors.push("Nome da associação/cooperativa é obrigatório.");

  const municipio = str(raw, H.assocMunicipio);
  if (!municipio) warnings.push('Município em branco — preenchido como vazio, complete depois.');

  const endereco = str(raw, H.assocEndereco);
  if (!endereco) warnings.push("Endereço da sede em branco — preenchido como vazio, complete depois.");

  const { date: dataVisita, time: horarioVisita } = resolveDateTime(raw);
  if (!dataVisita) errors.push('Não foi possível determinar a "Data da realização da pesquisa".');
  if (!horarioVisita) errors.push('Não foi possível determinar o "Horário da visita".');

  const renda = parseRendaMensal(raw, H.renda);
  if (str(raw, H.renda) && renda === null) {
    warnings.push(`Renda média mensal não pôde ser convertida automaticamente ("${str(raw, H.renda)}") — preencha manualmente.`);
  }

  const materialPrices: ParsedMaterialPriceInput[] = [];
  for (const m of MATERIALS) {
    const comprador = str(raw, m.compradorHeader);
    const precoRaw = str(raw, m.precoHeader);
    const preco = looseNumber(raw, m.precoHeader);
    if (precoRaw && preco === null) {
      warnings.push(`Preço de "${m.key}" não pôde ser convertido ("${precoRaw}") — confira manualmente.`);
    }
    if (comprador || preco !== null) {
      materialPrices.push({ material: m.key, comprador, preco_por_kg: preco });
    }
  }

  const association: ParsedAssociationInput = {
    nome: nome ?? `Associação sem nome (linha ${rowNumber})`,
    cnpj: str(raw, H.assocCnpj),
    municipio: municipio ?? "",
    inscricao_municipal: str(raw, H.assocInscMun),
    inscricao_estadual: str(raw, H.assocInscEst),
    endereco_sede: endereco ?? "",
    telefone: str(raw, H.assocTelefone),
    email: str(raw, H.assocEmail),
    numero_associados_inicial: looseNumber(raw, H.assocNumInicial) ?? 0,
    numero_associados_atual: looseNumber(raw, H.assocNumAtual) ?? looseNumber(raw, H.assocNumInicial) ?? 0,
  };

  const assessment: ParsedAssessmentInput = {
    consultant_name: str(raw, H.consultorNome) ?? "Importação em massa",
    data_visita: dataVisita ?? "",
    horario_visita: horarioVisita ?? "",
    homens: looseNumber(raw, H.homens) ?? 0,
    mulheres: looseNumber(raw, H.mulheres) ?? 0,
    possui_pessoas_trans: boolFromSimNao(raw, H.possuiTrans),
    pessoas_trans_detalhes: str(raw, H.transDetalhes),
    autodeclaracao_racial: str(raw, H.racial),
    presidente_nome: str(raw, H.presidenteNome),
    presidente_telefone: str(raw, H.presidenteTelefone),
    presidente_email: str(raw, H.presidenteEmail),
    vice_presidente_nome: str(raw, H.viceNome),
    vice_presidente_telefone: str(raw, H.viceTelefone),
    vice_presidente_email: str(raw, H.viceEmail),
    diretoria_conselho: boolFromSimNao(raw, H.diretoria),
    diretoria_nomes: str(raw, H.diretoriaNomes),
    estatuto_registrado: str(raw, H.estatuto),
    mandato_em_dia: str(raw, H.mandato),
    ata_registrada_cartorio: str(raw, H.ataCartorio),
    alvara_funcionamento: str(raw, H.alvara),
    licenca_ambiental_status: str(raw, H.licencaAmbiental),
    faixa_etaria_predominante: str(raw, H.faixaEtaria),
    escolaridade_predominante: str(raw, H.escolaridade),
    media_moradores_casa: looseNumber(raw, H.moradoresCasa),
    criancas_adolescentes_dependentes: boolFromSimNao(raw, H.criancasDependentes),
    contribuicao_inss: str(raw, H.inss),
    inscritos_cadunico: str(raw, H.cadunico),
    uso_epis: str(raw, H.epis),
    cooperativa_fornece_epis: boolFromSimNao(raw, H.cooperativaForneceEpis),
    acidentes_ultimo_ano: boolFromSimNao(raw, H.acidentes),
    acidentes_tipo: str(raw, H.acidentesTipo),
    problemas_saude: str(raw, H.problemasSaude),
    media_horas_trabalhadas: str(raw, H.horasTrabalhadas),
    aumento_trabalho_festividades: boolFromSimNao(raw, H.aumentoFestividades),
    necessita_documentos: boolFromSimNao(raw, H.necessitaDocs),
    documentos_necessarios: str(raw, H.docsNecessarios),
    recebe_beneficios: boolFromSimNao(raw, H.recebeBeneficios),
    quantidade_beneficiarios: looseNumber(raw, H.qtdBeneficiarios),
    reconhecimento_sociedade: str(raw, H.reconhecimento),
    relatos_preconceito: boolFromSimNao(raw, H.preconceito),
    preconceito_detalhes: str(raw, H.preconceitoDetalhes),
    motivos_entrada_reciclagem: str(raw, H.motivosEntrada),
    historico_trabalho_infantil: boolFromSimNao(raw, H.trabalhoInfantil),
    interesse_capacitacao: boolFromSimNao(raw, H.interesseCapacitacao),
    capacitacoes_interesse: str(raw, H.capacitacoesInteresse),
    contrato_remunerado: boolFromSimNao(raw, H.contratoRemunerado),
    contrato_instituicoes_publicas: str(raw, H.contratoPublicas),
    contrato_instituicoes_privadas: str(raw, H.contratoPrivadas),
    tipo_coleta: str(raw, H.tipoColeta),
    realiza_triagem: boolFromSimNao(raw, H.triagem),
    volumetria_toneladas_mes: looseNumber(raw, H.volumetria) ?? looseNumber(raw, H.volumetria2),
    renda_media_mensal: renda,
    possui_parcerias: str(raw, H.parcerias),
    destino_venda: str(raw, H.destinoVenda),
    tipo_galpao: str(raw, H.galpao),
    possui_veiculos_maquinas: boolFromSimNao(raw, H.veiculosMaquinas),
    equipamentos_outros: str(raw, H.equipamentosQuais),
    recebeu_apoio_programas: boolFromSimNao(raw, H.apoioProgramas),
    participa_movimentos: boolFromSimNao(raw, H.movimentos),
    movimento_qual: str(raw, H.movimentoQual),
  };

  return { rowNumber, raw, association, assessment, materialPrices, errors, warnings };
}

export { H as SOCIAL_IMPORT_HEADERS };
