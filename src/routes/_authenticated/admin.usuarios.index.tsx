import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Trash2, UserCog } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { BackButton } from "@/components/ui/back-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { listOperationalUsers, deleteOperationalUser } from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/admin/usuarios/")({
  beforeLoad: ({ context }) => {
    if (!context.isAdmin && !context.isCoordenador) throw redirect({ to: "/admin" });
  },

  component: UsuariosPage,
});

function UsuariosPage() {
  const { isAdmin } = Route.useRouteContext() as any;
  const list = useServerFn(listOperationalUsers);
  const remove = useServerFn(deleteOperationalUser);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["operational-users"],
    queryFn: () => list(),
  });

  const del = useMutation({
    mutationFn: (user_id: string) => remove({ data: { user_id } }),
    onSuccess: () => {
      toast.success("Usuário excluído.");
      qc.invalidateQueries({ queryKey: ["operational-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminShell>
      <BackButton />
      <div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <UserCog className="size-5 shrink-0 sm:size-6" />{" "}
            <span className="truncate">Usuários operacionais</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Recenseadores cadastram catadores; Consultores de Campo cadastram diagnósticos.
          </p>
        </div>
        {isAdmin && (
          <Link to="/admin/usuarios/novo" className="shrink-0">
            <Button size="sm" className="sm:size-default">
              <Plus className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Novo usuário</span>
            </Button>
          </Link>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">E-mail</TableHead>
                <TableHead className="hidden lg:table-cell">CPF</TableHead>
                <TableHead className="hidden lg:table-cell">Município</TableHead>
                <TableHead className="hidden sm:table-cell">Papéis</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Carregando…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && (data?.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum usuário cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {data?.map((u) => {
                const areaLabel: Record<string, string> = {
                  social: "Social",
                  juridico: "Jurídico",
                  contabil: "Contábil",
                  infraestrutura: "Infraestrutura",
                };
                const areaSuffix = u.area ? ` ${areaLabel[u.area] ?? u.area}` : "";
                const roleLabels = u.roles.map((r) =>
                  r === "admin"
                    ? "Administrador do Sistema"
                    : r === "recenseador"
                      ? "Recenseador"
                      : r === "coordenador_recenseador"
                        ? "Coordenador do Recenseamento"
                        : r === "coordenador"
                          ? `Coordenador${areaSuffix}`
                          : r === "consultor"
                            ? `Consultor${areaSuffix}`
                            : r,
                );
                return (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">
                      <div className="min-w-0">
                        <div className="truncate">{u.full_name}</div>
                        <div className="mt-0.5 truncate text-xs text-muted-foreground md:hidden">
                          {u.email}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
                          {roleLabels.map((label, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">
                              {label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="break-all">{u.email}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-xs">
                      {u.cpf ?? "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {u.municipio_referencia ?? "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {roleLabels.map((label, i) => (
                          <Badge key={i} variant="secondary">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isAdmin && (
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to="/admin/usuarios/$userId/editar"
                            params={{ userId: u.user_id }}
                          >
                            <Button variant="ghost" size="icon" title="Editar usuário">
                              <Pencil className="size-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Excluir usuário"
                            onClick={() => {
                              if (confirm(`Excluir ${u.full_name}?`)) del.mutate(u.user_id);
                            }}
                            disabled={del.isPending}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </AdminShell>
  );
}
