// src/screens/AlunosDoProfScreen.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  SafeAreaView,
  StyleSheet,
  View,
  StatusBar,
  FlatList,
  RefreshControl,
  Image,
  TouchableOpacity,
  Platform,
} from "react-native";
import {
  Provider as PaperProvider,
  DefaultTheme,
  Card,
  List,
  ActivityIndicator,
  Text,
  Divider,
  IconButton,
  useTheme,
} from "react-native-paper";
import axios from "axios";
import config from "../../config/config_db";
import ModalConfig from "../../components/modalConfig";

// — tipos de dado —
type Turma = { id: number; turma: string; ano: number };
type Aluno = { id: number; email: string; turma: string; ano: number };
type Grade = {
  id: number;
  disciplina: string;
  modulo: string;
  nota: number;
  data_lancamento: string;
};
type TurmaWithStudents = Turma & { students: Aluno[] };

// — tema Paper com primary = #47AD4D —
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#47AD4D",
  },
};

// — assets de ícones (imagens) —
const iconAssets: Record<string, any> = {
  school: require("../../assets/icons/school.png"),
  account: require("../../assets/icons/account.png"),
  "account-circle": require("../../assets/icons/account-circle.png"),
  refresh: require("../../assets/icons/refresh.png"),
};

// — retorna um componente <Image> para usar como ícone —
const getIconComponent = (name: string) => (props: { color: string }) => (
  <Image
    source={iconAssets[name]}
    style={{
      width: 24, // Default size for icons
      height: 24,
      tintColor: props.color,
    }}
    resizeMode="contain"
  />
);

function AlunosDoProfScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const professorEmail = route.params?.email ?? "";

  const urls = {
    profInfo: `${config.baseUrl}/calendarioFiles/professor/fetchProfessorInfo.php`,
    turmas: `${config.baseUrl}/calendarioFiles/professor/fetch_turmas.php`,
    students: `${config.baseUrl}/calendarioFiles/professor/fetchStudents.php`,
    grades: `${config.baseUrl}/calendarioFiles/professor/fetchStudentGrades.php`,
  };

  const [turmas, setTurmas] = useState<TurmaWithStudents[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTurma, setExpandedTurma] = useState<number | null>(null);
  const [expandedAluno, setExpandedAluno] = useState<number | null>(null);
  const [gradesByAluno, setGradesByAluno] = useState<Record<number, Grade[]>>(
    {}
  );
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      // buscar ID do professor
      const profResp = await axios.post(urls.profInfo, {
        email: professorEmail,
      });
      if (!profResp.data.success)
        throw new Error("Não foi possível obter dados do professor.");
      const professorId = profResp.data.professor.user_id;

      // buscar turmas
      const turResp = await axios.post(urls.turmas, { email: professorEmail });
      if (!turResp.data.success) throw new Error("Nenhuma turma encontrada.");

      // para cada turma, buscar alunos
      const tvs: TurmaWithStudents[] = await Promise.all(
        turResp.data.turmas.map(async (t: Turma) => {
          const stuResp = await axios.post(urls.students, {
            professor_id: professorId,
            turma: t.turma,
            ano: t.ano,
          });
          const students: Aluno[] = stuResp.data.success
            ? stuResp.data.students.map((al: any, idx: number) => ({
                id:
                  typeof al.id === "number"
                    ? al.id
                    : typeof al.user_id === "number"
                      ? al.user_id
                      : idx,
                email: al.email,
                turma: al.turma,
                ano: al.ano,
              }))
            : [];
          return { ...t, students };
        })
      );

      setTurmas(tvs);
    } catch (e: any) {
      setError(e.message || "Erro de conexão.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [professorEmail]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const loadGrades = async (alunoId: number) => {
    if (gradesByAluno[alunoId]) return;
    try {
      const resp = await axios.post(urls.grades, {
        professor_email: professorEmail,
        aluno_id: alunoId,
      });
      setGradesByAluno((prev) => ({
        ...prev,
        [alunoId]: resp.data.success ? resp.data.grades : [],
      }));
    } catch {
      setGradesByAluno((prev) => ({ ...prev, [alunoId]: [] }));
    }
  };

  // — loading inicial —
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator animating size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  // — erro de carregamento —
  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ color: colors.error, marginBottom: 16 }}>{error}</Text>
        <IconButton
          icon={getIconComponent("refresh")}
          size={36}
          onPress={fetchAll}
        />
      </SafeAreaView>
    );
  }

  // — render da lista de turmas e alunos —
  return (
    <>
      <StatusBar backgroundColor={"#ffffff"} barStyle="#ffffff" />
      <View
        style={{
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop:
            Platform.OS === "web" ? 40 : StatusBar.currentHeight || 20,
          paddingHorizontal: 10,
          paddingBottom: 10,
          position: "absolute",
          top: 0,
          zIndex: 10,
          backgroundColor: "white",
          borderBottomWidth: 1,
          borderBottomColor: "#ddd",
        }}
      >
        <TouchableOpacity
          onPress={() => {
            navigation.goBack();
          }}
          style={{ flex: 1 }}
        >
          <Image
            source={require("../../assets/icons/angle-left.png")}
            style={{
              width: Platform.OS === "web" ? 35 : 23,
              height: Platform.OS === "web" ? 35 : 25,
              marginLeft: 3,
              marginTop: Platform.OS === "web" ? -15 : 3,
              tintColor: "#000",
            }}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setAccountModalVisible(true)}
          style={{ flex: 1, alignItems: "flex-end" }}
        >
          <Image
            source={require("../../assets/icons/user.png")}
            style={{
              width: Platform.OS === "web" ? 30 : 25,
              height: Platform.OS === "web" ? 30 : 25,
              marginTop: Platform.OS === "web" ? -5 : 3,
              tintColor: "#000",
            }}
          />
        </TouchableOpacity>
      </View>
      <SafeAreaView style={styles.container}>
        <FlatList
          data={turmas}
          keyExtractor={(t) => t.id.toString()}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          renderItem={({ item: turma }) => (
            <Card style={styles.card} elevation={2}>
              <List.Accordion
                title={`Turma ${turma.ano}º ${turma.turma}`}
                description={`${turma.students.length} aluno(s)`}
                expanded={expandedTurma === turma.id}
                onPress={() =>
                  setExpandedTurma(expandedTurma === turma.id ? null : turma.id)
                }
                right={() => null}
              >
                <Divider />
                {turma.students.map((aluno) => (
                  <List.Accordion
                    key={aluno.id}
                    title={aluno.email}
                    expanded={expandedAluno === aluno.id}
                    onPress={async () => {
                      const willExpand = expandedAluno !== aluno.id;
                      setExpandedAluno(willExpand ? aluno.id : null);
                      if (willExpand) await loadGrades(aluno.id);
                    }}
                    left={getIconComponent("school")}
                    right={() => null}
                  >
                    {gradesByAluno[aluno.id] === undefined ? (
                      <ActivityIndicator style={styles.innerLoader} />
                    ) : gradesByAluno[aluno.id].length > 0 ? (
                      gradesByAluno[aluno.id].map((g) => (
                        <View key={g.id} style={styles.gradeRow}>
                          <Text style={styles.gradeDisc}>
                            {g.disciplina} ({g.modulo})
                          </Text>
                          <Text style={styles.gradeNota}>Nota: {g.nota}</Text>
                          <Text style={styles.gradeDate}>
                            {new Date(g.data_lancamento).toLocaleDateString()}
                          </Text>
                          <Divider style={{ marginVertical: 6 }} />
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noGrades}>Sem notas registradas</Text>
                    )}
                  </List.Accordion>
                ))}
              </List.Accordion>
            </Card>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          contentContainerStyle={{ padding: 16 }}
        />
      </SafeAreaView>
      <ModalConfig
        visible={accountModalVisible}
        dynamicHeaderBackground="white"
        dynamicTextColor="black"
        onClose={() => setAccountModalVisible(false)}
        navigation={navigation}
        email={professorEmail}
      />
    </>
  );
}

export default function WrappedScreen(props: any) {
  return (
    <PaperProvider theme={theme}>
      <AlunosDoProfScreen {...props} />
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fdfdfd", marginTop: 70 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: { borderRadius: 8 },
  innerLoader: { margin: 12 },
  gradeRow: { paddingHorizontal: 16 },
  gradeDisc: { fontSize: 14, fontWeight: "600" },
  gradeNota: { fontSize: 14, marginTop: 2 },
  gradeDate: { fontSize: 12, color: "#666", marginTop: 2 },
  noGrades: { padding: 16, fontStyle: "italic", color: "#888" },
});
