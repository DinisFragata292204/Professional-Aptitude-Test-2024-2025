import config from "../../config/config_db";
import React, { useState, useEffect } from "react";
import { View, StyleSheet, KeyboardAvoidingView, ImageBackground, ActivityIndicator,TouchableOpacity, Platform} from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../types";

let ToastAndroid: any = null;
if (Platform.OS === "android") {
  // Só importa ToastAndroid no Android
  ToastAndroid = require("react-native").ToastAndroid;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

const VerifyCodeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'VerifyCode'>>();
  const { email, initialMessage = "" } = route.params;
  

  const url_validateCode = `${config.baseUrl}/signInFiles/validateCode.php`;
  const url_sendEmail = `${config.baseUrl}/signInFiles/sendEmail.php`;

  const [formData, setFormData] = useState({ email: "", code: "" });
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);    

  useEffect(() => {
    if (initialMessage) {
      setSuccessMessage(initialMessage);
      setTimeout(() => setSuccessMessage(""), 2000);
    }
  }, [initialMessage]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleCodeSubmit = async () => {
    if (!formData.code) {
      setErrorMessage("Pedimos-lhe que insira o código que foi mandado para o seu email.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(url_validateCode, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email, code: formData.code }),});
      const result = await response.json();
      if (result.success) {
        const msg = "O código que inseriu foi verificado com sucesso, pedimos que coloque uma palavra‑passe!";
        if (Platform.OS !== "web") {
          ToastAndroid.show(msg, ToastAndroid.LONG);
          navigation.navigate("PutPassword", { email: email, initialMessage: "" });
        } else {
          navigation.navigate("PutPassword", { email: email, initialMessage: msg });
        }
      } else {
        setErrorMessage( result.message || "Ocorreu um erro da nossa parte ao tentar validar o código que você introduziu, pedimos que tente novamente mais tarde.");
      }
    } catch {
      setErrorMessage("Ocorreu um erro enquanto o tentavamos conectar aos nossos servidores. Pedimos que tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    setLoading(true);
    try {
      const response = await fetch(url_sendEmail, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: formData.email }), });
      const result = await response.json();
      if (result.success) {
        const msg = result.message || `Código enviado novamente para ${formData.email} com sucesso.`;
        setSuccessMessage(msg);
        if (Platform.OS !== "web") {
          ToastAndroid.show(msg, ToastAndroid.LONG);
        }
        setTimeout(() => {
          setSuccessMessage("");
        }, 5000);
      } else {
        setErrorMessage(result.message || "Ocorreu um erro da nossa parte ao tentar enviar o código para o seu email. Pedimos que tente novamente mais tarde.");
      }
    } catch (error) {
      setErrorMessage("Ocorreu um erro enquanto o tentavamos conectar aos nossos servidores. Pedimos que tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ImageBackground
        source={require('../../assets/images/bg1.jpg')}
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
          <ActivityIndicator size="large" color="#47AD4D" />
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('../../assets/images/bg1.jpg')} style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        {successMessage !== "" && (
          <View style={styles.toastContainer}>
            <View style={styles.toastBox}>
              <Text style={styles.toastText}>{successMessage}</Text>
            </View>
          </View>
        )}
        <View style={styles.box}>
          <Text variant="headlineMedium" style={styles.title}>
            Insira o código
          </Text>
          {errorMessage ? (
            <View style={{ alignItems: "center" }}>
              <HelperText 
                type="error" 
                visible={!!errorMessage} 
                style={styles.errorText}
              >
                {errorMessage}
              </HelperText>
            </View>
          ) : null}
          <TextInput
            label="Código"
            value={formData.code}
            onChangeText={(text) => handleChange("code", text)}
            mode="outlined"
            style={styles.input}
            keyboardType="number-pad"
            outlineColor="#47AD4D"
            activeOutlineColor="#47AD4D"
          />
          <Button
            mode="contained"
            onPress={handleCodeSubmit}
            style={styles.verifyButton}
            labelStyle={{ color: "#fff" }}
          >
            Verificar Código
          </Button>
          <Button
            mode="text"
            onPress={handleResendCode}
            disabled={resendCooldown > 0}
            style={styles.link}
            labelStyle={{ color: "#47AD4D" }}
          >
            {resendCooldown > 0 ? `Reenviar o código (${resendCooldown} segundos)` : "Reenviar o código"}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    alignItems: "center",
  },
  title: {
    marginBottom: 16,
    fontWeight: "bold",
    color: "#333",
  },
  input: {
    width: "100%",
    marginBottom: 16,
    backgroundColor: "white",
  },
  verifyButton: {
    width: "100%",
    marginBottom: 16,
    backgroundColor: "#47AD4D",
  },
  link: {
    textAlign: "center",
    marginTop: 8,
  },
  errorText: {
    color: "red",
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

export default VerifyCodeScreen;