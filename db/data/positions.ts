import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  addressKey,
  lines,
  stopKey,
  stopName,
  type Coordinate,
} from "./lines";

const DATA_DIR = path.join(process.cwd(), "db", "data");
const COORDINATES_FILE = path.join(DATA_DIR, "coordinates.json");
const MANUAL_FILE = path.join(DATA_DIR, "manual-positions.json");

// manual   = você posicionou ou confirmou no editor
// endereco = o geocode achou o número exato (ainda não conferido)
// rua      = o geocode achou só a rua (aproximado)
// nenhum   = sem posição
export type StopSource = "manual" | "endereco" | "rua" | "nenhum";

export type ManualPositions = Record<
  string,
  { latitude: number; longitude: number }
>;

export type ResolvedStop = {
  key: string; // identifica o ponto (rua + número + referência)
  name: string;
  street: string;
  number?: string;
  lineCodes: string[];
  latitude: number | null;
  longitude: number | null;
  source: StopSource;
};

export type EditorLine = {
  code: string;
  name: string;
  color: string;
  stopKeys: string[]; // na ordem do trajeto
};

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return null; // arquivo ainda não existe
  }
}

export function loadManualPositions(): ManualPositions {
  return readJson<ManualPositions>(MANUAL_FILE) ?? {};
}

// Funções síncronas de propósito: ler e gravar acontecem de uma vez só,
// então dois salvamentos seguidos nunca se atropelam.
export function saveManualPosition(
  key: string,
  latitude: number,
  longitude: number
) {
  const all = loadManualPositions();
  all[key] = { latitude, longitude };
  writeFileSync(MANUAL_FILE, JSON.stringify(all, null, 2) + "\n");
}

// Uma entrada por ponto único (o terminal serve às duas linhas, mas é um só).
// Prioridade da posição: ajuste manual > coordenada do geocode.
export function resolveStops(): ResolvedStop[] {
  const coordinates =
    readJson<Record<string, Coordinate>>(COORDINATES_FILE) ?? {};
  const manual = loadManualPositions();
  const byKey = new Map<string, ResolvedStop>();

  for (const line of lines) {
    for (const stop of line.stops) {
      const key = stopKey(stop);

      const existing = byKey.get(key);
      if (existing) {
        existing.lineCodes.push(line.code);
        continue;
      }

      const base = {
        key,
        name: stopName(stop),
        street: stop.street,
        number: stop.number,
        lineCodes: [line.code],
      };

      const adjusted = manual[key];
      const found = coordinates[addressKey(stop)];

      if (adjusted) {
        byKey.set(key, {
          ...base,
          latitude: adjusted.latitude,
          longitude: adjusted.longitude,
          source: "manual",
        });
      } else if (found && found.latitude !== null && found.longitude !== null) {
        byKey.set(key, {
          ...base,
          latitude: found.latitude,
          longitude: found.longitude,
          source:
            found.precision === "manual" || found.precision === "endereco"
              ? found.precision
              : "rua",
        });
      } else {
        byKey.set(key, { ...base, latitude: null, longitude: null, source: "nenhum" });
      }
    }
  }

  return [...byKey.values()];
}

export function editorLines(): EditorLine[] {
  return lines.map((line) => ({
    code: line.code,
    name: line.name,
    color: line.color,
    stopKeys: line.stops.map((stop) => stopKey(stop)),
  }));
}