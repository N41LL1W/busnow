import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { AppearanceForm } from "./appearance-form";

// Sem login, ninguém vê esta tela
async function Gate() {
  if (!(await getCurrentAdmin())) redirect("/admin/login");
  const settings = await getSettings();
  return <AppearanceForm settings={settings} />;
}

export default function AppearancePage() {
  return (
    <main className="min-h-screen bg-slate-900 p-4 pb-28 text-white sm:p-8 sm:pb-28">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Aparência e informações</h1>
        <p className="mt-1 text-sm text-slate-400">
          O que aparece no cabeçalho, no rodapé e na página Sobre do app.
        </p>

        <Suspense
          fallback={<div className="mt-6 h-96 animate-pulse rounded-lg bg-slate-800" />}
        >
          <Gate />
        </Suspense>
      </div>
    </main>
  );
}