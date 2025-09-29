import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  Platform,
  ImageBackground,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { TextInput, Button, HelperText } from "react-native-paper";
import { useNavigation, useRoute } from "@react-navigation/native";
import axios from "axios";
import config from "../../config/config_db";

let ToastAndroid: any = null;
if (Platform.OS === "android") {
  // Só importa ToastAndroid no Android
  ToastAndroid = require("react-native").ToastAndroid;
}

const VerificationScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const email: string = route.params?.email || "";

  const url = `${config.baseUrl}/loginFiles/sendVerificationCode.php`;
  const url_validateCode = `${config.baseUrl}/loginFiles/verifyCode.php`;

  const [verificationCode, setVerificationCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startResendTimer = () => {
    setResendTimer(60);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendCode = useCallback(async () => {
    if (sendingCode || resendTimer > 0) return;
    setSendingCode(true);
    setErrorMessage("");
    try {
      const response = await axios.post(
        url,
        { email },
        { headers: { "Content-Type": "application/json" } }
      );
      if (response.data.success) {
        startResendTimer();
      } else {
        setErrorMessage(
          response.data.message ||
            "Ocorreu um erro da nossa parte ao tentar enviar o código para o seu email. Pedimos que tente novamente mais tarde."
        );
      }
    } catch {
      setErrorMessage(
        "Ocorreu um erro enquanto o tentavamos conectar aos nossos servidores. Pedimos que tente novamente mais tarde."
      );
    } finally {
      setSendingCode(false);
    }
  }, [email, sendingCode, resendTimer]);

  useEffect(() => {
    if (email) sendCode();
  }, [email, sendCode]);

  const handleVerify = async () => {
    if (!verificationCode.trim()) {
      setErrorMessage(
        "Por favor, para a sua segurança pedimos que insira o código de verificação."
      );
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        url_validateCode,
        { email, code: verificationCode },
        { headers: { "Content-Type": "application/json" } }
      );
      if (response.data.success) {
        if (Platform.OS !== "web") {
          ToastAndroid.show(
            "Código verificado com sucesso!",
            ToastAndroid.LONG
          );
          navigation.replace("InsertPasswordScreen", { email });
        } else {
          window.alert("Código verificado com sucesso!");
          navigation.replace("InsertPasswordScreen", { email });
        }
      } else {
        setErrorMessage(
          response.data.message ||
            "O código que inseriu não é o mesmo que foi enviado para o seu email."
        );
      }
    } catch {
      setErrorMessage(
        "Ocorreu um erro enquanto o tentavamos conectar aos nossos servidores. Pedimos que tente novamente mais tarde."
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
          <ScrollView contentContainerStyle={styles.form}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "#000",
                textAlign: "center",
              }}
            >
              Verificação adicional
            </Text>
            <Text style={styles.subtitle}>
              Para a sua segurança enviamos um código para:{"\n"}
              <Text style={{ fontWeight: "bold", marginBottom: 20 }}>
                {email}
              </Text>
            </Text>
            <TextInput
              label="Código de Verificação"
              value={verificationCode}
              onChangeText={setVerificationCode}
              mode="outlined"
              keyboardType="numeric"
              style={styles.input}
              theme={{
                colors: {
                  primary: "#47AD4D",
                  background: "#fff",
                  text: "#000",
                },
              }}
            />
            {errorMessage ? (
              <HelperText type="error" visible style={styles.errorText}>
                {errorMessage}
              </HelperText>
            ) : null}
            <Button
              mode="contained"
              onPress={handleVerify}
              style={styles.submitButton}
              labelStyle={{ color: "#fff" }}
              disabled={loading}
            >
              Confirmar Código
            </Button>
            <Button
              mode="outlined"
              onPress={sendCode}
              style={styles.resendButton}
              labelStyle={{ color: "#47AD4D" }}
              disabled={resendTimer > 0 || sendingCode}
            >
              {resendTimer > 0
                ? `Reenviar em ${resendTimer}s`
                : "Reenviar Código"}
            </Button>
            <Button
              mode="text"
              onPress={() => navigation.navigate("Login")}
              style={styles.link}
              labelStyle={{ color: "#47AD4D" }}
            >
              Voltar
            </Button>
          </ScrollView>
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
  form: {
    width: "100%",
  },
  subtitle: {
    marginTop: 8,
    textAlign: "center",
    color: "#333",
  },
  input: {
    width: "100%",
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  submitButton: {
    width: "100%",
    marginTop: 12,
    backgroundColor: "#47AD4D",
  },
  resendButton: {
    width: "100%",
    marginTop: 8,
    borderColor: "#47AD4D",
  },
  errorText: {
    color: "#B00020",
    marginBottom: 4,
  },
  backButton: {
    marginTop: 16,
    alignSelf: "center",
  },
  link: {
    textAlign: "center",
    marginTop: 8,
  },
});

export default VerificationScreen;
