import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { BackButton } from "@/components/ui/back-button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Plus,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { CameraCapture } from "@/components/admin/CameraCapture";
import { SignaturePad } from "@/components/admin/SignaturePad";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute(
  "/_authenticated/admin/associacoes/$id/diagnostico/$assessmentId",
)({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "edit" ? ("edit" as const) : ("view" as const),
  }),
  head: () => ({ meta: [{ title: "Diagnóstico institucional — PROCATE" }] }),
  component: AssessmentDetails,
});

const STATUS = {
  regular: "Regular",
  parcialmente_regular: "Parcialmente regular",
  irregular: "Irregular",
} as const;
const BOOKS = [
  "Matrícula",
  "Atas Assembleia",
  "Presença Assembleia",
  "Atas Diretoria",
  "Atas Conselho Fiscal",
  "Registro Patrimônio",
  "Registro Inventário",
];
const EVIDENCE = [
  "Frente da cooperativa",
  "Sala administrativa/financeiro/almoxarifado",
  "Reunião/entrevista",
  "Lista de cooperados",
  "Lista de não cooperados",
  "Livro/ficha de trabalho",
  "Livro de inspeção",
];

function AssessmentDetails() {
  const router = useRouter();
  const { id, assessmentId } = Route.useParams();
  const { mode } = Route.useSearch();
  const ctx = Route.useRouteContext() as any;
  const { isAdmin, isConsultant, isCoordenador, area } = ctx;
  const { data: assessmentArea } = useQuery({
    queryKey: ["assessment-area", assessmentId],
    queryFn: async () => {
      const { data: a } = await supabase
        .from("association_assessments")
        .select("created_by")
        .eq("id", assessmentId)
        .maybeSingle();
      if (!a?.created_by) return null;
      const { data: r } = await supabase
        .from("user_roles")
        .select("area")
        .eq("user_id", a.created_by)
        .not("area", "is", null)
        .maybeSingle();
      return (r?.area as string) ?? null;
    },
  });
  const effectiveArea = assessmentArea ?? area;
  const showSocial = !effectiveArea || effectiveArea === "social";
  const showJuridico = effectiveArea === "juridico";
  const showContabil = effectiveArea === "contabil";
  const canEditFieldData =
    mode === "edit" &&
    (isAdmin ||
      (isCoordenador && (!effectiveArea || area === effectiveArea)) ||
      (isConsultant && (!effectiveArea || area === effectiveArea)));
  const qc = useQueryClient();
  const [cameraCategory, setCameraCategory] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [module, setModule] = useState<"social" | "juridico" | "contabil">("social");
  const [representativeName, setRepresentativeName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["assessment-detail", assessmentId],
    queryFn: async () => {
      const [
        assessmentResult,
        associationResult,
        pricesResult,
        equipmentResult,
        booksResult,
        evidenceResult,
      ] = await Promise.all([
        supabase
          .from("association_assessments")
          .select("*")
          .eq("id", assessmentId)
          .eq("association_id", id)
          .single(),
        supabase.from("associations").select("*").eq("id", id).single(),
        supabase
          .from("material_prices")
          .select("*")
          .eq("assessment_id", assessmentId)
          .order("material"),
        supabase
          .from("association_equipment")
          .select("*")
          .eq("assessment_id", assessmentId)
          .order("tipo"),
        supabase
          .from("accounting_books")
          .select("*")
          .eq("assessment_id", assessmentId)
          .order("tipo"),
        supabase
          .from("association_evidence")
          .select("*")
          .eq("assessment_id", assessmentId)
          .order("created_at", { ascending: false }),
      ]);
      if (assessmentResult.error) throw assessmentResult.error;
      if (associationResult.error) throw associationResult.error;
      return {
        assessment: assessmentResult.data,
        association: associationResult.data,
        prices: pricesResult.data ?? [],
        equipment: equipmentResult.data ?? [],
        books: booksResult.data ?? [],
        evidence: evidenceResult.data ?? [],
      };
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["assessment-detail", assessmentId] });
  const addPrice = useMutation({
    mutationFn: async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const { error } = await supabase.from("material_prices").insert({
        assessment_id: assessmentId,
        material: String(form.get("material") ?? "").trim(),
        comprador: String(form.get("comprador") ?? "").trim() || null,
        preco_por_kg: Number(form.get("preco") ?? 0),
      });
      if (error) throw error;
      event.currentTarget.reset();
    },
    onSuccess: refresh,
    onError: notify,
  });
  const addEquipment = useMutation({
    mutationFn: async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const { error } = await supabase.from("association_equipment").insert({
        assessment_id: assessmentId,
        tipo: String(form.get("tipo") ?? "").trim(),
        quantidade: Number(form.get("quantidade") ?? 0),
      });
      if (error) throw error;
      event.currentTarget.reset();
    },
    onSuccess: refresh,
    onError: notify,
  });

  async function updateBook(
    tipo: string,
    changes: {
      implantado?: boolean;
      atualizado?: boolean;
      nao_sabe?: boolean;
      nao_possui?: boolean;
      observacao?: string;
    },
  ) {
    const current = data?.books.find((book) => book.tipo === tipo);
    const result = current
      ? await supabase.from("accounting_books").update(changes).eq("id", current.id)
      : await supabase
          .from("accounting_books")
          .insert({ assessment_id: assessmentId, tipo, ...changes });
    if (result.error) toast.error("Erro ao atualizar livro", { description: result.error.message });
    else refresh();
  }

  async function saveSummary(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = buildAssessmentUpdatePayload(form, effectiveArea ?? "social");
    const { error } = await supabase
      .from("association_assessments")
      .update(payload)
      .eq("id", assessmentId);

    if (error) return toast.error("Não foi possível salvar", { description: error.message });
    toast.success("Formulário atualizado.");
    refresh();
  }

  async function uploadEvidence(file: File, category: string) {
    if (!file.type.startsWith("image/") && file.type !== "application/pdf")
      return toast.error("Use uma imagem ou PDF.");
    if (file.size > 10 * 1024 * 1024) return toast.error("O arquivo deve ter no máximo 10 MB.");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return toast.error("Sua sessão expirou.");
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `associations/${id}/${assessmentId}/${crypto.randomUUID()}.${ext}`;
    const uploaded = await supabase.storage
      .from("catadores-docs")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (!uploaded.error) {
      const saved = await supabase.from("association_evidence").insert({
        association_id: id,
        assessment_id: assessmentId,
        module,
        category,
        storage_path: path,
        file_name: file.name.slice(0, 200),
        mime_type: file.type,
        uploaded_by: auth.user.id,
      });
      if (saved.error) await supabase.storage.from("catadores-docs").remove([path]);
      if (saved.error)
        toast.error("Erro ao registrar evidência", { description: saved.error.message });
      else {
        toast.success("Evidência anexada.");
        refresh();
      }
    } else toast.error("Erro no envio", { description: uploaded.error.message });
    setUploading(false);
  }

  async function validateEvidence() {
    if (!data) return;
    const categories = new Set(data.evidence.map((file) => file.category));
    const required = [
      "Frente da cooperativa",
      "Sala administrativa/financeiro/almoxarifado",
      "Reunião/entrevista",
    ];
    const hasDocument = data.evidence.some(
      (file) => file.category.startsWith("Lista de") || file.category.startsWith("Livro"),
    );
    const missing = required.filter((category) => !categories.has(category));
    const finalName =
      representativeName.trim() || data.assessment.representative_name?.trim() || "";
    const finalSignature = signature ?? data.assessment.representative_signature;
    if (missing.length || !hasDocument)
      return toast.error("Evidências incompletas", {
        description:
          "Anexe frente, sala administrativa, reunião/entrevista e ao menos uma lista ou livro.",
      });
    if (!finalName || !finalSignature)
      return toast.error("Assinatura obrigatória", {
        description: "Informe o representante e colete a assinatura.",
      });
    setValidating(true);
    const { error } = await supabase
      .from("association_assessments")
      .update({
        evidence_validated: true,
        representative_name: finalName,
        representative_signature: finalSignature,
        signed_at: new Date().toISOString(),
      })
      .eq("id", assessmentId);
    setValidating(false);
    if (error) return toast.error("Não foi possível concluir", { description: error.message });
    toast.success("Evidências validadas e diagnóstico concluído.");
    refresh();
  }

  async function exportPdf() {
    if (!data) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("PROCATE — Diagnóstico de Regularidade", 14, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = [
      `Entidade: ${data.association.nome}`,
      `Município: ${data.association.municipio}`,
      `Consultor(a): ${data.assessment.consultant_name}`,
      `Visita: ${formatDate(data.assessment.data_visita)} às ${data.assessment.horario_visita.slice(0, 5)}`,
      `Classificação: ${STATUS[data.assessment.status]}`,
      `Índice de regularidade: ${Number(data.assessment.regularity_index).toLocaleString("pt-BR")}% (${data.assessment.regularity_compliant_count}/${data.assessment.regularity_total_count} critérios)`,
      `Evidências: ${data.assessment.evidence_validated ? "Validadas" : "Pendentes"}`,
      `Representante: ${data.assessment.representative_name ?? "Assinatura pendente"}`,
      "",
      "Critérios de regularidade",
      `Mandato em dia: ${data.assessment.mandato_em_dia ?? "Não informado"}`,
      `Ata registrada: ${data.assessment.ata_registrada_cartorio ?? "Não informado"}`,
      `Estatuto registrado: ${data.assessment.estatuto_registrado ?? "Não informado"}`,
      `Alvará: ${data.assessment.alvara_funcionamento ?? "Não informado"}`,
      `Licença ambiental: ${data.assessment.licenca_ambiental_status ?? "Não informado"}`,
      `Contabilidade regular: ${data.assessment.contabilidade_regular ?? "Não informado"}`,
      `Emite notas fiscais: ${data.assessment.emite_notas_fiscais ?? "Não informado"}`,
      `Controle de estoque: ${data.assessment.controle_estoque ?? "Não informado"}`,
      "",
      "Módulo social / cadastral",
      `Presidente: ${data.assessment.presidente_nome ?? "Não informado"} · ${data.assessment.presidente_telefone ?? "Sem telefone"}`,
      `Vice-presidente: ${data.assessment.vice_presidente_nome ?? "Não informado"} · ${data.assessment.vice_presidente_telefone ?? "Sem telefone"}`,
      `Associados informados: ${data.assessment.homens + data.assessment.mulheres}`,
      `Faixa etária: ${data.assessment.faixa_etaria_predominante ?? "Não informado"}`,
      `Escolaridade: ${data.assessment.escolaridade_predominante ?? "Não informado"}`,
      `Autodeclaração racial: ${data.assessment.autodeclaracao_racial ?? "Não informado"}`,
      `Dependentes: ${yes(data.assessment.criancas_adolescentes_dependentes)}`,
      `INSS: ${data.assessment.contribuicao_inss ?? "Não informado"}`,
      `CadÚnico: ${data.assessment.inscritos_cadunico ?? "Não informado"}`,
      `Uso de EPIs: ${data.assessment.uso_epis ?? "Não informado"}`,
      `Fornecimento de EPIs: ${data.assessment.cooperativa_fornece_epis ?? "Não informado"}`,
      `Problemas de saúde: ${data.assessment.problemas_saude ?? "Não informado"}`,
      `Jornada: ${data.assessment.media_horas_trabalhadas ?? "Não informado"}`,
      `Documentos necessários: ${data.assessment.documentos_necessarios ?? "Não informado"}`,
      `Beneficiários: ${data.assessment.quantidade_beneficiarios ?? 0}`,
      `Relatos de preconceito: ${yes(data.assessment.relatos_preconceito)}`,
      `Histórico de trabalho infantil: ${yes(data.assessment.historico_trabalho_infantil)}`,
      `Capacitações de interesse: ${data.assessment.capacitacoes_interesse ?? "Não informado"}`,
      `Tipo de coleta: ${data.assessment.tipo_coleta ?? "Não informado"}`,
      `Materiais: ${data.assessment.materiais_coletados.join(", ") || "Não informado"}`,
      `Triagem: ${yes(data.assessment.realiza_triagem)}`,
      `Volumetria: ${data.assessment.volumetria_toneladas_mes ?? 0} t/mês`,
      `Parcerias: ${data.assessment.possui_parcerias ?? "Não informado"}`,
      `Destino da venda: ${data.assessment.destino_venda ?? "Não informado"}`,
      `Galpão: ${data.assessment.tipo_galpao ?? "Não informado"}`,
      `Movimentos ou redes: ${data.assessment.movimento_qual ?? "Não informado"}`,
      `Consentimento de dados: ${yes(data.assessment.consentimento_dados)}`,
      `Declaração de veracidade: ${yes(data.assessment.declaracao_veracidade)}`,
      "",
      "Módulo jurídico",
      `Registro de atas: ${data.assessment.possui_registro_atas ?? "Não informado"}`,
      `Apoio institucional: ${yes(data.assessment.apoio_instituicoes)}`,
      `Instituições responsáveis: ${data.assessment.apoio_instituicoes_quais ?? "Não informado"}`,
      `Lista de cooperados atualizada: ${data.assessment.lista_cooperados_atualizada ?? "Não informado"}`,
      `Lista de não cooperados atualizada: ${data.assessment.lista_nao_cooperados_atualizada ?? "Não informado"}`,
      `Regras de entrada: ${data.assessment.regras_entrada ?? "Não informado"}`,
      `Regras de saída/exclusão: ${data.assessment.regras_saida_exclusao ?? "Não informado"}`,
      `Divisão de tarefas: ${data.assessment.divisao_tarefas ?? "Não informado"}`,
      `Coordenação/gerência: ${data.assessment.coordenacao_gerencia ?? "Não informado"}`,
      `Problemas atuais: ${data.assessment.problemas_juridicos_atuais ?? "Não informado"}`,
      `Melhorias necessárias: ${data.assessment.melhorias_juridicas_necessarias ?? "Não informado"}`,
      `Contrato: ${data.assessment.contrato_tipo ?? "Não informado"} — ${data.assessment.contrato_detalhes ?? "Sem detalhes"}`,
      `Pendências: ${data.assessment.pendencias_juridicas ?? "Não informado"}`,
      `Classificação jurídica: ${data.assessment.classificacao_juridica ?? "Não informado"}`,
      "",
      "Módulo contábil",
      `Estatuto: ${data.assessment.estatuto_registrado ?? "Não informado"}`,
      `Alvará: ${data.assessment.alvara_funcionamento ?? "Não informado"}`,
      `Ficha/livro de trabalho: ${yes(data.assessment.livro_ficha_trabalho)} — ${data.assessment.livro_ficha_trabalho_qual ?? "Sem detalhes"}`,
      `Livro de inspeção: ${yes(data.assessment.livro_inspecao_trabalho)}`,
      `Filiação sindical: ${yes(data.assessment.filiacao_sindical)} — ${data.assessment.filiacao_sindical_qual ?? "Sem detalhes"}`,
      `SST: ${data.assessment.contrato_sst ?? "Não informado"}`,
      `Responsável SST: ${data.assessment.contrato_sst_responsavel ?? "Não informado"}`,
      `Controle de frequência: ${data.assessment.controle_frequencia ?? "Não informado"} — ${data.assessment.controle_frequencia_tipo ?? "Sem tipo"}`,
      `Contador: ${data.assessment.contador_tipo ?? "Não informado"} · ${data.assessment.contador_nome ?? "Sem nome"} · ${data.assessment.contador_telefone ?? "Sem telefone"} · ${data.assessment.contador_email ?? "Sem e-mail"}`,
      `Critério de divisão dos resultados: ${data.assessment.divisao_resultados_criterio ?? "Não informado"}`,
      `Procedimento de divisão: ${data.assessment.divisao_resultados_procedimento ?? "Não informado"}`,
      `Pendências contábeis: ${data.assessment.pendencias_contabeis ?? "Não informado"}`,
      `Classificação contábil: ${data.assessment.classificacao_contabil ?? "Não informado"}`,
    ];
    let y = 30;
    lines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, 180);
      if (y + wrapped.length * 5 > 285) {
        doc.addPage();
        y = 15;
      }
      doc.text(wrapped, 14, y);
      y += wrapped.length * 5 + 1;
    });
    doc.save(`diagnostico-${safeName(data.association.nome)}-${data.assessment.data_visita}.pdf`);
  }

  async function exportExcel() {
    if (!data) return;
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Diagnóstico");
    ws.columns = [
      { header: "Campo", key: "field", width: 36 },
      { header: "Valor", key: "value", width: 70 },
    ];
    Object.entries(data.assessment).forEach(([field, value]) =>
      ws.addRow({
        field: field.replaceAll("_", " "),
        value:
          field === "representative_signature"
            ? value
              ? "Assinatura coletada"
              : "Pendente"
            : Array.isArray(value)
              ? value.join(", ")
              : (value ?? ""),
      }),
    );
    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF15803D" } };
    });
    ws.eachRow((row, index) => {
      row.eachCell((cell) => {
        cell.alignment = { vertical: "top", wrapText: true };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE5E7EB" } },
          bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
          left: { style: "thin", color: { argb: "FFE5E7EB" } },
          right: { style: "thin", color: { argb: "FFE5E7EB" } },
        };
        if (index > 1 && index % 2 === 0)
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
      });
    });
    const buffer = await wb.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `diagnostico-${safeName(data.association.nome)}.xlsx`,
    );
  }

  if (isLoading)
    return (
      <AdminShell>
        <p className="text-muted-foreground">Carregando diagnóstico...</p>
      </AdminShell>
    );
  if (!data)
    return (
      <AdminShell>
        <p>Diagnóstico não encontrado.</p>
      </AdminShell>
    );
  const { assessment: a, association } = data;
  const flowSteps = [
    ["Entrevista", true],
    ["Evidências", data.evidence.length >= 4],
    ["Processamento", Boolean(a.processed_at)],
    ["Índice", Boolean(a.processed_at)],
    ["Ação", a.evidence_validated],
  ] as const;
  return (
    <AdminShell>
      <BackButton label="Voltar à entidade" className="mb-5" />
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-7">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {a.processed_at && <Badge variant="outline">{STATUS[a.status]}</Badge>}
            <Badge variant={a.evidence_validated ? "secondary" : "outline"}>
              {a.evidence_validated ? "Fluxo concluído" : "Evidências pendentes"}
            </Badge>
          </div>
          <h1 className="mt-3 text-3xl font-bold">{association.nome}</h1>
          <p className="mt-1 text-muted-foreground">
            Visita de {formatDate(a.data_visita)} · {a.consultant_name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel}>
            <FileSpreadsheet className="size-4" /> Excel integral
          </Button>
          <Button onClick={exportPdf}>
            <Download className="size-4" /> Gerar PDF
          </Button>
        </div>
      </div>
      <section className="mb-7 grid gap-5 border-b border-border pb-7 lg:grid-cols-[1fr_280px]">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {flowSteps.map(([label, complete], index) => (
            <div key={label} className="relative rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground">0{index + 1}</span>
                <CheckCircle2
                  className={complete ? "size-4 text-success" : "size-4 text-muted-foreground/40"}
                />
              </div>
              <p className="text-sm font-medium">{label}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-primary p-5 text-primary-foreground">
          <p className="text-xs font-bold uppercase tracking-wider opacity-80">
            Índice de regularidade
          </p>
          {a.processed_at ? (
            <>
              <div className="mt-1 flex items-end gap-2">
                <strong className="text-4xl tabular-nums">
                  {Number(a.regularity_index).toLocaleString("pt-BR")}%
                </strong>
                <span className="pb-1 text-sm opacity-80">
                  {a.regularity_compliant_count}/{a.regularity_total_count} critérios
                </span>
              </div>
              <progress
                className="mt-3 h-2 w-full accent-current"
                max="100"
                value={Number(a.regularity_index)}
                aria-label="Índice de regularidade"
              />
            </>
          ) : (
            <p className="mt-3 font-semibold">Aguardando evidências e assinatura</p>
          )}
        </div>
      </section>
      <Tabs defaultValue="resumo">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="precos">Compradores e preços</TabsTrigger>
          <TabsTrigger value="equipamentos">Equipamentos</TabsTrigger>
          <TabsTrigger value="livros">Livros</TabsTrigger>
          <TabsTrigger value="evidencias">Evidências</TabsTrigger>
        </TabsList>
        <TabsContent value="resumo">
          {canEditFieldData ? (
            <EditableSummaryForm
              assessment={a}
              area={effectiveArea ?? "social"}
              showSocial={showSocial}
              showJuridico={showJuridico}
              showContabil={showContabil}
              onSubmit={saveSummary}
            />
          ) : (
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              {showSocial && (<Summary
                title="Social / Cadastral"
                rows={[
                  ["Presidente", a.presidente_nome],
                  ["Telefone", a.presidente_telefone],
                  ["Vice-presidente", a.vice_presidente_nome],
                  ["Homens", a.homens],
                  ["Mulheres", a.mulheres],
                  ["Faixa etária", a.faixa_etaria_predominante],
                  ["Escolaridade", a.escolaridade_predominante],
                  ["Dependentes", yes(a.criancas_adolescentes_dependentes)],
                  ["INSS", a.contribuicao_inss],
                  ["CadÚnico", a.inscritos_cadunico],
                  ["Uso de EPIs", a.uso_epis],
                  ["Fornecimento de EPIs", a.cooperativa_fornece_epis],
                  ["Jornada", a.media_horas_trabalhadas],
                  ["Beneficiários", a.quantidade_beneficiarios],
                  ["Preconceito", yes(a.relatos_preconceito)],
                  ["Trabalho infantil", yes(a.historico_trabalho_infantil)],
                  ["Capacitação", yes(a.interesse_capacitacao)],
                  ["Coleta", a.tipo_coleta],
                  ["Triagem", yes(a.realiza_triagem)],
                  ["Materiais", a.materiais_coletados.join(", ")],
                  ["Volumetria", `${a.volumetria_toneladas_mes ?? 0} t/mês`],
                  ["Parcerias", a.possui_parcerias],
                  ["Destino da venda", a.destino_venda],
                  ["Galpão", a.tipo_galpao],
                  ["Movimento/rede", a.movimento_qual],
                  ["Consentimento", yes(a.consentimento_dados)],
                ]}
              />)}
              {showJuridico && (<Summary
                title="Jurídico"
                rows={[
                  ["Mandato em dia", a.mandato_em_dia],
                  ["Ata registrada", a.ata_registrada_cartorio],
                  ["Registro de atas", a.possui_registro_atas],
                  ["Conselho fiscal", a.conselho_fiscal],
                  ["Assessoria jurídica", yes(a.assessoria_juridica)],
                  ["Apoio institucional", yes(a.apoio_instituicoes)],
                  ["Instituições", a.apoio_instituicoes_quais],
                  ["Lista de cooperados", a.lista_cooperados_atualizada],
                  ["Lista de não cooperados", a.lista_nao_cooperados_atualizada],
                  ["Regras de entrada", a.regras_entrada],
                  ["Regras de saída", a.regras_saida_exclusao],
                  ["Divisão de tarefas", a.divisao_tarefas],
                  ["Coordenação/gerência", a.coordenacao_gerencia],
                  ["Contrato remunerado", yes(a.contrato_remunerado)],
                  ["Tipo de contrato", a.contrato_tipo],
                  ["Pendências", a.pendencias_juridicas],
                  ["Classificação", a.classificacao_juridica],
                ]}
              />)}
              {showContabil && (<Summary
                title="Contábil"
                rows={[
                  ["Estatuto", a.estatuto_registrado],
                  ["Alvará", a.alvara_funcionamento],
                  ["Licença", a.licenca_ambiental_status],
                  ["Ficha/livro de trabalho", yes(a.livro_ficha_trabalho)],
                  ["Livro de inspeção", yes(a.livro_inspecao_trabalho)],
                  ["Sindicato", yes(a.filiacao_sindical)],
                  ["SST", a.contrato_sst],
                  ["Controle de frequência", a.controle_frequencia_tipo],
                  ["Tipo de contador", a.contador_tipo],
                  ["Nome do contador", a.contador_nome],
                  ["Telefone", a.contador_telefone],
                  ["E-mail", a.contador_email],
                  ["Contabilidade", a.contabilidade_regular],
                  ["Notas fiscais", a.emite_notas_fiscais],
                  ["Estoque", a.controle_estoque],
                  ["Divisão — critério", a.divisao_resultados_criterio],
                  ["Divisão — procedimento", a.divisao_resultados_procedimento],
                  ["Pendências", a.pendencias_contabeis],
                  ["Classificação", a.classificacao_contabil],
                ]}
              />)}
            </div>
          )}
        </TabsContent>
        <TabsContent value="precos">
          <Collection title="Compradores e preços por quilograma">
            {canEditFieldData && (
              <form
                onSubmit={(event) => addPrice.mutate(event)}
                className="grid gap-3 md:grid-cols-[1fr_1fr_160px_auto]"
              >
                <Input name="material" required maxLength={80} placeholder="Material" />
                <Input name="comprador" maxLength={150} placeholder="Comprador" />
                <Input
                  name="preco"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="R$/kg"
                />
                <Button type="submit">
                  <Plus className="size-4" /> Adicionar
                </Button>
              </form>
            )}
            <Rows
              rows={data.prices.map((x) => [
                x.material,
                x.comprador ?? "—",
                Number(x.preco_por_kg).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }),
              ])}
            />
          </Collection>
        </TabsContent>
        <TabsContent value="equipamentos">
          <Collection title="Veículos e máquinas">
            {canEditFieldData && (
              <form
                onSubmit={(event) => addEquipment.mutate(event)}
                className="grid gap-3 md:grid-cols-[1fr_180px_auto]"
              >
                <Input
                  name="tipo"
                  required
                  maxLength={100}
                  placeholder="Caminhão, prensa, balança..."
                />
                <Input name="quantidade" required type="number" min="0" defaultValue="1" />
                <Button type="submit">
                  <Plus className="size-4" /> Adicionar
                </Button>
              </form>
            )}
            <Rows rows={data.equipment.map((x) => [x.tipo, x.quantidade])} />
          </Collection>
        </TabsContent>
        <TabsContent value="livros">
          <Collection title="Situação dos livros obrigatórios">
            <div className="divide-y divide-border">
              {BOOKS.map((type) => {
                const current = data.books.find((book) => book.tipo === type);
                return (
                  <div key={type} className="space-y-3 py-4">
                    <span className="font-medium">{type}</span>
                    <div className="flex flex-wrap gap-5">
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={current?.implantado ?? false}
                          disabled={!canEditFieldData}
                          onCheckedChange={(v) => updateBook(type, { implantado: !!v })}
                        />{" "}
                        Implantado
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={current?.atualizado ?? false}
                          disabled={!canEditFieldData}
                          onCheckedChange={(v) => updateBook(type, { atualizado: !!v })}
                        />{" "}
                        Atualizado
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={current?.nao_sabe ?? false}
                          disabled={!canEditFieldData}
                          onCheckedChange={(v) =>
                            updateBook(type, { nao_sabe: !!v, nao_possui: false })
                          }
                        />{" "}
                        Não sabe
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={current?.nao_possui ?? false}
                          disabled={!canEditFieldData}
                          onCheckedChange={(v) =>
                            updateBook(type, { nao_possui: !!v, nao_sabe: false })
                          }
                        />{" "}
                        Não possui
                      </label>
                    </div>
                    <Input
                      defaultValue={current?.observacao ?? ""}
                      disabled={!canEditFieldData}
                      maxLength={500}
                      placeholder="Observação"
                      onBlur={(event) =>
                        updateBook(type, { observacao: event.currentTarget.value.trim() })
                      }
                    />
                  </div>
                );
              })}
            </div>
          </Collection>
        </TabsContent>
        <TabsContent value="evidencias">
          <Collection title="Galeria de evidências">
            <p className="mb-5 text-sm text-muted-foreground">
              Para concluir: frente, sala administrativa, reunião/entrevista, uma lista ou livro e
              assinatura do representante.
            </p>
            {canEditFieldData && (
              <div className="mb-5 flex flex-wrap gap-3">
                <Select value={module} onValueChange={(v) => setModule(v as typeof module)}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="juridico">Jurídico</SelectItem>
                    <SelectItem value="contabil">Contábil</SelectItem>
                  </SelectContent>
                </Select>
                {EVIDENCE.map((category) => (
                  <div key={category} className="flex items-center rounded-md border border-border">
                    <span className="px-3 text-xs">{category}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Tirar foto"
                      onClick={() => setCameraCategory(category)}
                    >
                      <Camera className="size-4" />
                    </Button>
                    <Label className="cursor-pointer p-2" title="Enviar arquivo">
                      <Upload className="size-4" />
                      <Input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        disabled={uploading}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) uploadEvidence(file, category);
                          event.target.value = "";
                        }}
                      />
                    </Label>
                  </div>
                ))}
              </div>
            )}
            {uploading && (
              <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Enviando evidência...
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.evidence.map((file) => (
                <Evidence key={file.id} file={file} />
              ))}
            </div>
            <div className="mt-8 border-t border-border pt-6">
              <h3 className="mb-1 font-semibold">Assinatura e validação</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                O representante confirma a veracidade da entrevista e das evidências anexadas.
              </p>
              {a.evidence_validated ? (
                <div className="rounded-lg border border-success/30 bg-success/10 p-5">
                  <div className="flex items-center gap-2 font-semibold text-success">
                    <ShieldCheck className="size-5" /> Evidências validadas
                  </div>
                  <p className="mt-1 text-sm">
                    {a.representative_name} ·{" "}
                    {a.signed_at
                      ? new Date(a.signed_at).toLocaleString("pt-BR")
                      : "assinatura registrada"}
                  </p>
                  {a.representative_signature && (
                    <img
                      src={a.representative_signature}
                      alt={`Assinatura de ${a.representative_name}`}
                      className="mt-4 h-24 max-w-full rounded border border-border bg-background object-contain p-2"
                    />
                  )}
                </div>
              ) : canEditFieldData ? (
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                  <div>
                    <Label htmlFor="representative-name">Nome do representante</Label>
                    <Input
                      id="representative-name"
                      value={representativeName}
                      onChange={(event) => setRepresentativeName(event.target.value)}
                      maxLength={150}
                      className="mt-2"
                      placeholder="Nome completo"
                    />
                  </div>
                  <SignaturePad value={signature} onChange={setSignature} />
                  <Button
                    type="button"
                    className="lg:col-span-2"
                    onClick={validateEvidence}
                    disabled={validating}
                  >
                    {validating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="size-4" />
                    )}{" "}
                    Validar evidências e concluir diagnóstico
                  </Button>
                </div>
              ) : (
                <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                  A coleta da assinatura e a validação das evidências são realizadas pelo consultor
                  responsável.
                </p>
              )}
            </div>
            {canEditFieldData && (
              <CameraCapture
                open={!!cameraCategory}
                onOpenChange={(open) => !open && setCameraCategory(null)}
                onCapture={(file) => cameraCategory && uploadEvidence(file, cameraCategory)}
              />
            )}
          </Collection>
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}

