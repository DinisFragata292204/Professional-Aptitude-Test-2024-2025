import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  SafeAreaView,
  Platform,
  StatusBar
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";
import config from "../../../config/config_db";
import ModalConfig from "../../../components/modalConfig";

let ToastAndroid: any = null;
if (Platform.OS === "android") {
  // Só importa ToastAndroid no Android
  ToastAndroid = require("react-native").ToastAndroid;
}

type RootStackParamList = {
  PasswordAndSecurity: { email: string };
};

type PasswordSecurityScreenRouteProp = RouteProp<
  RootStackParamList,
  "PasswordAndSecurity"
>;

// Componente de input de senha, memorizado para evitar re-renderizações desnecessárias.
interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secure: boolean;
  toggleSecure: () => void;
  userTheme: "dark" | "light";
}

const PasswordInput = memo(
  ({
    value,
    onChangeText,
    placeholder,
    secure,
    toggleSecure,
    userTheme,
  }: PasswordInputProps) => {
    return (
      <View
        style={[
          styles.inputContainer,
          { borderColor: userTheme === "dark" ? "#fff" : "#000" },
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            { color: userTheme === "dark" ? "#fff" : "#000" },
          ]}
          placeholder={placeholder}
          placeholderTextColor={userTheme === "dark" ? "#aaa" : "#555"}
          secureTextEntry={secure}
          value={value}
          onChangeText={onChangeText}
          blurOnSubmit={false}
        />
        <TouchableOpacity onPress={toggleSecure}>
          <Ionicons
            name={secure ? "eye-off" : "eye"}
            size={20}
            color={userTheme === "dark" ? "#fff" : "#000"}
          />
        </TouchableOpacity>
      </View>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

// Componente para exibir o timer, isolado para que só ele seja atualizado a cada segundo.
interface TimerTextProps {
  timer: number;
  userTheme: "dark" | "light";
}

const TimerText = memo(({ timer, userTheme }: TimerTextProps) => (
  <Text
    style={[
      styles.info,
      userTheme === "light" ? { color: "#000" } : { color: "#fff" },
    ]}
  >
    Insira a nova palavra-passe. Para garantirmos a sua segurança, dentro de um 1 minuto a sessão será encerrada (Ainda têm: {timer} segundos):
  </Text>
));

TimerText.displayName = "TimerText";

const PasswordSecurityScreen = () => {
  const route = useRoute<PasswordSecurityScreenRouteProp>();
  const { email } = route.params;
  const navigation = useNavigation();

  const url_verifyPassword = `${config.baseUrl}/calendarioFiles/passwordAndSecurity/verify_password.php`;
  const url_updatePassword = `${config.baseUrl}/calendarioFiles/passwordAndSecurity/update_password.php`;

  // Estados para configurações do cliente
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [userTheme, setUserTheme] = useState<"dark" | "light">("light");
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Estados do fluxo da tela
  const [step, setStep] = useState<"verify" | "update">("verify");
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  // Estados para mostrar/esconder senha
  const [currentPasswordSecure, setCurrentPasswordSecure] = useState(true);
  const [newPasswordSecure, setNewPasswordSecure] = useState(true);
  const [confirmPasswordSecure, setConfirmPasswordSecure] = useState(true);

  // Timer para a etapa "update" (em segundos)
  const [timer, setTimer] = useState(60);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Carregar configurações do cliente usando SecureStore
  useEffect(() => {
    async function loadSettings() {
      try {
        const bg = await SecureStore.getItemAsync("backgroundUrl");
        setBackgroundUrl(bg);

        const mode = await SecureStore.getItemAsync("userTheme");
        setUserTheme(mode === "dark" ? "dark" : "light");
      } catch{
        console.log("Erro ao carregar configurações.");
      } finally {
        setSettingsLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Iniciar o timer quando a etapa for "update"
  useEffect(() => {
    if (step === "update") {
      setTimer(60);
      timerRef.current = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [step]);

  // Monitorar o timer para avisos e expiração
  useEffect(() => {
    if (step === "update") {
      if (timer === 10) {
        if (Platform.OS === "web") {
          alert("A sessão expira em 10 segundos! Por favor, insira a nova palavra-passe ou cancele.");
        } else {
          ToastAndroid.show(
            "A sessão expira em 10 segundos! Por favor, insira a nova palavra-passe ou cancele.",
            ToastAndroid.LONG
          );
        }
      }
      if (timer <= 0) {
        if (Platform.OS === "web") {
          alert("Sessão expirada. Por favor, verifique a palavra-passe atual novamente.");
        } else {
          ToastAndroid.show(
            "Sessão expirada. Por favor, verifique a palavra-passe atual novamente.",
            ToastAndroid.LONG
          );
        }
        setStep("verify");
        setCurrentPasswordInput("");
        setNewPassword("");
        setConfirmPassword("");
      }
    }
  }, [timer, step]);

  // Funções para alternar a visibilidade da senha, memoizadas para não serem recriadas a cada renderização
  const toggleCurrentPasswordSecure = useCallback(() => {
    setCurrentPasswordSecure((prev) => !prev);
  }, []);
  const toggleNewPasswordSecure = useCallback(() => {
    setNewPasswordSecure((prev) => !prev);
  }, []);
  const toggleConfirmPasswordSecure = useCallback(() => {
    setConfirmPasswordSecure((prev) => !prev);
  }, []);

  // Função para verificar a palavra-passe atual
  const verifyPassword = async () => {
    if (!currentPasswordInput) {
      if (Platform.OS === "web") {
        alert("Por favor, insira a palavra-passe atual!");
      } else {
        ToastAndroid.show(
          "Por favor, insira a palavra-passe atual!",
          ToastAndroid.LONG
        );
      }
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(url_verifyPassword, {
        email,
        password: currentPasswordInput,
      });
      if (response.data.success) {
        setCurrentPasswordInput("");
        setStep("update");
      } else {
        if (Platform.OS === "web") {
          alert(response.data.message);
        } else {
          ToastAndroid.show(response.data.message, ToastAndroid.LONG);
        }
      }
    } catch (error) {
      if (Platform.OS === "web") {
        alert("Ocorreu um erro ao verificar a palavra-passe.");
      } else {
        ToastAndroid.show(
          "Ocorreu um erro ao verificar a palavra-passe.",
          ToastAndroid.LONG
        );
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Função para atualizar a palavra-passe
  const updatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      if (Platform.OS === "web") {
        alert("Preencha todos os campos!");
      } else {
        ToastAndroid.show("Preencha todos os campos!", ToastAndroid.LONG);
      }
      return;
    }
    if (newPassword !== confirmPassword) {
      if (Platform.OS === "web") {
        alert("A nova palavra-passe e a confirmação não coincidem.");
      } else {
        ToastAndroid.show(
          "A nova palavra-passe e a confirmação não coincidem.",
          ToastAndroid.LONG
        );
      }
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(url_updatePassword, {
        email,
        newPassword,
      });
      if (response.data.success === true) {
        if (Platform.OS === "web") {
          alert("A sua palavra-passe foi atualizada com sucesso.");
        } else {
          ToastAndroid.show(
            "A sua palavra-passe foi atualizada com sucesso.",
            ToastAndroid.LONG
          );
        }
        setStep("verify");
        setCurrentPasswordInput("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        if (Platform.OS === "web") {
          alert(response.data.message);
        } else {
          ToastAndroid.show(response.data.message, ToastAndroid.LONG);
        }
      }
    } catch (error) {
      if (Platform.OS === "web") {
        alert("Ocorreu um erro ao atualizar a palavra-passe. Pedimos que tente novamente mais tarde.");
      } else {
        ToastAndroid.show(
          "Ocorreu um erro ao atualizar a palavra-passe. Pedimos que tente novamente mais tarde.",
          ToastAndroid.LONG
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelUpdate = () => {
    setStep("verify");
    setCurrentPasswordInput("");
    setNewPassword("");
    setConfirmPassword("");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    async function loadSettings() {
      try {
        let bg: string | null;
        let mode: string | null;
        // Se for web, usamos localStorage; se não, usamos SecureStore
        if (Platform.OS === "web") {
          bg = localStorage.getItem("backgroundUrl");
          mode = localStorage.getItem("userTheme");
        } else {
          bg = await SecureStore.getItemAsync("backgroundUrl");
          mode = await SecureStore.getItemAsync("userTheme");
        }
        // Se o background existir e não começar com "http", concatenamos com o baseUrl
        if (bg && !bg.startsWith("http")) {
          bg = `${config.baseUrl}/${bg}`;
        }
        setBackgroundUrl(bg);
        setUserTheme(mode === "dark" ? "dark" : "light");
      } catch (error) {
        console.log("Erro ao carregar configurações.", error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);  

  const dynamicTextColor = userTheme === "dark" ? "#e0dede" : "#000";
  if (loading) { 
    return (
      <ImageBackground
        source={
          backgroundUrl
            ? { uri: backgroundUrl }
            : require("../../../assets/images/bg1.jpg")
        }
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {userTheme === "dark" && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              zIndex: 1,
            }}
          />
        )}
        <View style={{ alignItems: "center" }}>
          <ActivityIndicator size="large" color={dynamicTextColor} />
          <Text style={{ fontSize: 18, marginTop: 10, color: dynamicTextColor }}>
            Carregando registros...
          </Text>
        </View>
      </ImageBackground>
    );
  }
  
  

  // Estilos condicionais conforme o tema
  const boxStyle = [
    styles.box,
    userTheme === "light"
      ? { backgroundColor: "#f0f0f0" }
      : { backgroundColor: "rgba(0, 0, 0, 0.5)" },
  ];
  const titleStyle = [
    styles.title,
    userTheme === "light" ? { color: "#000" } : { color: "#fff" },
  ];
  const buttonStyle = [
    styles.button,
    { backgroundColor: userTheme === "dark" ? "#333" : "#ccc" },
  ];
  const cancelButtonStyle = [
    styles.button,
    { backgroundColor: userTheme === "dark" ? "#630101" : "#f29d9d" },
  ];
  const backIconColor = userTheme === "light" ? "#000" : "#fff";

  return (
    <ImageBackground source={{ uri: backgroundUrl ? backgroundUrl : "../../../assets/images/bg1.png" }} style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <StatusBar
        backgroundColor={userTheme === "dark" ? "#000000" : "#ffffff"}
        translucent
        barStyle={userTheme === "dark" ? "light-content" : "dark-content"}
      />


      <SafeAreaView style={styles.safeContainer}>
        <View
          style={[
            styles.configHeader,
            {
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
          >
            <Image
              source={require("../../../assets/icons/angle-left.png")}
              style={{
                width: Platform.OS === "web" ? 35 : 23,
                height: Platform.OS === "web" ? 35 : 25,
                tintColor: "#000000",
              }}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAccountModalVisible(true)}>
            <Image
              source={require("../../../assets/icons/user.png")}
              style={{
                width: Platform.OS === "web" ? 35 : 23,
                height: Platform.OS === "web" ? 35 : 25,
                tintColor: "#000000",
              }}
            />
          </TouchableOpacity>
        </View>
      <View style={boxStyle}>
        <Text style={titleStyle}>Palavra-passe e Segurança</Text>
        {step === "verify" && (
          <>
            <Text
              style={[
                styles.info,
                userTheme === "light" ? { color: "#000" } : { color: "#fff" },
              ]}
            >
              Para garantir a sua segurança, insira a palavra-passe atual:
            </Text>
            <PasswordInput
              value={currentPasswordInput}
              onChangeText={setCurrentPasswordInput}
              placeholder="Palavra-passe atual"
              secure={currentPasswordSecure}
              toggleSecure={toggleCurrentPasswordSecure}
              userTheme={userTheme}
            />
            <TouchableOpacity style={buttonStyle} onPress={verifyPassword}>
              <Text
                style={[
                  styles.buttonText,
                  userTheme === "light" ? { color: "#000" } : { color: "#fff" },
                ]}
              >
                Verificar
              </Text>
            </TouchableOpacity>
          </>
        )}

        {step === "update" && (
          <>
            <TimerText timer={timer} userTheme={userTheme} />
            <PasswordInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nova palavra-passe"
              secure={newPasswordSecure}
              toggleSecure={toggleNewPasswordSecure}
              userTheme={userTheme}
            />
            <PasswordInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirme a nova palavra-passe"
              secure={confirmPasswordSecure}
              toggleSecure={toggleConfirmPasswordSecure}
              userTheme={userTheme}
            />
            <TouchableOpacity style={buttonStyle} onPress={updatePassword}>
              <Text
                style={[
                  styles.buttonText,
                  userTheme === "light" ? { color: "#000" } : { color: "#fff" },
                ]}
              >
                Atualizar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={cancelButtonStyle} onPress={cancelUpdate}>
              <Text
                style={[
                  styles.buttonText,
                  userTheme === "light" ? { color: "#000" } : { color: "#fff" },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
        <ModalConfig
          visible={accountModalVisible}
          dynamicHeaderBackground="white"
          dynamicTextColor="black"
          onClose={() => setAccountModalVisible(false)}
          navigation={navigation}
          email={email}
        />
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    padding: 8,
    borderRadius: 20,
  },
  box: {
    marginTop: 280,
    padding: 20,
    borderRadius: 15,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  info: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 45,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Caixa de loading menor
  loadingContainer: {
    padding: 20,
    borderRadius: 10,
    // Pode definir uma largura fixa se preferir, por exemplo: width: 150
    alignItems: "center",
    justifyContent: "center",
  },
  // Estilos para temas
  loadingDark: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  loadingLight: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  safeContainer: { flex: 1 },
    loaderContainer: {
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
  configHeader: {
    width: "101%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: StatusBar.currentHeight || 20,
    paddingHorizontal: 15,
    paddingBottom: 10,
    backgroundColor: "white",
    elevation: 4,
    position: "absolute",
    top: 0,
    zIndex: 10,
  },
});

export default PasswordSecurityScreen;