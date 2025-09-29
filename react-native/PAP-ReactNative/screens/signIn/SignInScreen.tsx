import config from "../../config/config_db";
import React, { useState } from "react";
import axios from "axios";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  StatusBar,
  ImageBackground,
  ActivityIndicator,
  Platform,
  Image,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import {
  Text,
  HelperText,
  TextInput,
  Button,
  Portal,
  Dialog,
  Paragraph,
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types";

let ToastAndroid: any = null;
if (Platform.OS === "android") {
  // Só importa ToastAndroid no Android
  ToastAndroid = require("react-native").ToastAndroid;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

const SignInScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const url_sendEmail = `${config.baseUrl}/signInFiles/sendEmail.php`;

  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);

  const handleSignIn = async () => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!email) {
      setErrorMessage("Pedimos que coloque o seu email no campo.");
      return;
    } else if (!email.includes("@etps.com.pt")) {
      setErrorMessage("Pedimos insira o seu email da escola.");
      return;
    } else if (email.length < 6) {
      setErrorMessage(
        "Para a sua segurança pedimos, insira um email com mais de 6 caracteres."
      );
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        url_sendEmail,
        { email },
        { headers: { "Content-Type": "application/json" } }
      );
      const data = response.data;
      if (data.success) {
        const msg =
          "Enviamos um código de 6 digitos para o seu email, por isso, para ativar a conta insira-o no campo abaixo!";
        if (Platform.OS === "android") {
          ToastAndroid.show(msg, ToastAndroid.LONG);
        } else if (Platform.OS === "web") {
          setSuccessMessage(msg);
          setTimeout(() => setSuccessMessage(""), 5000);
        }
        navigation.navigate("VerifyCode", { email, initialMessage: msg });
      } else {
        setErrorMessage(
          data.message ||
            "Ocorreu um erro da nossa parte, pedimos que tente criar uma conta novamente mais tarde."
        );
        if (data.message === "O email já existe.") {
          setErrorMessage(
            "O seu email já existe na nossa base de dados! Por isso pedimos que inicie sessão."
          );
          if (Platform.OS === "android") {
            ToastAndroid.show(
              "O seu email já existe na nossa base de dados! Por isso pedimos que inicie sessão.",
              ToastAndroid.LONG
            );
          } else if (Platform.OS === "web") {
            setErrorMessage(
              "O seu email já existe na nossa base de dados! Por isso pedimos que inicie sessão."
            );
            setTimeout(() => setErrorMessage(""), 5000);
          }
          navigation.navigate("Login");
        }
      }
    } catch {
      setErrorMessage(
        "Ocorreu um problem nos nossos servidores enquanto tentavamos criar uma conta para si. Pedimos que tente novamente mais tarde."
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
        <View style={styles.box}>
          <TouchableOpacity onPress={() => setInfoVisible(true)}>
            <Image
              source={require("../../assets/icons/info.png")}
              style={styles.infoIcon}
            />
          </TouchableOpacity>

          <Text variant="headlineMedium" style={styles.title}>
            Criar uma conta
          </Text>

          {errorMessage ? (
            <HelperText type="error" visible style={styles.errorText}>
              {errorMessage}
            </HelperText>
          ) : null}
          {successMessage ? (
            <HelperText type="info" visible style={styles.successText}>
              {successMessage}
            </HelperText>
          ) : null}

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            mode="outlined"
            style={styles.input}
            outlineColor="#47AD4D"
            activeOutlineColor="#47AD4D"
          />
          <Button
            mode="contained"
            onPress={handleSignIn}
            style={styles.registrarButton}
            labelStyle={{ color: "#fff" }}
          >
            Enviar email
          </Button>
          <Button
            mode="text"
            onPress={() => navigation.navigate("Login")}
            style={styles.link}
            labelStyle={{ color: "#47AD4D" }}
          >
            Já tem conta? Iniciar sessão
          </Button>
        </View>
      </KeyboardAvoidingView>

      {/* Dialog de informações */}
      <Portal>
        <Dialog
          visible={infoVisible}
          onDismiss={() => setInfoVisible(false)}
          style={Platform.OS === "web" ? styles.webDialog : undefined}
        >
          <Dialog.Title>O que pode fazer aqui?</Dialog.Title>
          <Dialog.Content>
            <ScrollView
              style={Platform.OS === "web" ? styles.webScroll : undefined}
            >
              <Paragraph>Aqui pode:</Paragraph>
              <Paragraph>
                • Criar uma conta de aluno que ficará pendente de aprovação de
                um administrador.
              </Paragraph>
              <Paragraph>
                • Ter uma conta com o seu email da escola, colocando a sua
                palavra-passe e colocando a sua turma, tendo em conta que ficará
                automáticamente como 10º e a turma que escolher.
              </Paragraph>
            </ScrollView>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setInfoVisible(false)}>OK</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    position: "relative",
    borderRadius: 12,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    elevation: 3,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    alignItems: "center",
  },
  infoIcon: {
    position: "absolute",
    top: -10,
    right: -150,
    width: 24,
    height: 24,
  },
  title: {
    marginBottom: 16,
    fontWeight: "bold",
    color: "#333",
  },
  input: {
    backgroundColor: "#fff",
    width: "100%",
    marginBottom: 10,
  },
  registrarButton: {
    width: "100%",
    marginBottom: 8,
    backgroundColor: "#47AD4D",
  },
  link: {
    textAlign: "center",
    marginTop: 8,
  },
  successText: {
    color: "green",
  },
  errorText: {
    color: "red",
  },
  webDialog: {
    left: "35%",
    width: "80%",
    maxWidth: 400,
  },
  webScroll: {
    maxHeight: 200,
  },
});

export default SignInScreen;
