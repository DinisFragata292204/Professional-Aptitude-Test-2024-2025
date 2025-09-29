// background.tsx
import React, { ReactNode } from "react";
import { ImageBackground, View } from "react-native";
import { styles } from "./styles";

interface BackgroundProps {
  source: { uri: string };
  children: ReactNode;
}

export function Background({ source, children }: BackgroundProps) {
  return (
    <ImageBackground source={source} style={styles.background}>
      <View style={styles.overlay}>{children}</View>
    </ImageBackground>
  );
}