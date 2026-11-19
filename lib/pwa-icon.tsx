import { ImageResponse } from "next/og";
import { getSettings } from "@/lib/settings";

// "Circular Brodowski" -> "CB"; sem acentos (a fonte do ícone não tem todos)
function initials(name: string): string {
  const words = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  const letters =
    words.length >= 2 ? words[0][0] + words[1][0] : (words[0] ?? "B").slice(0, 2);
  return letters.toUpperCase();
}

// "maskable": o Android recorta o ícone em círculo ou quadrado arredondado,
// por isso ele precisa de fundo até a borda e conteúdo só no centro
// (a "zona segura").
export async function renderIcon(size: number, maskable = false) {
  const settings = await getSettings();
  const radius = maskable ? 0 : Math.round(size * 0.22);
  const fontSize = Math.round(size * (maskable ? 0.32 : 0.4));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: settings.primaryColor,
          borderRadius: radius,
          color: "#ffffff",
          fontSize,
          fontWeight: 700,
        }}
      >
        {initials(settings.serviceName)}
      </div>
    ),
    { width: size, height: size }
  );
}