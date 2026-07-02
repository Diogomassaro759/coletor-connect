import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, Camera, KeyRound, UserCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/perfil")({
  component: PerfilPage,
});

type ProfileRow = {
  user_id: string;
  full_name: string;
  email: string | null;
  cpf: string | null;
  municipio_referencia: string | null;
  identificacao_profissional: string | null;
  avatar_url: string | null;
  must_change_password: boolean;
};

function PerfilPage() {
  const { user } = useRouteContext({ from: "/_authenticated" });
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "user_id, full_name, email, cpf, municipio_referencia, identificacao_profissional, avatar_url, must_change_password",
        )
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as ProfileRow | null;
    },
  });

  const profile = profileQuery.data;
  const mustChange = profile?.must_change_password ?? false;

  // Resolve signed URL for avatar
  useEffect(() => {
    let cancel = false;
    async function load() {
      if (!profile?.avatar_url) {
        setAvatarPreview(null);
        return;
      }
      const { data } = await supabase.storage
        .from("avatars")
        .createSignedUrl(profile.avatar_url, 60 * 60);
      if (!cancel) setAvatarPreview(data?.signedUrl ?? null);
    }
    load();
    return () => {
      cancel = true;
    };
  }, [profile?.avatar_url]);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    municipio_referencia: "",
    identificacao_profissional: "",
  });
  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        email: profile.email ?? user.email ?? "",
        municipio_referencia: profile.municipio_referencia ?? "",
        identificacao_profissional: profile.identificacao_profissional ?? "",
      });
    }
  }, [profile, user.email]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error: pErr } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          email: form.email,
          municipio_referencia: form.municipio_referencia || null,
          identificacao_profissional: form.identificacao_profissional || null,
        })
        .eq("user_id", user.id);
      if (pErr) throw new Error(pErr.message);
      if (form.email && form.email !== user.email) {
        const { error: aErr } = await supabase.auth.updateUser({ email: form.email });
        if (aErr) throw new Error(aErr.message);
      }
    },
    onSuccess: () => {
      toast.success("Perfil atualizado.");
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 5 * 1024 * 1024) throw new Error("Máximo 5 MB.");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "0" });
      if (upErr) throw new Error(upErr.message);
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("user_id", user.id);
      if (pErr) throw new Error(pErr.message);
    },
    onSuccess: () => {
      toast.success("Foto atualizada.");
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [pwd, setPwd] = useState({ next: "", confirm: "" });
  const changePwd = useMutation({
    mutationFn: async () => {
      if (pwd.next.length < 8) throw new Error("Mínimo 8 caracteres.");
      if (!/[A-Z]/.test(pwd.next) || !/[a-z]/.test(pwd.next) || !/\d/.test(pwd.next)) {
        throw new Error("Use letras maiúsculas, minúsculas e números.");
      }
      if (pwd.next !== pwd.confirm) throw new Error("As senhas não coincidem.");
      const { error } = await supabase.auth.updateUser({ password: pwd.next });
      if (error) throw new Error(error.message);
      if (mustChange) {
        await supabase
          .from("profiles")
          .update({ must_change_password: false })
          .eq("user_id", user.id);
      }
    },
    onSuccess: () => {
      toast.success("Senha alterada.");
      setPwd({ next: "", confirm: "" });
      qc.invalidateQueries({ queryKey: ["profile", user.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const initials = String(profile?.full_name || user.email || "U")
    .split(" ")
    .map((s: string) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AdminShell>
      <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
        <UserCircle2 className="size-6" /> Meu perfil
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Atualize seus dados, sua foto e sua senha.
      </p>

      {mustChange && (
        <Alert variant="destructive" className="mb-6 max-w-3xl">
          <AlertCircle className="size-4" />
          <AlertTitle>Troque sua senha</AlertTitle>
          <AlertDescription>
            Esta é uma senha temporária definida por um administrador. Defina uma nova senha para
            continuar usando o sistema.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue={mustChange ? "senha" : "dados"} className="max-w-3xl">
        <TabsList>
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="foto">Foto</TabsTrigger>
          <TabsTrigger value="senha">Senha</TabsTrigger>
        </TabsList>

        <TabsContent value="dados">
          <Card className="p-6 space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveProfile.mutate();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Nome completo</Label>
                  <Input
                    required
                    value={form.full_name}
                    onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input value={profile?.cpf ?? ""} disabled />
                  <p className="text-xs text-muted-foreground mt-1">
                    Para alterar o CPF, contate um administrador.
                  </p>
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Município de referência</Label>
                  <Input
                    value={form.municipio_referencia}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, municipio_referencia: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Identificação profissional</Label>
                  <Input
                    value={form.identificacao_profissional}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, identificacao_profissional: e.target.value }))
                    }
                    placeholder="CRESS, OAB, registro etc."
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saveProfile.isPending}>
                  {saveProfile.isPending ? "Salvando…" : "Salvar alterações"}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="foto">
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-6">
              <Avatar className="size-24">
                {avatarPreview && <AvatarImage src={avatarPreview} alt="Foto de perfil" />}
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAvatar.mutate(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadAvatar.isPending}
                >
                  <Camera className="size-4 mr-2" />
                  {uploadAvatar.isPending ? "Enviando…" : "Trocar foto"}
                </Button>
                <p className="text-xs text-muted-foreground">JPG ou PNG, até 5 MB.</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="senha">
          <Card className="p-6 space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                changePwd.mutate();
              }}
              className="space-y-4 max-w-md"
            >
              <div>
                <Label>Nova senha</Label>
                <Input
                  type="password"
                  required
                  value={pwd.next}
                  onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Mínimo 8 caracteres, com maiúsculas, minúsculas e números.
                </p>
              </div>
              <div>
                <Label>Confirmar nova senha</Label>
                <Input
                  type="password"
                  required
                  value={pwd.confirm}
                  onChange={(e) => setPwd((p) => ({ ...p, confirm: e.target.value }))}
                />
              </div>
              <Button type="submit" disabled={changePwd.isPending}>
                <KeyRound className="size-4 mr-2" />
                {changePwd.isPending ? "Alterando…" : "Alterar senha"}
              </Button>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}
