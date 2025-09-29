import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  ImageBackground,
  StatusBar,
  Platform,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from "react-native";
import { useTheme, Card } from "react-native-paper";
import config from "../../config/config_db";
import ModalConfig from "../../components/modalConfig";
import * as SecureStore from "expo-secure-store";

const ConfirmacoesScreen = ({ navigation, route }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [backgroundUrl, setBackgroundUrl] = useState(null);
  const [userTheme, setUserTheme] = useState(theme.dark ? "dark" : "light");
  const [alunos, setAlunos] = useState([]);
  const [modalContaVisivel, setModalContaVisivel] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "", type: "" });

  const showToast = useCallback((message, type) => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast({ visible: false, message: "", type: "" }), 2000);
  }, []);

  // carregar preferências de tema/background
  useEffect(() => {
    (async () => {
      try {
        let bg, mode;
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
      } catch (err) {
        console.error("Erro carregando configurações", err);
      }
    })();
  }, []);

  // buscar alunos pendentes
  const fetchPendentes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${config.baseUrl}/adminFiles/aboutStudents/fetchAlunosPendentes.php`
      );
      const json = await res.json();
      if (json.success) {
        setAlunos(json.alunos);
      } else {
        showToast(json.message || "Erro ao carregar alunos", "error");
      }
    } catch (err) {
      console.error("fetchPendentes", err);
      showToast("Falha ao procurar os alunos", "error");
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchPendentes();
  }, [fetchPendentes]);

  const confirmAluno = async (id) => {
    try {
      const res = await fetch(
        `${config.baseUrl}/adminFiles/aboutStudents/confirmAluno.php`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        }
      );
      const json = await res.json();
      if (json.success) {
        showToast("Aluno confirmado", "success");
        fetchPendentes();
      } else showToast(json.message, "error");
    } catch (err) {
      console.error("confirmAluno", err);
      showToast("Erro ao confirmar aluno", "error");
    }
  };

  const deleteAluno = async (id) => {
    try {
      const res = await fetch(
        `${config.baseUrl}/adminFiles/aboutStudents/deleteAluno.php`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        }
      );
      const json = await res.json();
      if (json.success) {
        showToast("Aluno removido", "success");
        fetchPendentes();
      } else showToast(json.message, "error");
    } catch (err) {
      console.error("deleteAluno", err);
      showToast("Erro ao remover aluno", "error");
    }
  };

  const boxBg = userTheme === "dark" ? "#1e1e1e" : "#fff";
  const textColor = userTheme === "dark" ? "#fff" : "#000";

  const renderItem = ({ item }) => (
    <Card style={[styles.card, { backgroundColor: boxBg }]}>
      <View style={styles.cardContent}>
        <View style={styles.infoBox}>
          <Text
            style={[styles.emailText, { color: textColor }]}
            numberOfLines={1}
          >
            {item.email}
          </Text>
        </View>
        <View style={styles.actionsBox}>
          <TouchableOpacity onPress={() => confirmAluno(item.id)}>
            <Image
              source={require("../../assets/icons/check.png")}
              style={styles.iconAction}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteAluno(item.id)}>
            <Image
              source={require("../../assets/icons/cross.png")}
              style={styles.iconAction}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );

  return (
    <ImageBackground
      source={
        backgroundUrl
          ? { uri: backgroundUrl }
          : require("../../assets/images/bg1.jpg")
      }
      style={styles.bgImage}
      resizeMode="cover"
    >
      {userTheme === "dark" && <View style={styles.darkOverlay} />}
      <StatusBar
        backgroundColor={userTheme === "dark" ? "#000000" : "#ffffff"}
        translucent
        barStyle={userTheme === "dark" ? "light-content" : "dark-content"}
      />


      {toast.visible && (
        <View
          style={[
            styles.toast,
            toast.type === "success" ? styles.toastSuccess : styles.toastError,
          ]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

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
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ flex: 1 }}
        >
          <Image
            source={require("../../assets/icons/angle-left.png")}
            style={{
              width: Platform.OS === "web" ? 35 : 23,
              height: Platform.OS === "web" ? 35 : 25,
              marginLeft: 3,
              marginTop: Platform.OS === "web" ? -15 : 3,
              tintColor: userTheme === "dark" ? "#FFFFFF" : "#000",
            }}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setModalContaVisivel(true)}
          style={{ flex: 1, alignItems: "flex-end" }}
        >
          <Image
            source={require("../../assets/icons/user.png")}
            style={{
              width: Platform.OS === "web" ? 30 : 25,
              height: Platform.OS === "web" ? 30 : 25,
              marginTop: Platform.OS === "web" ? -5 : 3,
              tintColor: userTheme === "dark" ? "#FFFFFF" : "#000",
            }}
          />
        </TouchableOpacity>
      </View>
      <SafeAreaView style={styles.listContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#47AD4D" />
        ) : (
          <FlatList
            data={alunos}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={alunos.length === 0 && styles.emptyContainer}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: textColor }]}>
                Nenhum aluno pendente.
              </Text>
            }
          />
        )}
      </SafeAreaView>

      <ModalConfig
        visible={modalContaVisivel}
        dynamicHeaderBackground={boxBg}
        dynamicTextColor={textColor}
        onClose={() => setModalContaVisivel(false)}
        navigation={navigation}
        email={route.params.email}
      />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bgImage: { flex: 1 },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  headerIcon: { width: 28, height: 28, tintColor: "#000" },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginTop: 90,
  },
  card: { marginVertical: 8, borderRadius: 10, elevation: 4 },
  cardContent: { flexDirection: "row", alignItems: "center", padding: 12 },
  infoBox: { flex: 1, marginRight: 12 },
  emailText: { fontSize: 16, fontWeight: "500" },
  actionsBox: { flexDirection: "row" },
  iconAction: { width: 24, height: 24, marginHorizontal: 8 },
  toast: {
    position: "absolute",
    top: Platform.OS === "web" ? 50 : 80,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    zIndex: 20,
  },
  toastText: { color: "#fff", fontSize: 14 },
  toastSuccess: { backgroundColor: "#47AD4D" },
  toastError: { backgroundColor: "#D32F2F" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 16 },
});

export default ConfirmacoesScreen;