function Summary({ title, rows }: { title: string; rows: Array<[string, unknown]> }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-card">
      <h2 className="mb-4 font-bold text-primary">{title}</h2>
      <div className="space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <strong className="text-right">{String(value ?? "—")}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function EditableSummaryForm({
  assessment,
  area,
  showSocial,
  showJuridico,
  showContabil,
  onSubmit,
}: {
  assessment: any;
  area: string;
  showSocial: boolean;
  showJuridico: boolean;
  showContabil: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-5 rounded-xl border border-border bg-card p-5 shadow-card md:p-7">
      <div className="border-b border-border pb-4">
        <h2 className="text-xl font-bold">
          Editar formulário {area === "juridico" ? "Jurídico" : area === "contabil" ? "Contábil" : "Social"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Altere os campos e salve ao final.</p>
      </div>

      {showSocial && (
        <div className="grid gap-4 md:grid-cols-2">
          <EditField label="Presidente"><Input name="presidente_nome" defaultValue={assessment.presidente_nome ?? ""} /></EditField>
          <EditField label="Telefone"><Input name="presidente_telefone" defaultValue={assessment.presidente_telefone ?? ""} /></EditField>
          <EditField label="Vice-presidente"><Input name="vice_presidente_nome" defaultValue={assessment.vice_presidente_nome ?? ""} /></EditField>
          <EditField label="Homens"><Input name="homens" type="number" min="0" defaultValue={assessment.homens ?? 0} /></EditField>
          <EditField label="Mulheres"><Input name="mulheres" type="number" min="0" defaultValue={assessment.mulheres ?? 0} /></EditField>
          <EditField label="Faixa etária"><Input name="faixa_etaria_predominante" defaultValue={assessment.faixa_etaria_predominante ?? ""} /></EditField>
          <EditField label="Escolaridade"><Input name="escolaridade_predominante" defaultValue={assessment.escolaridade_predominante ?? ""} /></EditField>
          <EditField label="INSS"><Input name="contribuicao_inss" defaultValue={assessment.contribuicao_inss ?? ""} /></EditField>
          <EditField label="CadÚnico"><Input name="inscritos_cadunico" defaultValue={assessment.inscritos_cadunico ?? ""} /></EditField>
          <EditField label="Uso de EPIs"><Input name="uso_epis" defaultValue={assessment.uso_epis ?? ""} /></EditField>
          <EditField label="Fornecimento de EPIs"><Input name="cooperativa_fornece_epis" defaultValue={assessment.cooperativa_fornece_epis ?? ""} /></EditField>
          <EditField label="Jornada"><Input name="media_horas_trabalhadas" defaultValue={assessment.media_horas_trabalhadas ?? ""} /></EditField>
          <EditField label="Beneficiários"><Input name="quantidade_beneficiarios" type="number" min="0" defaultValue={assessment.quantidade_beneficiarios ?? 0} /></EditField>
          <EditField label="Coleta"><Input name="tipo_coleta" defaultValue={assessment.tipo_coleta ?? ""} /></EditField>
          <EditField label="Volumetria"><Input name="volumetria_toneladas_mes" type="number" min="0" step="0.01" defaultValue={assessment.volumetria_toneladas_mes ?? 0} /></EditField>
          <EditField label="Parcerias"><Input name="possui_parcerias" defaultValue={assessment.possui_parcerias ?? ""} /></EditField>
          <EditField label="Destino da venda"><Input name="destino_venda" defaultValue={assessment.destino_venda ?? ""} /></EditField>
          <EditField label="Galpão"><Input name="tipo_galpao" defaultValue={assessment.tipo_galpao ?? ""} /></EditField>
          <EditField label="Materiais" wide><Input name="materiais_coletados" defaultValue={(assessment.materiais_coletados ?? []).join(", ")} /></EditField>
          <EditField label="Movimento/rede" wide><Textarea name="movimento_qual" defaultValue={assessment.movimento_qual ?? ""} /></EditField>
          <CheckEdit name="criancas_adolescentes_dependentes" label="Dependentes" checked={assessment.criancas_adolescentes_dependentes} />
          <CheckEdit name="relatos_preconceito" label="Preconceito" checked={assessment.relatos_preconceito} />
          <CheckEdit name="historico_trabalho_infantil" label="Trabalho infantil" checked={assessment.historico_trabalho_infantil} />
          <CheckEdit name="interesse_capacitacao" label="Capacitação" checked={assessment.interesse_capacitacao} />
          <CheckEdit name="realiza_triagem" label="Triagem" checked={assessment.realiza_triagem} />
        </div>
      )}

      {showJuridico && (
        <div className="grid gap-4 md:grid-cols-2">
          <EditField label="Mandato em dia"><Input name="mandato_em_dia" defaultValue={assessment.mandato_em_dia ?? ""} /></EditField>
          <EditField label="Ata registrada"><Input name="ata_registrada_cartorio" defaultValue={assessment.ata_registrada_cartorio ?? ""} /></EditField>
          <EditField label="Registro de atas"><Input name="possui_registro_atas" defaultValue={assessment.possui_registro_atas ?? ""} /></EditField>
          <EditField label="Conselho fiscal"><Input name="conselho_fiscal" defaultValue={assessment.conselho_fiscal ?? ""} /></EditField>
          <EditField label="Instituições" wide><Textarea name="apoio_instituicoes_quais" defaultValue={assessment.apoio_instituicoes_quais ?? ""} /></EditField>
          <EditField label="Lista de cooperados"><Input name="lista_cooperados_atualizada" defaultValue={assessment.lista_cooperados_atualizada ?? ""} /></EditField>
          <EditField label="Lista de não cooperados"><Input name="lista_nao_cooperados_atualizada" defaultValue={assessment.lista_nao_cooperados_atualizada ?? ""} /></EditField>
          <EditField label="Regras de entrada"><Input name="regras_entrada" defaultValue={assessment.regras_entrada ?? ""} /></EditField>
          <EditField label="Regras de saída"><Input name="regras_saida_exclusao" defaultValue={assessment.regras_saida_exclusao ?? ""} /></EditField>
          <EditField label="Divisão de tarefas"><Input name="divisao_tarefas" defaultValue={assessment.divisao_tarefas ?? ""} /></EditField>
          <EditField label="Coordenação/gerência"><Input name="coordenacao_gerencia" defaultValue={assessment.coordenacao_gerencia ?? ""} /></EditField>
          <EditField label="Tipo de contrato"><Input name="contrato_tipo" defaultValue={assessment.contrato_tipo ?? ""} /></EditField>
          <EditField label="Pendências" wide><Textarea name="pendencias_juridicas" defaultValue={assessment.pendencias_juridicas ?? ""} /></EditField>
          <EditField label="Classificação"><Input name="classificacao_juridica" defaultValue={assessment.classificacao_juridica ?? ""} /></EditField>
          <CheckEdit name="assessoria_juridica" label="Assessoria jurídica" checked={assessment.assessoria_juridica} />
          <CheckEdit name="apoio_instituicoes" label="Apoio institucional" checked={assessment.apoio_instituicoes} />
          <CheckEdit name="contrato_remunerado" label="Contrato remunerado" checked={assessment.contrato_remunerado} />
        </div>
      )}

      {showContabil && (
        <div className="grid gap-4 md:grid-cols-2">
          <EditField label="Estatuto"><Input name="estatuto_registrado" defaultValue={assessment.estatuto_registrado ?? ""} /></EditField>
          <EditField label="Alvará"><Input name="alvara_funcionamento" defaultValue={assessment.alvara_funcionamento ?? ""} /></EditField>
          <EditField label="Licença"><Input name="licenca_ambiental_status" defaultValue={assessment.licenca_ambiental_status ?? ""} /></EditField>
          <EditField label="SST"><Input name="contrato_sst" defaultValue={assessment.contrato_sst ?? ""} /></EditField>
          <EditField label="Controle de frequência"><Input name="controle_frequencia_tipo" defaultValue={assessment.controle_frequencia_tipo ?? ""} /></EditField>
          <EditField label="Tipo de contador"><Input name="contador_tipo" defaultValue={assessment.contador_tipo ?? ""} /></EditField>
          <EditField label="Nome do contador"><Input name="contador_nome" defaultValue={assessment.contador_nome ?? ""} /></EditField>
          <EditField label="Telefone"><Input name="contador_telefone" defaultValue={assessment.contador_telefone ?? ""} /></EditField>
          <EditField label="E-mail"><Input name="contador_email" defaultValue={assessment.contador_email ?? ""} /></EditField>
          <EditField label="Contabilidade"><Input name="contabilidade_regular" defaultValue={assessment.contabilidade_regular ?? ""} /></EditField>
          <EditField label="Notas fiscais"><Input name="emite_notas_fiscais" defaultValue={assessment.emite_notas_fiscais ?? ""} /></EditField>
          <EditField label="Estoque"><Input name="controle_estoque" defaultValue={assessment.controle_estoque ?? ""} /></EditField>
          <EditField label="Divisão — critério" wide><Textarea name="divisao_resultados_criterio" defaultValue={assessment.divisao_resultados_criterio ?? ""} /></EditField>
          <EditField label="Divisão — procedimento" wide><Textarea name="divisao_resultados_procedimento" defaultValue={assessment.divisao_resultados_procedimento ?? ""} /></EditField>
          <EditField label="Pendências" wide><Textarea name="pendencias_contabeis" defaultValue={assessment.pendencias_contabeis ?? ""} /></EditField>
          <EditField label="Classificação"><Input name="classificacao_contabil" defaultValue={assessment.classificacao_contabil ?? ""} /></EditField>
          <CheckEdit name="livro_ficha_trabalho" label="Ficha/livro de trabalho" checked={assessment.livro_ficha_trabalho} />
          <CheckEdit name="livro_inspecao_trabalho" label="Livro de inspeção" checked={assessment.livro_inspecao_trabalho} />
          <CheckEdit name="filiacao_sindical" label="Sindicato" checked={assessment.filiacao_sindical} />
        </div>
      )}

      <div className="flex justify-end border-t border-border pt-4">
        <Button type="submit">Salvar</Button>
      </div>
    </form>
  );
}

