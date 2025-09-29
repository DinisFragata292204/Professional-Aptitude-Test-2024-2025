import React, { useState } from "react";
import {
  View,
  Modal,
  FlatList,
  Image,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Button, Text, useTheme } from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { styles } from "./styles";

const IMAGES = [
  { id: "1", uri: require("../../assets/images/bg1.jpg") },
  { id: "2", uri: require("../../assets/images/bg2.jpg") },
  { id: "3", uri: require("../../assets/images/bg3.jpg") },
  { id: "4", uri: require("../../assets/images/bg4.jpg") },
  { id: "5", uri: require("../../assets/images/bg5.jpg") },
];

interface BackgroundPickerProps {
  visible: boolean;
  email: string;
  onClose: () => void;
  onSave: (imageUri: string) => void;
}

export const BackgroundPicker: React.FC<BackgroundPickerProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { colors } = useTheme();

  const pickImageFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (selectedImage) {
      onSave(selectedImage);
    }
    const message = "Para ver o novo background, atualize a página!";
    if (Platform.OS === "android") {
      const ToastAndroid = require("react-native").ToastAndroid;
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      alert(message);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: colors.backdrop }]}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.onSurface }]}>
            Escolha um Background
          </Text>

          {selectedImage && (
            <View style={styles.previewContainer}>
              <Text style={[styles.previewText, { color: colors.onSurface }]}>
                Pré-visualização:
              </Text>
              <Image
                source={{ uri: selectedImage }}
                style={styles.previewImage}
              />
            </View>
          )}

          <Text style={[styles.subtitle, { color: colors.onSurface }]}>
            Selecione uma opção:
          </Text>

          <FlatList
            data={IMAGES}
            horizontal
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const assetSource = Image.resolveAssetSource(item.uri).uri;
              return (
                <TouchableOpacity
                  onPress={() => setSelectedImage(assetSource)}
                  style={[
                    styles.thumbnailWrapper,
                    selectedImage === assetSource && styles.selectedWrapper,
                  ]}
                >
                  <Image source={item.uri} style={styles.thumbnail} />
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={styles.thumbnailsContainer}
          />

          <View style={styles.buttonRow}>
            <Button
              mode="outlined"
              onPress={onClose}
              labelStyle={{ color: colors.primary }}
              style={{ borderColor: colors.primary }}
            >
              Cancelar
            </Button>

            <Button
              mode="contained"
              onPress={pickImageFromGallery}
              style={{ backgroundColor: colors.primary }}
            >
              Upload
            </Button>

            <Button
              mode="contained"
              onPress={handleSave}
              disabled={!selectedImage}
              style={{
                backgroundColor: selectedImage
                  ? colors.primary
                  : colors.onSurfaceDisabled,
              }}
            >
              Salvar
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};
