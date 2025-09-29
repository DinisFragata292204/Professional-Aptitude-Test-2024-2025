// useLocalSettings.ts
import { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";

const THEME_KEY = "userTheme";
const BACKGROUND_KEY = "backgroundUrl";

export function useLocalSettings() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      console.log("Fetching local settings...");
      try {
        const storedTheme = await SecureStore.getItemAsync(THEME_KEY);
        const storedBackground = await SecureStore.getItemAsync(BACKGROUND_KEY);
        console.log("Stored theme:", storedTheme);
        console.log("Stored background URL:", storedBackground);
        setTheme(storedTheme === "dark" ? "dark" : "light");
        setBackgroundUrl(storedBackground);
      } catch (error) {
        console.error("Erro ao buscar configurações:", error);
      } finally {
        setLoading(false);
        console.log("Finished fetching settings. Loading:", false);
      }
    }
    fetchSettings();
  }, []);

  async function changeTheme(newTheme: "light" | "dark") {
    console.log("Changing theme to:", newTheme);
    try {
      await SecureStore.setItemAsync(THEME_KEY, newTheme);
      setTheme(newTheme);
      console.log("Theme updated successfully.");
    } catch (error) {
      console.error("Erro ao atualizar tema:", error);
    }
  }

  async function changeBackground(newUrl: string) {
    console.log("Changing background URL to:", newUrl);
    try {
      await SecureStore.setItemAsync(BACKGROUND_KEY, newUrl);
      setBackgroundUrl(newUrl);
      console.log("Background updated successfully.");
    } catch (error) {
      console.error("Erro ao atualizar background:", error);
    }
  }

  async function refreshSettings() {
    console.log("Refreshing settings...");
    setLoading(true);
    try {
      const storedTheme = await SecureStore.getItemAsync(THEME_KEY);
      const storedBackground = await SecureStore.getItemAsync(BACKGROUND_KEY);
      console.log("Refreshed stored theme:", storedTheme);
      console.log("Refreshed stored background URL:", storedBackground);
      setTheme(storedTheme === "dark" ? "dark" : "light");
      setBackgroundUrl(storedBackground);
    } catch (error) {
      console.error("Erro ao buscar configurações:", error);
    } finally {
      setLoading(false);
      console.log("Finished refreshing settings. Loading:", false);
    }
  }

  return { theme, backgroundUrl, loading, changeTheme, changeBackground, refreshSettings };
}