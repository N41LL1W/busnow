import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentAdmin } from "@/lib/auth";
import { PasswordForm } from "./password-form";

async function Gate() {
  if (!(await getCurrentAdmin())) redirect("/admin/login");
  return <PasswordForm />;
}

export default function PasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 p-4 text-white">
      <Suspense fallback={null}>
        <Gate />
      </Suspense>
      <Link href="/admin/linhas" className="text-sm text-blue-300">
        ← Voltar ao editor
      </Link>
    </main>
  );
}