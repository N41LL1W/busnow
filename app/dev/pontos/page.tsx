import { notFound } from "next/navigation";
import { StopEditor } from "./stop-editor";

export default function PontosPage() {
  // Ferramenta de desenvolvimento: não existe em produção
  if (process.env.NODE_ENV === "production") notFound();

  return <StopEditor />;
}