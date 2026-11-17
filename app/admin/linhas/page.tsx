import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentAdmin } from "@/lib/auth";
import { LineEditor } from "./line-editor";

// Sem login, ninguém vê o editor
async function Guard() {
  if (!(await getCurrentAdmin())) redirect("/admin/login");
  return <LineEditor />;
}

export default function LinhasPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-slate-900" />}>
      <Guard />
    </Suspense>
  );
}