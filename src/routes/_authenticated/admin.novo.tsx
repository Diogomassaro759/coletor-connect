import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { BackButton } from "@/components/ui/back-button";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { CatadorForm } from "@/components/admin/CatadorForm";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/novo")({
  beforeLoad: ({ context }) => {
    const ctx = context as unknown as {
      isRecenseador?: boolean;
      isAdmin?: boolean;
      isCoordenadorRecenseador?: boolean;
    };
    if (!ctx.isRecenseador && !ctx.isAdmin && !ctx.isCoordenadorRecenseador) {
      throw redirect({ to: "/admin" });
    }
  },
  head: () => ({ meta: [{ title: "Novo catador — RecicladoresBR" }] }),
  component: NovoCatadorPage,
});

function NovoCatadorPage() {
  return (
    <AdminShell>
      <BackButton label="Voltar à lista" />
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Cadastrar catador</h1>
        <p className="text-muted-foreground mt-1">
          Preencha o formulário completo. Vincule à entidade no primeiro bloco.
        </p>
      </div>
      <CatadorForm mode="create" />
    </AdminShell>
  );
}
