import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Calculator, Loader2, Scale, Users } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
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
import { MATERIAIS_OPTIONS } from "@/lib/catador-constants";

export const Route = createFileRoute("/_authenticated/admin/associacoes/$id/diagnostico/novo")({
  beforeLoad: ({ context }) => {
    if (!context.isConsultant && !context.isAdmin && !context.isCoordenador) {
      throw redirect({ to: "/admin/associacoes" });
    }
  },
  validateSearch: (search: Record<string, unknown>) => ({
    modulo:
      search.modulo === "juridico" ||
      search.modulo === "contabil" ||
      search.modulo === "infraestrutura"
        ? (search.modulo as "juridico" | "contabil" | "infraestrutura")
        : "social",
  }),
  head: () => ({ meta: [{ title: "Novo diagnóstico — PROCATE" }] }),
  component: NewAssessment,
});

function NewAssessment() {
  const { id } = Route.useParams();
  const { modulo } = Route.useSearch();
  const { area } = Route.useRouteContext() as any;
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const forcedModule =
    area === "juridico" || area === "contabil" || area === "social"
      ? (area as "social" | "juridico" | "contabil" | "infraestrutura")
      : area === "infraestrutura"
        ? ("infraestrutura" as const)
        : (modulo as "social" | "juridico" | "contabil" | "infraestrutura" | undefined);
  const [activeModule, setActiveModule] = useState<
    "social" | "juridico" | "contabil" | "infraestrutura"
  >(forcedModule ?? "social");
  const isInfrastructure = activeModule === "infraestrutura";
  const [materials, setMaterials] = useState<string[]>([]);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const defaultDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const defaultTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const { data: consultantProfile } = useQuery({
    queryKey: ["consultant-profile-me"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      return data;
    },
  });
  const { data: association, isLoading: loadingAssociation } = useQuery({
    queryKey: ["association-social-form", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("associations").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const { data: entidades } = useQuery({
    queryKey: ["entidades-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("associations")
        .select("id, nome, municipio")
        .order("nome", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  const onEntityChange = (newId: string) => {
    if (newId && newId !== id) {
      navigate({
        to: "/admin/associacoes/$id/diagnostico/novo",
        params: { id: newId },
        search: { modulo },
      });
    }
  };
  const moduleMeta: Record<typeof activeModule, { title: string; description: string }> = {
    social: {
      title: "Cadastro Social",
      description:
        "Perfil dos associados, saúde, renda, benefícios, cota e estrutura social.",
    },
    juridico: {
      title: "Cadastro Jurídico",
      description: "Diretoria, atas, contratos, processos, regras internas e regulação.",
    },
    contabil: {
      title: "Cadastro Contábil",
      description:
        "Documentos, contador, livros, controles, balanços e pendências contábeis.",
    },
    infraestrutura: {
      title: "Cadastro de Infraestrutura",
      description:
        "Sede, equipamentos, veículos, EPIs e condições operacionais do galpão.",
    },
  };
  const currentMeta = moduleMeta[activeModule];


  function choice(name: string, fallback = "") {
    return choices[name] ?? fallback;
  }
  function setChoice(name: string, value: string) {
    setChoices((current) => ({ ...current, [name]: value }));
  }
  function bool(name: string) {
    return choice(name) === "Sim";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return toast.error("Sua sessão expirou.");

    if (isInfrastructure) {
      setSaving(true);
      const payload: Record<string, unknown> = {};
      for (const [k, v] of values.entries()) {
        if (k.startsWith("infra_")) payload[k.slice(6)] = v;
      }
      for (const [k, v] of Object.entries(choices)) {
        if (k.startsWith("infra_")) payload[k.slice(6)] = v;
      }
      const { error: infraError } = await supabase.from("infrastructure_assessments").insert({
        association_id: id,
        consultant_id: auth.user.id,
        consultant_name: String(values.get("consultant_name") ?? "").trim(),
        data_visita: String(values.get("data_visita") ?? ""),
        horario_visita: String(values.get("horario_visita") ?? ""),
        entrevistador: text(values, "infra_entrevistador"),
        organizacao_nome: text(values, "infra_organizacao_nome"),
        cidade: text(values, "infra_cidade"),
        endereco_sede: text(values, "infra_endereco_sede"),
        regime_ocupacao: choice("infra_regime_ocupacao", ""),
        pessoas_total: numberOrNull(values, "infra_pessoas_total"),
        pessoas_homens: numberOrNull(values, "infra_pessoas_homens"),
        pessoas_mulheres: numberOrNull(values, "infra_pessoas_mulheres"),
        pessoas_especifique: text(values, "infra_pessoas_especifique"),
        payload: payload as any,
      });
      setSaving(false);
      if (infraError) return toast.error("Erro ao salvar diagnóstico de infraestrutura", { description: infraError.message });
      toast.success("Diagnóstico de infraestrutura salvo.");
      navigate({ to: "/admin/associacoes/$id", params: { id } });
      return;
    }

    if (!values.has("consentimento_dados") || !values.has("declaracao_veracidade")) {
      return toast.error("Confirme o consentimento e a veracidade das informações.");
    }
    setSaving(true);
    const { data: assessment, error } = await supabase
      .from("association_assessments")
      .insert({
        association_id: id,
        consultant_id: auth.user.id,
        consultant_name: String(values.get("consultant_name") ?? "").trim(),
        data_visita: String(values.get("data_visita") ?? ""),
        horario_visita: String(values.get("horario_visita") ?? ""),
        homens: Number(values.get("homens") ?? 0),
        mulheres: Number(values.get("mulheres") ?? 0),
        possui_pessoas_trans: bool("possui_pessoas_trans"),
        pessoas_trans_detalhes: text(values, "pessoas_trans_detalhes"),
        autodeclaracao_racial: text(values, "autodeclaracao_racial"),
        faixa_etaria_predominante: choice("faixa_etaria_predominante", "Até 25 anos"),
        escolaridade_predominante: choice("escolaridade_predominante", "Não alfabetizado"),
        media_moradores_casa: numberOrNull(values, "media_moradores_casa"),
        presidente_nome: text(values, "presidente_nome"),
        presidente_telefone: text(values, "presidente_telefone"),
        presidente_email: text(values, "presidente_email"),
        vice_presidente_nome: text(values, "vice_presidente_nome"),
        vice_presidente_telefone: text(values, "vice_presidente_telefone"),
        vice_presidente_email: text(values, "vice_presidente_email"),
        criancas_adolescentes_dependentes: bool("criancas_adolescentes_dependentes"),
        contribuicao_inss: choice("contribuicao_inss"),
        inscritos_cadunico: choice("inscritos_cadunico"),
        uso_epis: choice("uso_epis", "Não"),
        cooperativa_fornece_epis: choice("cooperativa_fornece_epis", "Não"),
        acidentes_ultimo_ano: bool("acidentes_ultimo_ano"),
        acidentes_tipo: text(values, "acidentes_tipo"),
        problemas_saude: text(values, "problemas_saude"),
        media_horas_trabalhadas: choice("media_horas_trabalhadas", "8h"),
        aumento_trabalho_festividades: bool("aumento_trabalho_festividades"),
        necessita_documentos: bool("necessita_documentos"),
        documentos_necessarios: text(values, "documentos_necessarios"),
        recebe_beneficios: bool("recebe_beneficios"),
        quantidade_beneficiarios: numberOrNull(values, "quantidade_beneficiarios"),
        reconhecimento_sociedade: choice("reconhecimento_sociedade"),
        relatos_preconceito: bool("relatos_preconceito"),
        preconceito_detalhes: text(values, "preconceito_detalhes"),
        motivos_entrada_reciclagem: text(values, "motivos_entrada_reciclagem"),
        historico_trabalho_infantil: bool("historico_trabalho_infantil"),
        quantidade_trabalho_infantil: numberOrNull(values, "quantidade_trabalho_infantil"),
        interesse_capacitacao: bool("interesse_capacitacao"),
        capacitacoes_interesse: text(values, "capacitacoes_interesse"),
        tipo_coleta: choice("tipo_coleta", "Mista"),
        materiais_coletados: materials,
        realiza_triagem: bool("realiza_triagem"),
        volumetria_toneladas_mes: numberOrNull(values, "volumetria_toneladas_mes"),
        renda_media_mensal: numberOrNull(values, "renda_media_mensal"),
        possui_parcerias: choice("possui_parcerias"),
        parcerias_detalhes: text(values, "parcerias_detalhes"),
        destino_venda: choice("destino_venda", "Indústria"),
        tipo_galpao: choice("tipo_galpao", "Não possui"),
        possui_veiculos_maquinas: bool("possui_veiculos_maquinas"),
        equipamentos_outros: text(values, "equipamentos_outros"),
        recebeu_apoio_programas: bool("recebeu_apoio_programas"),
        participa_movimentos: bool("participa_movimentos"),
        movimento_qual: text(values, "movimento_qual"),
        diretoria_conselho: bool("diretoria_conselho"),
        diretoria_nomes: text(values, "diretoria_nomes"),
        mandato_em_dia: choice("mandato_em_dia"),
        conselho_fiscal: choice("conselho_fiscal"),
        cargos_por_eleicao: choice("cargos_por_eleicao"),
        data_ultima_eleicao: text(values, "data_ultima_eleicao"),
        ata_registrada_cartorio: choice("ata_registrada_cartorio"),
        realiza_assembleias: choice("realiza_assembleias"),
        frequencia_assembleias: text(values, "frequencia_assembleias"),
        possui_registro_atas: choice("possui_registro_atas"),
        assessoria_juridica: bool("assessoria_juridica"),
        apoio_instituicoes: bool("apoio_instituicoes"),
        apoio_instituicoes_quais: text(values, "apoio_instituicoes_quais"),
        processos_judiciais: bool("processos_judiciais"),
        processos_judiciais_quais: text(values, "processos_judiciais_quais"),
        todos_sao_cooperados: bool("todos_sao_cooperados"),
        lista_cooperados_atualizada: choice("lista_cooperados_atualizada"),
        lista_nao_cooperados_atualizada: choice("lista_nao_cooperados_atualizada"),
        regras_entrada: choice("regras_entrada"),
        regras_saida_exclusao: choice("regras_saida_exclusao"),
        fluxo_trabalho_diario: text(values, "fluxo_trabalho_diario"),
        divisao_tarefas: choice("divisao_tarefas"),
        coordenacao_gerencia: choice("coordenacao_gerencia"),
        controle_jornada: bool("controle_jornada"),
        problemas_juridicos_atuais: text(values, "problemas_juridicos_atuais"),
        melhorias_juridicas_necessarias: text(values, "melhorias_juridicas_necessarias"),
        contrato_remunerado: bool("contrato_remunerado"),
        contrato_tipo: choice("contrato_tipo", "Não se aplica"),
        contrato_detalhes: text(values, "contrato_detalhes"),
        contrato_instituicoes_publicas: text(values, "contrato_instituicoes_publicas"),
        contrato_instituicoes_privadas: text(values, "contrato_instituicoes_privadas"),
        participa_coleta_seletiva_municipal: bool("participa_coleta_seletiva_municipal"),
        apoio_poder_publico: choice("apoio_poder_publico"),
        pendencias_juridicas: text(values, "pendencias_juridicas"),
        orientacao_regularizacao_aceita: values.has("orientacao_regularizacao_aceita"),
        orientacao_documentos_aceita: values.has("orientacao_documentos_aceita"),
        classificacao_juridica: choice("classificacao_juridica", "Irregular"),
        estatuto_registrado: choice("estatuto_registrado"),
        alvara_funcionamento: choice("alvara_funcionamento"),
        licenca_ambiental_status: choice("licenca_ambiental_status", "Nenhum"),
        avcb: choice("avcb"),
        extintores: choice("extintores"),
        registro_ocb: choice("registro_ocb"),
        empregados_registrados: Number(values.get("empregados_registrados") ?? 0),
        empregados_sem_registro: Number(values.get("empregados_sem_registro") ?? 0),
        autonomos: Number(values.get("autonomos") ?? 0),
        livro_ficha_trabalho: bool("livro_ficha_trabalho"),
        livro_ficha_trabalho_qual: text(values, "livro_ficha_trabalho_qual"),
        livro_inspecao_trabalho: bool("livro_inspecao_trabalho"),
        filiacao_sindical: bool("filiacao_sindical"),
        filiacao_sindical_qual: text(values, "filiacao_sindical_qual"),
        contrato_sst: choice("contrato_sst"),
        contrato_sst_responsavel: text(values, "contrato_sst_responsavel"),
        controle_frequencia: choice("controle_frequencia"),
        controle_frequencia_tipo: choice("controle_frequencia_tipo", "Não se aplica"),
        possui_contador: choice("possui_contador"),
        contador_tipo: choice("contador_tipo", "Não tem contador"),
        contador_nome: text(values, "contador_nome"),
        contador_telefone: text(values, "contador_telefone"),
        contador_email: text(values, "contador_email"),
        contabilidade_regular: choice("contabilidade_regular"),
        possui_conta_bancaria: choice("possui_conta_bancaria"),
        possui_maquineta: choice("possui_maquineta"),
        emite_notas_fiscais: choice("emite_notas_fiscais"),
        controle_estoque: choice("controle_estoque"),
        sistema_financeiro: choice("sistema_financeiro"),
        sistema_financeiro_qual: text(values, "sistema_financeiro_qual"),
        ano_ultimo_balanco: numberOrNull(values, "ano_ultimo_balanco"),
        divisao_resultados_criterio: text(values, "divisao_resultados_criterio"),
        divisao_resultados_procedimento: text(values, "divisao_resultados_procedimento"),
        pagamento_fixo_mensal: bool("pagamento_fixo_mensal"),
        renda_media_cooperado: numberOrNull(values, "renda_media_cooperado"),
        pendencias_contabeis: text(values, "pendencias_contabeis"),
        classificacao_contabil: choice("classificacao_contabil", "Irregular"),
        evidencia_frente_confirmada: values.has("evidencia_frente_confirmada"),
        evidencia_administrativo_confirmada: values.has("evidencia_administrativo_confirmada"),
        evidencia_reuniao_confirmada: values.has("evidencia_reuniao_confirmada"),
        evidencia_entrevista_confirmada: values.has("evidencia_entrevista_confirmada"),
        evidencia_livro_trabalho_confirmada: values.has("evidencia_livro_trabalho_confirmada"),
        consentimento_dados: true,
        declaracao_veracidade: true,
      })
      .select("id")
      .single();
    if (error) {
      setSaving(false);
      return toast.error("Erro ao salvar diagnóstico", { description: error.message });
    }
    if (activeModule === "social" && assessment) {
      const associationUpdate = supabase
        .from("associations")
        .update({
          nome: String(values.get("association_nome") ?? "").trim(),
          cnpj: text(values, "association_cnpj"),
          municipio: String(values.get("association_municipio") ?? "").trim(),
          tipo: String(values.get("association_tipo") ?? "associacao"),
          ativa: String(values.get("association_situacao") ?? "ativa") === "ativa",
          inscricao_municipal: text(values, "association_inscricao_municipal"),
          inscricao_estadual: text(values, "association_inscricao_estadual"),
          endereco_sede: text(values, "association_endereco_sede") ?? "",
          telefone: text(values, "association_telefone"),
          email: text(values, "association_email"),
          numero_associados_inicial: Number(values.get("association_numero_inicial") ?? 0),
          numero_associados_atual: Number(values.get("association_numero_atual") ?? 0),
        })
        .eq("id", id);
      const priceRows = SOCIAL_MATERIALS.flatMap((material) => {
        const comprador = text(values, `comprador_${material.key}`);
        const preco = numberOrNull(values, `preco_${material.key}`);
        return comprador || preco !== null
          ? [
              {
                assessment_id: assessment.id,
                material: material.label,
                comprador,
                preco_por_kg: preco ?? undefined,
              },
            ]
          : [];
      });
      const equipmentRows = SOCIAL_EQUIPMENT.flatMap((equipment) => {
        const quantidade = numberOrNull(values, `equipamento_${equipment.key}`);
        return quantidade !== null && quantidade > 0
          ? [{ assessment_id: assessment.id, tipo: equipment.label, quantidade }]
          : [];
      });
      const [associationResult, pricesResult, equipmentResult] = await Promise.all([
        associationUpdate,
        priceRows.length
          ? supabase.from("material_prices").insert(priceRows)
          : Promise.resolve({ error: null }),
        equipmentRows.length
          ? supabase.from("association_equipment").insert(equipmentRows)
          : Promise.resolve({ error: null }),
      ]);
      if (associationResult.error || pricesResult.error || equipmentResult.error) {
        setSaving(false);
        return toast.error(
          "Diagnóstico salvo, mas houve erro nos detalhes de materiais ou equipamentos.",
        );
      }
    }
    if (activeModule === "juridico") {
      const { error: associationError } = await supabase
        .from("associations")
        .update({
          nome: String(values.get("legal_association_nome") ?? "").trim(),
          cnpj: text(values, "legal_association_cnpj"),
          municipio: String(values.get("legal_association_municipio") ?? "").trim(),
        })
        .eq("id", id);
      if (associationError) {
        setSaving(false);
        return toast.error("Diagnóstico salvo, mas não foi possível atualizar a entidade.");
      }
    }
    if (activeModule === "contabil" && assessment) {
      const { error: associationError } = await supabase
        .from("associations")
        .update({
          nome: String(values.get("accounting_association_nome") ?? "").trim(),
          cnpj: text(values, "accounting_association_cnpj"),
          municipio: String(values.get("accounting_association_municipio") ?? "").trim(),
        })
        .eq("id", id);
      const bookRows = ACCOUNTING_BOOKS.map((book) => ({
        assessment_id: assessment.id,
        tipo: book.label,
        implantado: choice(`livro_${book.key}_implantado`) === "Sim",
        atualizado: choice(`livro_${book.key}_atualizado`) === "Sim",
        nao_possui: choice(`livro_${book.key}_implantado`) === "Não",
        nao_sabe: choice(`livro_${book.key}_implantado`) === "Não sabe informar",
        observacao: text(values, `livro_${book.key}_observacao`),
      }));
      const { error: booksError } = await supabase.from("accounting_books").insert(bookRows);
      if (associationError || booksError) {
        setSaving(false);
        return toast.error(
          "Diagnóstico salvo, mas houve erro nos dados da entidade ou dos livros.",
        );
      }
    }
    setSaving(false);
    toast.success("Diagnóstico salvo e classificação calculada.");
    navigate({ to: "/admin/associacoes/$id", params: { id } });
  }

  return (
    <AdminShell>
      <Link to="/admin/associacoes/$id" params={{ id }}>
        <Button variant="ghost" size="sm" className="mb-5">
          <ArrowLeft className="size-4" /> Voltar à entidade
        </Button>
      </Link>
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
          3 tipos de cadastro de campo
        </p>
        <h1 className="mt-1 text-3xl font-bold">{currentMeta.title}</h1>
        <p className="mt-2 text-muted-foreground">
          Selecione o tipo de cadastro e preencha o formulário correspondente ao documento de campo.
        </p>
        <form onSubmit={submit} className="mt-7">
          <div className="mb-6 grid gap-4 rounded-xl border border-border bg-card p-5 shadow-card md:grid-cols-4">
            <Field label="Nome do consultor">
              <Input
                name="consultant_name"
                required
                defaultValue={consultantProfile?.full_name ?? ""}
                key={consultantProfile?.full_name ?? "loading"}
              />
            </Field>
            <Field label="Data da visita">
              <Input name="data_visita" type="date" required defaultValue={defaultDate} />
            </Field>
            <Field label="Horário da visita">
              <Input name="horario_visita" type="time" required defaultValue={defaultTime} />
            </Field>
            <Field label="Escolha entidade">
              <Select
                value={id}
                onValueChange={(newId) => {
                  if (newId && newId !== id) {
                    navigate({
                      to: "/admin/associacoes/$id/diagnostico/novo",
                      params: { id: newId },
                      search: { modulo },
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a entidade" />
                </SelectTrigger>
                <SelectContent>
                  {(entidades ?? []).map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome}
                      {e.municipio ? ` — ${e.municipio}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {isInfrastructure && (
            <div className="mt-6 space-y-5">
              <InfrastructureFields
                association={association}
                choice={choice}
                setChoice={setChoice}
                entidades={entidades ?? []}
                entityId={id}
                onEntityChange={onEntityChange}
              />
              <div className="flex justify-end">
                <Button type="submit" size="lg" disabled={saving}>
                  {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Salvar diagnóstico de infraestrutura
                </Button>
              </div>
            </div>
          )}
          <Tabs
            value={activeModule}
            onValueChange={(value) =>
              setActiveModule(value as "social" | "juridico" | "contabil")
            }
            className={isInfrastructure ? "hidden" : ""}
          >
            {!forcedModule && (
              <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl p-1">
                <TabsTrigger
                  value="social"
                  className="min-w-0 py-3 data-[state=active]:text-destructive"
                >
                  <Users className="mr-2 size-4 shrink-0" />
                  <span className="truncate">1. Social</span>
                </TabsTrigger>
                <TabsTrigger
                  value="juridico"
                  className="min-w-0 py-3 data-[state=active]:text-primary"
                >
                  <Scale className="mr-2 size-4 shrink-0" />
                  <span className="truncate">2. Jurídico</span>
                </TabsTrigger>
                <TabsTrigger
                  value="contabil"
                  className="min-w-0 py-3 data-[state=active]:text-warning-foreground"
                >
                  <Calculator className="mr-2 size-4 shrink-0" />
                  <span className="truncate">3. Contábil</span>
                </TabsTrigger>
              </TabsList>
            )}
            <TabsContent value="social">
              {loadingAssociation ? (
                <p className="mt-5 text-muted-foreground">Carregando dados da entidade...</p>
              ) : (
                <div className="mt-5 space-y-5">
                  <SocialFields
                    association={association}
                    materials={materials}
                    setMaterials={setMaterials}
                    choice={choice}
                    setChoice={setChoice}
                    entidades={entidades ?? []}
                    entityId={id}
                    onEntityChange={onEntityChange}
                  />
                  <div className="space-y-4 rounded-xl border border-border bg-card p-5">
                    <label className="flex items-start gap-3 text-sm">
                      <Checkbox name="consentimento_dados" required />
                      <span>
                        Autorizo o tratamento dos dados coletados para as finalidades do diagnóstico
                        e acompanhamento institucional.
                      </span>
                    </label>
                    <label className="flex items-start gap-3 text-sm">
                      <Checkbox name="declaracao_veracidade" required />
                      <span>
                        Declaro que as informações prestadas são verdadeiras e correspondem à
                        realidade observada na visita.
                      </span>
                    </label>
                  </div>
                </div>
              )}
              <fieldset disabled className="hidden">
                <Module title="Módulo Social / Cadastral" tone="border-destructive/40">
                  <Grid>
                    <Field label="Nome do presidente">
                      <Input name="presidente_nome" maxLength={150} />
                    </Field>
                    <Field label="Telefone do presidente">
                      <Input name="presidente_telefone" type="tel" maxLength={30} />
                    </Field>
                    <Field label="Nome do vice-presidente">
                      <Input name="vice_presidente_nome" maxLength={150} />
                    </Field>
                    <Field label="Telefone do vice-presidente">
                      <Input name="vice_presidente_telefone" type="tel" maxLength={30} />
                    </Field>
                    <NumberField name="homens" label="Quantidade de homens" />
                    <NumberField name="mulheres" label="Quantidade de mulheres" />
                    <Choice
                      name="possui_pessoas_trans"
                      label="Possui pessoas trans?"
                      options={YN}
                      value={choice("possui_pessoas_trans")}
                      onChange={setChoice}
                    />
                    <Field label="Identidades e quantidade">
                      <Input name="pessoas_trans_detalhes" maxLength={300} />
                    </Field>
                    <Field label="Relação da autodeclaração racial" wide>
                      <Textarea name="autodeclaracao_racial" maxLength={1000} />
                    </Field>
                    <Choice
                      name="faixa_etaria_predominante"
                      label="Faixa etária predominante"
                      options={["Até 25 anos", "26 a 40 anos", "41 a 60 anos", "Acima de 60 anos"]}
                      value={choice("faixa_etaria_predominante", "")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="escolaridade_predominante"
                      label="Escolaridade predominante"
                      options={[
                        "Não alfabetizado",
                        "Ensino fundamental incompleto",
                        "Ensino fundamental completo",
                        "Ensino médio",
                        "Ensino superior",
                      ]}
                      value={choice("escolaridade_predominante", "")}
                      onChange={setChoice}
                    />
                    <NumberField name="media_moradores_casa" label="Média de moradores por casa" />
                    <Choice
                      name="criancas_adolescentes_dependentes"
                      label="Possui crianças ou adolescentes dependentes?"
                      options={YN}
                      value={choice("criancas_adolescentes_dependentes")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="contribuicao_inss"
                      label="Contribuição INSS"
                      options={YNSOME}
                      value={choice("contribuicao_inss")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="inscritos_cadunico"
                      label="Inscritos no CadÚnico"
                      options={YNK}
                      value={choice("inscritos_cadunico")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="uso_epis"
                      label="Utilização de EPIs"
                      options={["Sim todos", "Parcialmente", "Não"]}
                      value={choice("uso_epis")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="cooperativa_fornece_epis"
                      label="A entidade fornece EPIs?"
                      options={["Todos", "Parcialmente", "Não"]}
                      value={choice("cooperativa_fornece_epis")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="acidentes_ultimo_ano"
                      label="Acidentes no último ano?"
                      options={YN}
                      value={choice("acidentes_ultimo_ano")}
                      onChange={setChoice}
                    />
                    <Field label="Tipo de acidentes">
                      <Textarea name="acidentes_tipo" maxLength={1000} />
                    </Field>
                    <Field label="Principais problemas de saúde">
                      <Textarea name="problemas_saude" maxLength={1000} />
                    </Field>
                    <Choice
                      name="media_horas_trabalhadas"
                      label="Média de horas trabalhadas por dia"
                      options={["Até 4h", "6h", "8h", "Mais de 8h"]}
                      value={choice("media_horas_trabalhadas", "")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="aumento_trabalho_festividades"
                      label="O trabalho aumenta em festividades?"
                      options={YN}
                      value={choice("aumento_trabalho_festividades")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="necessita_documentos"
                      label="Há necessidade de emitir documentos?"
                      options={YN}
                      value={choice("necessita_documentos")}
                      onChange={setChoice}
                    />
                    <Field label="Documentos necessários">
                      <Textarea name="documentos_necessarios" maxLength={1000} />
                    </Field>
                    <Choice
                      name="recebe_beneficios"
                      label="Recebe benefícios sociais?"
                      options={YN}
                      value={choice("recebe_beneficios")}
                      onChange={setChoice}
                    />
                    <NumberField
                      name="quantidade_beneficiarios"
                      label="Quantidade de beneficiários"
                    />
                    <Choice
                      name="reconhecimento_sociedade"
                      label="Há reconhecimento pela sociedade?"
                      options={YNK}
                      value={choice("reconhecimento_sociedade")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="relatos_preconceito"
                      label="Há relatos de preconceito ou discriminação?"
                      options={YN}
                      value={choice("relatos_preconceito")}
                      onChange={setChoice}
                    />
                    <Field label="Detalhes dos relatos">
                      <Textarea name="preconceito_detalhes" maxLength={1000} />
                    </Field>
                    <Field label="Motivos de entrada na reciclagem" wide>
                      <Textarea name="motivos_entrada_reciclagem" maxLength={1500} />
                    </Field>
                    <Choice
                      name="historico_trabalho_infantil"
                      label="Há histórico de trabalho infantil?"
                      options={YN}
                      value={choice("historico_trabalho_infantil")}
                      onChange={setChoice}
                    />
                    <NumberField
                      name="quantidade_trabalho_infantil"
                      label="Quantidade relacionada ao trabalho infantil"
                    />
                    <Choice
                      name="interesse_capacitacao"
                      label="Há interesse em capacitações?"
                      options={YN}
                      value={choice("interesse_capacitacao")}
                      onChange={setChoice}
                    />
                    <Field label="Capacitações de interesse">
                      <Textarea name="capacitacoes_interesse" maxLength={1000} />
                    </Field>
                    <Choice
                      name="tipo_coleta"
                      label="Tipo de coleta"
                      options={["Ruas", "Domicílios", "Mista", "Outro"]}
                      value={choice("tipo_coleta", "")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="realiza_triagem"
                      label="Realiza triagem dos materiais?"
                      options={YN}
                      value={choice("realiza_triagem")}
                      onChange={setChoice}
                    />
                    <NumberField
                      name="volumetria_toneladas_mes"
                      label="Toneladas por mês"
                      step="0.001"
                    />
                    <NumberField name="renda_media_mensal" label="Renda média mensal" step="0.01" />
                    <Field label="Materiais coletados (selecione todos os aplicáveis)" wide>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {MATERIAIS_OPTIONS.map((m) => (
                          <label
                            key={m}
                            className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
                          >
                            <Checkbox
                              checked={materials.includes(m)}
                              onCheckedChange={(checked) =>
                                setMaterials((current) =>
                                  checked ? [...current, m] : current.filter((x) => x !== m),
                                )
                              }
                            />
                            {m}
                          </label>
                        ))}
                      </div>
                    </Field>
                    <Choice
                      name="possui_parcerias"
                      label="Possui parcerias?"
                      options={[
                        "Sim — poder público",
                        "Sim — instituições privadas",
                        "Sim — outras",
                        "Não",
                      ]}
                      value={choice("possui_parcerias")}
                      onChange={setChoice}
                    />
                    <Field label="Detalhes das parcerias">
                      <Textarea name="parcerias_detalhes" maxLength={1000} />
                    </Field>
                    <Choice
                      name="destino_venda"
                      label="Destino da venda"
                      options={["Indústria", "Intermediários/Atravessadores", "Outro"]}
                      value={choice("destino_venda", "")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="tipo_galpao"
                      label="Situação do galpão"
                      options={["Próprio", "Alugado", "Cedido", "Não possui", "Outro"]}
                      value={choice("tipo_galpao", "")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="possui_veiculos_maquinas"
                      label="Possui veículos ou máquinas?"
                      options={YN}
                      value={choice("possui_veiculos_maquinas")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="recebeu_apoio_programas"
                      label="Recebeu apoio de programas ou projetos?"
                      options={YN}
                      value={choice("recebeu_apoio_programas")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="participa_movimentos"
                      label="Participa de movimentos ou redes?"
                      options={YN}
                      value={choice("participa_movimentos")}
                      onChange={setChoice}
                    />
                    <Field label="Qual movimento ou rede?">
                      <Input name="movimento_qual" maxLength={300} />
                    </Field>
                    <div className="space-y-4 md:col-span-2">
                      <label className="flex items-start gap-3 rounded-lg border border-border p-4 text-sm">
                        <Checkbox name="consentimento_dados" required />
                        <span>
                          Autorizo o tratamento dos dados coletados para as finalidades do
                          diagnóstico e acompanhamento institucional.
                        </span>
                      </label>
                      <label className="flex items-start gap-3 rounded-lg border border-border p-4 text-sm">
                        <Checkbox name="declaracao_veracidade" required />
                        <span>
                          Declaro que as informações prestadas são verdadeiras e correspondem à
                          realidade observada na visita.
                        </span>
                      </label>
                    </div>
                  </Grid>
                </Module>
              </fieldset>
            </TabsContent>
            <TabsContent value="juridico">
              {loadingAssociation ? (
                <p className="mt-5 text-muted-foreground">Carregando dados da entidade...</p>
              ) : (
                <div className="mt-5 space-y-5">
                  <LegalFields
                    association={association}
                    choice={choice}
                    setChoice={setChoice}
                    entidades={entidades ?? []}
                    entityId={id}
                    onEntityChange={onEntityChange}
                  />
                  <div className="space-y-4 rounded-xl border border-border bg-card p-5">
                    <label className="flex items-start gap-3 text-sm">
                      <Checkbox name="consentimento_dados" required />
                      <span>
                        Autorizo expressamente o uso e o tratamento dos dados pessoais fornecidos
                        neste formulário.
                      </span>
                    </label>
                    <label className="flex items-start gap-3 text-sm">
                      <Checkbox name="declaracao_veracidade" required />
                      <span>
                        Declaro, sob minha responsabilidade, que as informações prestadas são
                        verdadeiras, completas e foram devidamente fornecidas.
                      </span>
                    </label>
                  </div>
                </div>
              )}
              <fieldset disabled className="hidden">
                <Module title="Módulo Jurídico" tone="border-blue-500/40">
                  <Grid>
                    <Choice
                      name="diretoria_conselho"
                      label="Possui diretoria/conselho?"
                      options={YN}
                      value={choice("diretoria_conselho")}
                      onChange={setChoice}
                    />
                    <Field label="Nomes da diretoria">
                      <Textarea name="diretoria_nomes" maxLength={1500} />
                    </Field>
                    <Choice
                      name="mandato_em_dia"
                      label="Mandato em dia?"
                      options={YNK}
                      value={choice("mandato_em_dia")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="conselho_fiscal"
                      label="Conselho fiscal?"
                      options={YNK}
                      value={choice("conselho_fiscal")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="cargos_por_eleicao"
                      label="Cargos definidos por eleição?"
                      options={YNK}
                      value={choice("cargos_por_eleicao")}
                      onChange={setChoice}
                    />
                    <Field label="Data da última eleição">
                      <Input name="data_ultima_eleicao" type="date" />
                    </Field>
                    <Choice
                      name="ata_registrada_cartorio"
                      label="Ata registrada em cartório?"
                      options={YNK}
                      value={choice("ata_registrada_cartorio")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="realiza_assembleias"
                      label="Realiza assembleias?"
                      options={YNK}
                      value={choice("realiza_assembleias")}
                      onChange={setChoice}
                    />
                    <Field label="Frequência das assembleias">
                      <Input name="frequencia_assembleias" maxLength={200} />
                    </Field>
                    <Choice
                      name="possui_registro_atas"
                      label="Possui registro em atas?"
                      options={YNK}
                      value={choice("possui_registro_atas")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="assessoria_juridica"
                      label="Possui assessoria jurídica?"
                      options={YN}
                      value={choice("assessoria_juridica")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="apoio_instituicoes"
                      label="Recebe apoio institucional?"
                      options={YN}
                      value={choice("apoio_instituicoes")}
                      onChange={setChoice}
                    />
                    <Field label="Instituições responsáveis pelo apoio">
                      <Textarea name="apoio_instituicoes_quais" maxLength={1000} />
                    </Field>
                    <Choice
                      name="processos_judiciais"
                      label="Possui processos judiciais?"
                      options={YN}
                      value={choice("processos_judiciais")}
                      onChange={setChoice}
                    />
                    <Field label="Detalhes dos processos" wide>
                      <Textarea name="processos_judiciais_quais" maxLength={1500} />
                    </Field>
                    <Choice
                      name="todos_sao_cooperados"
                      label="Todos são cooperados?"
                      options={YN}
                      value={choice("todos_sao_cooperados")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="lista_cooperados_atualizada"
                      label="Lista de cooperados está atualizada?"
                      options={YNK}
                      value={choice("lista_cooperados_atualizada")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="lista_nao_cooperados_atualizada"
                      label="Lista de não cooperados está atualizada?"
                      options={YNK}
                      value={choice("lista_nao_cooperados_atualizada")}
                      onChange={setChoice}
                    />
                    <Field label="Regras de entrada">
                      <Textarea name="regras_entrada" maxLength={1500} />
                    </Field>
                    <Field label="Regras de saída ou exclusão">
                      <Textarea name="regras_saida_exclusao" maxLength={1500} />
                    </Field>
                    <Field label="Fluxo de trabalho diário" wide>
                      <Textarea name="fluxo_trabalho_diario" maxLength={1500} />
                    </Field>
                    <Field label="Como ocorre a divisão de tarefas?">
                      <Textarea name="divisao_tarefas" maxLength={1500} />
                    </Field>
                    <Field label="Como ocorre a coordenação ou gerência?">
                      <Textarea name="coordenacao_gerencia" maxLength={1500} />
                    </Field>
                    <Choice
                      name="controle_jornada"
                      label="Há controle de jornada?"
                      options={YN}
                      value={choice("controle_jornada")}
                      onChange={setChoice}
                    />
                    <Field label="Problemas jurídicos atuais">
                      <Textarea name="problemas_juridicos_atuais" maxLength={1500} />
                    </Field>
                    <Field label="Melhorias jurídicas necessárias">
                      <Textarea name="melhorias_juridicas_necessarias" maxLength={1500} />
                    </Field>
                    <Choice
                      name="contrato_remunerado"
                      label="Possui contrato remunerado?"
                      options={YN}
                      value={choice("contrato_remunerado")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="contrato_tipo"
                      label="Tipo de contrato"
                      options={[
                        "Prefeitura",
                        "Órgão público",
                        "Instituição privada",
                        "Outro",
                        "Não se aplica",
                      ]}
                      value={choice("contrato_tipo", "")}
                      onChange={setChoice}
                    />
                    <Field label="Detalhes do contrato" wide>
                      <Textarea name="contrato_detalhes" maxLength={1500} />
                    </Field>
                    <Choice
                      name="participa_coleta_seletiva_municipal"
                      label="Participa da coleta seletiva municipal?"
                      options={YN}
                      value={choice("participa_coleta_seletiva_municipal")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="apoio_poder_publico"
                      label="Apoio do poder público?"
                      options={YNK}
                      value={choice("apoio_poder_publico")}
                      onChange={setChoice}
                    />
                    <Field label="Pendências jurídicas finais" wide>
                      <Textarea name="pendencias_juridicas" maxLength={2000} />
                    </Field>
                    <Choice
                      name="classificacao_juridica"
                      label="Classificação final jurídica"
                      options={["Regular", "Parcialmente regular", "Irregular"]}
                      value={choice("classificacao_juridica", "")}
                      onChange={setChoice}
                    />
                    <div className="space-y-4 md:col-span-2">
                      <label className="flex items-start gap-3 rounded-lg border border-border p-4 text-sm">
                        <Checkbox name="orientacao_regularizacao_aceita" />
                        <span>
                          Confirmo que foram apresentadas as orientações para regularização
                          jurídica.
                        </span>
                      </label>
                      <label className="flex items-start gap-3 rounded-lg border border-border p-4 text-sm">
                        <Checkbox name="orientacao_documentos_aceita" />
                        <span>
                          Confirmo que foram apresentadas as orientações sobre documentos e
                          registros necessários.
                        </span>
                      </label>
                    </div>
                  </Grid>
                </Module>
              </fieldset>
            </TabsContent>
            <TabsContent value="contabil">
              {loadingAssociation ? (
                <p className="mt-5 text-muted-foreground">Carregando dados da entidade...</p>
              ) : (
                <div className="mt-5 space-y-5">
                  <AccountingFields
                    association={association}
                    choice={choice}
                    setChoice={setChoice}
                    entidades={entidades ?? []}
                    entityId={id}
                    onEntityChange={onEntityChange}
                  />
                  <div className="space-y-4 rounded-xl border border-border bg-card p-5">
                    <label className="flex items-start gap-3 text-sm">
                      <Checkbox name="consentimento_dados" required />
                      <span>
                        Autorizo o tratamento dos dados coletados para as finalidades do diagnóstico
                        e acompanhamento institucional.
                      </span>
                    </label>
                    <label className="flex items-start gap-3 text-sm">
                      <Checkbox name="declaracao_veracidade" required />
                      <span>
                        Declaro que as informações prestadas são verdadeiras e correspondem à
                        realidade observada na visita.
                      </span>
                    </label>
                  </div>
                </div>
              )}
              <fieldset disabled className="hidden">
                <Module title="Módulo Contábil" tone="border-primary/40">
                  <Grid>
                    <Choice
                      name="estatuto_registrado"
                      label="Estatuto registrado?"
                      options={YNK}
                      value={choice("estatuto_registrado")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="alvara_funcionamento"
                      label="Alvará de funcionamento?"
                      options={YNK}
                      value={choice("alvara_funcionamento")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="licenca_ambiental_status"
                      label="Licença ambiental"
                      options={["Licença", "Dispensa", "Nenhum", "Não sabe informar"]}
                      value={choice("licenca_ambiental_status", "")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="avcb"
                      label="Atestado dos Bombeiros?"
                      options={YNK}
                      value={choice("avcb")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="extintores"
                      label="Possui extintores?"
                      options={YNK}
                      value={choice("extintores")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="registro_ocb"
                      label="Registro na OCB?"
                      options={YNK}
                      value={choice("registro_ocb")}
                      onChange={setChoice}
                    />
                    <NumberField name="empregados_registrados" label="Empregados registrados" />
                    <NumberField name="empregados_sem_registro" label="Empregados sem registro" />
                    <NumberField name="autonomos" label="Autônomos" />
                    <Choice
                      name="livro_ficha_trabalho"
                      label="Possui ficha/livro de trabalho?"
                      options={YN}
                      value={choice("livro_ficha_trabalho")}
                      onChange={setChoice}
                    />
                    <Field label="Qual ficha/livro de trabalho?">
                      <Input name="livro_ficha_trabalho_qual" maxLength={300} />
                    </Field>
                    <Choice
                      name="livro_inspecao_trabalho"
                      label="Possui livro de inspeção do trabalho?"
                      options={YN}
                      value={choice("livro_inspecao_trabalho")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="filiacao_sindical"
                      label="Possui filiação sindical?"
                      options={YN}
                      value={choice("filiacao_sindical")}
                      onChange={setChoice}
                    />
                    <Field label="Qual sindicato?">
                      <Input name="filiacao_sindical_qual" maxLength={300} />
                    </Field>
                    <Choice
                      name="contrato_sst"
                      label="Possui serviço ou contrato de SST?"
                      options={YNK}
                      value={choice("contrato_sst")}
                      onChange={setChoice}
                    />
                    <Field label="Responsável pelo SST">
                      <Input name="contrato_sst_responsavel" maxLength={300} />
                    </Field>
                    <Choice
                      name="controle_frequencia"
                      label="Realiza controle de frequência?"
                      options={YNK}
                      value={choice("controle_frequencia")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="controle_frequencia_tipo"
                      label="Tipo de controle de frequência"
                      options={["Livro/ficha", "Sistema eletrônico", "Outro", "Não se aplica"]}
                      value={choice("controle_frequencia_tipo", "")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="possui_contador"
                      label="Possui contador?"
                      options={YNK}
                      value={choice("possui_contador")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="contador_tipo"
                      label="Tipo de contador"
                      options={[
                        "Terceirizado",
                        "Voluntário",
                        "Empregado",
                        "Cooperado",
                        "Não tem contador",
                        "Outro",
                      ]}
                      value={choice("contador_tipo", "")}
                      onChange={setChoice}
                    />
                    <Field label="Nome do contador">
                      <Input name="contador_nome" maxLength={150} />
                    </Field>
                    <Field label="Telefone do contador">
                      <Input name="contador_telefone" type="tel" maxLength={30} />
                    </Field>
                    <Field label="E-mail do contador">
                      <Input name="contador_email" type="email" maxLength={255} />
                    </Field>
                    <Choice
                      name="contabilidade_regular"
                      label="Contabilidade regular?"
                      options={YNK}
                      value={choice("contabilidade_regular")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="possui_conta_bancaria"
                      label="Possui conta bancária?"
                      options={YNK}
                      value={choice("possui_conta_bancaria")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="possui_maquineta"
                      label="Possui maquineta?"
                      options={YNK}
                      value={choice("possui_maquineta")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="emite_notas_fiscais"
                      label="Emite notas fiscais?"
                      options={YNK}
                      value={choice("emite_notas_fiscais")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="controle_estoque"
                      label="Faz controle de estoque?"
                      options={YNK}
                      value={choice("controle_estoque")}
                      onChange={setChoice}
                    />
                    <Choice
                      name="sistema_financeiro"
                      label="Possui sistema financeiro?"
                      options={YNK}
                      value={choice("sistema_financeiro")}
                      onChange={setChoice}
                    />
                    <Field label="Qual sistema?">
                      <Input name="sistema_financeiro_qual" maxLength={300} />
                    </Field>
                    <NumberField name="ano_ultimo_balanco" label="Ano do último balanço" />
                    <Field label="Como são definidos os critérios de divisão dos resultados?" wide>
                      <Textarea name="divisao_resultados_criterio" maxLength={1500} />
                    </Field>
                    <Field label="Como a divisão dos resultados é realizada?" wide>
                      <Textarea name="divisao_resultados_procedimento" maxLength={1500} />
                    </Field>
                    <Choice
                      name="pagamento_fixo_mensal"
                      label="Existe pagamento fixo mensal?"
                      options={YN}
                      value={choice("pagamento_fixo_mensal")}
                      onChange={setChoice}
                    />
                    <NumberField
                      name="renda_media_cooperado"
                      label="Renda média do cooperado"
                      step="0.01"
                    />
                    <Field label="Pendências contábeis finais" wide>
                      <Textarea name="pendencias_contabeis" maxLength={2000} />
                    </Field>
                    <Choice
                      name="classificacao_contabil"
                      label="Classificação final contábil"
                      options={["Regular", "Parcialmente regular", "Irregular"]}
                      value={choice("classificacao_contabil", "")}
                      onChange={setChoice}
                    />
                    <div className="space-y-3 md:col-span-2">
                      <p className="text-sm font-medium">Checklist obrigatório de evidências</p>
                      <label className="flex items-center gap-3 text-sm">
                        <Checkbox name="evidencia_frente_confirmada" required /> Foto da frente da
                        entidade
                      </label>
                      <label className="flex items-center gap-3 text-sm">
                        <Checkbox name="evidencia_administrativo_confirmada" required /> Foto da
                        área administrativa/financeira/almoxarifado
                      </label>
                      <label className="flex items-center gap-3 text-sm">
                        <Checkbox name="evidencia_reuniao_confirmada" required /> Foto da reunião ou
                        entrevista
                      </label>
                      <label className="flex items-center gap-3 text-sm">
                        <Checkbox name="evidencia_livro_trabalho_confirmada" required /> Foto da
                        ficha ou livro de trabalho
                      </label>
                    </div>
                  </Grid>
                </Module>
              </fieldset>
            </TabsContent>
          </Tabs>
          <div className="sticky bottom-4 mt-6 flex justify-end rounded-xl border border-border bg-background/95 p-4 shadow-card backdrop-blur">
            <Button type="submit" size="lg" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />} Salvar e calcular diagnóstico
            </Button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}

const YN = ["Sim", "Não"];
const YNK = ["Sim", "Não", "Não sabe"];
const YNSOME = ["Sim", "Não", "Alguns"];
const ACCOUNTING_BOOKS = [
  { key: "matricula", label: "Livro de Matrícula de Cooperados" },
  { key: "atas_assembleias", label: "Livro de Atas das Assembleias Gerais" },
  { key: "presenca_assembleias", label: "Livro de Presença das Assembleias" },
  { key: "atas_diretoria", label: "Livro de Atas da Diretoria" },
  { key: "atas_conselho_fiscal", label: "Livro de Atas do Conselho Fiscal" },
  { key: "patrimonio", label: "Livro de Registro de Patrimônio" },
  { key: "inventario", label: "Livro de Registro de Inventário" },
] as const;
const SOCIAL_MATERIALS = [
  { key: "vidro", label: "Vidro" },
  { key: "pet", label: "Plástico PET" },
  { key: "outros_plasticos", label: "Outros plásticos" },
  { key: "ferro", label: "Ferro" },
  { key: "aluminio", label: "Alumínio" },
  { key: "papelao", label: "Papelão" },
  { key: "papel", label: "Papel" },
  { key: "outros", label: "Outros materiais" },
] as const;
const SOCIAL_EQUIPMENT = [
  { key: "caminhao", label: "Caminhão" },
  { key: "prensa", label: "Prensa" },
  { key: "balanca", label: "Balança" },
  { key: "elevador", label: "Elevador" },
] as const;
type SocialAssociation = {
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
  tipo?: string | null;
  ativa?: boolean | null;
};
type EntityOption = { id: string; nome: string; municipio?: string | null };

type SocialFieldsProps = {
  association?: SocialAssociation;
  materials: string[];
  setMaterials: React.Dispatch<React.SetStateAction<string[]>>;
  choice: (name: string, fallback?: string) => string;
  setChoice: (name: string, value: string) => void;
  entidades?: EntityOption[];
  entityId?: string;
  onEntityChange?: (id: string) => void;
};

function EntitySelectField({
  name,
  entidades,
  entityId,
  onEntityChange,
  fallbackName,
}: {
  name: string;
  entidades?: EntityOption[];
  entityId?: string;
  onEntityChange?: (id: string) => void;
  fallbackName?: string;
}) {
  const currentName =
    entidades?.find((e) => e.id === entityId)?.nome ?? fallbackName ?? "";
  return (
    <>
      <input type="hidden" name={name} value={currentName} />
      <Select
        value={entityId}
        onValueChange={(newId) => {
          if (newId && newId !== entityId) onEntityChange?.(newId);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione a entidade" />
        </SelectTrigger>
        <SelectContent>
          {(entidades ?? []).map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.nome}
              {e.municipio ? ` — ${e.municipio}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}


function LegalFields({
  association,
  choice,
  setChoice,
  entidades,
  entityId,
  onEntityChange,
}: Pick<SocialFieldsProps, "association" | "choice" | "setChoice" | "entidades" | "entityId" | "onEntityChange">) {
  return (
    <>
      <LegalSection number="1" title="Identificação inicial da associação/cooperativa">
        <Grid>
          <Field label="Escolha entidade">
            <EntitySelectField
              name="legal_association_nome"
              entidades={entidades}
              entityId={entityId}
              onEntityChange={onEntityChange}
              fallbackName={association?.nome}
            />
          </Field>

          <Field label="CNPJ (se tiver)">
            <Input name="legal_association_cnpj" defaultValue={association?.cnpj ?? ""} />
          </Field>
          <Field label="Município">
            <Input
              name="legal_association_municipio"
              defaultValue={association?.municipio}
              required
            />
          </Field>
        </Grid>
      </LegalSection>
      <LegalSection number="2" title="Gestão e organização">
        <Grid>
          <Choice
            name="diretoria_conselho"
            label="Existe diretoria ou conselho de administração?"
            options={YN}
            value={choice("diretoria_conselho")}
            onChange={setChoice}
          />
          <Field label="Se sim, nomes dos principais responsáveis">
            <Textarea name="diretoria_nomes" />
          </Field>
          <Choice
            name="mandato_em_dia"
            label="A diretoria está com o mandato em dia?"
            options={YN}
            value={choice("mandato_em_dia")}
            onChange={setChoice}
          />
          <Choice
            name="conselho_fiscal"
            label="Existe Conselho Fiscal?"
            options={YNK}
            value={choice("conselho_fiscal")}
            onChange={setChoice}
          />
          <Choice
            name="cargos_por_eleicao"
            label="Os cargos foram definidos por eleição?"
            options={YNK}
            value={choice("cargos_por_eleicao")}
            onChange={setChoice}
          />
          <Field label="Quando foi a última eleição da cooperativa?">
            <Input name="data_ultima_eleicao" type="date" />
          </Field>
          <Choice
            name="ata_registrada_cartorio"
            label="A ata foi registrada em cartório?"
            options={YN}
            value={choice("ata_registrada_cartorio")}
            onChange={setChoice}
          />
          <Choice
            name="realiza_assembleias"
            label="Realiza reuniões ou assembleias com os cooperados?"
            options={YNK}
            value={choice("realiza_assembleias")}
            onChange={setChoice}
          />
          <Field label="Com que frequência essas reuniões acontecem?">
            <Input name="frequencia_assembleias" />
          </Field>
          <Choice
            name="possui_registro_atas"
            label="Existe registro dessas reuniões (atas)?"
            options={YN}
            value={choice("possui_registro_atas")}
            onChange={setChoice}
          />
        </Grid>
      </LegalSection>
      <LegalSection number="3" title="Apoio técnico e administrativo">
        <Grid>
          <Choice
            name="assessoria_juridica"
            label="Possui assessoria jurídica ou advogado?"
            options={YN}
            value={choice("assessoria_juridica")}
            onChange={setChoice}
          />
          <Choice
            name="apoio_instituicoes"
            label="Recebe apoio de alguma instituição?"
            options={YN}
            value={choice("apoio_instituicoes")}
            onChange={setChoice}
          />
          <Field label="Se sim, quais instituições?" wide>
            <Textarea name="apoio_instituicoes_quais" />
          </Field>
          <Choice
            name="processos_judiciais"
            label="Possui processos judiciais (trabalhista ou cível)?"
            options={YN}
            value={choice("processos_judiciais")}
            onChange={setChoice}
          />
          <Field label="Se sim, quais processos?" wide>
            <Textarea name="processos_judiciais_quais" />
          </Field>
        </Grid>
      </LegalSection>
      <LegalSection number="4" title="Quadro de cooperados">
        <Grid>
          <Choice
            name="todos_sao_cooperados"
            label="Todos que trabalham são cooperados?"
            options={YN}
            value={choice("todos_sao_cooperados")}
            onChange={setChoice}
          />
          <Choice
            name="lista_cooperados_atualizada"
            label="Existe cadastro ou lista atualizada dos cooperados? (pedir foto)"
            options={YN}
            value={choice("lista_cooperados_atualizada")}
            onChange={setChoice}
          />
          <Choice
            name="lista_nao_cooperados_atualizada"
            label="Existe lista atualizada dos não cooperados? (pedir foto)"
            options={YN}
            value={choice("lista_nao_cooperados_atualizada")}
            onChange={setChoice}
          />
          <Choice
            name="regras_entrada"
            label="Existem regras para entrada de novos cooperados?"
            options={YN}
            value={choice("regras_entrada")}
            onChange={setChoice}
          />
          <Choice
            name="regras_saida_exclusao"
            label="Existem regras para saída ou exclusão de cooperados?"
            options={YN}
            value={choice("regras_saida_exclusao")}
            onChange={setChoice}
          />
        </Grid>
      </LegalSection>
      <LegalSection number="5" title="Forma de trabalho e organização das atividades">
        <Grid>
          <Field label="Como funciona o trabalho no dia a dia? (coleta, triagem, venda etc.)" wide>
            <Textarea name="fluxo_trabalho_diario" />
          </Field>
          <Choice
            name="divisao_tarefas"
            label="Existe divisão de tarefas entre os cooperados?"
            options={YN}
            value={choice("divisao_tarefas")}
            onChange={setChoice}
          />
          <Choice
            name="coordenacao_gerencia"
            label="Existe alguém que coordena ou gerencia as atividades?"
            options={YN}
            value={choice("coordenacao_gerencia")}
            onChange={setChoice}
          />
          <Choice
            name="controle_jornada"
            label="Existe controle de horário ou jornada de trabalho?"
            options={YN}
            value={choice("controle_jornada")}
            onChange={setChoice}
          />
        </Grid>
      </LegalSection>
      <LegalSection number="6" title="Principais dificuldades">
        <Grid>
          <Field label="Quais são hoje os principais problemas da cooperativa?" wide>
            <Textarea name="problemas_juridicos_atuais" />
          </Field>
          <Field label="O que mais precisa melhorar atualmente?" wide>
            <Textarea name="melhorias_juridicas_necessarias" />
          </Field>
        </Grid>
      </LegalSection>
      <LegalSection number="7" title="Relação com o poder público">
        <Grid>
          <Choice
            name="contrato_tipo"
            label="Possui contrato remunerado com prefeitura ou outra instituição?"
            options={[
              "Sim, prefeitura",
              "Sim, outra instituição pública",
              "Sim, instituição privada",
              "Não",
            ]}
            value={choice("contrato_tipo", "")}
            onChange={(name, value) => {
              setChoice(name, value);
              setChoice("contrato_remunerado", value === "Não" ? "Não" : "Sim");
            }}
          />
          <Field label="Se sim, quais são as públicas?">
            <Textarea name="contrato_instituicoes_publicas" />
          </Field>
          <Field label="Se sim, quais são as privadas?">
            <Textarea name="contrato_instituicoes_privadas" />
          </Field>
          <Choice
            name="participa_coleta_seletiva_municipal"
            label="Participa da coleta seletiva do município?"
            options={YN}
            value={choice("participa_coleta_seletiva_municipal")}
            onChange={setChoice}
          />
          <Choice
            name="apoio_poder_publico"
            label="Recebe apoio do poder público (estrutura, transporte, equipamentos)?"
            options={YNK}
            value={choice("apoio_poder_publico")}
            onChange={setChoice}
          />
        </Grid>
      </LegalSection>
      <LegalSection
        number="8"
        title="Avaliação final"
        subtitle="Preenchimento pelo consultor após a entrevista"
      >
        <Grid>
          <Choice
            name="classificacao_juridica"
            label="Situação da cooperativa"
            options={["Regular", "Parcialmente regular", "Irregular"]}
            value={choice("classificacao_juridica", "")}
            onChange={setChoice}
          />
          <Field label="Principais pendências identificadas" wide>
            <Textarea name="pendencias_juridicas" />
          </Field>
          <Field label="Orientações ao agente de campo" wide>
            <div className="space-y-3 rounded-lg bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
              <p>
                <strong>1.</strong> Antes do envio, o declarante deve autorizar expressamente o
                tratamento dos dados e declarar a veracidade das informações.
              </p>
              <p>
                <strong>2.</strong> Antes da entrevista, apresente o projeto, sua finalidade e
                benefícios. Comece com perguntas gerais, aproveite informações já fornecidas e evite
                repetições que causem desgaste.
              </p>
            </div>
          </Field>
        </Grid>
      </LegalSection>
    </>
  );
}

function AccountingFields({
  association,
  choice,
  setChoice,
  entidades,
  entityId,
  onEntityChange,
}: Pick<SocialFieldsProps, "association" | "choice" | "setChoice" | "entidades" | "entityId" | "onEntityChange">) {
  return (
    <>
      <AccountingSection number="1" title="Identificação inicial da associação/cooperativa">
        <Grid>
          <Field label="Escolha entidade">
            <EntitySelectField
              name="accounting_association_nome"
              entidades={entidades}
              entityId={entityId}
              onEntityChange={onEntityChange}
              fallbackName={association?.nome}
            />
          </Field>

          <Field label="CNPJ (se tiver)">
            <Input name="accounting_association_cnpj" defaultValue={association?.cnpj ?? ""} />
          </Field>
          <Field label="Município">
            <Input
              name="accounting_association_municipio"
              defaultValue={association?.municipio}
              required
            />
          </Field>
        </Grid>
      </AccountingSection>
      <AccountingSection number="2" title="Gestão e organização">
        <Grid>
          <Choice
            name="estatuto_registrado"
            label="Possui Estatuto registrado na Junta Comercial do Estado?"
            options={YN}
            value={choice("estatuto_registrado")}
            onChange={setChoice}
          />
          <Choice
            name="alvara_funcionamento"
            label="Possui alvará de funcionamento/localização?"
            options={YN}
            value={choice("alvara_funcionamento")}
            onChange={setChoice}
          />
          <Choice
            name="licenca_ambiental_status"
            label="Possui licença ambiental ou certificado de dispensa?"
            options={["Licença ambiental", "Certificado de Dispensa", "Nenhum"]}
            value={choice("licenca_ambiental_status", "")}
            onChange={setChoice}
          />
          <Choice
            name="avcb"
            label="Possui atestado de vistoria do Corpo de Bombeiros Militar de PE?"
            options={YNK}
            value={choice("avcb")}
            onChange={setChoice}
          />
          <Choice
            name="extintores"
            label="Possui extintores de incêndio?"
            options={YNK}
            value={choice("extintores")}
            onChange={setChoice}
          />
          <Choice
            name="registro_ocb"
            label="Possui registro no sistema OCB?"
            options={YNK}
            value={choice("registro_ocb")}
            onChange={setChoice}
          />
          <Field label="Livros da organização (tirar fotos)" wide>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Implantado</th>
                    <th className="p-3">Atualizado</th>
                    <th className="p-3">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {ACCOUNTING_BOOKS.map((book) => (
                    <tr key={book.key} className="border-t border-border">
                      <td className="p-3 font-medium">{book.label}</td>
                      <td className="p-3">
                        <CompactChoice
                          name={`livro_${book.key}_implantado`}
                          options={YNK}
                          value={choice(`livro_${book.key}_implantado`)}
                          onChange={setChoice}
                        />
                      </td>
                      <td className="p-3">
                        <CompactChoice
                          name={`livro_${book.key}_atualizado`}
                          options={YNK}
                          value={choice(`livro_${book.key}_atualizado`)}
                          onChange={setChoice}
                        />
                      </td>
                      <td className="p-3">
                        <Input name={`livro_${book.key}_observacao`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Field>
        </Grid>
      </AccountingSection>
      <AccountingSection number="3" title="Departamento de pessoal">
        <Grid>
          <NumberField name="empregados_registrados" label="Quantos empregados registrados?" />
          <NumberField name="empregados_sem_registro" label="Quantos trabalhadores sem registro?" />
          <NumberField name="autonomos" label="Quantos trabalhadores autônomos?" />
          <Choice
            name="livro_ficha_trabalho"
            label="Existe livro ou ficha de trabalho? (tirar foto)"
            options={YN}
            value={choice("livro_ficha_trabalho")}
            onChange={setChoice}
          />
          <Field label="Se sim, qual?">
            <Input name="livro_ficha_trabalho_qual" />
          </Field>
          <Choice
            name="livro_inspecao_trabalho"
            label="Existe livro de inspeção do trabalho? (tirar foto)"
            options={YN}
            value={choice("livro_inspecao_trabalho")}
            onChange={setChoice}
          />
          <Choice
            name="filiacao_sindical"
            label="A organização é filiada a algum sindicato?"
            options={YN}
            value={choice("filiacao_sindical")}
            onChange={setChoice}
          />
          <Field label="Se sim, qual sindicato?">
            <Input name="filiacao_sindical_qual" />
          </Field>
          <Choice
            name="contrato_sst"
            label="Possui contrato para acompanhamento de SST?"
            options={YNK}
            value={choice("contrato_sst")}
            onChange={setChoice}
          />
          <Field label="Empresa ou responsável técnico">
            <Input name="contrato_sst_responsavel" />
          </Field>
          <Choice
            name="controle_frequencia"
            label="Tem controle de frequência dos empregados?"
            options={YNK}
            value={choice("controle_frequencia")}
            onChange={setChoice}
          />
          <Choice
            name="controle_frequencia_tipo"
            label="Se sim, qual tipo?"
            options={["Livro/ficha", "Eletrônico", "Outro", "Não se aplica"]}
            value={choice("controle_frequencia_tipo", "")}
            onChange={setChoice}
          />
        </Grid>
      </AccountingSection>
      <AccountingSection number="4" title="Diagnóstico contábil e fiscal">
        <Grid>
          <Choice
            name="possui_contador"
            label="A organização possui contador?"
            options={YNK}
            value={choice("possui_contador")}
            onChange={setChoice}
          />
          <Choice
            name="contador_tipo"
            label="Se sim, qual o tipo de contrato?"
            options={[
              "Terceirizado",
              "Voluntário",
              "Empregado",
              "Cooperado",
              "Outro tipo",
              "Não tem contador",
            ]}
            value={choice("contador_tipo", "")}
            onChange={setChoice}
          />
          <Field label="Nome do contador">
            <Input name="contador_nome" />
          </Field>
          <Field label="Telefone/WhatsApp">
            <Input name="contador_telefone" type="tel" />
          </Field>
          <Field label="E-mail">
            <Input name="contador_email" type="email" />
          </Field>
          <Choice
            name="contabilidade_regular"
            label="Possui contabilidade regular?"
            options={YNK}
            value={choice("contabilidade_regular")}
            onChange={setChoice}
          />
          <Choice
            name="possui_conta_bancaria"
            label="Possui conta bancária?"
            options={YNK}
            value={choice("possui_conta_bancaria")}
            onChange={setChoice}
          />
          <Choice
            name="possui_maquineta"
            label="Trabalha com maquineta de cartão?"
            options={YNK}
            value={choice("possui_maquineta")}
            onChange={setChoice}
          />
          <Choice
            name="emite_notas_fiscais"
            label="Realiza emissão de notas fiscais?"
            options={YNK}
            value={choice("emite_notas_fiscais")}
            onChange={setChoice}
          />
          <Choice
            name="controle_estoque"
            label="Faz controle de estoque?"
            options={YNK}
            value={choice("controle_estoque")}
            onChange={setChoice}
          />
          <Choice
            name="sistema_financeiro"
            label="Usa sistema para controle financeiro?"
            options={YNK}
            value={choice("sistema_financeiro")}
            onChange={setChoice}
          />
          <Field label="Se sim, qual sistema?">
            <Input name="sistema_financeiro_qual" />
          </Field>
          <NumberField name="ano_ultimo_balanco" label="Ano do último balanço apresentado" />
        </Grid>
      </AccountingSection>
      <AccountingSection number="5" title="Remuneração e divisão dos resultados">
        <Grid>
          <Field label="Como é feita a divisão do dinheiro entre os cooperados?" wide>
            <Textarea name="divisao_resultados_procedimento" />
          </Field>
          <Field label="A divisão é igual para todos ou depende da produção?" wide>
            <Textarea name="divisao_resultados_criterio" />
          </Field>
          <Choice
            name="pagamento_fixo_mensal"
            label="Existe pagamento fixo mensal?"
            options={YN}
            value={choice("pagamento_fixo_mensal")}
            onChange={setChoice}
          />
          <NumberField
            name="renda_media_cooperado"
            label="Renda média mensal de um cooperado"
            step="0.01"
          />
        </Grid>
      </AccountingSection>
      <AccountingSection
        number="6"
        title="Avaliação final"
        subtitle="Preenchimento pelo consultor após a entrevista"
      >
        <Grid>
          <Choice
            name="classificacao_contabil"
            label="Situação da cooperativa"
            options={["Regular", "Parcialmente regular", "Irregular"]}
            value={choice("classificacao_contabil", "")}
            onChange={setChoice}
          />
          <Field label="Principais pendências identificadas" wide>
            <Textarea name="pendencias_contabeis" />
          </Field>
          <Field label="Checklist das fotos / comprovação da visita" wide>
            <div className="grid gap-3 rounded-lg bg-muted p-4 sm:grid-cols-2">
              <Evidence
                name="evidencia_frente_confirmada"
                label="Frente da cooperativa (placa de identificação)"
              />
              <Evidence name="evidencia_reuniao_confirmada" label="Momento da reunião com todos" />
              <Evidence name="evidencia_entrevista_confirmada" label="Momento da entrevista" />
              <Evidence
                name="evidencia_administrativo_confirmada"
                label="Sala de administração, financeiro e almoxarifado"
              />
            </div>
          </Field>
        </Grid>
      </AccountingSection>
    </>
  );
}

function AccountingSection({
  number,
  title,
  subtitle,
  children,
}: {
  number: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-warning/50 bg-card p-5 shadow-card md:p-7">
      <div className="mb-6 flex gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-warning font-bold text-warning-foreground">
          {number}
        </span>
        <div>
          <h2 className="text-lg font-bold uppercase tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
function CompactChoice({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: string[];
  value: string;
  onChange: (name: string, value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(name, next)}>
      <SelectTrigger className="min-w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
function Evidence({ name, label }: { name: string; label: string }) {
  return (
    <label className="flex items-start gap-3 text-sm">
      <Checkbox name={name} required />
      <span>{label}</span>
    </label>
  );
}

function LegalSection({
  number,
  title,
  subtitle,
  children,
}: {
  number: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-primary/30 bg-card p-5 shadow-card md:p-7">
      <div className="mb-6 flex gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-foreground">
          {number}
        </span>
        <div>
          <h2 className="text-lg font-bold uppercase tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function SocialFields({
  association,
  materials,
  setMaterials,
  choice,
  setChoice,
  entidades,
  entityId,
  onEntityChange,
}: SocialFieldsProps) {
  return (
    <>
      <SocialSection
        number="1"
        title="Identificação inicial da associação/cooperativa"
        subtitle="Preencher logo no início da entrevista"
      >
        <Grid>
          <Field label="Nome completo da associação">
            <Input
              name="association_nome"
              defaultValue={association?.nome ?? ""}
              required
            />
          </Field>

          <Field label="CNPJ (se tiver)">
            <Input name="association_cnpj" defaultValue={association?.cnpj ?? ""} />
          </Field>
          <Field label="Tipo">
            <select
              name="association_tipo"
              defaultValue={
                association?.tipo === "formal"
                  ? "cooperativa"
                  : association?.tipo === "informal"
                    ? "coletivo"
                    : (association?.tipo ?? "associacao")
              }
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="associacao">Associação</option>
              <option value="cooperativa">Cooperativa</option>
              <option value="coletivo">Coletivo</option>
            </select>
          </Field>
          <Field label="Situação">
            <select
              name="association_situacao"
              defaultValue={association?.ativa === false ? "inativa" : "ativa"}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="ativa">Ativa</option>
              <option value="inativa">Inativa</option>
            </select>
          </Field>
          <Field label="Município">
            <Input name="association_municipio" defaultValue={association?.municipio} required />
          </Field>
          <Field label="Inscrição Municipal (se tiver)">
            <Input
              name="association_inscricao_municipal"
              defaultValue={association?.inscricao_municipal ?? ""}
            />
          </Field>
          <Field label="Inscrição Estadual (se tiver)">
            <Input
              name="association_inscricao_estadual"
              defaultValue={association?.inscricao_estadual ?? ""}
            />
          </Field>
          <Field label="Endereço completo da sede">
            <Input name="association_endereco_sede" defaultValue={association?.endereco_sede} />
          </Field>
          <Field label="Telefone">
            <Input
              name="association_telefone"
              type="tel"
              defaultValue={association?.telefone ?? ""}
            />
          </Field>
          <Field label="E-mail">
            <Input name="association_email" type="email" defaultValue={association?.email ?? ""} />
          </Field>
          <NumberField
            name="association_numero_inicial"
            label="Número inicial de associados/cooperados"
            defaultValue={association?.numero_associados_inicial}
          />
          <NumberField
            name="association_numero_atual"
            label="Número atual de associados/cooperados"
            defaultValue={association?.numero_associados_atual}
          />
          <NumberField name="homens" label="Quantos homens?" />
          <NumberField name="mulheres" label="Quantas mulheres?" />
          <Choice
            name="possui_pessoas_trans"
            label="Possui pessoas trans?"
            options={YN}
            value={choice("possui_pessoas_trans")}
            onChange={setChoice}
          />
          <Field label="Se sim, quantas e quais suas identidades?">
            <Textarea name="pessoas_trans_detalhes" />
          </Field>
          <Field label="Relação da autodeclaração racial dos associados" wide>
            <Textarea name="autodeclaracao_racial" />
          </Field>
        </Grid>
      </SocialSection>
      <SocialSection number="2" title="Gestão e organização">
        <Grid>
          <Field label="Nome do Presidente atual">
            <Input name="presidente_nome" />
          </Field>
          <Field label="Telefone">
            <Input name="presidente_telefone" type="tel" />
          </Field>
          <Field label="E-mail">
            <Input name="presidente_email" type="email" />
          </Field>
          <Field label="Nome do Vice-Presidente (se houver)">
            <Input name="vice_presidente_nome" />
          </Field>
          <Field label="Telefone">
            <Input name="vice_presidente_telefone" type="tel" />
          </Field>
          <Field label="E-mail">
            <Input name="vice_presidente_email" type="email" />
          </Field>
        </Grid>
      </SocialSection>
      <SocialSection number="3" title="Perfil socioeconômico e condições de vida dos catadores">
        <Grid>
          <Choice
            name="faixa_etaria_predominante"
            label="Qual a faixa etária predominante dos catadores?"
            options={["Até 25 anos", "26 a 40 anos", "41 a 60 anos", "Acima de 60 anos"]}
            value={choice("faixa_etaria_predominante", "")}
            onChange={setChoice}
          />
          <Choice
            name="escolaridade_predominante"
            label="Qual o nível de escolaridade predominante?"
            options={[
              "Não alfabetizado",
              "Ensino fundamental incompleto",
              "Ensino fundamental completo",
              "Ensino médio",
              "Ensino superior",
            ]}
            value={choice("escolaridade_predominante", "")}
            onChange={setChoice}
          />
          <NumberField
            name="media_moradores_casa"
            label="Em média, quantas pessoas moram na casa dos catadores?"
          />
          <Choice
            name="criancas_adolescentes_dependentes"
            label="Há crianças ou adolescentes dependentes da renda?"
            options={YN}
            value={choice("criancas_adolescentes_dependentes")}
            onChange={setChoice}
          />
          <Choice
            name="contribuicao_inss"
            label="Os catadores contribuem com o INSS?"
            options={YNSOME}
            value={choice("contribuicao_inss")}
            onChange={setChoice}
          />
          <Choice
            name="inscritos_cadunico"
            label="Estão inscritos no CadÚnico?"
            options={YNK}
            value={choice("inscritos_cadunico")}
            onChange={setChoice}
          />
          <Choice
            name="uso_epis"
            label="Utilizam Equipamentos de Proteção Individual (EPIs)?"
            options={["Sim, todos", "Parcialmente", "Não"]}
            value={choice("uso_epis")}
            onChange={setChoice}
          />
          <Choice
            name="cooperativa_fornece_epis"
            label="A cooperativa fornece esses equipamentos?"
            options={YN}
            value={choice("cooperativa_fornece_epis")}
            onChange={setChoice}
          />
          <Choice
            name="acidentes_ultimo_ano"
            label="Houve acidentes de trabalho no último ano?"
            options={YN}
            value={choice("acidentes_ultimo_ano")}
            onChange={setChoice}
          />
          <Field label="Se sim, qual o tipo de acidente?">
            <Textarea name="acidentes_tipo" />
          </Field>
          <Field label="Principais problemas de saúde identificados" wide>
            <Textarea name="problemas_saude" />
          </Field>
        </Grid>
      </SocialSection>
      <SocialSection number="4" title="Quanto ao trabalho e percepção">
        <Grid>
          <Choice
            name="media_horas_trabalhadas"
            label="Quantas horas por dia, em média, trabalham?"
            options={["Menos de 6 horas", "6 horas", "8 horas", "Mais de 8 horas"]}
            value={choice("media_horas_trabalhadas", "")}
            onChange={setChoice}
          />
          <Choice
            name="aumento_trabalho_festividades"
            label="O trabalho aumenta em períodos como Carnaval, São João e festas?"
            options={YN}
            value={choice("aumento_trabalho_festividades")}
            onChange={setChoice}
          />
          <Choice
            name="necessita_documentos"
            label="Algum associado precisa de atualização ou emissão de documentos?"
            options={YN}
            value={choice("necessita_documentos")}
            onChange={setChoice}
          />
          <Field label="Se sim, quais?">
            <Textarea name="documentos_necessarios" />
          </Field>
          <Choice
            name="recebe_beneficios"
            label="Algum associado possui Bolsa Família ou outro benefício?"
            options={YN}
            value={choice("recebe_beneficios")}
            onChange={setChoice}
          />
          <NumberField name="quantidade_beneficiarios" label="Se sim, quantos?" />
          <Choice
            name="reconhecimento_sociedade"
            label="Os catadores se sentem reconhecidos pela sociedade?"
            options={["Sim", "Não", "Parcialmente"]}
            value={choice("reconhecimento_sociedade")}
            onChange={setChoice}
          />
          <Choice
            name="relatos_preconceito"
            label="Relatam situações de preconceito?"
            options={YN}
            value={choice("relatos_preconceito")}
            onChange={setChoice}
          />
          <Field label="Se sim, quais?" wide>
            <Textarea name="preconceito_detalhes" />
          </Field>
        </Grid>
      </SocialSection>
      <SocialSection number="5" title="Trajetória e futuro">
        <Grid>
          <Field label="Principais motivos de entrada na reciclagem" wide>
            <Textarea name="motivos_entrada_reciclagem" />
          </Field>
          <Choice
            name="historico_trabalho_infantil"
            label="Há histórico de trabalho infantil entre os catadores?"
            options={YN}
            value={choice("historico_trabalho_infantil")}
            onChange={setChoice}
          />
          <NumberField name="quantidade_trabalho_infantil" label="Se sim, quantos?" />
          <Choice
            name="interesse_capacitacao"
            label="Há interesse em capacitação ou cursos?"
            options={YN}
            value={choice("interesse_capacitacao")}
            onChange={setChoice}
          />
          <Field label="Se sim, quais?">
            <Textarea name="capacitacoes_interesse" />
          </Field>
        </Grid>
      </SocialSection>
      <SocialSection number="6" title="Coleta e venda">
        <Grid>
          <Choice
            name="tipo_coleta"
            label="A cooperativa faz coleta nas ruas ou em domicílios?"
            options={["Sim", "Não", "Faz coleta mista"]}
            value={choice("tipo_coleta", "")}
            onChange={setChoice}
          />
          <Field label="Qual o tipo de material coletado?" wide>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {MATERIAIS_OPTIONS.map((material) => (
                <label
                  key={material}
                  className="flex items-center gap-2 rounded-md border border-border p-3 text-sm"
                >
                  <Checkbox
                    checked={materials.includes(material)}
                    onCheckedChange={(checked) =>
                      setMaterials((current) =>
                        checked
                          ? [...current, material]
                          : current.filter((item) => item !== material),
                      )
                    }
                  />
                  {material}
                </label>
              ))}
            </div>
          </Field>
          <Choice
            name="realiza_triagem"
            label="Há separação/triagem dos materiais?"
            options={YN}
            value={choice("realiza_triagem")}
            onChange={setChoice}
          />
          <NumberField
            name="volumetria_toneladas_mes"
            label="Quantidade coletada (toneladas/mês)"
            step="0.001"
          />
          <NumberField
            name="renda_media_mensal"
            label="Renda média mensal dos catadores(as)"
            step="0.01"
          />
          <Choice
            name="possui_parcerias"
            label="Possui parceria com empresa ou instituição?"
            options={["Sim", "Não", "Outro"]}
            value={choice("possui_parcerias")}
            onChange={setChoice}
          />
          <Field label="Qual parceria?">
            <Textarea name="parcerias_detalhes" />
          </Field>
          <Choice
            name="destino_venda"
            label="Vende os materiais recicláveis para quem?"
            options={[
              "Diretamente para a indústria recicladora",
              "Intermediários / atravessadores",
              "Outro",
            ]}
            value={choice("destino_venda", "")}
            onChange={setChoice}
          />
        </Grid>
      </SocialSection>
      <SocialSection number="7" title="Principais compradores dos materiais recicláveis">
        <Grid>
          {SOCIAL_MATERIALS.map((material) => (
            <Field key={material.key} label={`Compradores de ${material.label}`}>
              <Textarea name={`comprador_${material.key}`} />
            </Field>
          ))}
        </Grid>
      </SocialSection>
      <SocialSection number="8" title="Preços de venda dos materiais recicláveis (valor do kg)">
        <Grid>
          {SOCIAL_MATERIALS.map((material) => (
            <NumberField
              key={material.key}
              name={`preco_${material.key}`}
              label={material.label}
              step="0.01"
            />
          ))}
        </Grid>
      </SocialSection>
      <SocialSection number="9" title="Estrutura e logística">
        <Grid>
          <Choice
            name="tipo_galpao"
            label="A associação/cooperativa possui galpão"
            options={["Próprio", "Alugado", "Cedido pela prefeitura", "Não possui galpão"]}
            value={choice("tipo_galpao", "")}
            onChange={setChoice}
          />
          <Choice
            name="possui_veiculos_maquinas"
            label="Possui veículos, máquinas e equipamentos?"
            options={YN}
            value={choice("possui_veiculos_maquinas")}
            onChange={setChoice}
          />
          {SOCIAL_EQUIPMENT.map((equipment) => (
            <NumberField
              key={equipment.key}
              name={`equipamento_${equipment.key}`}
              label={`Quantidade de ${equipment.label}`}
            />
          ))}
          <Field label="Outros, quais?" wide>
            <Textarea name="equipamentos_outros" />
          </Field>
        </Grid>
      </SocialSection>
      <SocialSection number="10" title="Programas e apoios">
        <Grid>
          <Choice
            name="recebeu_apoio_programas"
            label="Já recebeu apoio dos programas Pró-catador ou Cataforte?"
            options={YN}
            value={choice("recebeu_apoio_programas")}
            onChange={setChoice}
          />
          <Choice
            name="participa_movimentos"
            label="Participa dos movimentos nacionais, MNRC ou MESC?"
            options={YN}
            value={choice("participa_movimentos")}
            onChange={setChoice}
          />
          <Field label="Se sim, qual?">
            <Input name="movimento_qual" />
          </Field>
        </Grid>
      </SocialSection>
    </>
  );
}

function SocialSection({
  number,
  title,
  subtitle,
  children,
}: {
  number: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-destructive/30 bg-card p-5 shadow-card md:p-7">
      <div className="mb-6 flex gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-destructive text-destructive-foreground font-bold">
          {number}
        </span>
        <div>
          <h2 className="text-lg font-bold uppercase tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}
function text(data: FormData, key: string) {
  const value = String(data.get(key) ?? "").trim();
  return value || null;
}
function numberOrNull(data: FormData, key: string) {
  const value = String(data.get(key) ?? "");
  return value === "" ? null : Number(value);
}
function Module({ title, tone, children }: { title: string; tone: string; children: ReactNode }) {
  return (
    <section className={`mt-5 rounded-xl border bg-card p-5 shadow-card md:p-7 ${tone}`}>
      <h2 className="mb-6 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}
function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 md:grid-cols-2">{children}</div>;
}
function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}
function NumberField({
  name,
  label,
  step = "1",
  defaultValue = 0,
}: {
  name: string;
  label: string;
  step?: string;
  defaultValue?: number;
}) {
  return (
    <Field label={label}>
      <Input name={name} type="number" min="0" step={step} defaultValue={defaultValue} />
    </Field>
  );
}
function Choice({
  name,
  label,
  options,
  value,
  onChange,
  placeholder = "Selecione...",
}: {
  name: string;
  label: string;
  options: string[];
  value: string;
  onChange: (name: string, value: string) => void;
  placeholder?: string;
}) {
  const hasOutro = options.some((o) => o.toLowerCase() === "outro");
  const isOutro = value.toLowerCase() === "outro";
  return (
    <Field label={label}>
      <Select value={value || undefined} onValueChange={(next) => onChange(name, next)}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasOutro && isOutro && (
        <Input
          name={`${name}_outro`}
          placeholder="Especifique"
          maxLength={200}
          className="mt-2"
        />
      )}
    </Field>
  );
}

const INFRA_ESTADO = ["BOM", "REGULAR", "RUIM", "CRÍTICO", "Outro"];
const INFRA_FREQ = ["FREQUENTEMENTE", "MUITAS VEZES", "ALGUMAS VEZES", "POUCAS VEZES"];

function SectionDivider({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-lg border-l-4 border-primary bg-primary/10 px-4 py-3">
      <h2 className="text-base font-bold uppercase tracking-wide text-primary">{children}</h2>
    </div>
  );
}

function InfraSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-primary/30 bg-card p-5 shadow-card md:p-7">
      <h2 className="mb-5 text-lg font-bold uppercase tracking-tight text-primary">{title}</h2>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  );
}

function InfrastructureFields({
  association,
  choice,
  setChoice,
  entidades,
  entityId,
  onEntityChange,
}: {
  association: any;
  choice: (name: string, fallback?: string) => string;
  setChoice: (name: string, value: string) => void;
  entidades?: EntityOption[];
  entityId?: string;
  onEntityChange?: (id: string) => void;
}) {
  const orgName = association?.nome ?? "";
  return (
    <>
      <div className="rounded-xl border border-primary/40 bg-primary/5 p-5">
        <h1 className="text-xl font-bold">
          INFRAESTRUTURA, FORMULÁRIO DE DIAGNÓSTICO
          {orgName ? ` — ${orgName.toUpperCase()}` : ""}
        </h1>
      </div>

      <SectionDivider>Seção 1 — Identificação inicial</SectionDivider>

      <InfraSection title="1. Identificação inicial">
        <Field label="Quem fará as entrevistas?" wide>
          <Input name="infra_entrevistador" maxLength={300} />
        </Field>
      </InfraSection>

      <InfraSection title="2. Informações da organização">
        <Field label="Escolha entidade">
          <EntitySelectField
            name="infra_organizacao_nome"
            entidades={entidades}
            entityId={entityId}
            onEntityChange={onEntityChange}
            fallbackName={orgName}
          />
        </Field>

        <Field label="Cidade">
          <Input name="infra_cidade" defaultValue={association?.municipio ?? ""} maxLength={150} />
        </Field>
        <Field label="Endereço da sede / galpão" wide>
          <Input
            name="infra_endereco_sede"
            defaultValue={association?.endereco_sede ?? ""}
            maxLength={300}
          />
        </Field>
        <Choice
          name="infra_regime_ocupacao"
          label="Regime de ocupação"
          options={["PRÓPRIA", "CEDIDA", "ALUGADA"]}
          value={choice("infra_regime_ocupacao", "")}
          onChange={setChoice}
        />
        <NumberField name="infra_pessoas_total" label="Pessoas — Total" />
        <NumberField name="infra_pessoas_homens" label="Homens" />
        <NumberField name="infra_pessoas_mulheres" label="Mulheres" />
        <Field label="Especifique (outras identidades / observações)" wide>
          <Input name="infra_pessoas_especifique" maxLength={300} />
        </Field>
      </InfraSection>

      <SectionDivider>Seção 2 — Acesso, mobilidade e serviços públicos</SectionDivider>

      <InfraSection title="3. Acesso, mobilidade e serviços públicos">
        <Choice
          name="infra_via_acesso"
          label="Via de acesso"
          options={[
            "ASFALTO",
            "PLACAS CONCRETO",
            "BLOCOS",
            "INTERTRAVADO",
            "SEM PAVIMENTAÇÃO",
            "Outro",
          ]}
          value={choice("infra_via_acesso", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_via_estado"
          label="Estado da via"
          options={["BOM", "REGULAR", "RUIM", "CRÍTICO", "SEM PAVIMENTAÇÃO", "Outro"]}
          value={choice("infra_via_estado", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_via_pesados"
          label="Via suporta veículos pesados?"
          options={YN}
          value={choice("infra_via_pesados", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_transporte_coletivo"
          label="Transporte coletivo"
          options={[
            "NÃO",
            "ÔNIBUS",
            "MICRO-ÔNIBUS",
            "ALTERNATIVO LEGALIZADO",
            "METRÔ",
            "Outro",
          ]}
          value={choice("infra_transporte_coletivo", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_rotas_ciclaveis"
          label="Rotas cicláveis"
          options={["NÃO", "SIM NÃO-SEGREGADO", "SIM SEGREGADO"]}
          value={choice("infra_rotas_ciclaveis", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_calcadas"
          label="Possui calçadas?"
          options={YN}
          value={choice("infra_calcadas", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_calcadas_estado"
          label="Estado das calçadas"
          options={INFRA_ESTADO}
          value={choice("infra_calcadas_estado", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_sinalizacao"
          label="Possui sinalização?"
          options={YN}
          value={choice("infra_sinalizacao", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_sinalizacao_estado"
          label="Estado da sinalização"
          options={["BOM", "REGULAR", "RUIM", "Outro"]}
          value={choice("infra_sinalizacao_estado", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_iluminacao"
          label="Iluminação pública?"
          options={YN}
          value={choice("infra_iluminacao", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_iluminacao_estado"
          label="Funcionamento da iluminação"
          options={["BOM", "REGULAR", "RUIM", "Outro"]}
          value={choice("infra_iluminacao_estado", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_energia"
          label="Energia elétrica"
          options={["CONCESSÃO PÚBLICA", "ALTERNATIVO", "INADEQUADO (gatos)", "SEM ENERGIA"]}
          value={choice("infra_energia", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_agua"
          label="Água"
          options={[
            "SEM ABASTECIMENTO",
            "CONCESSÃO PÚBLICA",
            "POÇO ARTESIANO",
            "CAMINHÃO PIPA",
            "Outro",
          ]}
          value={choice("infra_agua", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_esgoto"
          label="Esgoto"
          options={[
            "SANEAMENTO PÚBLICO",
            "FOSSA SÉPTICA",
            "SEM DESTINAÇÃO ADEQUADA",
            "Outro",
          ]}
          value={choice("infra_esgoto", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_via_alaga"
          label="Drenagem — a via alaga?"
          options={YN}
          value={choice("infra_via_alaga", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_via_alaga_freq"
          label="Frequência (via)"
          options={INFRA_FREQ}
          value={choice("infra_via_alaga_freq", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_espaco_alaga"
          label="Drenagem — o espaço alaga?"
          options={YN}
          value={choice("infra_espaco_alaga", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_espaco_alaga_freq"
          label="Frequência (espaço)"
          options={INFRA_FREQ}
          value={choice("infra_espaco_alaga_freq", "")}
          onChange={setChoice}
        />
      </InfraSection>

      <SectionDivider>Seção 3 — Estrutura física</SectionDivider>

      <InfraSection title="4. Estrutura física — Acesso e estacionamento">
        <Choice
          name="infra_piso_suporta_pesados"
          label="Piso suporta veículos pesados?"
          options={YN}
          value={choice("infra_piso_suporta_pesados", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_portoes_largura"
          label="Portões com largura adequada?"
          options={YN}
          value={choice("infra_portoes_largura", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_espaco_manobra"
          label="Há espaço de manobra?"
          options={YN}
          value={choice("infra_espaco_manobra", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_vagas_estacionamento"
          label="Vagas de estacionamento?"
          options={YN}
          value={choice("infra_vagas_estacionamento", "")}
          onChange={setChoice}
        />
      </InfraSection>

      <InfraSection title="5. Muros e cercamentos">
        <Choice
          name="infra_muros_estado"
          label="Estado"
          options={["BOM", "REGULAR", "RUIM"]}
          value={choice("infra_muros_estado", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_muros_patologias"
          label="Patologias"
          options={["NENHUMA", "RACHADURAS", "INCLINADO", "FERRUGEM"]}
          value={choice("infra_muros_patologias", "")}
          onChange={setChoice}
        />
      </InfraSection>

      <InfraSection title="6. Fundações">
        <Choice
          name="infra_fundacoes_patologias"
          label="Patologias"
          options={["NENHUM", "RECALQUES", "TRINCAS", "EROSÃO", "UMIDADE CAPILARIDADE"]}
          value={choice("infra_fundacoes_patologias", "")}
          onChange={setChoice}
        />
      </InfraSection>

      <InfraSection title="7. Pisos">
        <Choice
          name="infra_piso_tipo"
          label="Tipo"
          options={[
            "GRANILITE",
            "CONCRETO DESEMPENADO",
            "CONCRETO SIMPLES",
            "CERÂMICO",
            "ROCHAS",
          ]}
          value={choice("infra_piso_tipo", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_piso_estado"
          label="Estado"
          options={["BOM", "REGULAR", "RUIM"]}
          value={choice("infra_piso_estado", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_piso_nivelamento"
          label="Nivelamento adequado?"
          options={YN}
          value={choice("infra_piso_nivelamento", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_piso_resistencia"
          label="Resistência adequada?"
          options={YN}
          value={choice("infra_piso_resistencia", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_piso_riscos"
          label="Há riscos?"
          options={YN}
          value={choice("infra_piso_riscos", "")}
          onChange={setChoice}
        />
      </InfraSection>

      <InfraSection title="8. Pilares e vigas">
        <Choice
          name="infra_pilares_material"
          label="Material"
          options={[
            "CONCRETADO LOCAL",
            "PRÉ-FABRICADO",
            "METÁLICO",
            "MADEIRA",
            "MISTO",
          ]}
          value={choice("infra_pilares_material", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_pilares_estado"
          label="Estado"
          options={["BOM", "REGULAR", "RUIM"]}
          value={choice("infra_pilares_estado", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_pilares_patologias"
          label="Patologias"
          options={[
            "NENHUMA",
            "FISSURAS",
            "FERRAGENS EXPOSTAS",
            "CORROSÃO",
            "FORA DE PRUMO",
            "UMIDADE",
            "IMPACTO",
          ]}
          value={choice("infra_pilares_patologias", "")}
          onChange={setChoice}
        />
      </InfraSection>

      <InfraSection title="9. Paredes">
        <Choice
          name="infra_paredes_tipo"
          label="Tipo"
          options={["ESTRUTURAL", "VEDAÇÃO", "MISTO"]}
          value={choice("infra_paredes_tipo", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_paredes_material"
          label="Material"
          options={[
            "BLOCOS CONCRETO",
            "BLOCOS CERÂMICOS",
            "TIJOLO MACIÇO",
            "ECOLÓGICO",
          ]}
          value={choice("infra_paredes_material", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_paredes_estado"
          label="Estado"
          options={["BOM", "REGULAR", "RUIM"]}
          value={choice("infra_paredes_estado", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_paredes_patologias"
          label="Patologias"
          options={[
            "NENHUMA",
            "FISSURAS",
            "FORA DE PRUMO",
            "UMIDADE",
            "MOFO",
            "REVESTIMENTO SOLTO",
            "IMPACTO",
          ]}
          value={choice("infra_paredes_patologias", "")}
          onChange={setChoice}
        />
      </InfraSection>

      <InfraSection title="10. Cobertura">
        <Choice
          name="infra_cobertura_tipo"
          label="Tipo"
          options={["TELHA CERÂMICA", "FIBROCIMENTO", "METÁLICA", "FIBRA", "LAJE"]}
          value={choice("infra_cobertura_tipo", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_cobertura_estrutura"
          label="Estrutura"
          options={["MADEIRA", "METÁLICA", "CONCRETO"]}
          value={choice("infra_cobertura_estrutura", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_cobertura_estado"
          label="Estado"
          options={["BOM", "REGULAR", "RUIM"]}
          value={choice("infra_cobertura_estado", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_cobertura_patologias"
          label="Patologias"
          options={[
            "NENHUMA",
            "GOTEIRAS",
            "TELHAS QUEBRADAS",
            "ESTRUTURA DANIFICADA",
            "CALHAS ENTUPIDAS",
          ]}
          value={choice("infra_cobertura_patologias", "")}
          onChange={setChoice}
        />
      </InfraSection>

      <InfraSection title="11. Limpeza e salubridade">
        <Choice
          name="infra_espaco_refeicao_descanso"
          label="Espaço de refeição / descanso"
          options={["Não", "Sim ambos", "Sim parcial"]}
          value={choice("infra_espaco_refeicao_descanso", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_agua_potavel"
          label="Água potável disponível?"
          options={YN}
          value={choice("infra_agua_potavel", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_banheiros_vestiarios"
          label="Banheiros / vestiários?"
          options={YN}
          value={choice("infra_banheiros_vestiarios", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_mofo_bolor"
          label="Presença de mofo / bolor?"
          options={YN}
          value={choice("infra_mofo_bolor", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_conforto_termico_inadequado"
          label="Conforto térmico inadequado?"
          options={YN}
          value={choice("infra_conforto_termico_inadequado", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_problemas_externos"
          label="Problemas externos"
          options={["Nenhum", "Acúmulo de material", "Vetores", "Mau cheiro"]}
          value={choice("infra_problemas_externos", "")}
          onChange={setChoice}
        />
        <Choice
          name="infra_pontos_agua_escoamento"
          label="Pontos de água / escoamento para limpeza?"
          options={YN}
          value={choice("infra_pontos_agua_escoamento", "")}
          onChange={setChoice}
        />
      </InfraSection>
    </>
  );
}
