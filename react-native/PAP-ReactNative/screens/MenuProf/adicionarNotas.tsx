// src/screens/AdicionarNotasScreen.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ImageBackground,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  Button,
  TextInput,
  useTheme,
  Snackbar,
  Checkbox,
} from "react-native-paper";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import config from "../../config/config_db";
import { StackScreenProps } from "@react-navigation/stack";
import ModalConfig from "../../components/modalConfig";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type RootStackParamList = {
  AdicionarNotas: { email: string };
};
type Props = StackScreenProps<RootStackParamList, "AdicionarNotas">;

interface ProfessorData {
  user_id: number;
  disciplina: number;
}
interface Turma { id: number; turma: string; ano: number; }
interface Modulo { numero_do_modulo: number; nome: string; }
interface Aluno {
  id: number;
  email: string;
  nota?: string;
  comentario_privado?: string;
  selected?: boolean;
}

const url_saveNote       = `${config.baseUrl}/calendarioFiles/professor/notas/saveNote.php`;
const url_fetchProfessor = `${config.baseUrl}/calendarioFiles/professor/fetchProfessorInfo.php`;
const url_fetchTurmas    = `${config.baseUrl}/calendarioFiles/professor/fetch_turmas.php`;
const url_fetchAlunos    = `${config.baseUrl}/calendarioFiles/professor/fetchStudents.php`;
const url_fetchModulos   = `${config.baseUrl}/calendarioFiles/professor/fetchModulos.php`;

