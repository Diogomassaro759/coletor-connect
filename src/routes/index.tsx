import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Users,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  LeafyGreen,
} from "lucide-react";
import procateLogo from "@/assets/procate-logo.png";
import heroImage from "@/assets/hero-reciclagem.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RecicladoresBR — Plataforma de Cadastro de Catadores" },
      {
        name: "description",
        content:
          "Plataforma intuitiva para cadastrar catadores de materiais recicláveis e conectá-los a organizações e empresas comprometidas com a sustentabilidade.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" aria-label="PROCATE — Página inicial">
            <img
              src={procateLogo}
              alt="PROCATE — Projeto Catador Empreendedor"
              className="h-11 w-auto sm:h-12"
            />
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/auth">
              <Button>Acessar painel</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,color-mix(in_oklab,var(--color-primary-foreground)_20%,transparent)_0%,transparent_40%),radial-gradient(circle_at_80%_70%,color-mix(in_oklab,var(--color-success)_25%,transparent)_0%,transparent_35%)]" />
        <div className="container relative mx-auto px-4 py-20 md:py-28 text-primary-foreground">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium ring-1 ring-white/20 backdrop-blur-sm">
                <LeafyGreen className="size-3.5" />
                Sustentabilidade & inclusão social
              </div>
              <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight text-balance">
                Dignidade e dados para quem move a reciclagem.
              </h1>
              <p className="mt-6 text-lg md:text-xl text-white/90 max-w-2xl">
                Cadastre, organize e dê visibilidade aos catadores de materiais recicláveis. Uma
                base confiável para cooperativas, organizações e empresas.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link to="/auth">
                  <Button size="lg" variant="secondary" className="text-base shadow-soft">
                    Acessar painel <ArrowRight className="ml-1 size-4" />
                  </Button>
                </Link>
                <a href="#sobre">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-base bg-white/10 text-white border-white/30 hover:bg-white/20 hover:text-white"
                  >
                    Saiba mais
                  </Button>
                </a>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="absolute -inset-6 rounded-[2rem] bg-white/10 ring-1 ring-white/20 backdrop-blur-sm" />
              <img
                src={heroImage}
                alt="Mãos entregando materiais recicláveis sobre um broto verde, simbolizando o ciclo da reciclagem"
                width={1536}
                height={1024}
                className="relative rounded-[1.75rem] shadow-2xl ring-1 ring-white/30 object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="sobre" className="container mx-auto px-4 py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl md:text-4xl font-bold">Uma plataforma feita para gestores</h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Ferramenta admin-first para registrar, filtrar e exportar dados de catadores com
            segurança e respeito à privacidade.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Users,
              title: "Cadastro assistido",
              desc: "Formulário em etapas para registrar catadores em nome deles, mesmo sem acesso à internet ou e-mail.",
            },
            {
              icon: BarChart3,
              title: "Filtros & exportação",
              desc: "Encontre catadores por material, escolaridade, programas sociais e exporte para CSV em um clique.",
            },
            {
              icon: ShieldCheck,
              title: "Dados protegidos",
              desc: "Acesso restrito por autenticação. Documentos armazenados em ambiente privado e criptografado.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl bg-card p-6 shadow-card border border-border">
              <div className="grid place-items-center size-11 rounded-xl bg-primary-soft text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pagamentos — Stripe */}
      <section id="pagamentos" className="container mx-auto px-4 py-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary ring-1 ring-primary/20">
            <Lock className="size-3.5" />
            Pagamentos seguros
          </div>
          <h2 className="mt-6 text-3xl md:text-4xl font-bold">
            Como a Stripe Protege Suas Transações Online
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            A Stripe não é um aplicativo de pagamento para o consumidor final: ela é uma{" "}
            <strong>infraestrutura de software (gateway)</strong> utilizada por empresas para
            processar pagamentos com segurança. Quando você compra um produto na internet e
            digita o número do seu cartão de crédito, muitas vezes é a tecnologia da Stripe que
            está validando e liquidando aquela transação de forma invisível.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* Como funciona */}
          <div className="rounded-2xl bg-card p-6 shadow-card border border-border">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center size-10 rounded-xl bg-primary-soft text-primary">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="text-xl font-semibold">Como a Stripe Funciona na Prática?</h3>
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              A Stripe atua como a <strong>ponte</strong> entre o cliente, a loja virtual e os
              bancos. Veja os principais passos:
            </p>
            <ul className="mt-5 space-y-4">
              {[
                {
                  icon: CreditCard,
                  title: "Captura de dados",
                  desc: "Fornece o formulário seguro para o cliente digitar os dados do cartão.",
                },
                {
                  icon: Lock,
                  title: "Segurança",
                  desc: "Criptografa as informações para proteger o número do cartão do vendedor.",
                },
                {
                  icon: ArrowRight,
                  title: "Processamento",
                  desc: "Envia a cobrança para a bandeira (Visa, Mastercard etc.) e para o banco.",
                },
                {
                  icon: Building2,
                  title: "Depósito",
                  desc: "Recebe o dinheiro e transfere o valor consolidado para a conta da empresa.",
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-3">
                  <div className="mt-0.5 grid place-items-center size-8 rounded-lg bg-muted text-primary shrink-0">
                    <item.icon className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">{item.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Meios de pagamento */}
          <div className="rounded-2xl bg-card p-6 shadow-card border border-border">
            <div className="flex items-center gap-3">
              <div className="grid place-items-center size-10 rounded-xl bg-primary-soft text-primary">
                <Wallet className="size-5" />
              </div>
              <h3 className="text-xl font-semibold">Principais Meios de Pagamento Suportados no Brasil</h3>
            </div>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              A tecnologia da Stripe permite aceitar diversos métodos de pagamento no Brasil:
            </p>
            <ul className="mt-5 space-y-3">
              {[
                "Pix (com aprovação instantânea)",
                "Cartões de Crédito e Débito (nacionais e internacionais)",
                "Parcelamento (com ou sem juros para o cliente)",
                "Carteiras Digitais (Apple Pay e Google Pay)",
              ].map((text) => (
                <li key={text} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Quem usa */}
        <div className="mt-6 rounded-2xl bg-card p-6 shadow-card border border-border">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center size-10 rounded-xl bg-primary-soft text-primary">
              <Globe className="size-5" />
            </div>
            <h3 className="text-xl font-semibold">Quem Costuma Usar a Stripe?</h3>
          </div>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            A Stripe é a escolha principal de empresas que precisam de alta personalização via{" "}
            <strong>APIs</strong> para criar experiências de pagamento sob medida. Os negócios que
            mais utilizam a Stripe incluem:
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: RefreshCcw,
                title: "Plataformas de Assinatura (SaaS)",
                desc: "Cobranças mensais automáticas e gestão de assinaturas.",
              },
              {
                icon: ArrowLeftRight,
                title: "Marketplaces",
                desc: "Divisão de pagamentos entre comprador, vendedor e plataforma (split).",
              },
              {
                icon: Globe,
                title: "E-commerces Globais",
                desc: "Vendas internacionais com conversão automática de moedas.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-xl bg-muted/50 p-4 border border-border"
              >
                <div className="grid place-items-center size-9 rounded-lg bg-primary-soft text-primary">
                  <item.icon className="size-4" />
                </div>
                <h4 className="mt-3 text-sm font-semibold">{item.title}</h4>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} RecicladoresBR — Construído com propósito.
        </div>
      </footer>
    </div>
  );
}
