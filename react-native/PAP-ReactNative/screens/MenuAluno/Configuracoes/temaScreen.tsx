// ThemeScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Modal,
  Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import { Background } from "../../../components/background";
import ThemeToggle from "../../../components/themeToggle";
import { BackgroundPicker } from "../../../components/backgroundPicker";
import config from "../../../config/config_db";
import ModalConfig from "../../../components/modalConfig";

// Funções utilitárias para armazenamento
const storeItem = async (key: string, value: string) => {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

// Imagens padrões com mapeamento: caminho e fonte
const defaultImages = [
  { path: "bg1.jpg", source: require("../../../assets/images/bg1.jpg") },
  { path: "bg2.jpg", source: require("../../../assets/images/bg2.jpg") },
  { path: "bg3.jpg", source: require("../../../assets/images/bg3.jpg") },
  { path: "bg4.jpg", source: require("../../../assets/images/bg4.jpg") },
  { path: "bg5.jpg", source: require("../../../assets/images/bg5.jpg") },
];

const ThemeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { email } = route.params as { email: string };

  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light");
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  // URLs dos endpoints do backend
  const changeBgUrl = `${config.baseUrl}/backgroundFiles/changeBackground.php`;
  const getPersonalizationUrl = `${config.baseUrl}/backgroundFiles/getThemeAndBackground.php`;

  // Busca personalização do backend
  const fetchPersonalization = async () => {
    try {
      const response = await fetch(getPersonalizationUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await response.json();
      if (json.success) {
        const newTheme = json.tema_user === "dark" ? "dark" : "light";
        setCurrentTheme(newTheme);
        setBackgroundUrl(json.background_user);
        await storeItem("userTheme", newTheme);
        await storeItem("backgroundUrl", json.background_user);
      } else {
        console.log("Erro ao buscar personalização:", json.message);
      }
    } catch (error) {
      console.log("Erro ao buscar personalização:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonalization();
  }, []);

  // Converte imagem para base64 se necessário (apenas mobile)
  const getImageAsBase64 = async (uri: string): Promise<string> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error("Erro ao converter imagem para base64:", error);
      throw error;
    }
  };

  // Atualiza a personalização no backend
  const updatePersonalization = async (theme: "light" | "dark", background: string | null) => {
    try {
      let backgroundToSend = background || "";
      if (Platform.OS !== "web" && background && background.startsWith("file:")) {
        backgroundToSend = await getImageAsBase64(background);
      }
      const response = await fetch(changeBgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          background_user: backgroundToSend,
          tema_user: theme,
        }),
      });
      const json = await response.json();
      console.log("Resposta de atualização:", json);
      if (json.success) {
        setCurrentTheme(json.tema_user === "dark" ? "dark" : "light");
        setBackgroundUrl(json.background_user);
        await storeItem("userTheme", json.tema_user);
        await storeItem("backgroundUrl", json.background_user);
      }
    } catch (error) {
      console.error("Erro ao atualizar personalização:", error);
    }
  };

  const changeTheme = async (newTheme: "light" | "dark") => {
    setCurrentTheme(newTheme);
    await storeItem("userTheme", newTheme);
    updatePersonalization(newTheme, backgroundUrl);
  };

  const changeBackground = async (imageUri: string) => {
    setBackgroundUrl(imageUri);
    await storeItem("backgroundUrl", imageUri);
    updatePersonalization(currentTheme, imageUri);
  };

  const handleThemeToggle = () => {
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    changeTheme(newTheme);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setPreviewImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSaveBackground = async () => {
    if (previewImage) {
      let finalImage = previewImage;
      if (Platform.OS !== "web" && previewImage.startsWith("file:")) {
        try {
          finalImage = await getImageAsBase64(previewImage);
        } catch (error) {
          console.error("Erro ao converter imagem para base64:", error);
        }
      }
      changeBackground(finalImage);
      setModalVisible(false);
      setPreviewImage(null);
    }
  };

  const handleCancelPreview = () => {
    setPreviewImage(null);
  };

  // Exibe tela de loading enquanto carrega os dados
  if (loading) {
    let loadingBackground;
    if (backgroundUrl) {
      if (backgroundUrl.startsWith("data:") || backgroundUrl.startsWith("http")) {
        loadingBackground = { uri: backgroundUrl };
      } else {
        const defaultBg = defaultImages.find(img => `assets/images/${img.path}` === backgroundUrl);
        loadingBackground = defaultBg ? defaultBg.source : { uri: `${config.baseUrl}/${backgroundUrl}` };
      }
    } else {
      loadingBackground = require("../../../assets/images/bg1.jpg");
    }
    return (
      <Background source={loadingBackground}>
        <View style={styles.loadingWrapper}>
          <View
            style={[
              styles.loadingContainer,
              currentTheme === "dark" ? styles.loadingDark : styles.loadingLight,
            ]}
          >
            <ActivityIndicator
              size="large"
              color={currentTheme === "dark" ? "#fff" : "#000"}
            />
          </View>
        </View>
      </Background>
    );
  }


  const resolvedBackground = (() => {
    if (!backgroundUrl) return require("../../../assets/images/bg1.jpg");
    if (backgroundUrl.startsWith("data:") || backgroundUrl.startsWith("http")) {
      return { uri: backgroundUrl };
    }
    const defaultMapping: { [key: string]: any } = {
      "assets/images/bg1.jpg": require("../../../assets/images/bg1.jpg"),
      "assets/images/bg2.jpg": require("../../../assets/images/bg2.jpg"),
      "assets/images/bg3.jpg": require("../../../assets/images/bg3.jpg"),
      "assets/images/bg4.jpg": require("../../../assets/images/bg4.jpg"),
      "assets/images/bg5.jpg": require("../../../assets/images/bg5.jpg"),
    };
    if (defaultMapping[backgroundUrl]) {
      return defaultMapping[backgroundUrl];
    }
    return { uri: `${config.baseUrl}/${backgroundUrl}` };
  })();

  // Cores dinâmicas conforme o tema
  const dynamicOverlayColor = currentTheme === "dark" ? "rgba(0, 0, 0, 0.5)" : "transparent";
  const dynamicCardBackground = currentTheme === "dark" ? "rgba(0, 0, 0, 0.5)" : "#f0f0f0";
  const dynamicTextColor = currentTheme === "dark" ? "#fff" : "#000";

  // Estilos para o botão e seu texto de acordo com o tema
  const buttonStyle = [
    styles.button,
    { backgroundColor: currentTheme === "dark" ? "#333" : "#ccc" },
  ];
  const buttonTextStyle = [
    styles.buttonText,
    { color: currentTheme === "dark" ? "#fff" : "#000" },
  ];

  // Modal para escolha do background (tratamento diferenciado para web vs mobile)
  const renderBackgroundModal = () => {
    if (Platform.OS === "web") {
      return (
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setModalVisible(false);
            setPreviewImage(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {!previewImage ? (
                <>
                  <Text style={[styles.modalTitle, { color: dynamicTextColor }]}>
                    Escolha um background
                  </Text>
                  <View style={styles.defaultImagesContainer}>
                    {defaultImages.map((img, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => setPreviewImage(`assets/images/${img.path}`)}
                      >
                        <Image source={img.source} style={styles.defaultImage} />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={buttonStyle}
                    onPress={openFilePicker}
                  >
                    <Text style={buttonTextStyle}>Selecionar do Computador</Text>
                  </TouchableOpacity>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                  />
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={{ color: dynamicTextColor }}>Fechar</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={[styles.modalTitle, { color: dynamicTextColor }]}>
                    Preview do Background
                  </Text>
                  {previewImage.startsWith("assets/") ? (
                    <Image
                      source={
                        defaultImages.find(img => `assets/images/${img.path}` === previewImage)?.source
                      }
                      style={styles.previewImage}
                    />
                  ) : (
                    <Image source={{ uri: previewImage }} style={styles.previewImage} />
                  )}
                  <View style={styles.previewButtonsContainer}>
                    <TouchableOpacity
                      style={buttonStyle}
                      onPress={handleSaveBackground}
                    >
                      <Text style={buttonTextStyle}>Salvar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancelPreview}>
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      );
    } else {
      return (
        <BackgroundPicker
          visible={modalVisible}
          email={email}
          onClose={() => setModalVisible(false)}
          onSave={(imageUri: string) => {
            changeBackground(imageUri);
            setModalVisible(false);
          }}
        />
      );
    }
  };

  return (
    <Background source={resolvedBackground}>
      {currentTheme === "dark" && (
        <View
          style={[styles.darkOverlay, { backgroundColor: dynamicOverlayColor }]}
          pointerEvents="none"
        />
      )}
        <View
          style={{
            width: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: Platform.OS === "web" ? 40 : (StatusBar.currentHeight || 20),
            paddingHorizontal: 10,
            paddingBottom: 10,
            position: "absolute",
            top: 0,
            zIndex: 10,
            backgroundColor: currentTheme === "dark" ? "rgba(0, 0, 0, 0.5)" : "#ffffff",
          }}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ flex: 1 }}>
            <Image
              source={require("../../../assets/icons/angle-left.png")}
              style={{
                width: Platform.OS === "web" ? 35 : 23,
                height: Platform.OS === "web" ? 35 : 25,
                marginLeft: 3,
                marginTop: Platform.OS === "web" ? -15 : 3,
                tintColor: currentTheme === "dark" ? "#fff" : "#000",
              }}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAccountModalVisible(true)} style={{ flex: 1, alignItems: "flex-end" }}>
            <Image
              source={require("../../../assets/icons/user.png")}
              style={{
                width: Platform.OS === "web" ? 30 : 25,
                height: Platform.OS === "web" ? 30 : 25,
                marginTop: Platform.OS === "web" ? -5 : 3,
                tintColor: currentTheme === "dark" ? "#fff" : "#000",
              }}
            />
          </TouchableOpacity>
        </View>

      <View style={styles.container}>
        <View style={[styles.box, { backgroundColor: dynamicCardBackground }]}>
          <Text style={[styles.title, { color: dynamicTextColor }]}>Personalize</Text>
          <ThemeToggle onToggle={handleThemeToggle} currentTheme={currentTheme} />
          <TouchableOpacity
            style={buttonStyle}
            onPress={() => {
              setModalVisible(true);
              setPreviewImage(null);
            }}
          >
            <Text style={buttonTextStyle}>Mudar Background</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderBackgroundModal()}
      <ModalConfig
          visible={accountModalVisible}
          dynamicHeaderBackground="white"
          dynamicTextColor="black"
          onClose={() => setAccountModalVisible(false)}
          navigation={navigation}
          email={email}
        />
    </Background>
  );
};

const styles = StyleSheet.create({
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  box: {
    padding: 20,
    borderRadius: 15,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingDark: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  loadingLight: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 500,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
  },
  defaultImagesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 16,
  },
  defaultImage: {
    width: 80,
    height: 80,
    margin: 5,
    borderRadius: 10,
  },
  closeButton: {
    marginTop: 10,
  },
  previewImage: {
    width: 300,
    height: 200,
    resizeMode: "cover",
    borderRadius: 10,
    marginBottom: 16,
  },
  previewButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginLeft: 5,
    backgroundColor: "#ff0000",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default ThemeScreen;