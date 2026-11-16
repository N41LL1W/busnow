import { buildRoute, minutesAtDistance } from "@/lib/eta";
import { getDepartures, getLinesWithStops } from "@/lib/queries";
import type { DayType } from "@/lib/time";

export type TimetableStop = {
  id: number;
  name: string;
  minute: number; // minutos depois da saída do terminal
};

export type TimetableLine = {
  code: string;
  name: string;
  color: string;
  stops: TimetableStop[];
  departures: Record<DayType, number[]>; // saídas, em minutos desde a meia-noite
};

export async function getTimetables(): Promise<TimetableLine[]> {
  const [lines, departures] = await Promise.all([
    getLinesWithStops(),
    getDepartures(),
  ]);

  return lines.map((line) => {
    const route = buildRoute(line);

    return {
      code: line.code,
      name: line.name,
      color: line.color,
      stops: line.stops.map((stop, index) => ({
        id: stop.id,
        name: stop.name,
        minute: route.timeline
          ? Math.round(minutesAtDistance(route.timeline, route.stopDistances[index]))
          : (stop.offsetMinutes ?? 0),
      })),
      departures: departures.get(line.id) ?? {
        weekday: [],
        saturday: [],
        sunday: [],
      },
    };
  });
}