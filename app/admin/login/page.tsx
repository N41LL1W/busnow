import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentAdmin } from "@/lib/auth";
import { LoginForm } from "./login-form";

// Quem já está logado vai direto para o editor
async function Gate() {
  if (await getCurrentAdmin()) redirect("/admin/linhas");
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 p-4 text-white">
      <Suspense fallback={null}>
        <Gate />
      </Suspense>
    </main>
  );
}