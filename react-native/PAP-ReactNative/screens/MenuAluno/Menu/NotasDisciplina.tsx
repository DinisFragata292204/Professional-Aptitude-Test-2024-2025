import React, { useState, useEffect, useCallback } from "react";
import { 
  SafeAreaView, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator, 
  RefreshControl, 
  View, 
  ScrollView, 
  TouchableOpacity,
  Platform,
  StatusBar,
  Image
} from "react-native";
import { Text, Card, Title, Appbar, useTheme } from "react-native-paper";
import axios from "axios";
import config from "../../../config/config_db"; // ajuste conforme sua estrutura

const NotasDisciplina = ({ route, navigation }) => {
  // Recebe os parâmetros: email do aluno, disciplina_id, disciplina_nome e emailprof (email do professor)
  const { email, disciplina_id, disciplina_nome, emailprof } = route.params;

  // Estados para cada seção
  const [notas, setNotas] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [tarefas, setTarefas] = useState([]);

  // Estados de loading e erros
  const [loadingNotas, setLoadingNotas] = useState(true);
  const [loadingEventos, setLoadingEventos] = useState(true);
  const [loadingTarefas, setLoadingTarefas] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorNotas, setErrorNotas] = useState(null);
  const [errorEventos, setErrorEventos] = useState(null);
  const [errorTarefas, setErrorTarefas] = useState(null);
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  // Endpoints
  const url_fetchNotas = `${config.baseUrl}/alunoFiles/fetchNotas.php`;
  const url_fetchEventos = `${config.baseUrl}/alunoFiles/fetchEventos.php`;
  const url_fetchTarefas = `${config.baseUrl}/alunoFiles/fetchTasks.php`; // endpoint para tarefas

  const theme = useTheme();

  // FUNÇÃO: Buscar Notas (continua inalterado)
  const fetchNotas = useCallback(async () => {
    try {
      console.log("DEBUG: Buscando notas para email:", email, "disciplina_id:", disciplina_id);
      const response = await axios.post(url_fetchNotas, { email, disciplina_id });
      console.log("DEBUG: Resposta do fetchNotas:", response.data);
      if (response.data.notas) {
        setNotas(response.data.notas);
        setErrorNotas(null);
      } else {
        setErrorNotas(response.data.error || "Nenhuma nota encontrada");
      }
    } catch (err) {
      console.error("DEBUG: Erro ao buscar notas:", err);
      setErrorNotas("Erro na conexão com a base de dados (notas)");
    } finally {
      setLoadingNotas(false);
    }
  }, [email, disciplina_id, url_fetchNotas]);

  // FUNÇÃO: Buscar Eventos (continua inalterado)
  const fetchEventos = useCallback(async () => {
    try {
      console.log("DEBUG: Buscando eventos para email:", email, "disciplina_id:", disciplina_id);
      const response = await axios.post(url_fetchEventos, { email, disciplina_id });
      console.log("DEBUG: Resposta do fetchEventos:", response.data);
      if (Array.isArray(response.data)) {
        setEventos(response.data);
        setErrorEventos(null);
      }
    } catch (err) {
      console.error("DEBUG: Erro ao buscar eventos:", err);
      setErrorEventos("Erro na conexão com o servidor (eventos)");
    } finally {
      setLoadingEventos(false);
    }
  }, [email, disciplina_id, url_fetchEventos]);

  // FUNÇÃO: Buscar Tarefas – agora usando o email do professor (emailprof)
  const fetchTarefas = useCallback(async () => {
    try {
      console.log("DEBUG: Buscando tarefas para email (professor):", emailprof, "disciplina_id:", disciplina_id);
      // Envie o email do professor (emailprof) como professor_id no payload
      const response = await axios.post(url_fetchTarefas, { email: emailprof, disciplina_id });
      console.log("DEBUG: Resposta do fetchTarefas:", response.data);
      if (response.data.success && Array.isArray(response.data.tasks)) {
        setTarefas(response.data.tasks);
        setErrorTarefas(null);
      } else {
        setErrorTarefas(response.data.error || "Nenhuma tarefa encontrada");
      }
    } catch (err) {
      console.error("DEBUG: Erro ao buscar tarefas:", err);
      setErrorTarefas("Erro na conexão com o servidor (tarefas)");
    } finally {
      setLoadingTarefas(false);
    }
  }, [emailprof, disciplina_id, url_fetchTarefas]);

  useEffect(() => {
    fetchNotas();
    fetchEventos();
    fetchTarefas();
  }, [fetchNotas, fetchEventos, fetchTarefas]);

  const onRefresh = () => {
    console.log("DEBUG: Refresh acionado.");
    setRefreshing(true);
    setLoadingNotas(true);
    setLoadingEventos(true);
    setLoadingTarefas(true);
    Promise.all([fetchNotas(), fetchEventos(), fetchTarefas()])
      .finally(() => setRefreshing(false));
  };

  if (loadingNotas || loadingEventos || loadingTarefas) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={"#47AD4D"} />
      </SafeAreaView>
    );
  }

  return (
    <>
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
          backgroundColor: "white",
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
              tintColor: "#000",
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
              tintColor: "#000",
            }}
          />
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Title style={styles.sectionTitle}>Notas</Title>
        {errorNotas ? (
          <Text style={styles.errorText}>{errorNotas}</Text>
        ) : notas.length > 0 ? (
          notas.map((item, index) => (
            <Card key={item.nota_id ? item.nota_id.toString() : index.toString()} style={styles.card}>
              <Card.Content>
                <Title style={styles.itemTitle}>Nota: {item.nota}</Title>
                <Text style={styles.infoText}>Professor: {item.professor_email}</Text>
                <Text style={styles.infoText}>Data: {item.data_lancamento}</Text>
                {item.comentario_privado && (
                  <Text style={styles.infoText}>Comentário: {item.comentario_privado}</Text>
                )}
              </Card.Content>
            </Card>
          ))
        ) : (
          <Text style={styles.infoText}>Nenhuma nota encontrada.</Text>
        )}

        {/* Seção de Eventos */}
        <Title style={styles.sectionTitle}>Eventos da Disciplina</Title>
        {errorEventos ? (
          <Text style={styles.errorText}>{errorEventos}</Text>
        ) : eventos.length > 0 ? (
          eventos.map((item) => (
            <Card 
              key={item.id.toString()} 
              style={[
                styles.card,
                item.professor_email === emailprof 
                  ? styles.highlightCard 
                  : styles.normalCard
              ]}
            >
              <Card.Content>
                <Title style={styles.itemTitle}>{item.title}</Title>
                <Text style={styles.infoText}>Início: {item.start_datetime}</Text>
                <Text style={styles.infoText}>Fim: {item.end_datetime}</Text>
              </Card.Content>
            </Card>
          ))
        ) : (
          <Text style={styles.infoText}>Nenhum evento encontrado para esta disciplina.</Text>
        )}

        {/* Seção de Tarefas */}
        <Title style={styles.sectionTitle}>Tarefas Publicadas</Title>
        {errorTarefas ? (
          <Text style={styles.errorText}>{errorTarefas}</Text>
        ) : tarefas.length > 0 ? (
          tarefas.map((item) => (
            <Card key={item.tarefa_id ? item.tarefa_id.toString() : item.id.toString()} style={styles.card}>
              <Card.Content>
                <Title style={styles.itemTitle}>{item.titulo}</Title>
                <Text style={styles.infoText}>Descrição: {item.descricao}</Text>
                <Text style={styles.infoText}>Data de Criação: {item.dataDeCriacao}</Text>
                <Text style={styles.infoText}>Data da Tarefa: {item.data_da_tarefa}</Text>
              </Card.Content>
            </Card>
          ))
        ) : (
          <Text style={styles.infoText}>Nenhuma tarefa encontrada para esta disciplina.</Text>
        )}
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: Platform.OS === "web" ? 30 : ( StatusBar.currentHeight + 35 || 70),
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    padding: 16,
  },
  appBar: {
    backgroundColor: "#47AD4D",
  },
  sectionTitle: {
    fontSize: 20,
    marginTop: 12,
    marginBottom: 8,
    color: "black",
    textAlign: "center",
  },
  infoText: {
    fontSize: 14,
    color: "#333",
    marginTop: 4,
  },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
    marginBottom: 8,
  },
  card: {
    marginVertical: 6,
    borderRadius: 8,
    elevation: 3,
    backgroundColor: "#ffffff",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#47AD4D",
  },
  highlightCard: {
    backgroundColor: "#e0f7fa",
  },
  normalCard: {
    backgroundColor: "#ffffff",
  },
});

export default NotasDisciplina;