function EditField({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}

function CheckEdit({ name, label, checked }: { name: string; label: string; checked: boolean | null }) {
  return (
    <label className="flex min-h-10 items-center gap-2 rounded-md border border-border px-3 text-sm">
      <Checkbox name={name} defaultChecked={!!checked} /> {label}
    </label>
  );
}

function buildAssessmentUpdatePayload(form: FormData, area: string) {
  const base =
    area === "juridico"
      ? {
          mandato_em_dia: formText(form, "mandato_em_dia"),
          ata_registrada_cartorio: formText(form, "ata_registrada_cartorio"),
          possui_registro_atas: formText(form, "possui_registro_atas"),
          conselho_fiscal: formText(form, "conselho_fiscal"),
          assessoria_juridica: formBool(form, "assessoria_juridica"),
          apoio_instituicoes: formBool(form, "apoio_instituicoes"),
          apoio_instituicoes_quais: formText(form, "apoio_instituicoes_quais"),
          lista_cooperados_atualizada: formText(form, "lista_cooperados_atualizada"),
          lista_nao_cooperados_atualizada: formText(form, "lista_nao_cooperados_atualizada"),
          regras_entrada: formText(form, "regras_entrada"),
          regras_saida_exclusao: formText(form, "regras_saida_exclusao"),
          divisao_tarefas: formText(form, "divisao_tarefas"),
          coordenacao_gerencia: formText(form, "coordenacao_gerencia"),
          contrato_remunerado: formBool(form, "contrato_remunerado"),
          contrato_tipo: formText(form, "contrato_tipo"),
          pendencias_juridicas: formText(form, "pendencias_juridicas"),
          classificacao_juridica: formText(form, "classificacao_juridica"),
        }
      : area === "contabil"
        ? {
            estatuto_registrado: formText(form, "estatuto_registrado"),
            alvara_funcionamento: formText(form, "alvara_funcionamento"),
            licenca_ambiental_status: formText(form, "licenca_ambiental_status"),
            livro_ficha_trabalho: formBool(form, "livro_ficha_trabalho"),
            livro_inspecao_trabalho: formBool(form, "livro_inspecao_trabalho"),
            filiacao_sindical: formBool(form, "filiacao_sindical"),
            contrato_sst: formText(form, "contrato_sst"),
            controle_frequencia_tipo: formText(form, "controle_frequencia_tipo"),
            contador_tipo: formText(form, "contador_tipo"),
            contador_nome: formText(form, "contador_nome"),
            contador_telefone: formText(form, "contador_telefone"),
            contador_email: formText(form, "contador_email"),
            contabilidade_regular: formText(form, "contabilidade_regular"),
            emite_notas_fiscais: formText(form, "emite_notas_fiscais"),
            controle_estoque: formText(form, "controle_estoque"),
            divisao_resultados_criterio: formText(form, "divisao_resultados_criterio"),
            divisao_resultados_procedimento: formText(form, "divisao_resultados_procedimento"),
            pendencias_contabeis: formText(form, "pendencias_contabeis"),
            classificacao_contabil: formText(form, "classificacao_contabil"),
          }
        : {
            presidente_nome: formText(form, "presidente_nome"),
            presidente_telefone: formText(form, "presidente_telefone"),
            vice_presidente_nome: formText(form, "vice_presidente_nome"),
            homens: formNumber(form, "homens") ?? 0,
            mulheres: formNumber(form, "mulheres") ?? 0,
            faixa_etaria_predominante: formText(form, "faixa_etaria_predominante"),
            escolaridade_predominante: formText(form, "escolaridade_predominante"),
            criancas_adolescentes_dependentes: formBool(form, "criancas_adolescentes_dependentes"),
            contribuicao_inss: formText(form, "contribuicao_inss"),
            inscritos_cadunico: formText(form, "inscritos_cadunico"),
            uso_epis: formText(form, "uso_epis"),
            cooperativa_fornece_epis: formText(form, "cooperativa_fornece_epis"),
            media_horas_trabalhadas: formText(form, "media_horas_trabalhadas"),
            quantidade_beneficiarios: formNumber(form, "quantidade_beneficiarios"),
            relatos_preconceito: formBool(form, "relatos_preconceito"),
            historico_trabalho_infantil: formBool(form, "historico_trabalho_infantil"),
            interesse_capacitacao: formBool(form, "interesse_capacitacao"),
            tipo_coleta: formText(form, "tipo_coleta"),
            realiza_triagem: formBool(form, "realiza_triagem"),
            materiais_coletados: String(form.get("materiais_coletados") ?? "")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
            volumetria_toneladas_mes: formNumber(form, "volumetria_toneladas_mes"),
            possui_parcerias: formText(form, "possui_parcerias"),
            destino_venda: formText(form, "destino_venda"),
            tipo_galpao: formText(form, "tipo_galpao"),
            movimento_qual: formText(form, "movimento_qual"),
          };

  return base;
}

function formText(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim() || null;
}

function formNumber(form: FormData, name: string) {
  const value = String(form.get(name) ?? "").trim();
  return value === "" ? null : Number(value);
}

function formBool(form: FormData, name: string) {
  return form.has(name);
}

function Collection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 rounded-xl border border-border bg-card p-5 shadow-card md:p-7">
      <h2 className="mb-5 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}
function Rows({ rows }: { rows: Array<Array<unknown>> }) {
  return (
    <div className="mt-5 divide-y divide-border border-y border-border">
      {rows.length ? (
        rows.map((row, index) => (
          <div key={index} className="grid grid-flow-col auto-cols-fr gap-3 py-3 text-sm">
            {row.map((value, i) => (
              <span key={i}>{String(value)}</span>
            ))}
          </div>
        ))
      ) : (
        <p className="py-8 text-center text-muted-foreground">Nenhum item cadastrado.</p>
      )}
    </div>
  );
}
function Evidence({
  file,
}: {
  file: {
    id: string;
    category: string;
    module: string;
    storage_path: string;
    mime_type: string | null;
  };
}) {
  const { data } = useQuery({
    queryKey: ["evidence-url", file.storage_path],
    queryFn: async () => {
      const result = await supabase.storage
        .from("catadores-docs")
        .createSignedUrl(file.storage_path, 3600);
      if (result.error) throw result.error;
      return result.data.signedUrl;
    },
  });
  return (
    <a
      href={data}
      target="_blank"
      rel="noreferrer"
      className="overflow-hidden rounded-lg border border-border"
    >
      <div className="flex aspect-video items-center justify-center bg-muted">
        {data && file.mime_type?.startsWith("image/") ? (
          <img src={data} alt={file.category} className="size-full object-cover" />
        ) : (
          <span className="text-sm">Abrir arquivo</span>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-medium">{file.category}</p>
        <p className="text-xs capitalize text-muted-foreground">{file.module}</p>
      </div>
    </a>
  );
}
function notify(error: Error) {
  toast.error("Não foi possível salvar", { description: error.message });
}
function yes(value: boolean | null) {
  return value ? "Sim" : "Não";
}
function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}
function safeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}
function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
