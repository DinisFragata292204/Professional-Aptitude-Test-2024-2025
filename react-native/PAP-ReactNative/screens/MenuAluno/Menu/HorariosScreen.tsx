import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ImageBackground,
  SafeAreaView,
  Image,
  StatusBar,
  Dimensions,
  Animated,
  ScrollView,
} from "react-native";
import { useRoute, RouteProp, useTheme } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import config from "../../../config/config_db";
import * as SecureStore from "expo-secure-store";
import ModalConfig from "../../../components/modalConfig";

// Tipos para as rotas
type RootStackParamList = {
  Horarios: { email: string };
  PDFViewer?: { url: string };
};
type HorariosScreenRouteProp = RouteProp<RootStackParamList, "Horarios">;

export interface ICalendario {
  id: string;
  turma_id: string;
  pdf: string;
  pdf_url: string;
  data_de_upload: string;
  ano: string;
  turma: string;
  ano_inicio: string;
  ano_fim: string;
  status: string;
}

interface IStudentActiveInfo {
  turma: string;
  ano_inicio: string;
  ano_fim: string;
}

const HorariosScreen = ({ navigation }) => {
  const route = useRoute<HorariosScreenRouteProp>();
  const { email } = route.params;
  const theme = useTheme();

  // Estados principais
  const [loading, setLoading] = useState<boolean>(false);
  const [calendarData, setCalendarData] = useState<ICalendario[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [userTheme, setUserTheme] = useState<"light" | "dark">(theme.dark ? "dark" : "light");

  // Dados da turma ativa do aluno
  const [studentActiveInfo, setStudentActiveInfo] = useState<IStudentActiveInfo | null>(null);
  // Fase ativa do aluno (10, 11 ou 12)
  const [activePhase, setActivePhase] = useState<number>(0);
  // Filtro de ano para as abas
  const [selectedGrade, setSelectedGrade] = useState<string>("");

  // Estados para o preview do PDF
  // Para mobile usamos activeIndex/pdfs; para web, vamos usar selectedPdfUrl que será renderizado inline
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);

  // Modal de configurações da conta
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  // Animação para o preview expandido/recolhido (somente mobile)
  const slideAnim = useRef(new Animated.Value(0)).current;
  const previewMaxHeight =
    Platform.OS === "web"
      ? Dimensions.get("window").height * 1.6
      : Dimensions.get("window").height * 0.8;

  // Reinicia o preview sempre que o filtro é alterado
  useEffect(() => {
    setActiveIndex(null);
    setSelectedPdfUrl(null);
    setPdfBase64(null);
    setPdfUri(null);
  }, [selectedGrade]);

  // Busca os dados do calendário no servidor
  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append("email", email);
      const response = await fetch(
        `${config.baseUrl}/calendarioFiles/aluno/getCalendarByEmail.php`,
        {
          method: "POST",
          body: formData,
        }
      );
      const data = await response.json();
      console.log("DEBUG: Resposta do fetchCalendarData:", data);
      if (data.success) {
        setCalendarData(data.data);
      } else {
        setErrorMsg(data.message || "Erro ao buscar calendários.");
      }
    } catch (error) {
      setErrorMsg("Erro na comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  }, [email]);

  // Carrega configurações do background e tema
  const loadSettings = useCallback(async () => {
    try {
      let bg: string | null = null;
      let mode: string | null = null;
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
    } catch (error) {
      console.log("Erro ao carregar configurações.", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Define a turma ativa e a fase do aluno com base no calendário ativo
  useEffect(() => {
    if (calendarData.length > 0) {
      const activeCalendar = calendarData.find(item => item.status === "ativo");
      if (activeCalendar) {
        const phase = parseInt(activeCalendar.ano, 10);
        setActivePhase(phase);
        setStudentActiveInfo({
          turma: activeCalendar.turma,
          ano_inicio: activeCalendar.ano_inicio.toString(),
          ano_fim: activeCalendar.ano_fim.toString(),
        });
        setSelectedGrade(String(activeCalendar.ano));
      }
    }
  }, [calendarData]);

  // Filtra os calendários
  const filteredCalendars = calendarData.filter(item => {
    if (!studentActiveInfo) return false;
    return (
      item.turma === studentActiveInfo.turma &&
      item.ano_inicio.toString() === studentActiveInfo.ano_inicio &&
      item.ano_fim.toString() === studentActiveInfo.ano_fim &&
      String(item.ano) === selectedGrade
    );
  });

  // Renderiza as abas conforme a fase do aluno
  const renderTabButtons = () => {
    if (activePhase === 10) return null;
    let tabs: string[] = activePhase === 11 ? ["10", "11"] : ["10", "11", "12"];
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {tabs.map(grade => (
          <TouchableOpacity
            key={grade}
            style={[
              styles.filterButton,
              grade === selectedGrade && styles.filterButtonActive,
            ]}
            onPress={() => setSelectedGrade(grade)}
          >
            <Text
              style={[
                styles.filterText,
                grade === selectedGrade && styles.filterTextActive,
              ]}
            >
              {grade}º
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  // Altera o comportamento do preview do PDF de acordo com a plataforma
  const togglePreview = (index: number, pdfUrl: string) => {
    if (Platform.OS === "web") {
      // Para Web, se o mesmo item for clicado, fecha a visualização; caso contrário, define o pdfUrl selecionado.
      setSelectedPdfUrl(selectedPdfUrl === pdfUrl ? null : pdfUrl);
      return;
    }
    // Comportamento para dispositivos móveis
    if (activeIndex === index) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setActiveIndex(null);
        setSelectedPdfUrl(null);
        setPdfBase64(null);
        setPdfUri(null);
      });
    } else {
      if (activeIndex !== null) {
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }).start(() => {
          setActiveIndex(index);
          setSelectedPdfUrl(pdfUrl);
          Animated.timing(slideAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: false,
          }).start();
          carregarPdf(pdfUrl);
        });
      } else {
        setActiveIndex(index);
        setSelectedPdfUrl(pdfUrl);
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
        carregarPdf(pdfUrl);
      }
    }
  };

  // Função auxiliar para carregar o PDF de forma assíncrona
  const carregarPdf = (pdfUrl: string) => {
    if (Platform.OS !== "web") {
      (async () => {
        try {
          const downloadResult = await FileSystem.downloadAsync(
            pdfUrl,
            FileSystem.documentDirectory + "temp.pdf"
          );
          setPdfUri(downloadResult.uri);
          const base64Content = await FileSystem.readAsStringAsync(downloadResult.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          setPdfBase64(base64Content);
        } catch (error) {
          Alert.alert("Erro", "Não foi possível abrir o PDF.");
        }
      })();
    } else {
      // Para web, se necessário podemos carregar o base64
      (async () => {
        try {
          const response = await fetch(pdfUrl);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = (reader.result as string).split(",")[1];
            setPdfBase64(base64data);
          };
          reader.readAsDataURL(blob);
        } catch (error) {
          Alert.alert("Erro", "Não foi possível carregar o PDF.");
        }
      })();
    }
  };

  // Gera o HTML para visualização do PDF usando PDF.js (usado somente para mobile)
  const getPdfHtml = (base64: string) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <title>PDF Preview</title>
          <style>
            body { margin: 0; padding: 0; background-color: #000; }
            #canvas_container { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
            canvas { max-width: 100%; height: auto; }
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
                var scale = 1.5;
                var viewport = page.getViewport({ scale: scale });
                var canvas = document.createElement("canvas");
                var context = canvas.getContext("2d");
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                document.getElementById('canvas_container').appendChild(canvas);
                var renderContext = { canvasContext: context, viewport: viewport };
                page.render(renderContext);
              });
            }).catch(function(error) {
              document.body.innerHTML = "<p style='color: white; text-align:center;'>Erro ao carregar o PDF.</p>";
            });
          </script>
        </body>
      </html>
    `;
  };

  // Função para download/visualização do PDF
  const handleDownload = async () => {
    if (Platform.OS === "web") {
      const pdfViewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(
        selectedPdfUrl || ""
      )}#page=1`;
      window.open(pdfViewerUrl, "_blank");
    } else {
      Alert.alert(
        "Quer guardar o arquivo?",
        "Tem a certeza que deseja guardar este arquivo?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Confirmar",
            onPress: async () => {
              if (pdfUri) {
                const newPath = FileSystem.documentDirectory + "downloaded.pdf";
                try {
                  const fileInfo = await FileSystem.getInfoAsync(newPath);
                  if (fileInfo.exists) {
                    await FileSystem.deleteAsync(newPath);
                  }
                  await FileSystem.moveAsync({ from: pdfUri, to: newPath });
                  Alert.alert("O calendário já está concluido", "Pode encontra-lo em: " + newPath);
                } catch (error) {
                  Alert.alert("Erro", "Não foi possível salvar o arquivo.");
                }
              }
            },
          },
        ]
      );
    }
  };

  // Função para compartilhar o PDF (somente para mobile)
  const handleShare = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Atenção", "Compartilhamento não disponível nesta plataforma.");
    } else {
      if (pdfUri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(pdfUri);
      } else {
        Alert.alert("Atenção", "Compartilhamento não disponível nesta plataforma.");
      }
    }
  };

  // Renderiza um item da lista de calendários
  const renderItem = ({ item, index }: { item: ICalendario; index: number }) => {
    return (
      <>
        <TouchableOpacity
          style={styles.itemContainer}
          onPress={() => togglePreview(index, item.pdf_url)}
        >
          <Text style={styles.itemTitle}>
            Horário de {item.ano}º - {item.turma}
          </Text>
          <Text style={styles.itemSub}>Data de Upload: {item.data_de_upload}</Text>
          <Text style={styles.itemSub}>Arquivo: {item.pdf}</Text>
        </TouchableOpacity>
        {/* Para mobile, renderiza o preview como Animated View */}
        {Platform.OS !== "web" && activeIndex === index && (
          <Animated.View
            style={[
              styles.previewContainer,
              {
                height: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, previewMaxHeight],
                }),
              },
            ]}
          >
            <TouchableOpacity
              style={styles.previewHeader}
              onPress={() => togglePreview(index, item.pdf_url)}
            >
              <Text style={styles.previewTitle}>Visualização</Text>
            </TouchableOpacity>
            <View style={styles.pdfContainer}>
              {pdfBase64 ? (
                <WebView
                  originWhitelist={["*"]}
                  source={{ html: getPdfHtml(pdfBase64) }}
                  style={{ flex: 1 }}
                />
              ) : (
                <ActivityIndicator size="large" color="#007AFF" style={{ flex: 1 }} />
              )}
            </View>
            <View style={styles.controlsContainer}>
              <TouchableOpacity style={styles.controlButton} onPress={handleDownload}>
                <Text style={styles.controlButtonText}>
                  {Platform.select({ web: "Abrir PDF", default: "Guardar" })}
                </Text>
              </TouchableOpacity>
              {(Platform.OS === "ios" || Platform.OS === "android") && (
                <TouchableOpacity style={styles.controlButton} onPress={handleShare}>
                  <Text style={styles.controlButtonText}>Partilhar</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}
        {/* Para Web, renderiza o preview inline entre as caixas */}
        {Platform.OS === "web" && selectedPdfUrl === item.pdf_url && (
          <View style={styles.webInlinePreviewContainer}>
            <Text style={styles.webPreviewTitle}>Visualização do PDF</Text>
            <View style={styles.iframeContainer}>
              <iframe
                title="PDF Viewer"
                src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(
                  item.pdf_url
                )}#page=1`}
                style={styles.iframeStyle}
              />
            </View>
            <TouchableOpacity
              style={[styles.webModalButton, { backgroundColor: "#47AD4D", marginTop: 15 }]}
              onPress={() => {
                window.open(
                  `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(
                    item.pdf_url
                  )}`,
                  "_blank"
                );
              }}
            >
              <Text style={styles.webModalButtonText}>Abrir PDF completo</Text>
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: userTheme === "dark" ? "#333" : "#FFF" }]}>
      <ImageBackground
        source={backgroundUrl ? { uri: backgroundUrl } : require("../../../assets/images/bg1.jpg")}
        style={styles.background}
        resizeMode="cover"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ flex: 1 }}>
            <Image
              source={require("../../../assets/icons/angle-left.png")}
              style={{
                width: Platform.OS === "web" ? 35 : 23,
                height: Platform.OS === "web" ? 35 : 25,
                marginLeft: 3,
                marginTop: Platform.OS === "web" ? -15 : 3,
                tintColor: userTheme === "dark" ? "#FFFFFF" : "#000",
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
                tintColor: userTheme === "dark" ? "#FFFFFF" : "#000",
              }}
            />
          </TouchableOpacity>
        </View>
        {/* Botões de filtro abaixo do header */}
        <View style={styles.filterButtonsContainer}>{renderTabButtons()}</View>
        {/* Lista dos calendários */}
        <View style={styles.listContainer}>
          {loading && <ActivityIndicator size="large" color="#007AFF" />}
          {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
          {!loading && !errorMsg && filteredCalendars.length > 0 ? (
            <FlatList
              data={filteredCalendars}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            !loading && <Text style={styles.error}>Nenhum calendário para o {selectedGrade}º ano.</Text>
          )}
        </View>
        <ModalConfig
          visible={accountModalVisible}
          dynamicHeaderBackground="white"
          dynamicTextColor="black"
          onClose={() => setAccountModalVisible(false)}
          navigation={navigation}
          email={email}
        />
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  background: { flex: 1 },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "web" ? 40 : (StatusBar.currentHeight || 20),
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: "white",
  },
  filterButtonsContainer: {
    backgroundColor: "transparent",
  },
  tabsContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  filterButton: {
    width: 50,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EEE",
    borderRadius: 15,
    marginHorizontal: 5,
  },
  filterButtonActive: {
    backgroundColor: "#555",
  },
  filterText: {
    fontSize: 16,
    color: "#333",
  },
  filterTextActive: {
    color: "#FFF",
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  listContent: { paddingBottom: 20 },
  itemContainer: {
    padding: 16,
    marginVertical: 8,
    backgroundColor: "#FFF",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  itemTitle: { fontSize: 18, fontWeight: "600", marginBottom: 6, color: "#333" },
  itemSub: { fontSize: 14, color: "#666" },
  error: { color: "#FF3B30", fontSize: 16, textAlign: "center", marginTop: 10 },
  previewContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    overflow: "hidden",
    marginHorizontal: 4,
    marginBottom: 8,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    borderBottomWidth: 1,
    borderColor: "#EEE",
    backgroundColor: "#F5F5F5",
  },
  previewTitle: { fontSize: 18, fontWeight: "600", color: "#333" },
  pdfContainer: { flex: 1, backgroundColor: "#000" },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: "#DDD",
    backgroundColor: "#F9F9F9",
  },
  controlButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#47AD4D",
    borderRadius: 5,
  },
  controlButtonText: { color: "#FFF", fontSize: 16 },
  // Estilos para o preview inline na Web (dentro do FlatList)
  webInlinePreviewContainer: {
    padding: 16,
    backgroundColor: "#FFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  webPreviewTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
    color: "#333",
  },
  iframeContainer: {
    height: 600,
    backgroundColor: "#ccc",
  },
  iframeStyle: {
    width: "100%",
    height: "100%",
  },
  webModalButton: {
    backgroundColor: "#47AD4D",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    width: "100%",
    alignItems: "center",
  },
  webModalButtonText: { color: "#FFF", fontSize: 16 },
});

export default HorariosScreen;