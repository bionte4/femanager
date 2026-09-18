import type { Metadata } from "next";
import Link from "next/link";
import {
  Banknote,
  Bike,
  Clock,
  CreditCard,
  GraduationCap,
  Laptop,
  MapPin,
  Monitor,
  Printer,
  Router,
  ShieldCheck,
  Sparkles,
  Video,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/utils/rupiah";
import { EarningsCalculator } from "@/components/join/earnings-calculator";

export const metadata: Metadata = {
  title: "Gabung Jadi Teknisi Freelance All-in-One | FE-Track",
  description:
    "Jadi teknisi freelance EDC, Laptop, WiFi, CCTV. Fee 100rb - 600rb per job.",
};

const ICON_MAP: Record<string, LucideIcon> = {
  CreditCard,
  Laptop,
  Monitor,
  Printer,
  Router,
  Video,
  Wifi,
};

const BENEFITS = [
  {
    icon: Clock,
    title: "Kerja Flexible",
    desc: "Ambil ticket di sekitar rumah. Atur sendiri jadwalmu.",
  },
  {
    icon: Banknote,
    title: "Fee Mingguan",
    desc: "Cair 100–600rb per job tergantung kategori. Withdraw tiap minggu.",
  },
  {
    icon: GraduationCap,
    title: "Training Gratis",
    desc: "Online 1 jam + SOP di app. Cocok buat lulusan SMK TKJ.",
  },
  {
    icon: ShieldCheck,
    title: "Multi Skill = Multi Income",
    desc: "EDC + Laptop + WiFi + CCTV. Naik fee lewat sertifikasi SDWAN.",
  },
];

const STEPS = [
  { n: "1", title: "Daftar", desc: "Isi data diri & upload KTP — 5 menit." },
  { n: "2", title: "Training Online", desc: "Ikuti materi 1 jam via app / Zoom." },
  { n: "3", title: "Dapet Job", desc: "Terima ticket di HP, kerjakan, cair fee." },
];

const TESTIMONIES = [
  {
    name: "Budi S.",
    city: "Bekasi",
    earn: "Rp 2,8jt / bulan",
    quote: "Sambil kuliah bisa ambil 3-4 ticket seminggu. Fee cair tiap Jumat.",
  },
  {
    name: "Rina A.",
    city: "Bandung",
    earn: "Rp 3,2jt / bulan",
    quote: "Dari SMK TKJ langsung kerja. Training di app gampang diikutin.",
  },
  {
    name: "Andi P.",
    city: "Surabaya",
    earn: "Rp 4,1jt / bulan",
    quote: "Naik ke job CCTV & SDWAN, fee lebih gede. Masih di sekitar rumah.",
  },
];

const FAQS = [
  {
    q: "Apakah harus punya pengalaman?",
    a: "Tidak wajib. Lulusan SMK TKJ / D3 TI dengan motor + toolkit sudah cukup. Kami latih di onboarding.",
  },
  {
    q: "Daerah mana saja?",
    a: "Seluruh Indonesia — prioritas kota dengan toko/tenant banyak. Cek coverage di form daftar.",
  },
  {
    q: "Kapan fee cair?",
    a: "Setelah ticket resolved & lolos review. Withdraw mingguan ke rekeningmu (min. sesuai kebijakan).",
  },
  {
    q: "Harus punya apa saja?",
    a: "Motor, HP Android, toolkit dasar. Untuk CCTV: tangga & bor plus. Laptop opsional.",
  },
];

type PageProps = {
  searchParams?: Promise<{ ref?: string }> | { ref?: string };
};

export default async function JoinLandingPage({ searchParams }: PageProps) {
  const sp = await Promise.resolve(searchParams ?? {});
  const ref = sp.ref ? `?ref=${encodeURIComponent(sp.ref)}` : "";
  const registerHref = `/join/register${ref}`;

  const categories = await prisma.serviceCategory.findMany({
    where: { is_active: true },
    orderBy: { name: "asc" },
  });

  const calcDefaults = categories.map((c) => ({
    code: c.code,
    name: c.name,
    fee: c.base_fee_tier1,
  }));

  return (
    <div className="min-h-screen bg-[#0c1a14] text-white">
      <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% -10%, #10b98155, transparent), radial-gradient(ellipse 50% 40% at 100% 50%, #04785733, transparent)",
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            FE-Track Recruitment
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Jadi Teknisi Freelance All-in-One:{" "}
            <span className="text-emerald-400">EDC, Laptop, WiFi, CCTV</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-emerald-100/70 sm:text-lg">
            Fee 100rb – 600rb per job. Training gratis. Cair mingguan. Cocok buat
            anak SMK &amp; freelancer IT.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href={registerHref}
              className="inline-flex h-14 w-full max-w-xs items-center justify-center rounded-2xl bg-emerald-500 px-8 text-lg font-bold text-[#0c1a14] shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400"
            >
              Daftar Sekarang Gratis
            </Link>
            <Link
              href="/order"
              className="text-sm text-emerald-300/80 underline-offset-4 hover:underline"
            >
              Atau order jasa (customer)
            </Link>
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-emerald-200/50">
            <MapPin className="h-3.5 w-3.5" />
            Coverage se-Indonesia · Prioritas kota yang butuh FE
          </p>
        </div>
      </section>

      {/* 7 kategori */}
      <section className="border-t border-white/5 bg-[#0f2219] px-4 py-14 sm:px-6">
        <h2 className="mb-8 text-center text-2xl font-bold">7 Kategori Service</h2>
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => {
            const Icon = (c.icon && ICON_MAP[c.icon]) || Monitor;
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-5"
              >
                <Icon className="mb-3 h-7 w-7 text-emerald-400" />
                <h3 className="font-semibold">{c.name}</h3>
                <p className="mt-1 text-sm text-emerald-100/60">
                  Fee up to {formatRupiah(c.base_fee_tier3)}/job
                </p>
                <p className="mt-1 text-xs text-emerald-200/40">
                  ~{c.estimated_duration_minutes} menit
                  {c.requires_certification ? " · Cert wajib" : ""}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6">
        <h2 className="mb-6 text-center text-2xl font-bold">
          Kalkulator Penghasilan
        </h2>
        <EarningsCalculator categories={calcDefaults} />
      </section>

      <section className="border-t border-white/5 bg-[#0f2219] px-4 py-14 sm:px-6">
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-5"
            >
              <Icon className="mb-3 h-7 w-7 text-emerald-400" />
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-emerald-100/60">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6">
        <h2 className="mb-8 text-center text-2xl font-bold">3 Langkah Gabung</h2>
        <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:gap-6">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-5 text-center"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-[#0c1a14]">
                {s.n}
              </span>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-emerald-100/60">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-white/5 bg-[#0f2219] px-4 py-14 sm:px-6">
        <h2 className="mb-8 text-center text-2xl font-bold">Kata Teman FE</h2>
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
          {TESTIMONIES.map((t) => (
            <blockquote
              key={t.name}
              className="rounded-2xl border border-white/10 bg-[#0c1a14] p-5"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-lg font-bold text-emerald-300">
                {t.name[0]}
              </div>
              <p className="text-sm text-emerald-50/80">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-3 text-xs text-emerald-300/70">
                <strong className="text-emerald-200">{t.name}</strong> · {t.city}
                <br />
                <span className="font-medium text-emerald-400">{t.earn}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6">
        <h2 className="mb-8 text-center text-2xl font-bold">FAQ</h2>
        <div className="mx-auto max-w-2xl space-y-4">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <summary className="cursor-pointer list-none font-medium marker:content-none">
                {f.q}
              </summary>
              <p className="mt-2 text-sm text-emerald-100/60">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center gap-2">
          <Link
            href={registerHref}
            className="inline-flex h-14 items-center justify-center rounded-2xl bg-emerald-500 px-10 text-lg font-bold text-[#0c1a14] hover:bg-emerald-400"
          >
            <Bike className="mr-2 h-5 w-5" />
            Daftar Sekarang Gratis
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/5 px-4 py-8 text-center text-xs text-emerald-200/40">
        © {new Date().getFullYear()} FE-Track · Field Engineer Dispatch
      </footer>
    </div>
  );
}
