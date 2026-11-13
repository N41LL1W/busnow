import { notFound } from "next/navigation";
import { LineEditor } from "./line-editor";

export default function LinhasPage() {
  // Painel só para desenvolvimento por enquanto (login vem na Fase 10)
  if (process.env.NODE_ENV === "production") notFound();

  return <LineEditor />;
}