const AdicionarNotasScreen: React.FC<Props> = ({ route, navigation }) => {
  const { email } = route.params;
  const theme = useTheme();

  const [backgroundUrl, setBackgroundUrl]   = useState<string|null>(null);
  const [userTheme, setUserTheme]           = useState<"light"|"dark">(theme.dark ? "dark" : "light");
  const [loading, setLoading]               = useState(true);
  const [dataLoading, setDataLoading]       = useState(true);
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [selectedModuloNum, setSelectedModuloNum] = useState<number | null>(null);
  const [selectedModuloName, setSelectedModuloName] = useState<string>("");

  const [professorData, setProfessorData]   = useState<ProfessorData|null>(null);
  const [availableTurmas, setAvailableTurmas] = useState<Turma[]>([]);
  const [selectedTurma, setSelectedTurma]   = useState<Turma|null>(null);

  const [modulos, setModulos]               = useState<Modulo[]>([]);
  const [selectedModulo, setSelectedModulo] = useState<string>("");

  const [alunos, setAlunos]                 = useState<Aluno[]>([]);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  function showMessage(title: string, message: string) {
    if (Platform.OS === "web") {
      setSnackbarMessage(`${title}: ${message}`);
      setSnackbarVisible(true);
    } else {
      Alert.alert(title, message);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        let bg: string|null, mode: string|null;
        if (Platform.OS === "web") {
          bg = localStorage.getItem("backgroundUrl");
          mode = localStorage.getItem("userTheme");
        } else {
          bg = await SecureStore.getItemAsync("backgroundUrl");
          mode = await SecureStore.getItemAsync("userTheme");
        }
        if (bg && !bg.startsWith("http")) bg = `${config.baseUrl}/${bg}`;
        setBackgroundUrl(bg);
        setUserTheme(mode === "dark" ? "dark" : "light");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setDataLoading(true);
      try {
        const profRes = await axios.post(url_fetchProfessor, { email });
        if (!profRes.data.success) throw new Error(profRes.data.message);
        setProfessorData({
          user_id: profRes.data.professor.user_id,
          disciplina: profRes.data.professor.disciplina,
        });

        const turRes = await axios.post(url_fetchTurmas, { email });
        if (!turRes.data.success) throw new Error(turRes.data.message);
        setAvailableTurmas(turRes.data.turmas);
      } catch (err: any) {
        showMessage("Erro", err.message);
      } finally {
        setDataLoading(false);
      }
    })();
  }, [email]);

  useEffect(() => {
    if (!professorData || !selectedTurma) return;
    axios.post(url_fetchModulos, {
      professor_id: professorData.user_id,
      disciplina: professorData.disciplina,
      turma_id: selectedTurma.id,
    })
    .then(resp => {
      if (!resp.data.success) throw new Error(resp.data.message);
      setModulos(resp.data.modulos);
      setSelectedModulo("");
    })
    .catch(err => showMessage("Erro", err.message))
  }, [professorData, selectedTurma]);

  useEffect(() => {
    if (!professorData || !selectedTurma || !selectedModulo) return;
    (async () => {
      try {
        const res = await axios.post(url_fetchAlunos, {
          professor_id: professorData.user_id,
          disciplina: professorData.disciplina,
          turma: selectedTurma.turma,
          ano: selectedTurma.ano,
          modulo: selectedModulo,
          moduloNum: selectedModuloNum, 
        });
        if (!res.data.success) throw new Error(res.data.message);
        setAlunos((res.data.students || []).map((a: any) => ({ ...a, selected: false })));
      } catch (err: any) {
        showMessage("Erro", err.message);
        setAlunos([]);
      }
    })();
  }, [professorData, selectedTurma, selectedModulo]);
  
  const handleSaveNote = async () => {
    if (!professorData || !selectedTurma || selectedModuloNum === null) return;
  
    const selecionados = alunos.filter(a => a.selected);
    if (selecionados.length === 0) {
      showMessage("Atenção", "Nenhum aluno selecionado");
      return;
    }
  
    const aprovados = selecionados.filter(a => a.nota !== undefined && +a.nota >= 10);
    const atrasados = selecionados.filter(a => a.nota !== undefined && +a.nota < 10);

    if (aprovados.length === 0) {
      showMessage( "Atenção", "Nenhum aluno com nota ≥ 10: não há nada a publicar.");
      return; 
    }
  
    const proceedSave = async () => {
      setSubmissionLoading(true);
      try {
        const payload = {
          professor_id: professorData.user_id,
          disciplina:   professorData.disciplina,
          modulo:       selectedModuloNum,
          turma:        selectedTurma.turma,
          ano:          selectedTurma.ano,
          alunos:       aprovados,
        };
        const res = await axios.post(url_saveNote, payload);
        if (!res.data.success) throw new Error(res.data.message);
  
        const publicadosMsg = aprovados
          .map(a => `${a.email} (${a.nota})`)
          .join(", ");
        showMessage("Sucesso", `Notas publicadas para: ${publicadosMsg}`);
        navigation.goBack();
  
      } catch (err: any) {
        showMessage("Erro", err.message);
      } finally {
        setSubmissionLoading(false);
      }
    };
  
if (atrasados.length > 0) {
    const listaAtrasados = atrasados
      .map(a => `${a.email} com ${a.nota} tem valores`)
      .join("\n");
    const mensagem = 
      `Notas com <10 NÃO serão publicadas:\n\nO/A ${listaAtrasados}\n\n` +
      `Deseja publicar apenas ${aprovados.length} aluno(s) com nota ≥ 10?`;

    if (Platform.OS === 'web') {
      if (window.confirm(mensagem)) {
        await proceedSave();
      }
    } else {
      Alert.alert(
        "Módulo em atraso",
        mensagem,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Continuar", onPress: () => proceedSave() }
        ]
      );
    }
    return;
  }

  await proceedSave();
}; 

  if (loading || dataLoading || submissionLoading) {
    const color = userTheme === "dark" ? "#e0dede" : "#000";
    return (
      <ImageBackground
        source={backgroundUrl ? { uri: backgroundUrl } : require("../../assets/images/bg1.jpg")}
        style={styles.loaderContainer}
      >
        <ActivityIndicator size="large" color={color} />
        <Text style={{ marginTop: 12, color, fontSize: 16 }}>Carregando…</Text>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={backgroundUrl ? { uri: backgroundUrl } : require("../../assets/images/bg1.jpg")}
      style={styles.wrapper}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flex: 1 }}>
          <Image
            source={require("../../assets/icons/angle-left.png")}
            style={[styles.icon, { tintColor: userTheme === "dark" ? "#FFF" : "#000" }]}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAccountModalVisible(true)} style={{ flex: 1, alignItems: "flex-end" }}>
          <Image
            source={require("../../assets/icons/user.png")}
            style={[styles.icon, { tintColor: userTheme === "dark" ? "#FFF" : "#000" }]}
          />
        </TouchableOpacity>
      </View>

      {/* Conteúdo branco por baixo */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentWrapper}>
          <Text style={styles.title}>Atribuição de Notas</Text>

          {/* Seleção de Turma */}
          <Text style={styles.label}>Selecione a Turma:</Text>
          <View style={styles.turmaContainer}>
            {availableTurmas.map((t) => {
              const isSel = selectedTurma?.id === t.id;
              return (
                <Button
                  key={t.id}
                  mode={isSel ? "contained" : "outlined"}
                  onPress={() => setSelectedTurma(t)}
                  style={[styles.turmaButton, isSel && styles.turmaButtonSelected]}
                  labelStyle={isSel ? styles.turmaButtonLabelSel : styles.turmaButtonLabel}
                >
                  {t.ano} - {t.turma}
                </Button>
              );
            })}
          </View>

          {/* Seleção de Módulo */}
          <Text style={styles.label}>Selecione o Módulo:</Text>
          <View style={styles.moduloContainer}>
            {modulos.length > 0 ? modulos.map((m) => {
              const label = `${m.numero_do_modulo}º — ${m.nome}`;
              const isSel = selectedModulo === m.nome;
              return (
                <Button
                  key={`${m.numero_do_modulo}-${m.nome}`}
                  mode={isSel ? "contained" : "outlined"}
                  onPress={() => {
                    setSelectedModulo(m.nome);
                    setSelectedModuloNum(m.numero_do_modulo);
                  }}
                  style={[styles.moduloButton, isSel && styles.moduloButtonSelected]}
                  labelStyle={isSel ? styles.moduloButtonLabelSelected : styles.moduloButtonLabel}
                  contentStyle={styles.moduloButtonContent}
                >
                  {label}
                </Button>
              );
            }) : (
              <Text style={styles.infoText}>Nenhum módulo disponível.</Text>
            )}
          </View>

          {alunos.length > 0 ? alunos.map((aluno, i) => (
            <View key={`${aluno.id}-${i}`} style={styles.alunoContainer}>
              <View style={styles.alunoHeader}>
              {Platform.OS === 'web' ? (
                <TouchableOpacity
                  onPress={() => {
                    const copy = [...alunos];
                    copy[i].selected = !copy[i].selected;
                    setAlunos(copy);
                  }}
                  style={{ padding: 4 }}
                >
                  <MaterialCommunityIcons
                    name={aluno.selected ? "checkbox-marked" : "checkbox-blank-outline"}
                    size={24}
                    color={aluno.selected ? "#47AD4D" : theme.colors.primary}
                  />
                </TouchableOpacity>
              ) : (
                <Checkbox
                  status={aluno.selected ? "checked" : "unchecked"}
                  onPress={() => {
                    const copy = [...alunos];
                    copy[i].selected = !copy[i].selected;
                    setAlunos(copy);
                  }}
                  color={aluno.selected ? "#47AD4D" : theme.colors.primary}
                />
              )}
                <Text style={styles.alunoEmail}>{aluno.email}</Text>
              </View>
              {aluno.selected && (
                <View style={styles.alunoForm}>
                  <TextInput
                    label="Nota (0–20)"
                    keyboardType="numeric"
                    value={aluno.nota || ""}
                    onChangeText={text => {
                      const num = text.replace(/[^0-9]/g, "");
                      if (num === "" || (+num >= 0 && +num <= 20)) {
                        const copy = [...alunos];
                        copy[i].nota = num;
                        setAlunos(copy);
                      }
                    }}
                    style={styles.input}
                  />
                  <TextInput
                    label="Comentário Privado"
                    multiline
                    value={aluno.comentario_privado || ""}
                    onChangeText={txt => {
                      const copy = [...alunos];
                      copy[i].comentario_privado = txt;
                      setAlunos(copy);
                    }}
                    style={[styles.input, styles.comentarioInput]}
                  />
                </View>
              )}
            </View>
          )) : (
            <Text style={styles.infoText}>Nenhum aluno encontrado</Text>
          )}

          <Button
            mode="contained"
            onPress={handleSaveNote}
            style={styles.saveButton}
          >
            Atribuir Notas
          </Button>
        </View>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{ label: "Fechar", onPress: () => setSnackbarVisible(false) }}
      >
        {snackbarMessage}
      </Snackbar>

      <ModalConfig
        visible={accountModalVisible}
        dynamicHeaderBackground="white"
        dynamicTextColor="black"
        onClose={() => setAccountModalVisible(false)}
        navigation={navigation}
        email={email}
      />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  header: {
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
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  icon: {
    width: Platform.OS === "web" ? 35 : 23,
    height: Platform.OS === "web" ? 35 : 25,
    marginLeft: 3,
    marginTop: Platform.OS === "web" ? -15 : 3,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // —— NOVO container branco ——
  scrollContent: {
    paddingTop: 80,    // para não ficar por baixo do header
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  contentWrapper: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    // sombra iOS
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    // sombra Android
    elevation: 2,
  },

  title: { fontSize: 26, fontWeight: "bold", marginBottom: 20, color: "#333", textAlign: "center" },
  label: { fontSize: 16, marginBottom: 8, color: "#555", fontWeight: "500" },
  turmaContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20, justifyContent: "center" },
  turmaButton: { margin: 4 },
  turmaButtonSelected: { backgroundColor: "#47AD4D", borderColor: "#47AD4D" },
  turmaButtonLabel: { color: "#47AD4D" },
  turmaButtonLabelSel: { color: "#FFF" },
  moduloContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 20, justifyContent: "center" },
  moduloButton: { margin: 4 },
  moduloButtonSelected: { backgroundColor: "#47AD4D", borderColor: "#47AD4D" },
  moduloButtonLabel: { color: "#47AD4D" },
  moduloButtonLabelSelected: { color: "#FFF" },
  moduloButtonContent: { paddingVertical: 6, paddingHorizontal: 12 },
  alunoContainer: { marginBottom: 16, padding: 16, backgroundColor: "#FFF", borderRadius: 8, elevation: 3 },
  alunoHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  alunoEmail: { marginLeft: 8, fontSize: 16, color: "#333", fontWeight: "500" },
  alunoForm: { marginTop: 8 },
  input: { marginBottom: 12, backgroundColor: "white" },
  comentarioInput: { height: 80, textAlignVertical: "top" },
  saveButton: { marginTop: 20, backgroundColor: "#47AD4D" },
  infoText: { fontSize: 16, marginBottom: 20, textAlign: "center", color: "#888" },
});

export default AdicionarNotasScreen;