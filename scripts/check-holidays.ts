import assert from "node:assert/strict";
import { nationalHolidays } from "../lib/national-holidays";
import { getSaoPauloNow } from "../lib/time";

// 1) Páscoa e feriados móveis de 2026 (Páscoa: 5 de abril)
const h2026 = Object.fromEntries(
  nationalHolidays(2026).map((item) => [item.name, item.date])
);
assert.equal(h2026["Carnaval (terça-feira)"], "2026-02-17");
assert.equal(h2026["Sexta-feira Santa"], "2026-04-03");
assert.equal(h2026["Corpus Christi"], "2026-06-04");
assert.equal(h2026["Dia da Consciência Negra"], "2026-11-20");

// 2) Outro ano, para pegar erro de fórmula (Páscoa 2025: 20 de abril)
const h2025 = Object.fromEntries(
  nationalHolidays(2025).map((item) => [item.name, item.date])
);
assert.equal(h2025["Sexta-feira Santa"], "2025-04-18");
assert.equal(h2025["Corpus Christi"], "2025-06-19");

// 3) Sem feriados cadastrados, nada muda (sexta 20/11/2026, 12:00 UTC)
assert.deepEqual(getSaoPauloNow(new Date("2026-11-20T12:00:00Z")), {
  dayType: "weekday",
  secondsOfDay: 9 * 3600,
});

// 4) Com o feriado cadastrado, o dia vira "sunday"
assert.deepEqual(
  getSaoPauloNow(new Date("2026-11-20T12:00:00Z"), { "2026-11-20": "sunday" }),
  { dayType: "sunday", secondsOfDay: 9 * 3600 }
);

// 5) Feriado de OUTRA data não afeta
assert.equal(
  getSaoPauloNow(new Date("2026-11-20T12:00:00Z"), { "2026-11-21": "sunday" })
    .dayType,
  "weekday"
);

// 6) A data vale em Brasília: 02:30 UTC de 21/11 ainda é 20/11 (23:30)
assert.equal(
  getSaoPauloNow(new Date("2026-11-21T02:30:00Z"), { "2026-11-20": "sunday" })
    .dayType,
  "sunday"
);

console.log("Testes de feriados passaram.");