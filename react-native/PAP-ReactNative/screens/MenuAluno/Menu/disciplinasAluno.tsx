import React, { useState, useEffect, useCallback } from "react";
import { SafeAreaView, StyleSheet, FlatList, ActivityIndicator, RefreshControl, View, TouchableOpacity, Image, Platform, StatusBar, Dimensions,} from "react-native";
import { Text, Card, Title } from "react-native-paper";
import axios from "axios";
import config from "../../../config/config_db";
import ModalConfig from "../../../components/modalConfig";

const HEADER_PADDING_TOP = 20;
const isWeb = Platform.OS === 'web';
const numColumns = isWeb ? 2 : 1;
const itemWidth = isWeb ? '42%' : '100%';
const ITEM_HEIGHT = Dimensions.get("window").height * 0.25;

const DisciplinasDoAlunoScreen = ({ route, navigation }) => {
  const [email] = useState(route?.params?.email || "");
  const [alunoData, setAlunoData] = useState(null);
  const [availableDisciplinas, setAvailableDisciplinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  const url_fetchAluno = `${config.baseUrl}/alunoFiles/fetchDisciplinasAluno.php`;

  const fetchAlunoInfo = useCallback(async () => {
    try {
      const response = await axios.post(url_fetchAluno, { email });
      if (response.data.success) {
        setAlunoData(response.data.aluno);
        setAvailableDisciplinas(response.data.disciplinas_professores);
        setError(null);
      } else {
        setError(response.data.message || "Erro ao buscar dados do aluno");
      }
    } catch (err) {
      setError("Erro na conexão com a base de dados (aluno)");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [email, url_fetchAluno]);

  useEffect(() => {
    fetchAlunoInfo();
  }, [fetchAlunoInfo]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlunoInfo();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#47AD4D" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
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

      <SafeAreaView style={styles.container}>
        {availableDisciplinas.length > 0 ? (
    <FlatList
      data={availableDisciplinas}
      keyExtractor={item => item.disciplina_id.toString()}
      numColumns={numColumns}
      contentContainerStyle={styles.listContent}
      // só aplica espaçamento em colunas quando houver realmente 2 colunas
      columnWrapperStyle={isWeb ? styles.row : undefined}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#47AD4D"
                />
              }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.itemBox,
                  {
                    width: itemWidth,
                    // só aplica height no web; no mobile fica auto
                    ...(isWeb
                      ? { height: ITEM_HEIGHT }
                      : {}
                    ),
                  },
                ]}
                onPress={() =>
                  navigation.navigate("NotasDisciplina", {
                    email: alunoData.email,
                    emailprof: item.professor_email,
                    disciplina_id: item.disciplina_id,
                    disciplina_nome: item.disciplina_nome,
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`Abrir ${item.disciplina_nome}`}
              >
                <Card
                  style={[
                    styles.smallerCard,
                    // remove qualquer altura fixa no mobile
                    !isWeb && { height: undefined },
                  ]}
                >
                  <Card.Content style={styles.cardContent}>
                    <Title style={styles.itemTitle}>
                      {item.disciplina_nome}
                    </Title>
                    <Text style={styles.infoText}>
                      {item.professor_email}
                    </Text>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            )}
          />
        ) : (
          <View style={styles.centerContainer}>
            <Text style={styles.infoText}>Nenhuma disciplina disponível.</Text>
            <TouchableOpacity onPress={onRefresh} style={{ marginTop: 16 }}>
              <Text style={{ color: "#47AD4D", fontWeight: "bold" }}>
                Tentar novamente
              </Text>
            </TouchableOpacity>
          </View>
        )}            
      </SafeAreaView>

      <ModalConfig
        visible={accountModalVisible}
        dynamicHeaderBackground="white"
        dynamicTextColor="black"
        onClose={() => setAccountModalVisible(false)}
        navigation={navigation}
        email={email}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop:
      Platform.OS === "web" ? 80 : HEADER_PADDING_TOP + 35,
    },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    padding: 16,
  },
  errorText: {
    fontSize: 18,
    color: "red",
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  row: {  
    justifyContent: "space-between",
    marginBottom: 8,
  },
  itemBox: {
       alignItems: "center",
       marginVertical: 8,    // espaçamento uniforme em cima/baixo
     },
  smallerCard: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    elevation: 2,
    backgroundColor: "#fff",
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
    color: "#47AD4D",
  },
  infoText: {
    fontSize: 14,
    textAlign: "center",
    color: "#333",
  },
});

export default DisciplinasDoAlunoScreen;