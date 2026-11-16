"use client";

import { useEffect, useState } from "react";
import { getSaoPauloNow, minutesToTime, type DayType } from "@/lib/time";
import type { TimetableLine } from "@/lib/timetable";

const DAY_LABELS: Record<DayType, string> = {
  weekday: "Segunda a sexta",
  saturday: "Sábado",
  sunday: "Domingo",
};

const DAYS: DayType[] = ["weekday", "saturday", "sunday"];

export function Timetable({ lines }: { lines: TimetableLine[] }) {
  const [lineCode, setLineCode] = useState(lines[0]?.code);
  const [stopId, setStopId] = useState<number | null>(null);
  const [chosenDay, setChosenDay] = useState<DayType | null>(null);
  const [now, setNow] = useState<{ dayType: DayType; minutes: number } | null>(
    null
  );

  // O horário só é lido no navegador (no servidor seria outro fuso e outro
  // momento), e atualizado a cada 30 segundos
  useEffect(() => {
    function tick() {
      const { dayType, secondsOfDay } = getSaoPauloNow();
      setNow({ dayType, minutes: secondsOfDay / 60 });
    }

    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 30000);

    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, []);

  const line = lines.find((item) => item.code === lineCode) ?? lines[0];
  if (!line) {
    return <p className="text-slate-400">Nenhuma linha cadastrada.</p>;
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

  let nextText: string | null = null;
  if (nowMinutes !== null && nextIndex >= 0) {
    const wait = Math.round(times[nextIndex] - nowMinutes);
    nextText = `${minutesToTime(times[nextIndex])} (${wait <= 0 ? "agora" : `em ${wait} min`})`;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {lines.map((item) => (
          <button
            key={item.code}
            onClick={() => {
              setLineCode(item.code);
              setStopId(null);
            }}
            className={`rounded px-4 py-2 text-sm font-semibold ${
              item.code === line.code ? "text-white" : "bg-slate-800 text-slate-300"
            }`}
            style={
              item.code === line.code ? { backgroundColor: item.color } : undefined
            }
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {DAYS.map((item) => (
          <button
            key={item}
            onClick={() => setChosenDay(item)}
            className={`rounded px-3 py-1.5 text-xs font-semibold ${
              item === day ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"
            }`}
          >
            {DAY_LABELS[item]}
            {now?.dayType === item ? " (hoje)" : ""}
          </button>
        ))}
      </div>

      <label className="block text-sm text-slate-300">
        Ponto
        <select
          value={stop?.id}
          onChange={(e) => setStopId(Number(e.target.value))}
          className="mt-1 w-full rounded bg-slate-800 px-3 py-2 text-sm text-white"
        >
          {line.stops.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-lg bg-slate-800 p-4">
        {times.length === 0 ? (
          <p className="text-slate-300">Sem circulação neste dia.</p>
        ) : (
          <>
            {nextText && (
              <p className="mb-3 text-lg">
                Próximo ônibus: <strong>{nextText}</strong>
              </p>
            )}
            {nowMinutes !== null && nextIndex === -1 && (
              <p className="mb-3 text-slate-300">
                Acabaram os horários de hoje neste ponto.
              </p>
            )}

            <ul className="grid grid-cols-4 gap-2 text-center text-sm">
              {times.map((time, index) => (
                <li
                  key={`${time}-${index}`}
                  className={`rounded px-2 py-2 ${
                    index === nextIndex
                      ? "bg-blue-600 font-bold text-white"
                      : nowMinutes !== null && time < nowMinutes
                        ? "bg-slate-900 text-slate-500"
                        : "bg-slate-900 text-slate-200"
                  }`}
                >
                  {minutesToTime(time)}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Horários previstos; podem variar com o trânsito. Em feriados os
        horários podem mudar: confirme com a Prefeitura.
      </p>
    </div>
  );
}