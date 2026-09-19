"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  saveAiSettingsAction,
  saveSmtpSettingsAction,
  saveTelegramSettingsAction,
  saveWhatsappSettingsAction,
  saveWorkloadSettingsAction,
  testAiAction,
  testSmtpAction,
  testTelegramAction,
  testWhatsappAction,
  type IntegrationsPublicConfig,
} from "@/app/actions/settings-integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

export function IntegrationsSettingsClient({
  initial,
}: {
  initial: IntegrationsPublicConfig;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const [waEnabled, setWaEnabled] = useState(initial.whatsapp.enabled);
  const [waAdmin, setWaAdmin] = useState(initial.whatsapp.admin_phone);
  const [waToken, setWaToken] = useState("");

  const [tgEnabled, setTgEnabled] = useState(initial.telegram.enabled);
  const [tgChat, setTgChat] = useState(initial.telegram.admin_chat_id);
  const [tgToken, setTgToken] = useState("");

  const [smtpEnabled, setSmtpEnabled] = useState(initial.smtp.enabled);
  const [smtpHost, setSmtpHost] = useState(initial.smtp.host);
  const [smtpPort, setSmtpPort] = useState(String(initial.smtp.port));
  const [smtpSecure, setSmtpSecure] = useState(initial.smtp.secure);
  const [smtpUser, setSmtpUser] = useState(initial.smtp.user);
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState(initial.smtp.from_email);
  const [smtpFromName, setSmtpFromName] = useState(initial.smtp.from_name);
  const [testEmail, setTestEmail] = useState(initial.smtp.from_email);

  const [aiEnabled, setAiEnabled] = useState(initial.ai.enabled);
  const [aiBase, setAiBase] = useState(initial.ai.base_url);
  const [aiModel, setAiModel] = useState(initial.ai.model);
  const [aiKey, setAiKey] = useState("");

  const [wlEnabled, setWlEnabled] = useState(initial.workload.enabled);
  const [wlMaxActive, setWlMaxActive] = useState(
    String(initial.workload.max_active_tickets)
  );
  const [wlMaxLoad, setWlMaxLoad] = useState(
    String(initial.workload.max_load_minutes)
  );
  const [wlWarnLoad, setWlWarnLoad] = useState(
    String(initial.workload.warn_load_minutes)
  );

  async function saveWa() {
    setBusy("wa-save");
    const res = await saveWhatsappSettingsAction({
      enabled: waEnabled,
      admin_phone: waAdmin,
      token: waToken || undefined,
    });
    setBusy(null);
    if (!res.success) return toast.error(res.error);
    toast.success("WhatsApp disimpan");
    setWaToken("");
    router.refresh();
  }

  async function saveTg() {
    setBusy("tg-save");
    const res = await saveTelegramSettingsAction({
      enabled: tgEnabled,
      admin_chat_id: tgChat,
      bot_token: tgToken || undefined,
    });
    setBusy(null);
    if (!res.success) return toast.error(res.error);
    toast.success("Telegram disimpan");
    setTgToken("");
    router.refresh();
  }

  async function saveSmtp() {
    setBusy("smtp-save");
    const res = await saveSmtpSettingsAction({
      enabled: smtpEnabled,
      host: smtpHost,
      port: Number(smtpPort) || 587,
      secure: smtpSecure,
      user: smtpUser,
      password: smtpPass || undefined,
      from_email: smtpFrom,
      from_name: smtpFromName,
    });
    setBusy(null);
    if (!res.success) return toast.error(res.error);
    toast.success("SMTP disimpan");
    setSmtpPass("");
    router.refresh();
  }

  async function saveAi() {
    setBusy("ai-save");
    const res = await saveAiSettingsAction({
      enabled: aiEnabled,
      base_url: aiBase,
      model: aiModel,
      api_key: aiKey || undefined,
    });
    setBusy(null);
    if (!res.success) return toast.error(res.error);
    toast.success("AI card disimpan");
    setAiKey("");
    router.refresh();
  }

  async function saveWorkload() {
    setBusy("wl-save");
    const res = await saveWorkloadSettingsAction({
      enabled: wlEnabled,
      max_active_tickets: Number(wlMaxActive) || 2,
      max_load_minutes: Number(wlMaxLoad) || 240,
      warn_load_minutes: Number(wlWarnLoad) || 180,
    });
    setBusy(null);
    if (!res.success) return toast.error(res.error);
    toast.success("Workload Guard disimpan");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">WhatsApp (Fonnte)</CardTitle>
            <Badge variant={initial.whatsapp.token.configured ? "success" : "secondary"}>
              {initial.whatsapp.token.configured
                ? `Token ${initial.whatsapp.token.hint}`
                : "Token belum ada"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {initial.whatsapp.source_hint}. Dispatch, reminder kontrak, recruitment.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={waEnabled}
              onChange={(e) => setWaEnabled(e.target.checked)}
            />
            Aktifkan pengiriman WA
          </label>
          <div className="space-y-1 sm:col-span-2">
            <Label>Fonnte token</Label>
            <Input
              type="password"
              autoComplete="off"
              placeholder={
                initial.whatsapp.token.configured
                  ? `Biarkan kosong untuk pertahankan (${initial.whatsapp.token.hint})`
                  : "Tempel token Fonnte"
              }
              value={waToken}
              onChange={(e) => setWaToken(e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Nomor admin (62…)</Label>
            <Input
              value={waAdmin}
              onChange={(e) => setWaAdmin(e.target.value)}
              placeholder="628xxxxxxxxxx"
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button disabled={!!busy} onClick={() => void saveWa()}>
              {busy === "wa-save" ? "Menyimpan…" : "Simpan WA"}
            </Button>
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => {
                void (async () => {
                  setBusy("wa-test");
                  const r = await testWhatsappAction(waAdmin);
                  setBusy(null);
                  if (!r.success) return toast.error(r.error);
                  toast.success("Test WA terkirim");
                })();
              }}
            >
              {busy === "wa-test" ? "Mengirim…" : "Test kirim ke admin"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Telegram Bot (gratis)</CardTitle>
            <Badge
              variant={
                initial.telegram.bot_token.configured ? "success" : "secondary"
              }
            >
              {initial.telegram.bot_token.configured
                ? `Bot ${initial.telegram.bot_token.hint}`
                : "Belum dikonfigurasi"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Buat bot di @BotFather → tempel token. Chat bot, lalu ambil chat_id
            dari getUpdates. Cocok untuk notifikasi admin tanpa biaya Fonnte.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={tgEnabled}
              onChange={(e) => setTgEnabled(e.target.checked)}
            />
            Aktifkan Telegram
          </label>
          <div className="space-y-1 sm:col-span-2">
            <Label>Bot token</Label>
            <Input
              type="password"
              autoComplete="off"
              placeholder={
                initial.telegram.bot_token.configured
                  ? `Kosongkan untuk pertahankan (${initial.telegram.bot_token.hint})`
                  : "123456:ABC-DEF..."
              }
              value={tgToken}
              onChange={(e) => setTgToken(e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Admin chat ID</Label>
            <Input
              value={tgChat}
              onChange={(e) => setTgChat(e.target.value)}
              placeholder="123456789 atau -100..."
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button disabled={!!busy} onClick={() => void saveTg()}>
              {busy === "tg-save" ? "Menyimpan…" : "Simpan Telegram"}
            </Button>
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => {
                void (async () => {
                  setBusy("tg-test");
                  const r = await testTelegramAction(tgChat);
                  setBusy(null);
                  if (!r.success) return toast.error(r.error);
                  toast.success("Test Telegram terkirim");
                })();
              }}
            >
              {busy === "tg-test" ? "Mengirim…" : "Test kirim ke admin"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">SMTP / Email</CardTitle>
            <Badge variant={initial.smtp.password.configured || initial.smtp.host ? "success" : "secondary"}>
              {initial.smtp.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Notifikasi email (test & utilitas). Gmail/SMTP provider lain didukung.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={smtpEnabled}
              onChange={(e) => setSmtpEnabled(e.target.checked)}
            />
            Aktifkan SMTP
          </label>
          <div className="space-y-1">
            <Label>Host</Label>
            <Input
              value={smtpHost}
              onChange={(e) => setSmtpHost(e.target.value)}
              placeholder="smtp.gmail.com"
            />
          </div>
          <div className="space-y-1">
            <Label>Port</Label>
            <Input
              value={smtpPort}
              onChange={(e) => setSmtpPort(e.target.value)}
              placeholder="587"
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={smtpSecure}
              onChange={(e) => setSmtpSecure(e.target.checked)}
            />
            Secure (TLS/SSL — biasanya port 465)
          </label>
          <div className="space-y-1">
            <Label>Username</Label>
            <Input
              value={smtpUser}
              onChange={(e) => setSmtpUser(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <Label>Password</Label>
            <Input
              type="password"
              autoComplete="new-password"
              placeholder={
                initial.smtp.password.configured
                  ? `Kosongkan untuk pertahankan (${initial.smtp.password.hint})`
                  : "App password"
              }
              value={smtpPass}
              onChange={(e) => setSmtpPass(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>From email</Label>
            <Input
              value={smtpFrom}
              onChange={(e) => setSmtpFrom(e.target.value)}
              placeholder="noreply@domain.com"
            />
          </div>
          <div className="space-y-1">
            <Label>From name</Label>
            <Input
              value={smtpFromName}
              onChange={(e) => setSmtpFromName(e.target.value)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Email uji</Label>
            <Input
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button disabled={!!busy} onClick={() => void saveSmtp()}>
              {busy === "smtp-save" ? "Menyimpan…" : "Simpan SMTP"}
            </Button>
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => {
                void (async () => {
                  setBusy("smtp-test");
                  const r = await testSmtpAction(testEmail);
                  setBusy(null);
                  if (!r.success) return toast.error(r.error);
                  toast.success("Test email terkirim");
                })();
              }}
            >
              {busy === "smtp-test" ? "Mengirim…" : "Test kirim email"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">AI Card (KB Chat)</CardTitle>
            <Badge variant={initial.ai.api_key.configured ? "success" : "secondary"}>
              {initial.ai.enabled ? "AI on" : "Search lokal saja"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            OpenAI-compatible API. Jika aktif, jawaban KB chat dipoles dari hit SOP.
            Kosongkan = fallback search lokal tanpa LLM.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={(e) => setAiEnabled(e.target.checked)}
            />
            Aktifkan AI enhancement
          </label>
          <div className="space-y-1 sm:col-span-2">
            <Label>Base URL</Label>
            <Input
              value={aiBase}
              onChange={(e) => setAiBase(e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div className="space-y-1">
            <Label>Model</Label>
            <Input
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              placeholder="gpt-4o-mini"
            />
          </div>
          <div className="space-y-1">
            <Label>API key</Label>
            <Input
              type="password"
              autoComplete="off"
              placeholder={
                initial.ai.api_key.configured
                  ? `Kosongkan untuk pertahankan (${initial.ai.api_key.hint})`
                  : "sk-..."
              }
              value={aiKey}
              onChange={(e) => setAiKey(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button disabled={!!busy} onClick={() => void saveAi()}>
              {busy === "ai-save" ? "Menyimpan…" : "Simpan AI"}
            </Button>
            <Button
              variant="outline"
              disabled={!!busy}
              onClick={() => {
                void (async () => {
                  setBusy("ai-test");
                  const r = await testAiAction();
                  setBusy(null);
                  if (!r.success) return toast.error(r.error);
                  toast.success(r.data?.reply ?? "AI OK");
                })();
              }}
            >
              {busy === "ai-test" ? "Mengetes…" : "Test AI"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Workload Guard</CardTitle>
            <Badge variant={wlEnabled ? "success" : "secondary"}>
              {wlEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Batas beban FE untuk auto-dispatch &amp; assign manual. Disimpan di
            database (ops.workload).
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox
              checked={wlEnabled}
              onCheckedChange={(v) => setWlEnabled(v === true)}
            />
            Aktifkan Workload Guard
          </label>
          <div className="space-y-1">
            <Label>MAX_ACTIVE (ticket)</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={wlMaxActive}
              onChange={(e) => setWlMaxActive(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Max ticket aktif per engineer (default 2)
            </p>
          </div>
          <div className="space-y-1">
            <Label>MAX_LOAD (menit)</Label>
            <Input
              type="number"
              min={30}
              max={1440}
              value={wlMaxLoad}
              onChange={(e) => setWlMaxLoad(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Max total estimasi durasi ticket aktif (default 240)
            </p>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>WARN_LOAD (menit)</Label>
            <Input
              type="number"
              min={15}
              max={1440}
              value={wlWarnLoad}
              onChange={(e) => setWlWarnLoad(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Ambang kuning di UI assign (default 180, harus ≤ MAX_LOAD)
            </p>
          </div>
          <div className="sm:col-span-2">
            <Button disabled={!!busy} onClick={() => void saveWorkload()}>
              {busy === "wl-save" ? "Menyimpan…" : "Simpan Workload Guard"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
