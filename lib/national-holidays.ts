// Feriados nacionais do Brasil de um ano. Função pura (sem banco), por isso
// dá para testar com `npm run check:holidays`.

export type NationalHoliday = { date: string; name: string };

// Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher): serve para todo ano
// do calendário gregoriano.
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = março, 4 = abril
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function key(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function plusDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

export function nationalHolidays(year: number): NationalHoliday[] {
  const easter = easterSunday(year);
  const fixed = (month: number, day: number) =>
    `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const list: NationalHoliday[] = [
    { date: fixed(1, 1), name: "Confraternização Universal" },
    { date: key(plusDays(easter, -47)), name: "Carnaval (terça-feira)" },
    { date: key(plusDays(easter, -2)), name: "Sexta-feira Santa" },
    { date: fixed(4, 21), name: "Tiradentes" },
    { date: fixed(5, 1), name: "Dia do Trabalho" },
    { date: key(plusDays(easter, 60)), name: "Corpus Christi" },
    { date: fixed(9, 7), name: "Independência do Brasil" },
    { date: fixed(10, 12), name: "Nossa Senhora Aparecida" },
    { date: fixed(11, 2), name: "Finados" },
    { date: fixed(11, 15), name: "Proclamação da República" },
    { date: fixed(11, 20), name: "Dia da Consciência Negra" },
    { date: fixed(12, 25), name: "Natal" },
  ];

  return list.sort((x, y) => x.date.localeCompare(y.date));
}