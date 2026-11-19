import { Suspense } from "react";
import { requireAdmin } from "@/lib/admin-guard";
import { readSettings } from "@/lib/settings";
import { AppearanceForm } from "./appearance-form";

async function Gate() {
  await requireAdmin();
  // Direto do banco (sem cache): o painel sempre mostra o valor atual
  const settings = await readSettings();
  return <AppearanceForm settings={settings} />;
}

export default function AppearancePage() {
  return (
    <main className="min-h-screen bg-slate-900 p-4 pb-28 text-white sm:p-8">
      <Suspense fallback={null}>
        <Gate />
      </Suspense>
    </main>
  );
}