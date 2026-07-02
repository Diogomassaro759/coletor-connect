import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, UserCog } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
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

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  beforeLoad: ({ context }) => {
    if (!context.isAdmin) throw redirect({ to: "/admin" });
  },
  component: UsuariosPage,
});

function UsuariosPage() {
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="size-6" /> Usuários operacionais
          </h1>
          <p className="text-sm text-muted-foreground">
            Recenseadores cadastram catadores; Consultores de Campo cadastram diagnósticos.
          </p>
        </div>
        <Link to="/admin/usuarios/novo">
          <Button>
            <Plus className="size-4 mr-2" /> Novo usuário
          </Button>
        </Link>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Município</TableHead>
              <TableHead>Papéis</TableHead>
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
            {data?.map((u) => (
              <TableRow key={u.user_id}>
                <TableCell className="font-medium">{u.full_name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell className="font-mono text-xs">{u.cpf ?? "—"}</TableCell>
                <TableCell>{u.municipio_referencia ?? "—"}</TableCell>
                <TableCell className="space-x-1">
                  {u.roles.map((r) => (
                    <Badge key={r} variant="secondary">
                      {r}
                    </Badge>
                  ))}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(`Excluir ${u.full_name}?`)) del.mutate(u.user_id);
                    }}
                    disabled={del.isPending}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </AdminShell>
  );
}
