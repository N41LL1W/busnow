import { db } from "@/db";
import { auditLog } from "@/db/audit-schema";

// Quem fez a ação (o que getCurrentAdmin / requireAdmin devolvem)
type Actor = { id: number; name: string; email: string };

export const AUDIT_AREAS = {
  access: "Acesso",
  appearance: "Aparência",
  notice: "Avisos",
  schedule: "Horários",
  holiday: "Feriados",
  line: "Linhas",
  vehicle: "Veículos",
  route: "Trajeto",
} as const;

export type AuditArea = keyof typeof AUDIT_AREAS;
export type AuditAction = `${AuditArea}.${string}`;

// Registra uma ação do painel. Se o registro falhar, a ação que o painel
// acabou de fazer NÃO é desfeita: só avisamos no log do servidor.
export async function recordAudit(
  actor: Actor,
  action: AuditAction,
  summary: string,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await db.insert(auditLog).values({
      adminId: actor.id,
      adminName: actor.name,
      adminEmail: actor.email,
      action,
      summary: summary.slice(0, 300),
      details: details ?? null,
    });
  } catch (error) {
    console.error("Falha ao gravar o registro de auditoria:", error);
  }
}