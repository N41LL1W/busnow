import { getActiveNotices } from "@/lib/settings";

// Avisos de serviço no ar agora (some sozinho quando não há nenhum)
export async function NoticeBanner() {
  const notices = await getActiveNotices();
  if (notices.length === 0) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-2 px-4 pt-4 sm:px-6">
      {notices.map((notice) => (
        <p
          key={notice.id}
          role={notice.severity === "critical" ? "alert" : "status"}
          className={`notice notice-${notice.severity} rounded-xl px-4 py-3 text-sm`}
        >
          {notice.message}
        </p>
      ))}
    </div>
  );
}