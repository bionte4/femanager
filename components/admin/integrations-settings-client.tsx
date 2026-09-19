"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bot,
  Gauge,
  Mail,
  MessageCircle,
  Send,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

function Field({
  label,
  className,
  children,
  hint,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-[11px] font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
      {hint ? (
        <p className="text-[10px] leading-snug text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function ChannelCard({
  title,
  icon: Icon,
  badge,
  description,
  children,
  actions,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: React.ReactNode;
  description: string;
  children: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-lg border bg-card">
      <div className="flex items-start gap-2.5 border-b px-3 py-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-semibold leading-none">{title}</h3>
            {badge}
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="grid flex-1 gap-2.5 p-3 sm:grid-cols-2">{children}</div>
      <div className="flex flex-wrap gap-1.5 border-t bg-muted/30 px-3 py-2">
        {actions}
      </div>
    </div>
  );
}

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
    toast.success("AI disimpan");
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
    <div className="grid gap-3 lg:grid-cols-2">
      <ChannelCard
        title="WhatsApp"
        icon={MessageCircle}
        badge={
          <Badge
            variant={
              initial.whatsapp.token.configured ? "success" : "secondary"
            }
            className="h-5 px-1.5 text-[10px]"
          >
            {initial.whatsapp.token.configured
              ? initial.whatsapp.token.hint
              : "No token"}
          </Badge>
        }
        description={`${initial.whatsapp.source_hint} · Dispatch & reminder`}
        actions={
          <>
            <Button
              size="sm"
              className="h-8"
              disabled={!!busy}
              onClick={() => void saveWa()}
            >
              {busy === "wa-save" ? "…" : "Simpan"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
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
              {busy === "wa-test" ? "…" : "Test"}
            </Button>
          </>
        }
      >
        <label className="flex items-center gap-2 text-xs sm:col-span-2">
          <Checkbox
            checked={waEnabled}
            onCheckedChange={(v) => setWaEnabled(v === true)}
          />
          Aktifkan pengiriman
        </label>
        <Field
          label="Fonnte token"
          className="sm:col-span-2"
          hint={
            initial.whatsapp.token.configured
              ? `Kosongkan = pertahankan (${initial.whatsapp.token.hint})`
              : undefined
          }
        >
          <Input
            type="password"
            autoComplete="off"
            className="h-8 text-sm"
            placeholder="Token Fonnte"
            value={waToken}
            onChange={(e) => setWaToken(e.target.value)}
          />
        </Field>
        <Field label="Admin phone (62…)" className="sm:col-span-2">
          <Input
            className="h-8 text-sm"
            value={waAdmin}
            onChange={(e) => setWaAdmin(e.target.value)}
            placeholder="628xxxxxxxxxx"
          />
        </Field>
      </ChannelCard>

      <ChannelCard
        title="Telegram"
        icon={Send}
        badge={
          <Badge
            variant={
              initial.telegram.bot_token.configured ? "success" : "secondary"
            }
            className="h-5 px-1.5 text-[10px]"
          >
            {initial.telegram.bot_token.configured
              ? initial.telegram.bot_token.hint
              : "No bot"}
          </Badge>
        }
        description="Bot gratis via @BotFather · notifikasi & OTP"
        actions={
          <>
            <Button
              size="sm"
              className="h-8"
              disabled={!!busy}
              onClick={() => void saveTg()}
            >
              {busy === "tg-save" ? "…" : "Simpan"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
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
              {busy === "tg-test" ? "…" : "Test"}
            </Button>
          </>
        }
      >
        <label className="flex items-center gap-2 text-xs sm:col-span-2">
          <Checkbox
            checked={tgEnabled}
            onCheckedChange={(v) => setTgEnabled(v === true)}
          />
          Aktifkan Telegram
        </label>
        <Field label="Bot token" className="sm:col-span-2">
          <Input
            type="password"
            autoComplete="off"
            className="h-8 text-sm"
            placeholder={
              initial.telegram.bot_token.configured
                ? `Kosongkan = pertahankan (${initial.telegram.bot_token.hint})`
                : "123456:ABC-DEF…"
            }
            value={tgToken}
            onChange={(e) => setTgToken(e.target.value)}
          />
        </Field>
        <Field label="Admin chat ID" className="sm:col-span-2">
          <Input
            className="h-8 text-sm"
            value={tgChat}
            onChange={(e) => setTgChat(e.target.value)}
            placeholder="123456789 / -100…"
          />
        </Field>
      </ChannelCard>

      <ChannelCard
        title="SMTP / Email"
        icon={Mail}
        badge={
          <Badge
            variant={initial.smtp.enabled ? "success" : "secondary"}
            className="h-5 px-1.5 text-[10px]"
          >
            {initial.smtp.enabled ? "On" : "Off"}
          </Badge>
        }
        description="OTP reset password & utilitas email"
        actions={
          <>
            <Button
              size="sm"
              className="h-8"
              disabled={!!busy}
              onClick={() => void saveSmtp()}
            >
              {busy === "smtp-save" ? "…" : "Simpan"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
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
              {busy === "smtp-test" ? "…" : "Test"}
            </Button>
          </>
        }
      >
        <label className="flex items-center gap-2 text-xs">
          <Checkbox
            checked={smtpEnabled}
            onCheckedChange={(v) => setSmtpEnabled(v === true)}
          />
          Aktifkan SMTP
        </label>
        <label className="flex items-center gap-2 text-xs">
          <Checkbox
            checked={smtpSecure}
            onCheckedChange={(v) => setSmtpSecure(v === true)}
          />
          TLS/SSL (465)
        </label>
        <Field label="Host">
          <Input
            className="h-8 text-sm"
            value={smtpHost}
            onChange={(e) => setSmtpHost(e.target.value)}
            placeholder="smtp.gmail.com"
          />
        </Field>
        <Field label="Port">
          <Input
            className="h-8 text-sm"
            value={smtpPort}
            onChange={(e) => setSmtpPort(e.target.value)}
            placeholder="587"
          />
        </Field>
        <Field label="Username">
          <Input
            className="h-8 text-sm"
            value={smtpUser}
            onChange={(e) => setSmtpUser(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            autoComplete="new-password"
            className="h-8 text-sm"
            placeholder={
              initial.smtp.password.configured
                ? `•••• (${initial.smtp.password.hint})`
                : "App password"
            }
            value={smtpPass}
            onChange={(e) => setSmtpPass(e.target.value)}
          />
        </Field>
        <Field label="From email">
          <Input
            className="h-8 text-sm"
            value={smtpFrom}
            onChange={(e) => setSmtpFrom(e.target.value)}
            placeholder="noreply@domain.com"
          />
        </Field>
        <Field label="From name">
          <Input
            className="h-8 text-sm"
            value={smtpFromName}
            onChange={(e) => setSmtpFromName(e.target.value)}
          />
        </Field>
        <Field label="Email uji" className="sm:col-span-2">
          <Input
            className="h-8 text-sm"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </Field>
      </ChannelCard>

      <ChannelCard
        title="AI (KB Chat)"
        icon={Bot}
        badge={
          <Badge
            variant={initial.ai.enabled ? "success" : "secondary"}
            className="h-5 px-1.5 text-[10px]"
          >
            {initial.ai.enabled ? "LLM on" : "Lokal"}
          </Badge>
        }
        description="OpenAI-compatible · kosong = search SOP lokal"
        actions={
          <>
            <Button
              size="sm"
              className="h-8"
              disabled={!!busy}
              onClick={() => void saveAi()}
            >
              {busy === "ai-save" ? "…" : "Simpan"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8"
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
              {busy === "ai-test" ? "…" : "Test"}
            </Button>
          </>
        }
      >
        <label className="flex items-center gap-2 text-xs sm:col-span-2">
          <Checkbox
            checked={aiEnabled}
            onCheckedChange={(v) => setAiEnabled(v === true)}
          />
          Aktifkan AI enhancement
        </label>
        <Field label="Base URL" className="sm:col-span-2">
          <Input
            className="h-8 font-mono text-xs"
            value={aiBase}
            onChange={(e) => setAiBase(e.target.value)}
            placeholder="https://api.openai.com/v1"
          />
        </Field>
        <Field label="Model">
          <Input
            className="h-8 text-sm"
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            placeholder="gpt-4o-mini"
          />
        </Field>
        <Field label="API key">
          <Input
            type="password"
            autoComplete="off"
            className="h-8 text-sm"
            placeholder={
              initial.ai.api_key.configured
                ? `•••• (${initial.ai.api_key.hint})`
                : "sk-…"
            }
            value={aiKey}
            onChange={(e) => setAiKey(e.target.value)}
          />
        </Field>
      </ChannelCard>

      <ChannelCard
        title="Workload Guard"
        icon={Gauge}
        badge={
          <Badge
            variant={wlEnabled ? "success" : "secondary"}
            className="h-5 px-1.5 text-[10px]"
          >
            {wlEnabled ? "On" : "Off"}
          </Badge>
        }
        description="Batas beban FE · auto-dispatch & assign · ops.workload"
        actions={
          <Button
            size="sm"
            className="h-8"
            disabled={!!busy}
            onClick={() => void saveWorkload()}
          >
            {busy === "wl-save" ? "…" : "Simpan"}
          </Button>
        }
      >
        <label className="flex items-center gap-2 text-xs sm:col-span-2">
          <Checkbox
            checked={wlEnabled}
            onCheckedChange={(v) => setWlEnabled(v === true)}
          />
          Aktifkan guard
        </label>
        <Field label="MAX_ACTIVE" hint="Ticket aktif / FE">
          <Input
            type="number"
            min={1}
            max={20}
            className="h-8 text-sm"
            value={wlMaxActive}
            onChange={(e) => setWlMaxActive(e.target.value)}
          />
        </Field>
        <Field label="MAX_LOAD (mnt)" hint="Total estimasi aktif">
          <Input
            type="number"
            min={30}
            max={1440}
            className="h-8 text-sm"
            value={wlMaxLoad}
            onChange={(e) => setWlMaxLoad(e.target.value)}
          />
        </Field>
        <Field
          label="WARN_LOAD (mnt)"
          className="sm:col-span-2"
          hint="Ambang kuning di UI assign (≤ MAX_LOAD)"
        >
          <Input
            type="number"
            min={15}
            max={1440}
            className="h-8 text-sm"
            value={wlWarnLoad}
            onChange={(e) => setWlWarnLoad(e.target.value)}
          />
        </Field>
      </ChannelCard>
    </div>
  );
}
