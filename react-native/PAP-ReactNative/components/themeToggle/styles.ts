// ../components/themeToggle/styles.ts
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  themeToggleContainer: {
    position: "absolute",
    top: 50,
    right: 20,
    borderRadius: 10,
    padding: 10,
    elevation: 3,
  },
  radioItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 4,
  },
});
