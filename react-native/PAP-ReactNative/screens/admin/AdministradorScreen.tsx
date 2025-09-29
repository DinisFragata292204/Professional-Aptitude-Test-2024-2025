import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Image,
  ImageBackground,
  StatusBar,
  Platform,
  Pressable,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from "react-native";
import {
  TextInput,
  Button,
  RadioButton,
  useTheme,
  Portal,
  Dialog,
  Paragraph,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import config from "../../config/config_db";
import ModalConfig from "../../components/modalConfig";
import * as SecureStore from "expo-secure-store";

const CriarUtilizadorScreen = ({ navigation, route }) => {
  const theme = useTheme();
  const isWeb = Platform.OS === "web";

  const url = `${config.baseUrl}/adminFiles/`;
  const url_getDisciplinas = `${config.baseUrl}/adminFiles/getDisciplinas.php`;
  const url_getTurmas = `${config.baseUrl}/adminFiles/getTurmas.php`;
  const url_createTurma = `${config.baseUrl}/adminFiles/createTurma.php`;

  const [turmasList, setTurmasList] = useState([]);
  const [anosList, setAnosList] = useState([]);
  const [turmasByAno, setTurmasByAno] = useState({});

  const [showNewTurma, setShowNewTurma] = useState(false);
  const [newTurmaAno, setNewTurmaAno] = useState("");
  const [newTurmaLetra, setNewTurmaLetra] = useState("");
  const [creatingTurma, setCreatingTurma] = useState(false);

  const [emailLocal, setEmailLocal] = useState("");
  const [cargo, setCargo] = useState("aluno");
  const [carregando, setCarregando] = useState(false);
  const [menuVisivel, setMenuVisivel] = useState(false);
  const [modalContaVisivel, setModalContaVisivel] = useState(false);
  const [backgroundUrl, setBackgroundUrl] = useState(null);
  const [userTheme, setUserTheme] = useState(theme.dark ? "dark" : "light");
  const [loading, setLoading] = useState(true);

  // Estados específicos para alunos
  const [anoAluno, setAnoAluno] = useState("");
  const [turmaAluno, setTurmaAluno] = useState("");

  // Estados específicos para professores
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState("");
  const [disciplinasList, setDisciplinasList] = useState([]);
  const [anoProfessorSelecionado, setAnoProfessorSelecionado] = useState("");
  const [turmasProfessor, setTurmasProfessor] = useState({});

  // Estados para criação inline de disciplina
  const [showNewDisciplinaInput, setShowNewDisciplinaInput] = useState(false);
  const [newDisciplina, setNewDisciplina] = useState("");
  const [creatingDisciplina, setCreatingDisciplina] = useState(false);

  // Estado para toast notification
  const [toast, setToast] = useState({ visible: false, message: "", type: "" });
  const [infoVisible, setInfoVisible] = useState(false);

  const [authEmail, setAuthEmail] = useState("");

  // Cores dinâmicas
  const boxBackground = userTheme === "dark" ? "#101218" : "#FFFFFF";
  const dynamicTextColor = userTheme === "dark" ? "#FFFFFF" : "#000";
  const inputBackground = userTheme === "dark" ? "#3F4454" : "#fff";

  useEffect(() => {
    if (route.params?.email) {
      setAuthEmail(route.params.email);
    }
  }, [route.params?.email]);

  useEffect(() => {
    if (cargo === "aluno" || cargo === "professor") {
      fetch(url_getTurmas)
        .then(async (res) => {
          const text = await res.text();
          return JSON.parse(text);
        })
        .then((dados) => {
          if (dados.success) {
            setTurmasList(dados.turmas);
            // extrair anos únicos e agrupar turmas
            const anos = Array.from(new Set(dados.turmas.map((t) => t.ano)))
              .sort((a, b) => Number(a) - Number(b))
              .map((n) => n.toString());
            setAnosList(anos);
            const agrup = {};
            dados.turmas.forEach((t) => {
              const ano = t.ano.toString();
              agrup[ano] = agrup[ano] || [];
              agrup[ano].push(t);
            });
            setTurmasByAno(agrup);
          } else {
            showToast(dados.message, "error");
          }
        })
        .catch(() => showToast("Não foi possível carregar turmas", "error"));
    }
  }, [cargo]);

  const handleCreateTurma = async () => {
    if (!newTurmaAno || !newTurmaLetra.trim()) {
      showToast("Preenche ano e letra da turma", "error");
      return;
    }
    if (
      turmasList.some(
        (t) =>
          t.ano.toString() === newTurmaAno &&
          t.turma.toUpperCase() === newTurmaLetra.toUpperCase()
      )
    ) {
      showToast("Essa turma já existe", "error");
      return;
    }
    setCreatingTurma(true);
    try {
      const res = await fetch(url_createTurma, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ano: newTurmaAno, turma: newTurmaLetra }),
      });
      const dados = await res.json();
      if (dados.success) {
        showToast("Turma criada!", "success");
        // atualizar lista local
        const t = dados.turma;
        setTurmasList((prev) => [...prev, t]);
        // atualizar agrupamentos
        setAnosList((prev) =>
          prev.includes(t.ano.toString())
            ? prev
            : [...prev, t.ano.toString()].sort()
        );
        setTurmasByAno((prev) => {
          const anoKey = t.ano.toString();
          const arr = prev[anoKey] ? [...prev[anoKey], t] : [t];
          return { ...prev, [anoKey]: arr };
        });
        setShowNewTurma(false);
        setNewTurmaAno("");
        setNewTurmaLetra("");
      } else {
        showToast(dados.message || "Erro ao criar turma", "error");
      }
    } catch {
      showToast("Falha ao comunicar com o servidor", "error");
    } finally {
      setCreatingTurma(false);
    }
  };

  const salvarDisabled =
    !newTurmaAno ||
    !newTurmaLetra.trim() ||
    turmasList.some(
      (t) =>
        t.ano.toString() === newTurmaAno &&
        t.turma.toUpperCase() === newTurmaLetra.toUpperCase()
    );

  const renderAlunoFields = () => (
    <>
      <Text style={[styles.rotulo, { color: dynamicTextColor }]}>
        Ano Escolar:
      </Text>
      {anosList.length === 0 ? (
        <ActivityIndicator size="small" />
      ) : (
        <RadioButton.Group onValueChange={setAnoAluno} value={anoAluno}>
          {anosList.map((ano) => (
            <View key={ano} style={styles.grupoRadio}>
              <RadioButton value={ano} color="#47AD4D" />
              <Text style={{ color: dynamicTextColor }}>{ano}º Ano</Text>
            </View>
          ))}
        </RadioButton.Group>
      )}

      {anoAluno !== "" && (
        <>
          <Text style={[styles.rotulo, { color: dynamicTextColor }]}>
            Turma:
          </Text>
          <RadioButton.Group onValueChange={setTurmaAluno} value={turmaAluno}>
            {(turmasByAno[anoAluno] || []).map((t) => (
              <View key={t.id} style={styles.grupoRadio}>
                <RadioButton value={t.id.toString()} color="#47AD4D" />
                <Text style={{ color: dynamicTextColor }}>Turma {t.turma}</Text>
              </View>
            ))}
          </RadioButton.Group>
        </>
      )}

      {/* botão para nova turma */}
      <TouchableOpacity
        onPress={() => setShowNewTurma(!showNewTurma)}
        style={styles.plusButton}
      >
        <Ionicons
          name="add-circle-outline"
          size={24}
          color={dynamicTextColor}
        />
        <Text style={{ color: dynamicTextColor, marginLeft: 5 }}>
          Nova Turma
        </Text>
      </TouchableOpacity>
      <Portal>
        <Dialog
          visible={showNewTurma}
          onDismiss={() => {
            setShowNewTurma(false);
            setNewTurmaAno("");
            setNewTurmaLetra("");
          }}
          style={{
            marginHorizontal: 20,
            backgroundColor: "#fff", // força fundo branco
          }}
          // se quiseres mesmo garantir que todo o Surface fica branco:
          theme={{ colors: { surface: "#fff" } }}
        >
          <Dialog.Title>Criar Nova Turma</Dialog.Title>
          <Dialog.Content>
            <Text
              style={[
                styles.rotulo,
                { color: dynamicTextColor, marginBottom: 0 },
              ]}
            >
              Selecione o Ano:
            </Text>
            <RadioButton.Group
              onValueChange={setNewTurmaAno}
              value={newTurmaAno}
            >
              {["10", "11", "12"].map((a) => (
                <View key={a} style={styles.grupoRadio}>
                  <RadioButton value={a} color="#47AD4D" />
                  <Text style={{ color: dynamicTextColor }}>{a}º Ano</Text>
                </View>
              ))}
            </RadioButton.Group>

            <Text
              style={[
                styles.rotulo,
                { color: dynamicTextColor, marginTop: 10 },
              ]}
            >
              Letra da Turma:
            </Text>
            <TextInput
              mode="outlined"
              placeholder="Ex: A"
              value={newTurmaLetra}
              onChangeText={(t) =>
                setNewTurmaLetra(t.replace(/[^A-Za-z]/g, "").toUpperCase())
              }
              maxLength={1} // limita a 1 carácter
              style={[styles.newDisciplinaInput, { backgroundColor: "#fff" }]}
              theme={{
                colors: {
                  text: dynamicTextColor,
                  primary: dynamicTextColor,
                  background: "#fff", // força fundo branco
                },
              }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setShowNewTurma(false);
                setNewTurmaAno("");
                setNewTurmaLetra("");
              }}
              labelStyle={{ color: "red" }}
            >
              Cancelar
            </Button>
            <Button
              onPress={handleCreateTurma}
              loading={creatingTurma}
              disabled={salvarDisabled}
              // aplica opacidade reduzida quando disabled
              style={{ opacity: salvarDisabled ? 0.5 : 1 }}
              // ajusta a cor do texto conforme o estado
              labelStyle={{ color: salvarDisabled ? "#999" : "#47AD4D" }}
            >
              Salvar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );

  const showToast = (message, type) => {
    if (isWeb && type === "success") {
      // no web, sucessos viram alerta nativo
      window.alert(message);
      return;
    }
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "" }), 2000);
  };

  // Carrega configurações (background e tema)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        let bg = null;
        let mode = null;
        if (isWeb) {
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
      } catch (err) {
        console.error("Erro ao carregar configurações:", err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (cargo === "professor") {
      buscarDisciplinas();
    }
  }, [route.params?.email, cargo]);

  // Busca as disciplinas do servidor via getDisciplinas.php
  const buscarDisciplinas = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const resposta = await fetch(url_getDisciplinas, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!resposta.ok) {
        throw new Error(`Erro HTTP: ${resposta.status}`);
      }
      const dados = await resposta.json();
      if (dados.success) {
        setDisciplinasList(dados.disciplinas);
      } else {
        showToast(dados.message || "Erro ao carregar disciplinas.", "error");
      }
    } catch (erro) {
      console.error("[ERROR] Erro ao buscar disciplinas:", erro);
      if (erro.name === "AbortError") {
        showToast(
          "Tempo de resposta excedido. Verifique sua conexão.",
          "error"
        );
      } else {
        showToast("Não foi possível carregar as disciplinas.", "error");
      }
    }
  };

  // Função para criar o utilizador conforme o cargo
  const criarUtilizador = async () => {
    try {
      if (!emailLocal || !cargo) {
        showToast(
          "Pedimos que preencha todos os campos obrigatórios.",
          "error"
        );
        return;
      }
      if (cargo === "aluno" && (!anoAluno || !turmaAluno)) {
        showToast(
          "Para poder criar um aluno pedimos que preencha o ano e turma do aluno.",
          "error"
        );
        return;
      }
      if (
        cargo === "professor" &&
        (!disciplinaSelecionada ||
          !anoProfessorSelecionado ||
          Object.keys(turmasProfessor).length === 0)
      ) {
        showToast(
          "Pedimos que selecione uma disciplina que o professor irá lecionar, e as turmas que ele leciona.",
          "error"
        );
        return;
      }
      setCarregando(true);
      const endpointMap = {
        admin: "CreateAdmin.php",
        professor: "CreateProfessor.php",
        aluno: "CreateAluno.php",
        auxiliar: "CreateAuxiliar.php",
      };
      const endpoint = endpointMap[cargo];

      const fullEmail = `${emailLocal}@etps.com.pt`;
      if (emailLocal.includes("@")) {
        showToast(
          "Não inclua o “@” – só escreva a parte antes do domínio.",
          "error"
        );
        return;
      }
      let payload = {};
      if (cargo === "professor") {
        payload = {
          email: fullEmail,
          cargoUtilizador: cargo,
          disciplina: disciplinaSelecionada,
          ano: anoProfessorSelecionado,
          turma: turmasProfessor[anoProfessorSelecionado] || [],
        };
      } else if (cargo === "aluno") {
        payload = {
          email: fullEmail,
          cargoUtilizador: cargo,
          ano: anoAluno,
          turma: turmaAluno,
        };
      } else {
        payload = { email: fullEmail, cargoUtilizador: cargo };
      }
      const resposta = await fetch(url + endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:19006",
        },
        body: JSON.stringify(payload),
      });
      if (!resposta.ok) {
        const txt = await resposta.text();
        console.error("ERRO HTTP", resposta.status, txt);
        throw new Error(`HTTP ${resposta.status}`);
      }
      const dados = await resposta.json();
      if (dados.success) {
        showToast("Utilizador criado com sucesso!", "success");
      } else {
        showToast(
          dados.message || "Ocorreu um erro ao criar o utilizador.",
          "error"
        );
      }
    } catch (erro) {
      console.error("[ERROR]", erro);
      showToast("Falha na comunicação com o servidor.", "error");
    } finally {
      setCarregando(false);
    }
  };

  // Alterna a seleção de turma para o professor
  const alternarTurmaProfessor = (turma) => {
    setTurmasProfessor((prev) => {
      const currentYear = anoProfessorSelecionado;
      const currentTurmas = prev[currentYear] || [];
      const newTurmas = currentTurmas.includes(turma)
        ? currentTurmas.filter((t) => t !== turma)
        : [...currentTurmas, turma];
      return { ...prev, [currentYear]: newTurmas };
    });
  };

  // Função para criação inline de nova disciplina
  const handleCreateNewDisciplina = async () => {
    if (!newDisciplina.trim()) {
      showToast("Informe o nome da nova disciplina", "error");
      return;
    }
    setCreatingDisciplina(true);
    try {
      const resposta = await fetch(
        `${config.baseUrl}/adminFiles/CreateDisciplina.php`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nomeDisciplina: newDisciplina,
            professorId: 0, // Valor padrão, ajuste conforme necessário
          }),
        }
      );
      const dados = await resposta.json();
      if (dados.success) {
        showToast("Disciplina criada com sucesso!", "success");
        const novaDisciplinaObj = {
          id: dados.disciplinaId,
          disciplina: newDisciplina,
        };
        setDisciplinasList((prev) => [...prev, novaDisciplinaObj]);
        setDisciplinaSelecionada(novaDisciplinaObj.id.toString());
        setNewDisciplina("");
        setShowNewDisciplinaInput(false);
      } else {
        showToast(dados.message || "Erro ao criar disciplina.", "error");
      }
    } catch (err) {
      console.error("Erro ao criar disciplina:", err);
      showToast(
        "Erro na comunicação com o servidor (criar disciplina)",
        "error"
      );
    } finally {
      setCreatingDisciplina(false);
    }
  };

  const podeSalvarDisciplina = newDisciplina.trim().length > 0;
  const salvarTurmaDisabled =
    !newTurmaAno ||
    !newTurmaLetra.trim() ||
    turmasList.some(
      (t) =>
        t.ano.toString() === newTurmaAno &&
        t.turma.toUpperCase() === newTurmaLetra.toUpperCase()
    );

  const renderProfessorFields = () => (
    <>
      {/* Seleção de Disciplina */}
      <Text style={[styles.rotulo, { color: dynamicTextColor }]}>
        Selecione a Disciplina:
      </Text>
      <TouchableOpacity
        onPress={() => setShowNewDisciplinaInput(!showNewDisciplinaInput)}
        style={styles.plusButton}
      >
        <Ionicons
          name="add-circle-outline"
          size={28}
          color={dynamicTextColor}
        />
        <Text style={{ color: dynamicTextColor, marginLeft: 5 }}>
          Nova Disciplina
        </Text>
      </TouchableOpacity>
      {showNewDisciplinaInput && (
        <View style={styles.newDisciplinaContainer}>
          <TextInput
            mode="outlined"
            placeholder="Nome da nova disciplina"
            value={newDisciplina}
            onChangeText={setNewDisciplina}
            style={styles.newDisciplinaInput}
            theme={{
              colors: {
                primary: dynamicTextColor,
                text: dynamicTextColor,
                background: inputBackground,
              },
            }}
          />
          <Button
            onPress={handleCreateNewDisciplina}
            mode="contained"
            loading={creatingDisciplina}
            disabled={!podeSalvarDisciplina}
            style={[
              styles.newDisciplinaButton,
              { opacity: podeSalvarDisciplina ? 1 : 0.5 },
            ]}
            labelStyle={{ color: podeSalvarDisciplina ? "#FFFFFF" : "#999" }}
          >
            Salvar
          </Button>
        </View>
      )}
      {disciplinasList.length === 0 ? (
        <View style={styles.indicadorContainer}>
          <ActivityIndicator size="large" color="#47AD4D" />
          <Button
            onPress={buscarDisciplinas}
            mode="outlined"
            style={{ marginTop: 10 }}
            labelStyle={{ color: "#47AD4D" }}
          >
            Tentar Novamente
          </Button>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollViewDisciplinas}
          contentContainerStyle={{ paddingVertical: 5 }}
          nestedScrollEnabled={true}
          scrollEnabled={true}
          keyboardShouldPersistTaps="handled"
        >
          <RadioButton.Group
            onValueChange={setDisciplinaSelecionada}
            value={disciplinaSelecionada}
          >
            {disciplinasList.map((d) => (
              <View key={d.id} style={styles.grupoRadio}>
                <RadioButton value={d.id.toString()} color="#47AD4D" />
                <Text style={{ color: dynamicTextColor }}>{d.disciplina}</Text>
              </View>
            ))}
          </RadioButton.Group>
        </ScrollView>
      )}

      {/* Seleção de Ano (dinâmico) */}
      <Text style={[styles.rotulo, { color: dynamicTextColor, marginTop: 10 }]}>
        Ano em que o professor leciona:
      </Text>
      <RadioButton.Group
        onValueChange={setAnoProfessorSelecionado}
        value={anoProfessorSelecionado}
      >
        {anosList.map((ano) => (
          <View key={ano} style={styles.grupoRadio}>
            <RadioButton value={ano} color="#47AD4D" />
            <Text style={{ color: dynamicTextColor }}>{ano}º Ano</Text>
          </View>
        ))}
      </RadioButton.Group>

      {/* Botão Nova Turma (abre o mesmo modal) */}
      <TouchableOpacity
        onPress={() => setShowNewTurma(true)}
        style={styles.plusButton}
      >
        <Ionicons
          name="add-circle-outline"
          size={24}
          color={dynamicTextColor}
        />
        <Text style={{ color: dynamicTextColor, marginLeft: 5 }}>
          Nova Turma
        </Text>
      </TouchableOpacity>

      {/* Modal de criar turma (reaproveitando o mesmo estado e lógica) */}
      <Portal>
        <Dialog
          visible={showNewTurma}
          onDismiss={() => {
            setShowNewTurma(false);
            setNewTurmaAno("");
            setNewTurmaLetra("");
          }}
          style={{ marginHorizontal: 20, backgroundColor: "#fff" }}
          theme={{ colors: { surface: "#fff" } }}
        >
          <Dialog.Title>Criar Nova Turma</Dialog.Title>
          <Dialog.Content>
            <Text
              style={[
                styles.rotulo,
                { color: dynamicTextColor, marginBottom: 0 },
              ]}
            >
              Selecione o Ano:
            </Text>
            <RadioButton.Group
              onValueChange={setNewTurmaAno}
              value={newTurmaAno}
            >
              {anosList.map((a) => (
                <View key={a} style={styles.grupoRadio}>
                  <RadioButton value={a} color="#47AD4D" />
                  <Text style={{ color: dynamicTextColor }}>{a}º Ano</Text>
                </View>
              ))}
            </RadioButton.Group>

            <Text
              style={[
                styles.rotulo,
                { color: dynamicTextColor, marginTop: 10 },
              ]}
            >
              Letra da Turma:
            </Text>
            <TextInput
              mode="outlined"
              placeholder="Ex: A"
              value={newTurmaLetra}
              onChangeText={(t) =>
                setNewTurmaLetra(t.replace(/[^A-Za-z]/g, "").toUpperCase())
              }
              maxLength={1}
              style={[styles.newDisciplinaInput, { backgroundColor: "#fff" }]}
              theme={{
                colors: {
                  text: dynamicTextColor,
                  primary: dynamicTextColor,
                  background: "#fff",
                },
              }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setShowNewTurma(false);
                setNewTurmaAno("");
                setNewTurmaLetra("");
              }}
              labelStyle={{ color: "red" }}
            >
              Cancelar
            </Button>
            <Button
              onPress={handleCreateTurma}
              loading={creatingTurma}
              disabled={salvarTurmaDisabled}
              style={{ opacity: salvarTurmaDisabled ? 0.5 : 1 }}
              labelStyle={{ color: salvarTurmaDisabled ? "#999" : "#47AD4D" }}
            >
              Salvar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Seleção de Turmas (dinâmico) */}
      {anoProfessorSelecionado !== "" && (
        <View style={styles.containerTurmas}>
          <Text style={[styles.rotulo, { color: dynamicTextColor }]}>
            Selecionar Turmas:
          </Text>
          <ScrollView
            style={styles.scrollViewTurmas}
            contentContainerStyle={{ paddingVertical: 5 }}
            nestedScrollEnabled={true}
            scrollEnabled={true}
          >
            <View style={styles.grelhaTurmas}>
              {(turmasByAno[anoProfessorSelecionado] || []).map((t) => {
                const selecionada = (
                  turmasProfessor[anoProfessorSelecionado] || []
                ).includes(t.turma);
                return (
                  <Pressable
                    key={t.id}
                    style={[
                      styles.botaoTurma,
                      selecionada && styles.botaoTurmaSelecionada,
                    ]}
                    onPress={() => alternarTurmaProfessor(t.turma)}
                  >
                    <Text
                      style={
                        selecionada
                          ? styles.textoTurmaSelecionada
                          : [styles.textoTurma, { color: dynamicTextColor }]
                      }
                    >
                      {t.turma}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Exibição das turmas já selecionadas */}
          <View style={styles.turmasSelecionadas}>
            <Text style={[styles.rotuloTurmas, { color: dynamicTextColor }]}>
              Turmas Selecionadas:
            </Text>
            {Object.entries(turmasProfessor).map(([ano, turmas]) => (
              <Text
                key={ano}
                style={[styles.textoTurmas, { color: dynamicTextColor }]}
              >
                {ano}º: {Array.isArray(turmas) ? turmas.join(", ") : ""}
              </Text>
            ))}
            {Object.keys(turmasProfessor).length === 0 && (
              <Text style={[styles.textoTurmas, { color: dynamicTextColor }]}>
                Nenhuma turma selecionada
              </Text>
            )}
          </View>
        </View>
      )}
    </>
  );

  const renderContentWeb = () => (
    <View style={styles.webContainer}>
      <View style={styles.leftColumn}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <Text style={[styles.rotulo, { color: dynamicTextColor, margin: 0 }]}>
            Selecione o Cargo:
          </Text>
          <TouchableOpacity
            onPress={() => setInfoVisible(true)}
            style={{ padding: 4 }}
          >
            <Image
              source={require("../../assets/icons/info.png")}
              style={{ width: 20, height: 20, tintColor: dynamicTextColor }}
            />
          </TouchableOpacity>
        </View>
        <RadioButton.Group onValueChange={setCargo} value={cargo}>
          <View style={styles.grupoRadio}>
            <RadioButton value="aluno" color="#47AD4D" />
            <Text style={{ color: dynamicTextColor }}>Aluno</Text>
          </View>
          <View style={styles.grupoRadio}>
            <RadioButton value="professor" color="#47AD4D" />
            <Text style={{ color: dynamicTextColor }}>Professor</Text>
          </View>
          <View style={styles.grupoRadio}>
            <RadioButton value="admin" color="#47AD4D" />
            <Text style={{ color: dynamicTextColor }}>Administrador</Text>
          </View>
          <View style={styles.grupoRadio}>
            <RadioButton value="auxiliar" color="#47AD4D" />
            <Text style={{ color: dynamicTextColor }}>Auxiliar</Text>
          </View>
        </RadioButton.Group>
        <TextInput
          label={
            <Text style={{ color: userTheme === "dark" ? "#FFF" : "#000" }}>
              Nome de utilizador
            </Text>
          }
          mode="outlined"
          value={emailLocal}
          onChangeText={setEmailLocal}
          keyboardType="email-address"
          style={[styles.campoInput, { backgroundColor: inputBackground }]}
          right={<TextInput.Affix text="@etps.com.pt" />}
          theme={{
            colors: {
              text: userTheme === "dark" ? "#FFF" : "#000",
              primary: userTheme === "dark" ? "#FFF" : "#000",
              placeholder:
                userTheme === "dark"
                  ? "rgba(255,255,255,0.6)"
                  : "rgba(0,0,0,0.6)",
              background: inputBackground,
              onSurfaceVariant: userTheme === "dark" ? "#FFF" : "#000",
            },
          }}
        />
      </View>
      <View style={styles.rightColumn}>
        {cargo === "aluno" && renderAlunoFields()}
        {cargo === "professor" && renderProfessorFields()}
        {(cargo === "admin" || cargo === "auxiliar") && (
          <Text style={{ color: dynamicTextColor, marginTop: 20 }}>
            Nenhum campo adicional necessário.
          </Text>
        )}
      </View>
    </View>
  );

  const renderContentMobile = () => (
    <View style={styles.mobileContainer}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <Text style={[styles.rotulo, { color: dynamicTextColor, margin: 0 }]}>
          Selecione o Cargo:
        </Text>
        <TouchableOpacity
          onPress={() => setInfoVisible(true)}
          style={{ padding: 4 }}
        >
          <Image
            source={require("../../assets/icons/info.png")}
            style={{ width: 20, height: 20, tintColor: dynamicTextColor }}
          />
        </TouchableOpacity>
      </View>
      <RadioButton.Group onValueChange={setCargo} value={cargo}>
        <View style={styles.grupoRadio}>
          <RadioButton value="aluno" color="#47AD4D" />
          <Text style={{ color: dynamicTextColor }}>Aluno</Text>
        </View>
        <View style={styles.grupoRadio}>
          <RadioButton value="professor" color="#47AD4D" />
          <Text style={{ color: dynamicTextColor }}>Professor</Text>
        </View>
        <View style={styles.grupoRadio}>
          <RadioButton value="admin" color="#47AD4D" />
          <Text style={{ color: dynamicTextColor }}>Administrador</Text>
        </View>
        <View style={styles.grupoRadio}>
          <RadioButton value="auxiliar" color="#47AD4D" />
          <Text style={{ color: dynamicTextColor }}>Auxiliar</Text>
        </View>
      </RadioButton.Group>
      <TextInput
        label={
          <Text style={{ color: userTheme === "dark" ? "#FFF" : "#000" }}>
            Nome de utilizador
          </Text>
        }
        mode="outlined"
        value={emailLocal}
        onChangeText={(t) => setEmailLocal(t.replace(/@.*$/, ""))}
        placeholder="ex: aluno"
        keyboardType="default"
        style={[styles.campoInput, { backgroundColor: inputBackground }]}
        right={<TextInput.Affix text="@etps.com.pt" />}
        theme={{
          colors: {
            text: userTheme === "dark" ? "#FFF" : "#000",
            primary: userTheme === "dark" ? "#FFF" : "#000",
            placeholder:
              userTheme === "dark"
                ? "rgba(255,255,255,0.6)"
                : "rgba(0,0,0,0.6)",
            background: inputBackground,
            onSurfaceVariant: userTheme === "dark" ? "#FFF" : "#000",
          },
        }}
      />
      {cargo === "aluno" && renderAlunoFields()}
      {cargo === "professor" && renderProfessorFields()}
      {(cargo === "admin" || cargo === "auxiliar") && (
        <Text style={{ color: dynamicTextColor, marginTop: 20 }}>
          Nenhum campo adicional necessário.
        </Text>
      )}
    </View>
  );

  const renderContent = () =>
    isWeb ? renderContentWeb() : renderContentMobile();

  const renderMobileLayout = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      nestedScrollEnabled={true}
      keyboardShouldPersistTaps="handled"
    >
      {renderContent()}
      <Button
        mode="contained"
        onPress={criarUtilizador}
        style={styles.botaoCriar}
        labelStyle={{ color: "#fff" }}
        loading={carregando}
      >
        Criar Utilizador
      </Button>
    </ScrollView>
  );

  const renderWebLayout = () => (
    <>
      {renderContent()}
      <Button
        mode="contained"
        onPress={criarUtilizador}
        style={styles.botaoCriar}
        labelStyle={{ color: "#fff" }}
        loading={carregando}
      >
        Criar Utilizador
      </Button>
    </>
  );

  const containerWidth = isWeb ? "80%" : "90%";

  return (
    <ImageBackground
      source={
        backgroundUrl
          ? { uri: backgroundUrl }
          : require("../../assets/images/bg1.jpg")
      }
      style={styles.bgImage}
    >
      {userTheme === "dark" && <View style={styles.darkOverlay} />}
     <StatusBar
        backgroundColor={userTheme === "dark" ? "#000000" : "#ffffff"}
        translucent
        barStyle={userTheme === "dark" ? "light-content" : "dark-content"}
      />


      {toast.visible &&
        (isWeb && toast.type !== "success" ? (
          <View style={styles.webErrorOverlay}>
            <Text style={styles.webErrorText}>{toast.message}</Text>
          </View>
        ) : (
          <View
            style={[
              styles.toastContainer,
              toast.type === "success"
                ? styles.toastSuccess
                : styles.toastError,
            ]}
          >
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        ))}

      <View
        style={[
          styles.headerFixed,
          { backgroundColor: userTheme === "dark" ? "#101218" : "#FFFFFF" },
        ]}
      >
        <TouchableOpacity
          onPress={() => setMenuVisivel(true)}
          style={styles.botaoMenu}
        >
          <Image
            source={require("../../assets/icons/menu-burger.png")}
            style={[
              styles.menuIcon,
              { tintColor: userTheme === "dark" ? "#FFFFFF" : "#000" },
            ]}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setModalContaVisivel(true)}
          style={styles.botaoConta}
        >
          <Image
            source={require("../../assets/icons/user.png")}
            style={[
              styles.userIcon,
              { tintColor: userTheme === "dark" ? "#FFFFFF" : "#000" },
            ]}
          />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.fixedBox,
          { width: containerWidth, backgroundColor: boxBackground },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#47AD4D" />
        ) : isWeb ? (
          renderWebLayout()
        ) : (
          renderMobileLayout()
        )}
      </View>

      {menuVisivel && (
        <TouchableWithoutFeedback onPress={() => setMenuVisivel(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.sideMenu,
                  {
                    backgroundColor:
                      userTheme === "dark" ? "#101218" : "#FFFFFF",
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    setMenuVisivel(false);
                    navigation.navigate("PutCalendar", { email: emailLocal });
                  }}
                  style={styles.menuItem}
                >
                  <Text
                    style={[
                      styles.menuText,
                      { color: userTheme === "dark" ? "#FFFFFF" : "#000000" },
                    ]}
                  >
                    Carregar um Calendário
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setMenuVisivel(false);
                    navigation.navigate("confirmacoesScreen", {
                      email: emailLocal,
                    });
                  }}
                  style={styles.menuItem}
                >
                  <Text
                    style={[
                      styles.menuText,
                      { color: userTheme === "dark" ? "#FFFFFF" : "#000000" },
                    ]}
                  >
                    Alunos Pendentes
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
      <Portal>
        <Dialog
          visible={infoVisible}
          onDismiss={() => setInfoVisible(false)}
          style={[
            { backgroundColor: "#fff" },
            isWeb && { width: 400, alignSelf: "center" },
          ]}
          theme={{ colors: { surface: "#fff" } }}
        >
          <Dialog.Title>O que podes fazer aqui?</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={isWeb ? { maxHeight: 200 } : { maxHeight: 200 }}>
              <Paragraph>
                • É possível criar uma conta para um utilizador com cargo
                “Aluno”, “Professor”, “Administrador” ou “Auxiliar”.
              </Paragraph>
              <Paragraph>
                • Se for para criar um “Aluno”, escolher ano (10º,11º,12º) e a
                turma.
              </Paragraph>
              <Paragraph>
                • Se for para criar um “Professor”, selecionar disciplina, ano e
                uma ou mais turmas.
              </Paragraph>
              <Paragraph>
                • Os administradores e auxiliares não têm campos adicionais,
                bastando assim adicionar o email.
              </Paragraph>
              <Paragraph>
                • É possível criar um nova disciplina, bastando apenas informar
                o nome.
              </Paragraph>
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              labelStyle={{ color: "#47AD4D" }}
              onPress={() => setInfoVisible(false)}
            >
              OK
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <ModalConfig
        visible={modalContaVisivel}
        dynamicHeaderBackground={userTheme === "dark" ? "#101218" : "#FFFFFF"}
        dynamicTextColor={userTheme === "dark" ? "#FFFFFF" : "#000"}
        onClose={() => setModalContaVisivel(false)}
        navigation={navigation}
        email={authEmail}
      />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  scrollViewDisciplinas: {
    maxHeight: 120,
    marginBottom: 10,
  },
  scrollViewTurmas: {
    maxHeight: 100,
    marginVertical: 5,
  },
  bgImage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  indicadorContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  darkOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  headerFixed: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: StatusBar.currentHeight || 20,
    paddingHorizontal: 10,
    paddingBottom: 10,
    position: "absolute",
    top: 0,
    zIndex: 10,
  },
  botaoMenu: { flex: 1 },
  menuIcon: {
    width: Platform.OS === "web" ? 30 : 23,
    height: Platform.OS === "web" ? 30 : 25,
    marginLeft: 3,
    marginTop: Platform.OS === "web" ? -5 : 3,
  },
  plusButton: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  newDisciplinaContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  newDisciplinaInput: {
    flex: 1,
    marginRight: 10,
    backgroundColor: "#fff",
  },
  newDisciplinaButton: {
    backgroundColor: "#47AD4D",
  },
  botaoConta: {
    flex: 1,
    alignItems: "flex-end",
  },
  userIcon: {
    width: Platform.OS === "web" ? 30 : 25,
    height: Platform.OS === "web" ? 30 : 25,
    marginTop: Platform.OS === "web" ? -5 : 3,
  },
  fixedBox: {
    marginTop: 80,
    borderRadius: 10,
    padding: 15,
    maxHeight: "80%",
    alignSelf: "center",
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  webContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  mobileContainer: {
    paddingBottom: 20,
  },
  leftColumn: {
    flex: 1,
    paddingRight: 15,
  },
  rightColumn: {
    flex: 1,
    paddingLeft: 15,
  },
  rotulo: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  grupoRadio: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  campoInput: {
    marginBottom: 15,
  },
  botaoCriar: {
    marginTop: 10,
    backgroundColor: "#47AD4D",
    alignSelf: "center",
    width: "90%",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 18,
    marginTop: 10,
  },
  grelhaTurmas: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 5,
  },
  botaoTurma: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 8,
    width: 50,
    alignItems: "center",
    marginVertical: 2,
    marginRight: 5,
  },
  botaoTurmaSelecionada: {
    backgroundColor: "green",
    borderColor: "green",
  },
  textoTurma: {},
  textoTurmaSelecionada: { color: "#fff" },
  containerTurmas: {
    marginVertical: 10,
  },
  rotuloTurmas: {
    fontWeight: "bold",
    marginBottom: 4,
  },
  textoTurmas: {},
  turmasSelecionadas: {
    marginTop: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    backgroundColor: "#f9f9f9",
  },
  scrollViewFixed: {
    maxHeight: 120,
    marginBottom: 10,
  },
  toastContainer: {
    position: "absolute",
    top: Platform.OS === "web" ? 10 : 40,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    zIndex: 20,
  },
  toastText: {
    color: "#fff",
    fontSize: 16,
  },
  toastSuccess: {
    backgroundColor: "green",
  },
  toastError: {
    backgroundColor: "red",
  },
  webErrorOverlay: {
    position: "absolute",
    top: "1%",
    left: "10%",
    right: "10%",
    padding: 15,
    backgroundColor: "red",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  webErrorText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sideMenu: {
    position: "absolute",
    top: Platform.OS === "web" ? 10 : 72,
    left: 0,
    bottom: 0,
    width: 260,
    paddingHorizontal: 20,
    paddingVertical: 30,
    shadowColor: "#000",
    shadowOffset: { width: 3, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  menuItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    marginBottom: 10,
  },
  menuText: {
    fontSize: 18,
    fontWeight: "500",
  },
});

export default CriarUtilizadorScreen;
