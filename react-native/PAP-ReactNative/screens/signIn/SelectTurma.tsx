import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  ImageBackground,
  Platform,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
} from "react-native";
import { Button, RadioButton, HelperText } from "react-native-paper";
import config from "../../config/config_db";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "../../types";

type Turma = { id: number; turma: string };

let ToastAndroid: any = null;
if (Platform.OS === "android") {
  // Só importa ToastAndroid no Android
  ToastAndroid = require("react-native").ToastAndroid;
}

function showMessage(msg: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(msg, ToastAndroid.LONG);
  } else {
    Alert.alert("", msg);
  }
}

const SelectTurmaScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "SelectTurma">>();
  const { email, initialMessage = "" } = route.params;

  const url_fetchTurmas = `${config.baseUrl}/signInFiles/fetchTurmas.php`;
  const url_saveTurmas = `${config.baseUrl}/signInFiles/saveSelectedTurma.php`;

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [success, setSuccess] = useState<string>(initialMessage);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (initialMessage) {
      setSuccess(initialMessage);
      setTimeout(() => setSuccess(""), 2000);
    }
  }, [initialMessage]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(url_fetchTurmas);
        const text = await res.text();
        const json = JSON.parse(text);
        if (json.success) {
          if (isMounted) setTurmas(json.turmas);
        } else {
          showMessage(json.message);
        }
      } catch {
        showMessage("Ocorreu um erro de conexão. Tente novamente mais tarde.");
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async () => {
    if (selectedId === null) {
      setErrorMessage("Selecione uma turma antes de avançar.");
      return;
    }
    setErrorMessage("");
    setLoading(true);

    try {
      const res = await fetch(url_saveTurmas, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turma_id: selectedId }),
      });
      const text = await res.text();
      const json = JSON.parse(text);

      if (json.success) {
        const mensagem =
          "A sua turma foi selecionada com sucesso! Você agora vai precisar da aprovação de um administrador.";
        if (Platform.OS === "web") {
          window.alert(mensagem);
        } else {
          showMessage(mensagem);
        }
        navigation.navigate("Login");
      } else {
        showMessage(
          json.message ||
            "Ocorreu um erro enquanto o tentavamos conectar aos nossos servidores. Tente novamente mais tarde."
        );
      }
    } catch {
      showMessage(
        "Ocorreu um erro enquanto o tentavamos conectar aos nossos servidores. Tente novamente mais tarde."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ImageBackground
        source={require("../../assets/images/bg1.jpg")}
        style={styles.bg}
      >
        <ActivityIndicator size="large" color="#47AD4D" />
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require("../../assets/images/bg1.jpg")}
      style={styles.bg}
    >
      <StatusBar barStyle="#000000" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        {success !== "" && (
          <View style={styles.toastContainer}>
            <View style={styles.toastBox}>
              <Text style={styles.toastText}>{success}</Text>
            </View>
          </View>
        )}
        <View style={styles.box}>
          <Text style={styles.title}>Selecione sua Turma (10º Ano)</Text>

          {errorMessage ? (
            <HelperText type="error" visible style={styles.errorText}>
              {errorMessage}
            </HelperText>
          ) : null}

          <RadioButton.Group
            onValueChange={(v) => setSelectedId(Number(v))}
            value={selectedId?.toString()}
          >
            <ScrollView style={styles.list}>
              {turmas.map((t) => (
                <View key={t.id} style={styles.item}>
                  <RadioButton value={t.id.toString()} />
                  <Text style={styles.itemText}>Turma {t.turma}</Text>
                </View>
              ))}
            </ScrollView>
          </RadioButton.Group>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            Confirmar
          </Button>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    width: "100%",
    padding: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  title: {
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "bold",
    color: "#333",
  },
  list: {
    maxHeight: 200,
    marginBottom: 20,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  itemText: {
    fontSize: 16,
    color: "#333",
  },
  button: {
    width: "100%",
    marginTop: 8,
    backgroundColor: "#47AD4D",
  },
  buttonLabel: {
    color: "#fff",
  },
  errorText: {
    color: "#B00020",
    marginBottom: 8,
  },
  toastContainer: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    alignItems: "center",
    zIndex: 10,
  },
  toastBox: {
    backgroundColor: "#47AD4D",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  toastText: {
    color: "#FFF",
    fontSize: 14,
    textAlign: "center",
  },
});

export default SelectTurmaScreen;
