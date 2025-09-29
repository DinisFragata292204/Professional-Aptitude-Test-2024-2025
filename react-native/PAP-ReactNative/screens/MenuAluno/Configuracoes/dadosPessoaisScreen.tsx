import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  ImageBackground,
  Platform,
  TouchableOpacity,
  Image
} from "react-native";
import { Text, List, useTheme } from "react-native-paper";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import config from "../../../config/config_db";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import ModalConfig from "../../../components/modalConfig";

type RootStackParamList = {
  ProximosEventos: { email: string };
};

type PersonalDataScreenRouteProp = RouteProp<RootStackParamList, "ProximosEventos">;

const PersonalDataScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<PersonalDataScreenRouteProp>();
  const { email } = route.params;

  const url = `${config.baseUrl}/calendarioFiles/personalData/fetch_user_data.php`;

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [userTheme, setUserTheme] = useState<"light" | "dark">(theme.dark ? "dark" : "light");
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await axios.get(url, { params: { email } });
        if (response.data?.success) {
          // Aqui userData.professorData.disciplina já é o NOME da disciplina
          setUserData(response.data.user);
        } else {
          console.log("Erro ao procurar dados do utilizador:", response.data);
        }
      } catch (error) {
        console.error("Erro na requisição:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [email]);

  useEffect(() => {
    const loadSettings = async () => {
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
      } catch (error) {
        console.log("Erro ao carregar configurações.", error);
      }
    };
    loadSettings();
  }, []);

  const getLeftIcon = (iconName: string) => {
    if (Platform.OS === "web") return undefined;
    return (props: any) => <List.Icon {...props} icon={iconName} color="#47AD4D" />;
  };

  if (loading) {
    return (
      <ImageBackground
        source={
          backgroundUrl
            ? { uri: backgroundUrl }
            : require("../../../assets/images/bg1.jpg")
        }
        style={styles.flexCenter}
      >
        {userTheme === "dark" && <View style={styles.darkOverlay} />}
        <ActivityIndicator size="large" color="#47AD4D" />
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={
        backgroundUrl
          ? { uri: backgroundUrl }
          : require("../../../assets/images/bg1.jpg")
      }
      style={styles.flexCenter}
    >
      {userTheme === "dark" && <View style={styles.darkOverlay} pointerEvents="none" />}

      {/* Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flex: 1 }}>
          <Image
            source={require("../../../assets/icons/angle-left.png")}
            style={[
              styles.icon,
              {
                tintColor: userTheme === "dark" ? "#FFF" : "#000",
                width: Platform.OS === "web" ? 35 : 23,
                height: Platform.OS === "web" ? 35 : 25,
              }
            ]}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setAccountModalVisible(true)}
          style={{ flex: 1, alignItems: "flex-end" }}
        >
          <Image
            source={require("../../../assets/icons/user.png")}
            style={[
              styles.icon,
              {
                tintColor: userTheme === "dark" ? "#FFF" : "#000",
                width: Platform.OS === "web" ? 30 : 25,
                height: Platform.OS === "web" ? 30 : 25,
              }
            ]}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.box}>
        <List.Section>
          {/* Email, Cargo, Data de Criação */}
          <List.Item
            title="Email"
            description={userData.email || "-"}
            left={getLeftIcon("email")}
          />
          <List.Item
            title="Cargo"
            description={
              userData.cargoUtilizador
                ? userData.cargoUtilizador.charAt(0).toUpperCase() +
                  userData.cargoUtilizador.slice(1)
                : "-"
            }
            left={getLeftIcon("account")}
          />
          <List.Item
            title="Data de Criação"
            description={userData.data_criacao || "-"}
            left={getLeftIcon("calendar")}
          />

          {/* Se for aluno, mostra turma e ano */}
          {userData.cargoUtilizador.toLowerCase() === "aluno" &&
            userData.alunoData && (
              <>
                <List.Item
                  title="Turma"
                  description={userData.alunoData.turma}
                  left={getLeftIcon("school")}
                />
                <List.Item
                  title="Ano"
                  description={String(userData.alunoData.ano)}
                  left={getLeftIcon("calendar")}
                />
              </>
            )}

          {/* Se for professor, mostra NOME da disciplina e turmas */}
          {userData.cargoUtilizador.toLowerCase() === "professor" &&
            userData.professorData && (
              <>
                <List.Item
                  title="Disciplina"
                  description={userData.professorData.disciplina || "-"}
                  left={getLeftIcon("book")}
                />
                <List.Subheader style={styles.subheader}>
                  Turmas
                </List.Subheader>
                {userData.professorData.turmas.map(
                  (turma: any, idx: number) => (
                    <List.Item
                      key={idx}
                      title={`Turma: ${turma.turma}`}
                      description={`Ano: ${turma.ano}`}
                      left={getLeftIcon("school")}
                    />
                  )
                )}
              </>
            )}
        </List.Section>
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
  );
};

const styles = StyleSheet.create({
  flexCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  headerContainer: {
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
  },
  icon: {
    marginLeft: 3,
    marginTop: 3,
  },
  box: {
    backgroundColor: "#FFF",
    margin: 20,
    borderRadius: 15,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  subheader: {
    fontWeight: "bold",
  },
});

export default PersonalDataScreen;