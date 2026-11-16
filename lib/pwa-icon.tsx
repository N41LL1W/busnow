import { ImageResponse } from "next/og";

// Ícone provisório gerado por código.
// Quando tiver a identidade visual definitiva, coloque PNGs em public/icons
// e ajuste os "src" em app/manifest.ts.
//
// "maskable": o Android recorta o ícone em círculo ou quadrado arredondado,
// por isso ele precisa de fundo até a borda e conteúdo só no centro
// (a "zona segura").
export function renderIcon(size: number, maskable = false) {
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
          background: "#2563eb",
          borderRadius: radius,
          color: "#ffffff",
          fontSize,
          fontWeight: 700,
        }}
      >
        BN
      </div>
    ),
    { width: size, height: size }
  );
}