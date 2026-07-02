import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  Recycle,
  Camera,
  Upload,
  Check,
  X,
  Building2,
  UserRound,
  FileText,
  WalletCards,
} from "lucide-react";
import {
  GENERO_OPTIONS,
  RACA_OPTIONS,
  ESCOLARIDADE_OPTIONS,
  MATERIAIS_OPTIONS,
  NIVEL_GOV_BR_OPTIONS,
  isValidCPF,
  maskCPF,
  maskPhone,
} from "@/lib/catador-constants";
import { CameraCapture } from "./CameraCapture";

type DocKey =
  | "comprovante_residencia_url"
  | "cpf_foto_url"
  | "rg_cin_foto_url"
  | "titulo_eleitor_foto_url"
  | "ctps_foto_url"
  | "nis_foto_url";

const schema = z.object({
  association_id: z.string().uuid("Selecione uma entidade"),
  nome_cooperativa: z.string().trim().max(150).optional().or(z.literal("")),
  nome_completo: z.string().trim().max(150).optional().or(z.literal("")),
  genero: z.enum(["feminino", "masculino", "lgbtqia", "nao_responder"]).optional(),
  autodeclaracao_racial: z.string().optional().or(z.literal("")),
  escolaridade: z.string().optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .max(150)
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "E-mail inválido"),
  telefone: z.string().trim().max(20).optional().or(z.literal("")),
  endereco_completo: z.string().trim().max(500).optional().or(z.literal("")),
  cpf: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || isValidCPF(v), "CPF inválido"),
  rg_cin: z.string().trim().max(30).optional().or(z.literal("")),
  titulo_eleitor: z.string().trim().max(30).optional().or(z.literal("")),
  ctps: z.string().trim().max(30).optional().or(z.literal("")),
  nis: z.string().trim().max(30).optional().or(z.literal("")),
  renda_media_mensal: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().min(0, "Valor inválido").optional(),
  ),
  contribui_inss: z.boolean().default(false),
  inscrito_cadunico: z.boolean().default(false),
  possui_bolsa_familia: z.boolean().default(false),
  conta_bancaria_digital: z.string().trim().max(100).optional().or(z.literal("")),
  cadastro_gov_br: z.boolean().default(false),
  nivel_cadastro_gov_br: z.string().optional().or(z.literal("")),
  materiais_coletados: z.array(z.string()).default([]),
  possui_carroca: z.boolean().default(false),
  tipo_carroca: z.string().optional().or(z.literal("")),
  area_atuacao: z.string().trim().max(500).optional().or(z.literal("")),
});



export type CatadorFormData = z.infer<typeof schema>;

