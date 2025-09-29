// src/utils/colors.ts

// Define um tipo “Theme” (podes usar “string” se não quiseres TS):
export type ThemeMode = "light" | "dark";

// Aqui está o “mapa” de cores para cada elemento. 
// Para cada modo (“light” e “dark”) definimos as cores de título, caixa, ícone, texto genérico, fundo de modal etc.
const palette = {
  light: {
    title: "#000000",         // cor do texto de título no modo claro
    box: "#FFFFFF",           // cor de fundo de caixas no modo claro
    icon: "#000000",          // cor dos ícones no modo claro
    text: "#333333",          // cor de texto genérico no modo claro
    background: "#F2F2F2",    // cor geral de background no modo claro
    modalOverlay: "rgba(0,0,0,0.1)", // exemplo de overlay claro
    // adiciona aqui outras propriedades que precises:
    //   buttonBackground: "#E0E0E0",
    //   buttonText: "#000000",
    //   border: "#CCCCCC",
    //   etc...
  },
  dark: {
    title: "#FFFFFF",         // cor do texto de título no modo escuro
    box: "#222222",           // cor de fundo de caixas no modo escuro
    icon: "#FFFFFF",          // cor dos ícones no modo escuro
    text: "#EEEEEE",          // cor de texto genérico no modo escuro
    background: "#000000",    // cor geral de background no modo escuro
    modalOverlay: "rgba(255,255,255,0.1)", // exemplo de overlay escuro
    // outras propriedades específicas para dark:
    //   buttonBackground: "#333333",
    //   buttonText: "#FFFFFF",
    //   border: "#444444",
    //   etc...
  },
};

// Para cada “elemento” que precises (título, caixa, ícone, texto, fundo, overlay…), exporta uma função que recebe o tema e devolve a cor correspondente:
export function titleColor(theme: ThemeMode): string {
  return palette[theme].title;
}

export function boxColor(theme: ThemeMode): string {
  return palette[theme].box;
}

export function iconColor(theme: ThemeMode): string {
  return palette[theme].icon;
}

export function textColor(theme: ThemeMode): string {
  return palette[theme].text;
}

export function backgroundColor(theme: ThemeMode): string {
  return palette[theme].background;
}

export function modalOverlayColor(theme: ThemeMode): string {
  return palette[theme].modalOverlay;
}
export function color(theme: ThemeMode): string {
  return palette[theme].modalOverlay;
}

// Se precisares de mais “categorias”, cria mais funções, por ex:
// export function buttonBackgroundColor(theme: ThemeMode): string {
//   return palette[theme].buttonBackground;
// }
// export function buttonTextColor(theme: ThemeMode): string {
//   return palette[theme].buttonText;
// }
// export function borderColor(theme: ThemeMode): string {
//   return palette[theme].border;
// }
// …etc.
