// Exemplo modificado do ThemeProvider para aceitar um valor inicial (opcional)
import React, { createContext, useState, useEffect } from "react";
import { DefaultTheme, MD3DarkTheme, Provider as PaperProvider } from "react-native-paper";

export interface ThemeContextData {
  toggleTheme: () => void;
  isDarkTheme: boolean;
}

export const ThemeContext = createContext<ThemeContextData>({
  toggleTheme: () => {},
  isDarkTheme: false,
});

interface ThemeProviderProps {
  children: React.ReactNode;
  // Exemplo de prop opcional para definir o tema inicial
  initialTheme?: "light" | "dark";
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, initialTheme = "light" }) => {
  const [isDarkTheme, setIsDarkTheme] = useState(initialTheme === "dark");

  const toggleTheme = () => setIsDarkTheme((prev) => !prev);

  const theme = isDarkTheme ? MD3DarkTheme : DefaultTheme;

  return (
    <ThemeContext.Provider value={{ toggleTheme, isDarkTheme }}>
      <PaperProvider theme={theme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
};