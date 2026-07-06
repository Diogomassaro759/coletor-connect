import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CircleAlert,
  FileWarning,
  Info,
  Loader2,
  Sparkles,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  loadNotifications,
  markAllRead,
  markNotificationRead,
  type AppNotification,
  type NotificationCategory,
} from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/admin/notificacoes")({
  head: () => ({ meta: [{ title: "Notificações — PROCATE" }] }),
  beforeLoad: ({ context }) => {
    if (!context.isAdmin && !context.isConsultant && !context.isCoordenador) {
      throw redirect({ to: "/admin" });
    }
  },
  component: NotificationsPage,
});

const ICONS: Record<NotificationCategory, any> = {
  document_expired: CircleAlert,
  document_expiring: FileWarning,
  evidence_pending: AlertTriangle,
  diagnostic_stale: AlertTriangle,
  new_association: Sparkles,
};

const SEVERITY_CLASS = {
  critical: "border-destructive/40 bg-destructive/5 text-destructive",
  warning: "border-amber-500/40 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300",
  info: "border-primary/30 bg-primary-soft text-primary",
} as const;

function NotificationsPage() {
  const { isAdmin, isConsultant, user } = Route.useRouteContext();
  const qc = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user.id],
    queryFn: () => loadNotifications({ isAdmin, isConsultant, userId: user.id }),
    refetchInterval: 60_000,
  });

  const readMut = useMutation({
    mutationFn: (key: string) => markNotificationRead(user.id, key),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }),
  });

  const readAllMut = useMutation({
    mutationFn: () =>
      markAllRead(
        user.id,
        notifications.filter((n) => !n.read).map((n) => n.key),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user.id] }),
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AdminShell>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
            Central de alertas
          </p>
          <h1 className="mt-1 text-3xl font-bold">Notificações</h1>
          <p className="text-muted-foreground">
            Documentos vencendo, diagnósticos em atraso, evidências pendentes e novas associações.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => readAllMut.mutate()}
          disabled={unreadCount === 0 || readAllMut.isPending}
        >
          {readAllMut.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCheck className="size-4" />
          )}
          Marcar todas como lidas
        </Button>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-muted-foreground">Carregando…</p>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Bell className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 font-medium">Nenhuma notificação no momento</p>
          <p className="text-sm text-muted-foreground">
            Você está em dia com os alertas institucionais.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <NotificationItem
              key={n.key}
              notification={n}
              onMarkRead={() => readMut.mutate(n.key)}
            />
          ))}
        </ul>
      )}
    </AdminShell>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: AppNotification;
  onMarkRead: () => void;
}) {
  const Icon = ICONS[notification.category] ?? Info;
  const sevClass = SEVERITY_CLASS[notification.severity];
  return (
    <li
      className={`flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4 ${
        notification.read ? "border-border bg-card opacity-70" : sevClass
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="grid size-10 place-items-center rounded-lg bg-background">
          <Icon className="size-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{notification.title}</p>
            {!notification.read && <Badge variant="secondary">Nova</Badge>}
          </div>
          <p className="text-sm opacity-90">{notification.description}</p>
        </div>
      </div>
      <div className="flex gap-2">
        {notification.link && (
          <Link to={notification.link.to as any} params={notification.link.params as any}>
            <Button size="sm" variant="outline">
              Abrir
            </Button>
          </Link>
        )}
        {!notification.read && (
          <Button size="sm" variant="ghost" onClick={onMarkRead}>
            Marcar lida
          </Button>
        )}
      </div>
    </li>
  );
}
