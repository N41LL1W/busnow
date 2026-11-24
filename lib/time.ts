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

// "2026-11-20": a data em Brodowski (o formato en-CA já sai como AAAA-MM-DD)
const calendar = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getSaoPauloDateKey(date: Date = new Date()): string {
  return calendar.format(date);
}

// Feriados por data: "2026-11-20" -> tipo de dia que vale nesse feriado
export type HolidayMap = Record<string, DayType>;

// Que dia e que hora são AGORA em Brodowski, independente do fuso do
// servidor ou do celular. Se a data for um feriado cadastrado, o tipo do
// dia vira o do feriado (por exemplo, "sunday").
export function getSaoPauloNow(
  date: Date = new Date(),
  holidays?: HolidayMap
): {
  dayType: DayType;
  secondsOfDay: number;
} {
  const parts = Object.fromEntries(
    clock.formatToParts(date).map((part) => [part.type, part.value])
  );

  const secondsOfDay =
    Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);

  const weekdayType: DayType =
    parts.weekday === "Sun"
      ? "sunday"
      : parts.weekday === "Sat"
        ? "saturday"
        : "weekday";

  const dayType = holidays?.[getSaoPauloDateKey(date)] ?? weekdayType;

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