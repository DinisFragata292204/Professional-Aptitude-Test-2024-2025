import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Modal,
  ImageBackground,
  Image,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from "react-native";
import { TextInput, Button, HelperText } from "react-native-paper";
import { useNavigation, useRoute } from "@react-navigation/native";
import axios from "axios";
import config from "../../config/config_db";

const InsertPasswordScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const email: string = route.params?.email || "";

  const urlUpdatePassword = `${config.baseUrl}/loginFiles/updatePassword.php`;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const validatePassword = () => {
    if (password.length < 6) {
      setErrorMessage(
        "Para a sua segurança pedimos que a palavra-passe tenha pelo menos 6 caracteres."
      );
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMessage("As palavras-passes não coincidem.");
      return false;
    }
    setErrorMessage("");
    return true;
  };

  const handleSubmit = async () => {
    if (!validatePassword()) return;

    setLoading(true);
    try {
      const res = await axios.post(urlUpdatePassword, {
        email,
        newPassword: password,
      });
      if (res.data.success) {
        const role = res.data.userRole;
        if (role === "aluno" && !res.data.studentDetailsComplete) {
          setLoading(false);
          return;
        }
        const successMessage =
          "A sua palavra-passe foi criada. Agora, faça login com a nova palavra‑passe.";
        if (Platform.OS === "web") {
          window.alert(successMessage);
          navigation.replace("Login");
        } else {
          Alert.alert("Sucesso!", successMessage, [
            { text: "OK", onPress: () => navigation.replace("Login") },
          ]);
        }
      } else {
        setErrorMessage(
          res.data.message ||
            "Ocorreu um problema enquanto tentavamos atualizar a sua palavra-passe."
        );
      }
    } catch {
      setErrorMessage(
        "Ocorreu um problema enquanto tentavamos conectar aos nossos servidores. Pedimos que tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ImageBackground
        source={require("../../assets/images/bg1.jpg")}
        style={styles.background}
      >
        <ActivityIndicator size="large" color="#47AD4D" />
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require("../../assets/images/bg1.jpg")}
      style={styles.background}
    >
      <StatusBar barStyle="#000000" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <View style={[styles.box, { backgroundColor: "#FFFFFF" }]}>
          <View style={styles.headerRow}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "#000",
                textAlign: "center",
              }}
            >
              Nova Palavra‑Passe
            </Text>
            <View style={{ width: 60 }} />
          </View>
          <TextInput
            label="Nova Palavra‑Passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!isPasswordVisible}
            mode="outlined"
            style={styles.input}
            theme={{
              colors: { primary: "#47AD4D", background: "#fff", text: "#000" },
            }}
            right={
              <TextInput.Icon
                icon={() => (
                  <TouchableOpacity
                    onPress={() => setIsPasswordVisible((v) => !v)}
                  >
                    <Image
                      source={
                        isPasswordVisible
                          ? require("../../assets/icons/eye-off.png")
                          : require("../../assets/icons/eye.png")
                      }
                      style={styles.iconStyle}
                    />
                  </TouchableOpacity>
                )}
              />
            }
          />
          <TextInput
            label="Confirmar Palavra‑Passe"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!isConfirmVisible}
            mode="outlined"
            style={[styles.input, { marginTop: 10 }]}
            theme={{
              colors: { primary: "#47AD4D", background: "#fff", text: "#000" },
            }}
            right={
              <TextInput.Icon
                icon={() => (
                  <TouchableOpacity
                    onPress={() => setIsConfirmVisible((v) => !v)}
                  >
                    <Image
                      source={
                        isConfirmVisible
                          ? require("../../assets/icons/eye-off.png")
                          : require("../../assets/icons/eye.png")
                      }
                      style={styles.iconStyle}
                    />
                  </TouchableOpacity>
                )}
              />
            }
          />
          {errorMessage ? (
            <HelperText type="error" visible style={styles.errorText}>
              {errorMessage}
            </HelperText>
          ) : null}
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.submitButton}
            labelStyle={{ color: "#fff" }}
          >
            Confirmar
          </Button>
          <Button
            mode="text"
            onPress={() => navigation.navigate("Login")}
            style={styles.link}
            labelStyle={{ color: "#47AD4D" }}
          >
            Voltar
          </Button>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, justifyContent: "center", alignItems: "center" },
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
    borderRadius: 12,
    padding: 24,
    elevation: 3,
    alignItems: "center",
  },
  headerRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontWeight: "bold",
    color: "#000",
  },
  input: {
    width: "100%",
    backgroundColor: "#fff",
  },
  submitButton: {
    width: "100%",
    marginTop: 16,
    backgroundColor: "#47AD4D",
  },
  errorText: {
    color: "#B00020",
    marginTop: 8,
  },
  link: {
    textAlign: "center",
    marginTop: 8,
  },
  iconStyle: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
});

export default InsertPasswordScreen;
