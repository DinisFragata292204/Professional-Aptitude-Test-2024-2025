import React from "react";
import { View, Text, Switch, StyleSheet } from "react-native";

interface ThemeToggleProps {
  onToggle: () => void;
  currentTheme: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ onToggle, currentTheme }) => {
  // Se o tema for light, usamos cores escuras e vice-versa.
  const dynamicTextColor = currentTheme === "light" ? "#000" : "#FFF";
  const dynamicSwitchThumbColor = currentTheme === "light" ? "#CCC" : "#CCC";
  const dynamicSwitchTrackColor = currentTheme === "light"
    ? { false: "#000", true: "#000" }
    : { false: "#FFF", true: "#FFF" };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: dynamicTextColor }]}>
        Mudar entre modo escuro e claro
      </Text>
      <Switch
        value={currentTheme === "dark"}
        onValueChange={onToggle}
        thumbColor={dynamicSwitchThumbColor}
        trackColor={dynamicSwitchTrackColor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
  },
  label: {
    fontSize: 16,
  },
});

export default ThemeToggle;