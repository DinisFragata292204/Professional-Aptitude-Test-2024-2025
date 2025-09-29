import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ImageBackground,
  Modal,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Platform,  
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import config from "../../config/config_db";
let ToastAndroid: any = null;
if (Platform.OS === "android") {
  ToastAndroid = require("react-native").ToastAndroid;
}

const QRCodeScannerScreen = ({ navigation, route }) => {
  // Obtém o email dos parâmetros
  const emailFromParams = route?.params?.email || null;
  const [permission, requestPermission] = useCameraPermissions();
  const isPermissionGranted = Boolean(permission?.granted);
  const [isScanning, setIsScanning] = useState(true);
  const [scannedData, setScannedData] = useState(null);
  
  // Estado para o modal de inserção manual com preview (sem pergunta de confirmação adicional)
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [previewData, setPreviewData] = useState(null); // { tipo, hora }
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const cameraRef = useRef(null);
  const animation = useRef(new Animated.Value(0)).current;

  // Endpoints
  const urlInserir = `${config.baseUrl}/calendarioFiles/entradasSaidas/handleEntradasESaidas.php`;
  const urlPreview = `${config.baseUrl}/calendarioFiles/entradasSaidas/getEntradasESaidas.php`;

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  useEffect(() => {
    if (navigation?.setOptions) {
      navigation.setOptions({ headerShown: false });
    }
  }, [navigation]);

  // Leitura do QR Code
  const handleBarcodeScanned = async ({ data }) => {
    if (isScanning) {
      let scannedEmail = emailFromParams;
      if (data && data.startsWith("email:")) {
        scannedEmail = data.replace("email:", "").trim();
      }
      setScannedData(data);
      setIsScanning(false);
      try {
        const response = await fetch(urlInserir, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: scannedEmail })
        });
        const result = await response.json();
        console.log("Resposta do servidor:", result);
        if (result.success) {
          // Feedback animado sobre a área do overlay
          Animated.sequence([
            Animated.timing(animation, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true
            }),
            Animated.delay(500),
            Animated.timing(animation, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true
            })
          ]).start(() => {
            navigation.navigate("Aluno", { email: scannedEmail, manualInsertion: false });
          });
        } else {
          setIsScanning(true);
        }
      } catch (error) {
        console.error("Erro ao enviar dados:", error);
        setIsScanning(true);
      }
    }
  };

  // Abre o modal de inserção manual e inicia o carregamento do preview
  const abrirModalManual = () => {
    setManualModalVisible(true);
    setIsPreviewLoading(true);
    setPreviewData(null);
    fetchPreview();
  };

  // Busca o preview do registo do dia atual
  const fetchPreview = async () => {
    try {
      const response = await fetch(urlPreview, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailFromParams })
      });
      const result = await response.json();
      let novoTipo = "entrada";
      if (result.success && result.days && result.days.length > 0) {
        const diaAtual = new Date().toISOString().slice(0, 10);
        const dia = result.days.find(d => d.date === diaAtual);
        if (dia && dia.records && dia.records.length > 0) {
          const ultimo = dia.records[dia.records.length - 1];
          novoTipo = (ultimo.type === "entrada") ? "saida" : "entrada";
        }
      }
      const horaAtual = new Date().toLocaleTimeString();
      setPreviewData({ tipo: novoTipo, hora: horaAtual });
    } catch (error) {
      if (Platform.OS === "android") {
        ToastAndroid.show("Erro ao buscar registos.", ToastAndroid.LONG);
      } else {
        alert("Erro ao buscar registos.");
      }
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Confirma a inserção manual (usa o preview mostrado)
  const confirmarInsercaoManual = async () => {
    setManualModalVisible(false);
    try {
      const response = await fetch(urlInserir, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailFromParams })
      });
      const result = await response.json();
      console.log("Inserção manual:", result);
      if (result.success) {
        navigation.navigate("Aluno", { email: emailFromParams, manualInsertion: true });
      } else {
        if (Platform.OS === "android") {
          ToastAndroid.show("Erro ao inserir registo.", ToastAndroid.LONG);
        } else {
          alert("Erro ao inserir registo.");
        }
      }
    } catch (error) {
      if (Platform.OS === "android") {
        ToastAndroid.show("Erro ao inserir registo.", ToastAndroid.LONG);
      } else {
        alert("Erro ao inserir registo.");
      }
    }
  };

  // Enquanto as permissões não são definidas, exibe loading
  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.text}>A pedir as permissões...</Text>
      </View>
    );
  }

  const wallpaperImage = require("../../assets/images/bg1.jpg");

  // Se a permissão não foi concedida, exibe a tela com os botões (que permitem pedir permissão ou inserir manualmente)
  if (!isPermissionGranted) {
    return (
      <ImageBackground source={wallpaperImage} style={styles.background}>
        <View style={styles.centered}>
          <Text style={styles.text}>A permissão para usar a câmera foi negada.</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity onPress={requestPermission} style={[styles.button, styles.btnSolicitar]}>
              <Text style={styles.buttonText}>Pedir Permissão</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={abrirModalManual} style={[styles.button, styles.btnManual]}>
              <Text style={styles.buttonText}>Inserir Manualmente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    );
  }

  // Estilo da animação sobre o foco
  const animatedStyle = {
    transform: [
      {
        scale: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 1.5]
        })
      }
    ],
    opacity: animation
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        onBarcodeScanned={handleBarcodeScanned}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("Aluno", { email: emailFromParams })}
        >
          <Image
            source={require("../../assets/icons/angle-left.png")}
            style={styles.backIcon}
          />
        </TouchableOpacity>
        {/* Overlay profissional */}
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.focusedArea}>
              {scannedData && (
                <Animated.View style={[styles.animationOverlay, animatedStyle]}>
                  <Text style={styles.animationText}>✓</Text>
                </Animated.View>
              )}
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom} />
        </View>
      </CameraView>
      {/* Botão para inserir manualmente */}
      <TouchableOpacity onPress={abrirModalManual} style={styles.manualButton}>
        <Text style={styles.manualButtonText}>Inserir Manualmente</Text>
      </TouchableOpacity>

      {/* Modal com o preview (sem pergunta adicional) */}
      <Modal
        visible={manualModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setManualModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            {isPreviewLoading ? (
              <ActivityIndicator size="large" color="#fff" />
            ) : previewData ? (
              <>
                <Text style={[styles.previewText, previewData.tipo === "saida" && styles.previewSaida]}>
                  {previewData.tipo === "saida" ? "SAÍDA" : "ENTRADA"}
                </Text>
                <Text style={styles.previewHora}>Hora: {previewData.hora}</Text>
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    onPress={confirmarInsercaoManual}
                    style={[styles.modalButton, styles.btnConfirmar]}
                  >
                    <Text style={styles.modalButtonText}>Sim</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setManualModalVisible(false)}
                    style={[styles.modalButton, styles.btnCancelar]}
                  >
                    <Text style={styles.modalButtonText}>Não</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <Text style={styles.modalText}>Não foi possível carregar o preview.</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center"
  },
  background: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  container: {
    flex: 1,
    backgroundColor: "black"
  },
  camera: {
    flex: 1
  },
  // Overlay com degradês e cantos arredondados
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center"
  },
  overlayTop: {
    flex: 1,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.5)"
  },
  overlayMiddle: {
    flexDirection: "row",
    width: "100%",
    alignItems: "center"
  },
  overlaySide: {
    flex: 1,
    height: 300,
    backgroundColor: "rgba(0,0,0,0.5)"
  },
  focusedArea: {
    width: 300,
    height: 300,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "hidden",
    backgroundColor: "transparent"
  },
  overlayBottom: {
    flex: 1,
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.5)"
  },
  animationOverlay: {
    position: "absolute",
    top: "40%",
    left: "50%",
    marginLeft: -50,
    marginTop: -50,
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.3)"
  },
  animationText: {
    fontSize: 40,
    color: "white"
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 10,
    borderRadius: 20
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: "white"
  },
  manualButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10
  },
  manualButtonText: {
    color: "white",
    fontSize: 16
  },
  centered: {
    flex: 1,
    width: "80%",
    height: "80%",
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    borderRadius: 10
  },
  text: {
    color: "white",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center"
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginHorizontal: 5
  },
  btnSolicitar: {
    backgroundColor: "#47AD4D"
  },
  btnManual: {
    backgroundColor: "#47AD4D"
  },
  buttonText: {
    color: "white",
    fontSize: 14
  },
  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)"
  },
  // Caixa modal com 80% da largura e 40% da altura (ajustado para visualização vertical)
  modalContainer: {
    width: "80%",
    height: "40%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    color: "black"
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%"
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: "center"
  },
  btnConfirmar: {
    backgroundColor: "#47AD4D"
  },
  btnCancelar: {
    backgroundColor: "red"
  },
  modalButtonText: {
    color: "white",
    fontSize: 16
  },
  previewText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "green"
  },
  previewSaida: {
    color: "red"
  },
  previewHora: {
    fontSize: 18,
    marginBottom: 20
  }
});

export default QRCodeScannerScreen;