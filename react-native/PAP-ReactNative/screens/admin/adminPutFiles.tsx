import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ImageBackground,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView
} from "react-native";
import { Button, Card, TextInput, useTheme } from "react-native-paper";
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { WebView } from "react-native-webview";
import config from "../../config/config_db";
import * as SecureStore from "expo-secure-store";
import ModalConfig from "../../components/modalConfig";

type PdfPickerResult =
  | { type: 'cancel' }
  | { 
      type: 'success'; 
      uri: string; 
      name: string; 
      size?: number; 
      mimeType?: string;
    };

type PdfFile = {
  uri: string;
  name: string;
  size?: number;
  mimeType?: string;
};

const PutCalendar = ({ navigation, route }: any) => {
  const theme = useTheme();
  const { email } = route.params;

  const [turmas, setTurmas] = useState<any[]>([]);
  const [selectedAno, setSelectedAno] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null);
  const [previewPdf, setPreviewPdf] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [userTheme, setUserTheme] = useState<"light" | "dark">(theme.dark ? "dark" : "light");
  const [loading, setLoading] = useState(true);
  const [modalContaVisivel, setModalContaVisivel] = useState(false);

  const url_getTurmas = `${config.baseUrl}/adminFiles/getTurmas.php`;
  const url_uploadCalendar = `${config.baseUrl}/adminFiles/uploadCalendar.php`;

  const isWebWithPdf = Platform.OS === "web" && pdfFile;
  const headerPadding = StatusBar.currentHeight || 20;

  // Obtém as dimensões da tela
  const windowHeight = Dimensions.get("window").height;

  useEffect(() => {
    async function loadSettings() {
      try {
        let bg: string | null;
        let mode: string | null;
        if (Platform.OS === "web") {
          bg = localStorage.getItem("backgroundUrl");
          mode = localStorage.getItem("userTheme");
        } else {
          bg = await SecureStore.getItemAsync("backgroundUrl");
          mode = await SecureStore.getItemAsync("userTheme");
        }
        if (bg && !bg.startsWith("http")) {
          bg = `${config.baseUrl}/${bg}`;
        }
        setBackgroundUrl(bg);
        setUserTheme(mode === "dark" ? "dark" : "light");
      } catch (e) {
        console.log("[DEBUG] Erro ao carregar as configurações:", e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  useEffect(() => {
    fetch(url_getTurmas)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log("[DEBUG] Turmas recebidas:", data.data);
            setTurmas(data.data); 
            setTurmas(Array.isArray(data.turmas) ? data.turmas : []);
          } else {
            console.log("[DEBUG] Erro ao buscar turmas:", data.message);
            Alert.alert("Erro", data.message || "Erro ao buscar turmas.");
          }
        })
        .catch(() => {
          console.log("[DEBUG] Erro na comunicação com o servidor.");
          Alert.alert("Erro", "Erro na comunicação com o servidor.");
        });
  }, [url_getTurmas]);

const openDocumentPicker = async (): Promise<void> => {
  try {
    // Fecha o modal de selecção
    setModalVisible(false);

    // Pequena pausa (100 ms) para o modal desaparecer
    await new Promise(resolve => setTimeout(resolve, 100));

    // Chama o picker. Cast forçado a any porque o TS não tem o tipo aqui
    const rawResult = await (DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true, // garante leitura no FileSystem
    }) as Promise<any>);

    // Fazemos o *narrowing* manual:
    const result = rawResult as PdfPickerResult;
    console.log('[DEBUG] Resultado do DocumentPicker:', result);

    if (result.type === 'success') {
      const { uri, name, size, mimeType } = result;

      // Guarda o ficheiro e o nome
      setPdfFile({ ...result, mimeType });
      setPreviewPdf(name);

      // Lê e converte em Base64
      try {
        if (Platform.OS === 'web') {
          // Web: fetch + FileReader
          const response = await fetch(uri);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const rawBase64 = dataUrl.split(',')[1];
            setPdfBase64(rawBase64);
          };
          reader.readAsDataURL(blob);
        } else {
          // Mobile: expo-file-system
          const b64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          setPdfBase64(b64);
        }
      } catch (e) {
        console.log('[DEBUG] Erro a ler o ficheiro em Base64:', e);
        Alert.alert('Erro', 'Não foi possível preparar o preview do PDF.');
      }
    } else {
      console.log('[DEBUG] Seleção cancelada pelo utilizador');
    }
  } catch (error) {
    console.log('[DEBUG] Erro no openDocumentPicker():', error);
    Alert.alert('Erro', 'Não foi possível aceder ao seletor de ficheiros.');
  }
};


  const uploadPdf = async () => {
    if (!selectedAno || !selectedTurma || !pdfFile) {
      Alert.alert("Atenção", "Selecione o ano, a turma e o PDF.");
      return;
    }
  
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("ano", selectedAno);
      formData.append("turma", selectedTurma);
      if (Platform.OS === "web") {
        // no web, você já tem o blob montado
        const responseBlob = await fetch(pdfFile.uri);
        const blob = await responseBlob.blob();
        formData.append("pdf", blob, pdfFile.name);
      } else {
        // no nativo, anexe diretamente a URI
        formData.append("pdf", {
          uri: pdfFile.uri,
          name: pdfFile.name,
          type: pdfFile.mimeType || "application/pdf",
        } as any);
      }
  
      console.log("[DEBUG] Enviando FormData:", formData);
      const resp = await fetch(url_uploadCalendar, {
        method: "POST",
        body: formData,
      });
      const resData = await resp.json();
      console.log("[DEBUG] Resposta do servidor:", resData);
      if (resData.success) {
        Alert.alert("Sucesso", resData.message);
        navigation.navigate("Administrador", { email });
      } else {
        Alert.alert("Erro", resData.message);
      }
    } catch (err) {
      console.error("[DEBUG] Erro no upload:", err);
      Alert.alert("Erro", "Erro ao fazer upload.");
    } finally {
      setUploading(false);
    }
  };    

  // Recebe um parâmetro "scale" para ajustar o zoom do PDF
  const getPdfHtml = (base64: string, scale: number = 1.0) => {
    return `
      <!DOCTYPE html> 
      <html>
        <head>
          <meta charset="utf-8">
          <title>PDF Preview</title>
          <style>
            html, body { 
              margin: 0; 
              height: 100vh; 
              overflow: hidden; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              background-color: #eee;
            }
            #canvas_container { 
              width: 100vw; 
              height: 100vh; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              overflow: hidden; 
            }
            canvas { 
              display: block; 
              max-width: 90vw;  
              max-height: 90vh;
              object-fit: contain;
            }
          </style>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"></script>
        </head>
        <body>
          <div id="canvas_container"></div>
          <script>
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
            var pdfData = "${base64}";
            var loadingTask = pdfjsLib.getDocument({ data: atob(pdfData) });

            loadingTask.promise.then(function(pdf) {
              pdf.getPage(1).then(function(page) {
                var scale = ${scale};
                var viewport = page.getViewport({ scale: scale });

                var canvas = document.createElement("canvas");
                var context = canvas.getContext("2d");

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // Adiciona o canvas ao container
                document.getElementById('canvas_container').appendChild(canvas);

                var renderContext = {
                  canvasContext: context,
                  viewport: viewport
                };

                page.render(renderContext);
              });
            });
          </script>
        </body>
      </html>
    `;
};

  // Renderiza o preview do PDF
  const renderPdfPreview = () => {
    if (!pdfBase64) return null;
    // Na web usamos scale menor para que caiba quase tudo na tela
    const scale = Platform.OS === "web" ? 1.0 : 1.5;
    const htmlContent = getPdfHtml(pdfBase64, scale);
    if (Platform.OS === "web") {
      return (
        <iframe
          srcDoc={htmlContent}
          style={styles.pdfContainer}
          title="PDF Preview"
        />
      );
    } else {
      return (
        <View style={styles.pdfContainer}>
          <WebView
            originWhitelist={["*"]}
            source={{ html: htmlContent }}
            style={styles.pdfPreview}
          />
        </View>
      );
    }
  };

  if (loading) {
    return (
      <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ImageBackground
        source={
          backgroundUrl
            ? { uri: backgroundUrl }
            : require("../../assets/images/bg1.jpg")
        }
        style={styles.background}
      >
        {userTheme === "dark" && <View style={styles.overlayDark} />}
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={userTheme === "dark" ? "#e0dede" : "#000"}
          />
          <Text
            style={[
              styles.loadingText,
              { color: userTheme === "dark" ? "#e0dede" : "#000" },
            ]}
          >
            Carregando registros...
          </Text>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
    );
  }

  const dynamicBoxBackground = userTheme === "dark" ? "#101218" : "#FFFFFF";
  const inputBackground = userTheme === "dark" ? "#3F4454" : "#FFFFFF";
  const dynamicTextColor = userTheme === "dark" ? "#FFFFFF" : "#000000";

  // Cálculo dos valores numéricos com base na altura da tela
  let fixedBoxHeight: number;
  let fixedBoxMargin: number;
  if (pdfFile) {
    fixedBoxHeight = Platform.OS === "web" ? windowHeight * 0.85 : windowHeight * 0.9;
    fixedBoxMargin = windowHeight * 0.1;
  } else if (selectedAno && selectedTurma) {
    fixedBoxHeight = Platform.OS === "web" ? windowHeight * 0.7 : windowHeight * 0.75;
    fixedBoxMargin = windowHeight * 0.1;
  } else {
    fixedBoxHeight = Platform.OS === "web" ? windowHeight * 0.6 : windowHeight * 0.65;
    fixedBoxMargin = windowHeight * 0.15;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
    <ImageBackground
      source={
        backgroundUrl
          ? { uri: backgroundUrl }
          : require("../../assets/images/bg1.jpg")
      }
      style={{ flex: 1, width: "100%", height: "100%" }}
      resizeMode="cover"
    >
      {/* HEADER */}
      <SafeAreaView
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: headerPadding,
          paddingHorizontal: 16,
          paddingBottom: 12,
          backgroundColor: dynamicBoxBackground,
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 4,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
          <Image
            source={require("../../assets/icons/angle-left.png")}
            style={{
              width: Platform.OS === "web" ? 36 : 24,
              height: Platform.OS === "web" ? 36 : 24,
              tintColor: dynamicTextColor,
            }}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setModalContaVisivel(true)} style={{ padding: 8 }}>
          <Image
            source={require("../../assets/icons/user.png")}
            style={{
              width: Platform.OS === "web" ? 32 : 26,
              height: Platform.OS === "web" ? 32 : 26,
              tintColor: dynamicTextColor,
            }}
          />
        </TouchableOpacity>
      </SafeAreaView>
      <ScrollView
        style={{ flex: 1 }}                                  // ocupa tudo que resta
        contentContainerStyle={{
          flexGrow: 1,                                       // content fully scrollable
          flexDirection: isWebWithPdf ? 'row' : 'column',
          justifyContent: 'space-between',
          alignItems: isWebWithPdf ? 'flex-start' : 'stretch',
          paddingTop: headerPadding + 60,                    // espaço só para sair do header
          paddingBottom: 16,  
          paddingHorizontal: 16,
        }}
      >
        {/* COLUNA 1: Ano / Turma / Botão Selecionar PDF */}
        <View
          style={{
            flex: isWebWithPdf ? 0.48 : undefined,
            width: isWebWithPdf ? undefined : '100%',
            marginBottom: pdfFile ? 24 : 0,
          }}
        >
          <Card style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
            <Card.Content style={{ paddingVertical: 12, paddingHorizontal: 8, backgroundColor: userTheme === 'dark' ? '#FFFFFF' : '#dedad5' }}>
              <TouchableOpacity onPress={() => setModalVisible(true)}>
                <TextInput
                  label="Ano"
                  value={selectedAno}
                  mode="outlined"
                  editable={false}
                  style={{ backgroundColor: inputBackground, color: dynamicTextColor, marginBottom: 12 }}
                  theme={{
                    colors: {
                      text: dynamicTextColor,
                      placeholder: dynamicTextColor,
                      primary: '#47AD4D',
                      background: inputBackground,
                    },
                  }}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setModalVisible(true)}>
                <TextInput
                  label="Turma"
                  value={selectedTurma}
                  mode="outlined"
                  editable={false}
                  style={{ backgroundColor: inputBackground, color: dynamicTextColor }}
                  theme={{
                    colors: {
                      text: dynamicTextColor,
                      placeholder: dynamicTextColor,
                      primary: '#47AD4D',
                      background: inputBackground,
                    },
                  }}
                />
              </TouchableOpacity>
            </Card.Content>
          </Card>

          {selectedAno && selectedTurma && !pdfFile && (
            <Button
              mode="contained"
              onPress={openDocumentPicker}
              contentStyle={{ paddingVertical: 8 }}
              style={{ borderRadius: 6, backgroundColor: '#47AD4D' }}
            >
              Selecionar PDF
            </Button>
          )}
        </View>

        {/* COLUNA 2: Pré‑visualização do PDF */}
        {pdfFile && (
           <View
              style={{
                flex: isWebWithPdf ? 0.48 : undefined,
                width: isWebWithPdf ? undefined : '100%',
                backgroundColor: dynamicBoxBackground,
                borderRadius: 8,
                padding: 16,
                marginLeft: isWebWithPdf ? 16 : 0,
                alignSelf: isWebWithPdf ? 'flex-start' : undefined,
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
            <Text style={{ fontSize: 16, fontWeight: '500', color: dynamicTextColor, marginBottom: 12 }}>
              Pré-visualização do PDF
            </Text>
            {renderPdfPreview()}
            <Text style={{ marginTop: 8, color: dynamicTextColor }}>{previewPdf}</Text>
            <View style={{ flexDirection: 'row', marginTop: 16, width: '100%' }}>
              <Button
                mode="contained"
                onPress={uploadPdf}
                contentStyle={{ paddingVertical: 6 }}
                style={{ flex: 1, marginRight: 8, borderRadius: 6, backgroundColor: '#47AD4D' }}
              >
                Salvar
              </Button>
              <Button
                mode="outlined"
                onPress={() => {
                  setModalVisible(false);
                  setPdfBase64(null);
                  setPdfFile(null);
                  setPreviewPdf(null);
                }}
                contentStyle={{ paddingVertical: 6 }}
                style={{ flex: 1, borderRadius: 6 }}
                textColor="#47AD4D"
              >
                Mudar
              </Button>
            </View>
            {uploading && (
              <ActivityIndicator size="large" style={{ marginTop: 16 }} color={userTheme === 'dark' ? '#FFF' : '#000'} />
            )}
          </View>
        )}
      </ScrollView>

      {/* MODAIS */}
      <Modal
        animationType="slide"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            padding: 16,
          }}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={{
              backgroundColor: dynamicBoxBackground,
              borderRadius: 10,
              padding: 16,
            }}
          >
            <Text style={{ fontSize: 18, marginBottom: 12, color: dynamicTextColor }}>
              Selecione o Ano e a Turma
            </Text>
            {turmas.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  setSelectedAno(item.ano);
                  setSelectedTurma(item.turma);
                  setModalVisible(false);
                }}
                style={{ paddingVertical: 10 }}
              >
                <Text style={{ fontSize: 16, color: dynamicTextColor }}>
                  {item.ano} – {item.turma}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <ModalConfig
        visible={modalContaVisivel}
        dynamicHeaderBackground={userTheme === "dark" ? "#101218" : "#FFF"}
        dynamicTextColor={dynamicTextColor}
        onClose={() => setModalContaVisivel(false)}
        navigation={navigation}
        email={email}
      />
    </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 16 * 2 },
  card: {
    borderRadius: 12,
    elevation: 4,
    overflow: "hidden",
  },
  background: {
    flex: 1,
  },
  overlayDark: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 18,
    marginTop: 10,
  },
  fixedBox: {
    alignSelf: "center",
    width: "90%",
    borderRadius: 12,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    marginTop: StatusBar.currentHeight || 20,
    marginBottom: 20,
  },
  contentContainer: {
    flexGrow: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  inputsWrapper: {
    flex: 1,
    justifyContent: "center",
  },
  input: {
    marginBottom: 15,
  },
  botao: {
    marginTop: 20,
  },
  carregamento: {
    marginTop: 10,
  },
  previewContainer: {
    marginVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
  },
  pdfContainer: {
    width: "100%",
    height: 400,
    backgroundColor: "#ddd",
    borderWidth: 0,
  },
  pdfPreview: {
    flex: 1,
  },
  botoesPreview: {
    flexDirection: "row",
    marginTop: 10,
  },
  botaoSalvar: {
    marginRight: 10,
  },
  botaoMudar: {},
  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 8,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modalItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
});

export default PutCalendar;