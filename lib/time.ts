// Tipo de dia da tabela de horários
export type DayType = "weekday" | "saturday" | "sunday";

const clock = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23", // 00 a 23 (nunca "24")
});

// Que dia e que hora são AGORA em Brodowski, independente do fuso do
// servidor ou do celular. Feriados ainda não são tratados.
export function getSaoPauloNow(date: Date = new Date()): {
  dayType: DayType;
  secondsOfDay: number;
} {
  const parts = Object.fromEntries(
    clock.formatToParts(date).map((part) => [part.type, part.value])
  );

  const secondsOfDay =
    Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);

  const dayType: DayType =
    parts.weekday === "Sun"
      ? "sunday"
      : parts.weekday === "Sat"
        ? "saturday"
        : "weekday";

  return { dayType, secondsOfDay };
}

// "06:30" ou "06:30:00" -> 390 (minutos desde a meia-noite)
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":");
  return Number(hours) * 60 + Number(minutes);
}

// 425 -> "07:05"
export function minutesToTime(total: number): string {
  const rounded = Math.round(total);
  const hours = Math.floor(rounded / 60) % 24;
  const minutes = rounded % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}