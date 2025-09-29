import { useState, useEffect } from "react";
import axios from "axios";
import config from "../config/config_db";

export function useBackground(email: string) {
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [userTheme, setUserTheme] = useState<"light" | "dark">("light");
  const [loading, setLoading] = useState(true);

  async function fetchBackground() {
    try {
      const response = await axios.get(
        `${config.baseUrl}/backgroundFiles/getBackground.php?email=${email}`
      );
      if (response.data.success) {
        setBackgroundUrl(response.data.background_url);
        // Garante que apenas "dark" ou "light" sejam armazenados
        setUserTheme(response.data.theme === "dark" ? "dark" : "light");
      }
    } catch (error) {
      console.error("Erro ao buscar background:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (email) {
      fetchBackground();
    }
  }, [email]);

  async function changeBackground(newUrl: string) {
    try {
      const response = await axios.post(
        `${config.baseUrl}/backgroundFiles/changeBackground.php`,
        {
          email,
          background_url: newUrl,
        }
      );
      if (response.data.success) {
        setBackgroundUrl(newUrl);
      }
    } catch (error) {
      console.error("Erro ao atualizar background:", error);
    }
  }

  return { backgroundUrl, userTheme, loading, changeBackground, refreshBackground: fetchBackground };
}