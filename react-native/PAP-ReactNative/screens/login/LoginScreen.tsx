import config from "../../config/config_db";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { View, StyleSheet, KeyboardAvoidingView, StatusBar, ImageBackground, ActivityIndicator, Platform, Image, TouchableOpacity, ScrollView,} from "react-native";
import { Text, HelperText, TextInput, Button, Portal, Dialog, Paragraph,} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types";
import * as SecureStore from "expo-secure-store";

let ToastAndroid: any = null;
if (Platform.OS === "android") { ToastAndroid = require("react-native").ToastAndroid; }

type NavigationProp = StackNavigationProp<RootStackParamList>;

const LoginScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const loginUrl = `${config.baseUrl}/loginFiles/checkEmail.php`;
  const sendCodeUrl = `${config.baseUrl}/loginFiles/sendVerificationCode.php`;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [deviceType] = useState(Platform.OS);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [infoVisible, setInfoVisible] = useState(false);

  const togglePasswordVisibility = () =>
    setIsPasswordVisible(!isPasswordVisible);

  const displayError = (msg: string) => {
    setErrorMessage(msg);
    setMessage("");
    if (Platform.OS === "android") {
      ToastAndroid.show(msg, ToastAndroid.LONG);
    } else {
      alert(msg);
    }
  };

  const wallpaperImage = require("../../assets/images/bg1.jpg");
  const infoIcon = require("../../assets/icons/info.png");

  const handleLogin = async () => {
    setErrorMessage("");
    setMessage("");

    if (!email) {
      displayError("Por favor, pedimos que preencha pelo menos o seu email.");
      return;
    }
    if (!email.endsWith("@etps.com.pt")) {
      displayError("Pedimos que insira o seu email da escola.");
      return;
    }

    setLoading(true);
    try {
      if (!password) {
        const response = await axios.post(
          sendCodeUrl,
          { email },
          { headers: { "Content-Type": "application/json" } }
        );
        const data = response.data;
        if (data.success) {
          navigation.navigate("VerificationScreen", { email });
        } else {
          displayError(
            data.message ||
              "Não conseguimos enviar o código de verificação. O que pode indicar que já tenha uma palavra-passe."
          );
        }
      } else {
        const response = await axios.post(
          loginUrl,
          { email, password, deviceType },
          { headers: { "Content-Type": "application/json" } }
        );
        const data = response.data;
        if (data.success) {
          if (Platform.OS === "web") {
            localStorage.setItem("userToken", data.token);
            localStorage.setItem("email", data.email);
            localStorage.setItem("userRole", data.cargoUtilizador);
          } else {
            await SecureStore.setItemAsync("userToken", data.token);
            await SecureStore.setItemAsync("email", data.email);
            await SecureStore.setItemAsync("userRole", data.cargoUtilizador);
          }

          switch (data.cargoUtilizador) {
            case "aluno":
              navigation.navigate("Aluno", { email: data.email });
              break;
            case "professor":
              navigation.navigate("Professor", { email: data.email });
              break;
            case "admin":
              navigation.navigate("Administrador", { email: data.email });
              break;
            case "auxiliar":
              navigation.navigate("auxiliarScreen", { email: data.email });
              break;
          }
        } else if (data.estado === "pendente") {
          displayError(
            "Esta conta está pendente, para a ativar insira o código que enviamos para o seu email."
          );
        } else {
          displayError(
            data.message ||
              "Verifique se a palavra-passe está correta ou tente criar uma conta."
          );
        }
      }
    } catch {
      displayError(
        "Houve um problema da nossa parte, pedimos que tente novamente mais tarde."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <ImageBackground source={wallpaperImage} style={styles.background}>
        <ActivityIndicator size="large" color="#47AD4D" />
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={wallpaperImage} style={styles.background}>
      <StatusBar barStyle="#000000" backgroundColor="transparent" translucent />
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <View style={[styles.box, { backgroundColor: "#FFFFFF" }]}>
          <View style={styles.headerRow}>
            <Text variant="headlineMedium" style={styles.title}>
              Iniciar sessão
            </Text>
            <TouchableOpacity onPress={() => setInfoVisible(true)}>
              <Image source={infoIcon} style={styles.infoIcon} />
            </TouchableOpacity>
          </View>

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            mode="outlined"
            style={styles.input}
            placeholderTextColor="rgba(0,0,0,0.6)"
            theme={{
              colors: {
                primary: "#47AD4D",
                background: "#fff",
                text: "#000",
              },
            }}
          />
          <TextInput
            label="Palavra-passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!isPasswordVisible}
            mode="outlined"
            style={[styles.input, { marginTop: 10 }]}
            placeholderTextColor="rgba(0,0,0,0.6)"
            theme={{
              colors: {
                primary: "#47AD4D",
                background: "#fff",
                text: "#000",
              },
            }}
            right={
              <TextInput.Icon
                icon={() => (
                  <TouchableOpacity onPress={togglePasswordVisibility}>
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
          <Button
            mode="contained"
            onPress={handleLogin}
            style={styles.loginButton}
            labelStyle={{ color: "#fff" }}
          >
            Iniciar sessão
          </Button>
          {errorMessage ? (
            <HelperText type="error" visible style={{ color: "#B00020" }}>
              {errorMessage}
            </HelperText>
          ) : null}
          {message ? (
            <HelperText type="info" visible style={{ color: "#B00020" }}>
              {message}
            </HelperText>
          ) : null}
          <Button
            mode="text"
            onPress={() => navigation.navigate("ForgetPasswordScreen")}
            labelStyle={{ color: "#47AD4D" }}
            style={styles.link}
          >
            Esqueci-me da palavra-passe
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.navigate("SignIn")}
            style={styles.signInButton}
            labelStyle={{ color: "#47AD4D" }}
          >
            Criar uma conta
          </Button>
        </View>
      </KeyboardAvoidingView>
      <Portal>
        <Dialog
          visible={infoVisible}
          onDismiss={() => setInfoVisible(false)}
          style={[
            { backgroundColor: "#fff" },
            Platform.OS === "web" ? styles.webDialog : undefined,
          ]}
        >
          <Dialog.Title>O que podes fazer aqui?</Dialog.Title>
          <Dialog.Content>
            <ScrollView
              style={Platform.OS === "web" ? styles.webScroll : undefined}
            >
              <Paragraph>Aqui podes:</Paragraph>
              <Paragraph>
                • Iniciar sessão utilizando o teu email da escola (@etps.com.pt)
                e a palavra‑passe que está associada.
              </Paragraph>
              <Paragraph>
                • Recuperar a palavra‑passe em “Esqueci‑me da palavra‑passe”.
              </Paragraph>
              <Paragraph>
                • Criar uma nova conta em “Criar uma conta”.
              </Paragraph>
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setInfoVisible(false)}
              labelStyle={{ color: "#47AD4D" }}
            >
              OK
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    padding: 16,
  },
  box: {
    borderRadius: 12,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    elevation: 3,
    alignItems: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  title: { fontWeight: "bold", color: "#000" },
  infoIcon: {
    width: 20,
    height: 20,
    resizeMode: "contain",
  },
  input: {
    width: "100%",
  },
  loginButton: {
    width: "100%",
    marginTop: 10,
    backgroundColor: "#47AD4D",
  },
  signInButton: {
    width: "100%",
    marginTop: 8,
    borderColor: "#47AD4D",
  },
  link: {
    textAlign: "center",
    marginTop: 8,
  },
  loaderContainer: {
    borderRadius: 12,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    elevation: 3,
    backgroundColor: "white",
    alignItems: "center",
  },
  iconStyle: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  webDialog: {
    marginHorizontal: 20,
  },
  webScroll: {
    maxHeight: 200,
  },
});

export default LoginScreen;
