import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { holidays } from "@/db/schema";
import { getSaoPauloDateKey, type DayType, type HolidayMap } from "@/lib/time";

export type HolidayInfo = {
  id: number;
  date: string;
  name: string;
  treatAs: DayType;
};

// Todos os feriados cadastrados, em ordem de data
export async function getHolidays(): Promise<HolidayInfo[]> {
  return db
    .select({
      id: holidays.id,
      date: holidays.date,
      name: holidays.name,
      treatAs: holidays.treatAs,
    })
    .from(holidays)
    .orderBy(asc(holidays.date));
}

// "2026-11-20" -> "sunday": o que o relógio (lib/time) precisa
export async function getHolidayMap(): Promise<HolidayMap> {
  const list = await getHolidays();
  return Object.fromEntries(list.map((item) => [item.date, item.treatAs]));
}

// Só para a tela do passageiro saber o NOME do feriado de hoje
export async function getHolidayByDate(date: string) {
  const [row] = await db
    .select({ name: holidays.name, treatAs: holidays.treatAs })
    .from(holidays)
    .where(eq(holidays.date, date))
    .limit(1);
  return row ?? null;
}

// Para o painel: cada feriado com a marca de "já passou" (comparando com a
// data de hoje em Brodowski, calculada aqui e não na tela)
export async function getHolidaysForAdmin(): Promise<
  (HolidayInfo & { past: boolean })[]
> {
  const today = getSaoPauloDateKey();
  const list = await getHolidays();
  return list.map((item) => ({ ...item, past: item.date < today }));
}