export function CatadorForm({
  defaultValues,
  catadorId,
  mode = "create",
  associationId,
  associationName,
}: {
  defaultValues?: Partial<CatadorFormData> & Partial<Record<DocKey, string | null>>;
  catadorId?: string;
  mode?: "create" | "edit";
  associationId?: string;
  associationName?: string;
}) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [urls, setUrls] = useState<Record<DocKey, string | null>>({
    comprovante_residencia_url: defaultValues?.comprovante_residencia_url ?? null,
    cpf_foto_url: defaultValues?.cpf_foto_url ?? null,
    rg_cin_foto_url: defaultValues?.rg_cin_foto_url ?? null,
    titulo_eleitor_foto_url: defaultValues?.titulo_eleitor_foto_url ?? null,
    ctps_foto_url: defaultValues?.ctps_foto_url ?? null,
    nis_foto_url: defaultValues?.nis_foto_url ?? null,
  });
  const [naoTem, setNaoTem] = useState({
    nome: false,
    genero: false,
    raca: false,
    escolaridade: false,
    cpf: false,
    rg: false,
    renda: false,
    materiais: false,
    email: false,
    telefone: false,
    endereco: false,
    comprovante_residencia: false,
    cpf_foto: false,
    rg_foto: false,
    titulo_foto: false,
    ctps_foto: false,
    nis_foto: false,
  });
  type SimNaoKey =
    | "contribui_inss"
    | "inscrito_cadunico"
    | "possui_bolsa_familia"
    | "cadastro_gov_br"
    | "possui_carroca";
  const [simNaoTouched, setSimNaoTouched] = useState<Record<SimNaoKey, boolean>>({
    contribui_inss: mode === "edit",
    inscrito_cadunico: mode === "edit",
    possui_bolsa_familia: mode === "edit",
    cadastro_gov_br: mode === "edit",
    possui_carroca: mode === "edit",
  });
  function markSimNaoTouched(key: SimNaoKey) {
    setSimNaoTouched((s) => ({ ...s, [key]: true }));
  }
  const { data: associations = [] } = useQuery({
    queryKey: ["associations-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("associations")
        .select("id,nome")
        .eq("ativa", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<CatadorFormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      association_id: associationId ?? "",
      nome_cooperativa: "",
      nome_completo: "",
      genero: "nao_responder",
      autodeclaracao_racial: "",
      escolaridade: "",
      email: "",
      telefone: "",
      endereco_completo: "",
      cpf: "",
      rg_cin: "",
      titulo_eleitor: "",
      ctps: "",
      nis: "",
      renda_media_mensal: 0,
      contribui_inss: false,
      inscrito_cadunico: false,
      possui_bolsa_familia: false,
      conta_bancaria_digital: "",
      cadastro_gov_br: false,
      nivel_cadastro_gov_br: "",
      materiais_coletados: [],
      possui_carroca: false,
      tipo_carroca: "",
      area_atuacao: "",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (mode !== "create") return;
    const draftKey = associationId
      ? `procate-catador-draft-${associationId}`
      : "procate-catador-draft";
    const draft = localStorage.getItem(draftKey);
    if (draft) {
      try {
        form.reset({
          ...form.getValues(),
          ...JSON.parse(draft),
          ...(associationId ? { association_id: associationId } : {}),
        });
        toast.info("Rascunho recuperado", {
          description: "Os dados salvos neste aparelho foram restaurados.",
        });
      } catch {
        localStorage.removeItem(draftKey);
      }
    }
    const subscription = form.watch((values) =>
      localStorage.setItem(draftKey, JSON.stringify(values)),
    );
    return () => subscription.unsubscribe();
  }, [associationId, form, mode]);

  async function onSubmit(values: CatadorFormData) {
    setSubmitting(true);
    const association = associations.find((item) => item.id === values.association_id);
    const payload = {
      ...values,
      association_id: values.association_id,
      nome_completo: naoTem.nome ? null : values.nome_completo?.trim() || null,
      genero: naoTem.genero ? null : values.genero ?? null,
      autodeclaracao_racial: naoTem.raca ? null : values.autodeclaracao_racial || null,
      escolaridade: naoTem.escolaridade ? null : values.escolaridade || null,
      cpf: naoTem.cpf ? null : values.cpf || null,
      rg_cin: naoTem.rg ? null : values.rg_cin || null,
      email: naoTem.email ? null : values.email || null,
      telefone: naoTem.telefone ? null : values.telefone || null,
      endereco_completo: naoTem.endereco ? null : values.endereco_completo || null,
      renda_media_mensal:
        naoTem.renda || values.renda_media_mensal === undefined
          ? null
          : values.renda_media_mensal,
      materiais_coletados: naoTem.materiais ? [] : values.materiais_coletados ?? [],
      contribui_inss: simNaoTouched.contribui_inss ? !!values.contribui_inss : null,
      inscrito_cadunico: simNaoTouched.inscrito_cadunico ? !!values.inscrito_cadunico : null,
      possui_bolsa_familia: simNaoTouched.possui_bolsa_familia
        ? !!values.possui_bolsa_familia
        : null,
      cadastro_gov_br: simNaoTouched.cadastro_gov_br ? !!values.cadastro_gov_br : null,
      possui_carroca: simNaoTouched.possui_carroca ? !!values.possui_carroca : null,
      nome_cooperativa: associationName ?? association?.nome ?? (values.nome_cooperativa || null),
      titulo_eleitor: values.titulo_eleitor || null,
      ctps: values.ctps || null,
      nis: values.nis || null,
      conta_bancaria_digital: values.conta_bancaria_digital || null,
      nivel_cadastro_gov_br: values.cadastro_gov_br ? values.nivel_cadastro_gov_br || null : null,
      tipo_carroca: values.possui_carroca ? values.tipo_carroca || null : null,
      area_atuacao: values.area_atuacao || null,
      comprovante_residencia_url: naoTem.comprovante_residencia
        ? null
        : urls.comprovante_residencia_url,
      cpf_foto_url: naoTem.cpf_foto ? null : urls.cpf_foto_url,
      rg_cin_foto_url: naoTem.rg_foto ? null : urls.rg_cin_foto_url,
      titulo_eleitor_foto_url: naoTem.titulo_foto ? null : urls.titulo_eleitor_foto_url,
      ctps_foto_url: naoTem.ctps_foto ? null : urls.ctps_foto_url,
      nis_foto_url: naoTem.nis_foto ? null : urls.nis_foto_url,
    };

    const { error } =
      mode === "edit" && catadorId
        ? await supabase.from("catadores").update(payload).eq("id", catadorId)
        : await supabase.from("catadores").insert(payload);

    setSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        toast.error("CPF já cadastrado", { description: "Esse CPF já existe no sistema." });
      } else {
        toast.error("Erro ao salvar", { description: error.message });
      }
      return;
    }
    localStorage.removeItem(
      associationId ? `procate-catador-draft-${associationId}` : "procate-catador-draft",
    );
    toast.success(mode === "edit" ? "Cadastro atualizado!" : "Catador cadastrado com sucesso!");
    if (associationId) {
      navigate({ to: "/admin/associacoes/$id", params: { id: associationId } });
    } else {
      navigate({ to: "/admin" });
    }
  }

  const v = form.watch();
  const e = form.formState.errors;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit as any, (errors) => {
        const first = Object.values(errors)[0] as { message?: string } | undefined;
        toast.error(first?.message ? `Verifique: ${first.message}` : "Verifique os campos destacados.");
      })}
      className="mx-auto grid max-w-6xl items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]"
    >
      <aside className="rounded-3xl border border-border bg-card p-5 shadow-card lg:sticky lg:top-24">
        <div className="mb-6 flex items-center gap-3 border-b border-border pb-5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Recycle className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-display font-bold">RecicladoresBR</p>
            <p className="text-xs text-muted-foreground">Projeto PROCATE</p>
          </div>
        </div>
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Blocos do cadastro
        </p>
        <nav className="space-y-2" aria-label="Seções do cadastro">
          <StepLink
            href="#instituicao"
            n="01"
            label="Instituição"
            icon={<Building2 className="size-4" />}
            active
          />
          <StepLink
            href="#identificacao"
            n="02"
            label="Dados pessoais"
            icon={<UserRound className="size-4" />}
          />
          <StepLink
            href="#documentos"
            n="03"
            label="Documentação"
            icon={<FileText className="size-4" />}
          />
          <StepLink
            href="#social"
            n="04"
            label="Situação social"
            icon={<WalletCards className="size-4" />}
          />
          <StepLink
            href="#coleta"
            n="05"
            label="Atuação na coleta"
            icon={<Recycle className="size-4" />}
          />
        </nav>
        <div className="mt-6 rounded-2xl border border-warning/40 bg-accent p-4 text-xs leading-relaxed text-accent-foreground">
          <strong className="block font-display">Proteção dos dados</strong>
          As informações são usadas exclusivamente pelo projeto e protegidas conforme a LGPD.
        </div>
      </aside>

      <div className="min-w-0 space-y-6">
        <header className="relative overflow-hidden rounded-3xl bg-gradient-hero p-7 text-primary-foreground shadow-soft md:p-9">
          <div className="absolute inset-x-0 top-0 flex h-1.5">
            <span className="flex-1 bg-secondary" />
            <span className="flex-1 bg-warning" />
            <span className="flex-1 bg-primary" />
          </div>
          <p className="mb-3 inline-flex rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em]">
            Projeto Catador Empreendedor
          </p>
          <h2 className="text-2xl font-extrabold md:text-3xl">Cidadania na Economia Circular</h2>
          <p className="mt-1 text-sm font-medium uppercase tracking-wider text-primary-foreground/75">
            Segmento da reciclagem
          </p>
        </header>

        <section
          id="instituicao"
          className="scroll-mt-24 rounded-3xl border border-border bg-card p-6 shadow-card md:p-8"
        >
          <SectionTitle
            icon={<Building2 className="size-5" />}
            title="Instituição de origem"
            description="Vincule o cadastro à entidade correspondente."
            tone="red"
          />
          <Linha label="Cooperativa / Associação / Grupo">
            {associationId ? (
              <div className="flex min-h-10 items-center rounded-md border border-input bg-muted px-3 text-sm font-medium">
                {associationName ?? "Entidade selecionada"}
              </div>
            ) : (
              <Select
                value={v.association_id}
                onValueChange={(value) =>
                  form.setValue("association_id", value, { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione na lista oficial" />
                </SelectTrigger>
                <SelectContent>
                  {associations.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {e.association_id?.message && (
              <p className="text-xs text-destructive">{e.association_id.message}</p>
            )}
          </Linha>
        </section>

        <section
          id="identificacao"
          className="scroll-mt-24 space-y-7 rounded-3xl border border-border bg-card p-6 shadow-card md:p-8"
        >
          <SectionTitle
            icon={<UserRound className="size-5" />}
            title="Identificação e contato"
            description="Dados pessoais e informações para contato."
            tone="blue"
          />
          <Item n={1} label="Nome completo do(a) Catador(a):" error={e.nome_completo?.message}>
            <Input {...form.register("nome_completo")} disabled={naoTem.nome} />
            <NaoInformar
              checked={naoTem.nome}
              onChange={(c) => setNaoTem((s) => ({ ...s, nome: c }))}
            />
          </Item>

          <Item n={2} label="Gênero:" error={e.genero?.message}>
            <RadioGroup
              value={v.genero}
              onValueChange={(val) => form.setValue("genero", val as CatadorFormData["genero"])}
              className="flex flex-wrap gap-x-6 gap-y-2"
              disabled={naoTem.genero}
            >
              {GENERO_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 cursor-pointer text-sm">
                  <RadioGroupItem value={o.value} />
                  <span>{o.label}</span>
                </label>
              ))}
            </RadioGroup>
            <NaoInformar
              checked={naoTem.genero}
              onChange={(c) => setNaoTem((s) => ({ ...s, genero: c }))}
            />
          </Item>

          <Item n={3} label="Autodeclaração racial:" error={e.autodeclaracao_racial?.message}>
            <Select
              value={v.autodeclaracao_racial}
              onValueChange={(val) => form.setValue("autodeclaracao_racial", val)}
              disabled={naoTem.raca}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {RACA_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <NaoInformar
              checked={naoTem.raca}
              onChange={(c) => setNaoTem((s) => ({ ...s, raca: c }))}
            />
          </Item>

          <Item n={4} label="Escolaridade:" error={e.escolaridade?.message}>
            <Select
              value={v.escolaridade}
              onValueChange={(val) => form.setValue("escolaridade", val)}
              disabled={naoTem.escolaridade}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {ESCOLARIDADE_OPTIONS.map((x) => (
                  <SelectItem key={x} value={x}>
                    {x}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <NaoInformar
              checked={naoTem.escolaridade}
              onChange={(c) => setNaoTem((s) => ({ ...s, escolaridade: c }))}
            />
          </Item>

          <Item n={5} label="E-mail:" error={e.email?.message}>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Input
                type="email"
                {...form.register("email")}
                disabled={naoTem.email}
                className="flex-1"
              />
              <NaoTem
                checked={naoTem.email}
                onChange={(c) => setNaoTem((s) => ({ ...s, email: c }))}
              />
            </div>
          </Item>

          <Item n={6} label="Número Telefone:">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Input
                value={v.telefone ?? ""}
                disabled={naoTem.telefone}
                onChange={(ev) => form.setValue("telefone", maskPhone(ev.target.value))}
                placeholder="(00) 00000-0000"
                className="flex-1"
              />
              <NaoTem
                checked={naoTem.telefone}
                onChange={(c) => setNaoTem((s) => ({ ...s, telefone: c }))}
              />
            </div>
          </Item>

          <Item
            n={7}
            label="Endereço residencial completo (logradouro, número, complemento, bairro, município):"
            error={e.endereco_completo?.message}
          >
            <div className="space-y-2">
              <Textarea
                {...form.register("endereco_completo")}
                rows={3}
                disabled={naoTem.endereco}
                placeholder={naoTem.endereco ? "Sem endereço informado" : ""}
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Checkbox
                  checked={naoTem.endereco}
                  onCheckedChange={(c) => setNaoTem((s) => ({ ...s, endereco: !!c }))}
                />
                <span>Não tem endereço fixo / não informado</span>
              </label>
            </div>
            <Anexo
              label="Foto de comprovante de residência"
              fieldKey="comprovante_residencia_url"
              url={urls.comprovante_residencia_url}
              onUpload={(u) => setUrls((s) => ({ ...s, comprovante_residencia_url: u }))}
              checked={naoTem.comprovante_residencia}
              onChange={(c) => setNaoTem((s) => ({ ...s, comprovante_residencia: c }))}
            />
          </Item>
        </section>

        <section
          id="documentos"
          className="scroll-mt-24 space-y-7 rounded-3xl border border-border bg-card p-6 shadow-card md:p-8"
        >
          <SectionTitle
            icon={<FileText className="size-5" />}
            title="Documentação"
            description="Documentos de identificação e respectivos anexos."
            tone="yellow"
          />
          <Item n={8} label="CPF:" error={e.cpf?.message}>
            <Input
              value={v.cpf}
              onChange={(ev) =>
                form.setValue("cpf", maskCPF(ev.target.value), { shouldValidate: true })
              }
              placeholder="000.000.000-00"
              disabled={naoTem.cpf}
            />
            <NaoInformar
              checked={naoTem.cpf}
              onChange={(c) => setNaoTem((s) => ({ ...s, cpf: c }))}
            />
            <Anexo
              label="Foto do CPF (frente e verso)"
              fieldKey="cpf_foto_url"
              url={urls.cpf_foto_url}
              onUpload={(u) => setUrls((s) => ({ ...s, cpf_foto_url: u }))}
              checked={naoTem.cpf_foto}
              onChange={(c) => setNaoTem((s) => ({ ...s, cpf_foto: c }))}
            />
          </Item>

          <Item n={9} label="RG / CIN:" error={e.rg_cin?.message}>
            <Input {...form.register("rg_cin")} disabled={naoTem.rg} />
            <NaoInformar
              checked={naoTem.rg}
              onChange={(c) => setNaoTem((s) => ({ ...s, rg: c }))}
            />
            <Anexo
              label="Foto do RG / CIN (frente e verso)"
              fieldKey="rg_cin_foto_url"
              url={urls.rg_cin_foto_url}
              onUpload={(u) => setUrls((s) => ({ ...s, rg_cin_foto_url: u }))}
              checked={naoTem.rg_foto}
              onChange={(c) => setNaoTem((s) => ({ ...s, rg_foto: c }))}
            />
          </Item>

          <Item n={10} label="Título de Eleitor:">
            <Input {...form.register("titulo_eleitor")} />
            <Anexo
              label="Foto do Título de Eleitor"
              fieldKey="titulo_eleitor_foto_url"
              url={urls.titulo_eleitor_foto_url}
              onUpload={(u) => setUrls((s) => ({ ...s, titulo_eleitor_foto_url: u }))}
              checked={naoTem.titulo_foto}
              onChange={(c) => setNaoTem((s) => ({ ...s, titulo_foto: c }))}
            />
          </Item>

          <Item n={11} label="CTPS:">
            <Input {...form.register("ctps")} />
            <Anexo
              label="Foto da CTPS"
              fieldKey="ctps_foto_url"
              url={urls.ctps_foto_url}
              onUpload={(u) => setUrls((s) => ({ ...s, ctps_foto_url: u }))}
              checked={naoTem.ctps_foto}
              onChange={(c) => setNaoTem((s) => ({ ...s, ctps_foto: c }))}
            />
          </Item>

          <Item n={12} label="NIS:">
            <Input {...form.register("nis")} />
            <Anexo
              label="Foto do NIS"
              fieldKey="nis_foto_url"
              url={urls.nis_foto_url}
              onUpload={(u) => setUrls((s) => ({ ...s, nis_foto_url: u }))}
              checked={naoTem.nis_foto}
              onChange={(c) => setNaoTem((s) => ({ ...s, nis_foto: c }))}
            />
          </Item>
        </section>

        <section
          id="social"
          className="scroll-mt-24 space-y-7 rounded-3xl border border-border bg-card p-6 shadow-card md:p-8"
        >
          <SectionTitle
            icon={<WalletCards className="size-5" />}
            title="Situação socioeconômica"
            description="Renda, benefícios e acesso a serviços digitais."
            tone="red"
          />
          <Item n={13} label="Qual a renda média mensal?" error={e.renda_media_mensal?.message}>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...form.register("renda_media_mensal")}
              placeholder="R$"
              disabled={naoTem.renda}
            />
            <NaoInformar
              checked={naoTem.renda}
              onChange={(c) => setNaoTem((s) => ({ ...s, renda: c }))}
            />
          </Item>

          <SimNao
            n={14}
            label="Contribui com o INSS?"
            value={v.contribui_inss}
            touched={simNaoTouched.contribui_inss}
            onChange={(b) => { form.setValue("contribui_inss", b); markSimNaoTouched("contribui_inss"); }}
          />
          <SimNao
            n={15}
            label="Inscrito(a) no CadÚnico?"
            value={v.inscrito_cadunico}
            touched={simNaoTouched.inscrito_cadunico}
            onChange={(b) => { form.setValue("inscrito_cadunico", b); markSimNaoTouched("inscrito_cadunico"); }}
          />
          <SimNao
            n={16}
            label="Possui Bolsa Família?"
            value={v.possui_bolsa_familia}
            touched={simNaoTouched.possui_bolsa_familia}
            onChange={(b) => { form.setValue("possui_bolsa_familia", b); markSimNaoTouched("possui_bolsa_familia"); }}
          />

          <Item n={17} label="Conta bancária digital (App Caixa Tem):">
            <Input {...form.register("conta_bancaria_digital")} placeholder="(opcional)" />
          </Item>

          <SimNao
            n={18}
            label="Cadastro no gov.br?"
            value={v.cadastro_gov_br}
            touched={simNaoTouched.cadastro_gov_br}
            onChange={(b) => { form.setValue("cadastro_gov_br", b); markSimNaoTouched("cadastro_gov_br"); }}
          />

          {v.cadastro_gov_br && (
            <Item n={19} label="Se tem cadastro no gov.br, qual Nível:">
              <RadioGroup
                value={v.nivel_cadastro_gov_br ?? ""}
                onValueChange={(val) => form.setValue("nivel_cadastro_gov_br", val)}
                className="flex flex-wrap gap-x-6 gap-y-2"
              >
                {NIVEL_GOV_BR_OPTIONS.map((n) => (
                  <label key={n} className="flex items-center gap-2 cursor-pointer text-sm">
                    <RadioGroupItem value={n} />
                    <span>{n}</span>
                  </label>
                ))}
              </RadioGroup>
            </Item>
          )}
        </section>

        <section
          id="coleta"
          className="scroll-mt-24 space-y-7 rounded-3xl border border-border bg-card p-6 shadow-card md:p-8"
        >
          <SectionTitle
            icon={<Recycle className="size-5" />}
            title="Atuação na coleta"
            description="Materiais, equipamentos e região de trabalho."
            tone="blue"
          />
          <Item n={20} label="Materiais coletados:" error={e.materiais_coletados?.message}>
            <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${naoTem.materiais ? "opacity-50 pointer-events-none" : ""}`}>
              {MATERIAIS_OPTIONS.map((m) => {
                const checked = v.materiais_coletados.includes(m);
                return (
                  <label
                    key={m}
                    className="flex items-center gap-2 border border-border rounded-md px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(c) => {
                        const set = new Set(v.materiais_coletados);
                        if (c) set.add(m);
                        else set.delete(m);
                        form.setValue("materiais_coletados", Array.from(set), {
                          shouldValidate: true,
                        });
                      }}
                    />
                    <span>{m}</span>
                  </label>
                );
              })}
            </div>
            <NaoInformar
              checked={naoTem.materiais}
              onChange={(c) => setNaoTem((s) => ({ ...s, materiais: c }))}
              label="Não informar materiais coletados"
            />
          </Item>

          <SimNao
            n={21}
            label="Possui carroça?"
            value={v.possui_carroca}
            touched={simNaoTouched.possui_carroca}
            onChange={(b) => { form.setValue("possui_carroca", b); markSimNaoTouched("possui_carroca"); }}
          />

          {v.possui_carroca && (
            <Item n={22} label="Tipo de carroça:">
              <RadioGroup
                value={v.tipo_carroca ?? ""}
                onValueChange={(val) => form.setValue("tipo_carroca", val)}
                className="flex gap-6"
              >
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="Manual" /> Manual
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <RadioGroupItem value="Motorizada" /> Motorizada
                </label>
              </RadioGroup>
            </Item>
          )}

          <Item n={23} label="Área de atuação:">
            <Textarea
              {...form.register("area_atuacao")}
              rows={2}
              placeholder="Bairros, regiões, pontos de coleta..."
            />
          </Item>
        </section>

        <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-soft backdrop-blur sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => navigate({ to: "/admin" })}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting} size="lg">
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {mode === "edit" ? "Salvar alterações" : "Finalizar cadastro"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function StepLink({
  href,
  n,
  label,
  icon,
  active = false,
}: {
  href: string;
  n: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <a
      href={href}
      className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition-colors ${active ? "border-primary/20 bg-primary-soft text-primary" : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground"}`}
    >
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-full ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="mr-2 text-[10px] font-bold opacity-60">{n}</span>
        <span className="font-semibold">{label}</span>
      </span>
    </a>
  );
}

function SectionTitle({
  icon,
  title,
  description,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tone: "red" | "blue" | "yellow";
}) {
  const toneClass =
    tone === "red"
      ? "bg-secondary text-secondary-foreground"
      : tone === "yellow"
        ? "bg-warning text-warning-foreground"
        : "bg-primary text-primary-foreground";
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b border-border pb-5">
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${toneClass}`}>
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
        <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function Item({
  n,
  label,
  error,
  children,
}: {
  n: number;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="flex gap-2 text-sm font-semibold text-foreground leading-snug">
        <span className="text-primary font-bold shrink-0">{n}.</span>
        <span>{label}</span>
      </label>
      <div className="pl-6">{children}</div>
      {error && <p className="text-xs text-destructive pl-6">{error}</p>}
    </div>
  );
}

function Linha({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 pb-2 border-b border-dashed border-border">
      <label className="text-sm font-semibold text-foreground">{label}</label>
      {children}
    </div>
  );
}

function NaoInformar({
  checked,
  onChange,
  label = "Não informar / não tem",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(c) => onChange(!!c)} />
      <span>{label}</span>
    </label>
  );
}

function SimNao({
  n,
  label,
  value,
  onChange,
  touched = true,
}: {
  n: number;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  touched?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="flex flex-wrap items-center gap-4 text-sm font-semibold">
        <span className="flex gap-2">
          <span className="text-primary font-bold">{n}.</span>
          <span>{label}</span>
          {!touched && <span className="text-xs text-destructive font-normal">(selecione)</span>}
        </span>
        <div className="flex gap-4 pl-6 sm:pl-0">
          <label className="flex items-center gap-2 cursor-pointer font-normal">
            <input
              type="radio"
              checked={touched && value === true}
              onChange={() => onChange(true)}
              className="accent-primary"
            />
            <span>SIM</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer font-normal">
            <input
              type="radio"
              checked={touched && value === false}
              onChange={() => onChange(false)}
              className="accent-primary"
            />
            <span>NÃO</span>
          </label>
        </div>
      </label>
    </div>
  );
}

function Anexo({
  label,
  fieldKey,
  url,
  onUpload,
  checked,
  onChange,
}: {
  label: string;
  fieldKey: DocKey;
  url: string | null;
  onUpload: (url: string | null) => void;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [camOpen, setCamOpen] = useState(false);
  const fileId = `${fieldKey}-file`;

  async function handleFile(file: File) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande", { description: "Máx. 10 MB." });
      return;
    }
    setBusy(true);
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${fieldKey}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("catadores-docs")
      .upload(path, file, { upsert: false, contentType: file.type || "image/jpeg" });
    setBusy(false);
    if (error) {
      toast.error("Falha no envio", { description: error.message });
      return;
    }
    onUpload(path);
    toast.success("Foto enviada!");
  }

  async function handleRemove() {
    if (!url) return;
    await supabase.storage.from("catadores-docs").remove([url]);
    onUpload(null);
  }

  const hasFile = !!url && !checked;

  return (
    <div className="mt-2 text-xs bg-muted/40 rounded-md px-3 py-2 border border-border space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-muted-foreground">📎 {label}</span>
        <label className="flex items-center gap-2 cursor-pointer text-muted-foreground">
          <Checkbox checked={checked} onCheckedChange={(c) => onChange(!!c)} />
          <span>não tem</span>
        </label>
      </div>
      {!checked && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={fileId}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => setCamOpen(true)}
          >
            {busy ? <Loader2 className="size-3 animate-spin" /> : <Camera className="size-3" />}
            Tirar foto
          </Button>
          <CameraCapture
            open={camOpen}
            onOpenChange={setCamOpen}
            onCapture={(file) => handleFile(file)}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => document.getElementById(fileId)?.click()}
          >
            <Upload className="size-3" /> Enviar arquivo
          </Button>

          {hasFile && (
            <span className="flex items-center gap-1 text-success">
              <Check className="size-3" /> Anexado
              <button
                type="button"
                onClick={handleRemove}
                className="ml-1 text-muted-foreground hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function NaoTem({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
      <Checkbox checked={checked} onCheckedChange={(c) => onChange(!!c)} />
      <span>não tem</span>
    </label>
  );
}
