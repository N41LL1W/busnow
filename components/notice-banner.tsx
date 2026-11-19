import { getActiveNotices } from "@/lib/settings";

const STYLES = {
  info: "border-sky-500 bg-sky-900/60 text-sky-100",
  warning: "border-amber-500 bg-amber-900/60 text-amber-100",
  critical: "border-red-500 bg-red-900/60 text-red-100",
} as const;

// Avisos de serviço no ar agora (some sozinho quando não há nenhum)
export async function NoticeBanner() {
  const notices = await getActiveNotices();
  if (notices.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {notices.map((notice) => (
        <p
          key={notice.id}
          role={notice.severity === "critical" ? "alert" : "status"}
          className={`rounded-lg border-l-4 px-4 py-3 text-sm ${STYLES[notice.severity]}`}
        >
          {notice.message}
        </p>
      ))}
    </div>
  );
}