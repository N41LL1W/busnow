"use client";

import { useEffect, useState } from "react";
import type { HolidayInfo } from "@/lib/holidays";
import {
  getSaoPauloDateKey,
  getSaoPauloNow,
  minutesToTime,
  type DayType,
} from "@/lib/time";
import type { TimetableLine } from "@/lib/timetable";

const DAY_LABELS: Record<DayType, string> = {
  weekday: "Segunda a sexta",
  saturday: "Sábado",
  sunday: "Domingo",
};

const DAYS: DayType[] = ["weekday", "saturday", "sunday"];

export function Timetable({
  lines,
  holidays,
}: {
  lines: TimetableLine[];
  holidays: HolidayInfo[];
}) {
  const [lineCode, setLineCode] = useState(lines[0]?.code);
  const [stopId, setStopId] = useState<number | null>(null);
  const [chosenDay, setChosenDay] = useState<DayType | null>(null);
  const [now, setNow] = useState<{
    dayType: DayType;
    minutes: number;
    holiday: string | null; // nome do feriado de hoje, se for feriado
  } | null>(null);

  // O horário só é lido no navegador (no servidor seria outro fuso e outro
  // momento), e atualizado a cada 30 segundos
  useEffect(() => {
    function tick() {
      // Feriado cadastrado: vale o tipo de dia dele (normalmente domingo)
      const holidayMap = Object.fromEntries(
        holidays.map((item) => [item.date, item.treatAs])
      );
      const { dayType, secondsOfDay } = getSaoPauloNow(new Date(), holidayMap);
      const today = holidays.find((item) => item.date === getSaoPauloDateKey());
      setNow({
        dayType,
        minutes: secondsOfDay / 60,
        holiday: today?.name ?? null,
      });
    }

    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 30000);

    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [holidays]);

  const line = lines.find((item) => item.code === lineCode) ?? lines[0];
  if (!line) {
    return <p className="text-muted">Nenhuma linha cadastrada.</p>;
  }

  const stop = line.stops.find((item) => item.id === stopId) ?? line.stops[0];
  const day = chosenDay ?? now?.dayType ?? "weekday";

  // Horário em cada ponto = saída do terminal + minutos do ponto
  const times = (line.departures[day] ?? []).map(
    (departure) => departure + (stop?.minute ?? 0)
  );

  // Só marcamos "próximo" e "já passou" se o dia mostrado for hoje
  const nowMinutes = now?.dayType === day ? now.minutes : null;
  const nextIndex =
    nowMinutes === null ? -1 : times.findIndex((time) => time >= nowMinutes);

  let nextTime: string | null = null;
  let nextWait: string | null = null;
  if (nowMinutes !== null && nextIndex >= 0) {
    const wait = Math.round(times[nextIndex] - nowMinutes);
    nextTime = minutesToTime(times[nextIndex]);
    nextWait = wait <= 0 ? "agora" : `em ${wait} min`;
  }

  return (
    <div className="space-y-5">
      {now?.holiday && (
        <p role="status" className="notice notice-info rounded-xl px-4 py-3 text-sm">
          Hoje é feriado ({now.holiday}). Valem os horários de{" "}
          {DAY_LABELS[now.dayType].toLowerCase()}.
        </p>
      )}
      {/* Linhas: abas que rolam de lado se não couberem */}
      <div
        role="tablist"
        aria-label="Linha"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
      >
        {lines.map((item) => {
          const selected = item.code === line.code;
          return (
            <button
              key={item.code}
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setLineCode(item.code);
                setStopId(null);
              }}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold ${
                selected
                  ? "border-transparent text-white"
                  : "border-line bg-card text-muted hover:text-ink"
              }`}
              style={selected ? { backgroundColor: item.color } : undefined}
            >
              {item.name}
            </button>
          );
        })}
      </div>

      {/* Dia da semana: controle segmentado */}
      <div
        role="group"
        aria-label="Dia da semana"
        className="grid grid-cols-3 gap-1 rounded-xl bg-card-2 p-1"
      >
        {DAYS.map((item) => (
          <button
            key={item}
            onClick={() => setChosenDay(item)}
            aria-pressed={item === day}
            className={`min-h-11 rounded-lg px-2 text-xs font-semibold sm:text-sm ${
              item === day
                ? "bg-card text-ink shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            {DAY_LABELS[item]}
            {now?.dayType === item && (
              <span className="block text-[11px] font-normal text-brand-ink">
                hoje
              </span>
            )}
          </button>
        ))}
      </div>

      <label className="block text-sm font-semibold">
        Ponto
        <select
          value={stop?.id}
          onChange={(e) => setStopId(Number(e.target.value))}
          className="mt-1 min-h-12 w-full rounded-xl border border-line bg-card px-3 text-base font-normal text-ink"
        >
          {line.stops.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <section
        aria-live="polite"
        className="rounded-2xl border border-line bg-card p-4 sm:p-5"
      >
        {times.length === 0 ? (
          <p className="text-muted">Sem circulação neste dia.</p>
        ) : (
          <>
            {nextTime && (
              <div className="mb-4 flex items-end justify-between gap-3 rounded-xl bg-card-2 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Próximo ônibus
                  </p>
                  <p className="mt-1 text-4xl font-extrabold leading-none tabular-nums text-brand-ink">
                    {nextTime}
                  </p>
                </div>
                <p className="text-sm font-semibold">{nextWait}</p>
              </div>
            )}
            {nowMinutes !== null && nextIndex === -1 && (
              <p className="mb-4 rounded-xl bg-card-2 p-4 text-sm text-muted">
                Acabaram os horários de hoje neste ponto.
              </p>
            )}

            <ul className="grid grid-cols-4 gap-2 text-center text-sm sm:grid-cols-6 md:grid-cols-8">
              {times.map((time, index) => (
                <li
                  key={`${time}-${index}`}
                  className={`rounded-lg px-1 py-2.5 tabular-nums ${
                    index === nextIndex
                      ? "bg-brand font-bold text-white"
                      : nowMinutes !== null && time < nowMinutes
                        ? "bg-card-2 text-muted opacity-60"
                        : "bg-card-2 font-medium"
                  }`}
                >
                  {minutesToTime(time)}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <p className="text-xs text-muted">
        Horários previstos; podem variar com o trânsito. Em feriados os
        horários podem mudar: confirme com a Prefeitura.
      </p>
    </div>
  );
}