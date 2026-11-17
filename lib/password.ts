import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

// O scrypt do Node usa "callback"; aqui o transformamos em Promise, com os
// tipos escritos por nós (o promisify não reconhece a versão com opções)
function scryptAsync(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

// Parâmetros do scrypt: quanto mais alto, mais difícil de adivinhar por
// força bruta (e mais lento para conferir; aqui leva uma fração de segundo)
const PARAMS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;

// Formato guardado: scrypt$N$r$p$sal$impressão
// Os parâmetros ficam junto, então dá para endurecê-los no futuro sem
// invalidar as senhas antigas.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH, PARAMS);
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64"),
    hash.toString("base64"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [scheme, n, r, p, saltBase64, hashBase64] = stored.split("$");
  if (scheme !== "scrypt" || !saltBase64 || !hashBase64) return false;

  const expected = Buffer.from(hashBase64, "base64");
  const actual = await scryptAsync(
    password,
    Buffer.from(saltBase64, "base64"),
    expected.length,
    { N: Number(n), r: Number(r), p: Number(p), maxmem: PARAMS.maxmem }
  );

  // Comparação em tempo constante: o tempo não revela quantos caracteres
  // "quase" batem
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}