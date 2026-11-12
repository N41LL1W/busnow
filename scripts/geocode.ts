import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { addressKey, lines, type Coordinate } from "../db/data/lines";

const OUTPUT = path.join(process.cwd(), "db", "data", "coordinates.json");

// TROQUE pelo seu e-mail: o Nominatim exige identificação de quem consulta
const USER_AGENT = "BusNow-Brodowski/0.1 (willian.pmbrodowski@gmail.com)";

// Brodowski e arredores (caixa de uns 22 km). Resultado fora dela é
// descartado, porque provavelmente é uma rua de mesmo nome em outra cidade.
const BOUNDS = { minLat: -21.09, maxLat: -20.89, minLon: -47.76, maxLon: -47.56 };

type NominatimResult = {
  lat: string;
  lon: string;
  display_name: string;
  category?: string;
  type?: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Faz UMA busca e devolve o primeiro resultado que cai dentro de Brodowski
async function search(params: Record<string, string>) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    countrycodes: "br",
    ...params,
  }).toString();

  // Servidor ocupado (503) ou limite atingido (429): espera e tenta de novo
  let res: Response | undefined;
  for (let attempt = 1; attempt <= 5; attempt++) {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "pt-BR" },
    });
    if (res.status !== 429 && res.status !== 503) break;

    const waitMs = attempt * 8000;
    console.log(
      `  Nominatim ocupado (${res.status}). Aguardando ${waitMs / 1000}s (tentativa ${attempt}/5)...`
    );
    await sleep(waitMs);
  }

  // Regra do Nominatim: no máximo 1 busca por segundo
  await sleep(1500);

  if (!res || !res.ok) {
    throw new Error(`Nominatim respondeu ${res ? res.status : "sem resposta"}`);
  }

  const [hit] = (await res.json()) as NominatimResult[];
  if (!hit) return null;

  const latitude = Number(hit.lat);
  const longitude = Number(hit.lon);
  const inside =
    latitude >= BOUNDS.minLat &&
    latitude <= BOUNDS.maxLat &&
    longitude >= BOUNDS.minLon &&
    longitude <= BOUNDS.maxLon;
  if (!inside) return null;

  return {
    latitude,
    longitude,
    found: hit.display_name,
    isHouse: hit.type === "house" || hit.category === "building",
  };
}

// Tenta do mais preciso para o mais genérico
async function geocode(street: string, number?: string): Promise<Coordinate> {
  const cleanNumber = number?.replace(/\./g, ""); // "1.417" -> "1417"

  const attempts: Record<string, string>[] = [];
  if (cleanNumber) {
    attempts.push({
      street: `${cleanNumber} ${street}`,
      city: "Brodowski",
      state: "São Paulo",
    });
  }
  attempts.push({ street, city: "Brodowski", state: "São Paulo" });
  attempts.push({ q: `${street}, Brodowski, SP, Brasil` });

  for (const params of attempts) {
    const hit = await search(params);
    if (hit) {
      return {
        latitude: hit.latitude,
        longitude: hit.longitude,
        precision: hit.isHouse ? "endereco" : "rua",
        found: hit.found,
      };
    }
  }

  return { latitude: null, longitude: null, precision: "nenhum", found: "" };
}

async function main() {
  // Resultados anteriores ficam guardados: rodar de novo só busca o que falta
  let cache: Record<string, Coordinate> = {};
  try {
    cache = JSON.parse(await readFile(OUTPUT, "utf8"));
  } catch {
    // arquivo ainda não existe
  }

  // Endereços únicos (o terminal aparece nas duas linhas, mas é buscado uma vez)
  const addresses = new Map<string, { street: string; number?: string }>();
  for (const line of lines) {
    for (const stop of line.stops) {
      addresses.set(addressKey(stop), { street: stop.street, number: stop.number });
    }
  }

  let index = 0;
  for (const [key, { street, number }] of addresses) {
    index++;
    const existing = cache[key];

    if (existing && (existing.precision === "manual" || existing.latitude !== null)) {
      console.log(`[${index}/${addresses.size}] já tem: ${key}`);
      continue;
    }

    cache[key] = await geocode(street, number);
    console.log(`[${index}/${addresses.size}] ${cache[key].precision.padEnd(8)} ${key}`);

    // Salva a cada endereço: se interromper, não perde o que já buscou
    await writeFile(OUTPUT, JSON.stringify(cache, null, 2) + "\n");
  }

  // Resumo
  const values = [...addresses.keys()].map((key) => ({ key, ...cache[key] }));
  const count = (p: string) => values.filter((v) => v.precision === p).length;
  console.log("\nResumo:");
  console.log(`  endereço exato: ${count("endereco")}`);
  console.log(`  só a rua (aproximado): ${count("rua")}`);
  console.log(`  não encontrado: ${count("nenhum")}`);
  console.log(`  corrigidos por você: ${count("manual")}`);

  // Lista o que precisa de conferência, com links para abrir no mapa
  const toCheck = values.filter((v) => v.precision === "rua" || v.precision === "nenhum");
  if (toCheck.length > 0) {
    console.log("\nConferir (abra o link e veja onde fica o ponto):");
    for (const v of toCheck) {
      const [street, number] = v.key.split("|");
      const query = encodeURIComponent(`${street} ${number}, Brodowski, SP`.replace(" ,", ","));
      console.log(`\n- ${v.key}  [${v.precision}]`);
      console.log(`  Google Maps: https://www.google.com/maps/search/?api=1&query=${query}`);
      if (v.latitude !== null && v.longitude !== null) {
        console.log(
          `  Onde o script pôs: https://www.openstreetmap.org/?mlat=${v.latitude}&mlon=${v.longitude}#map=18/${v.latitude}/${v.longitude}`
        );
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});