import config from "../../config/config_db";
import React, { useState, useEffect } from "react";
import { ImageBackground, KeyboardAvoidingView, View, StyleSheet, ActivityIndicator, Image, Platform} from "react-native";
import { Text, TextInput, Button, HelperText } from "react-native-paper";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "../../types";

let ToastAndroid: any = null;
if (Platform.OS === "android") {
  // Só importa ToastAndroid no Android
  ToastAndroid = require("react-native").ToastAndroid;
}

const UserDetailsPassword = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>(); 
  const route = useRoute<{ key: string; name: string; params: { email?: string; initialMessage?: string } }>();
  const { email, initialMessage = "" } = route.params;

  const url_password = `${config.baseUrl}/signInFiles/saveUserPassword.php`;

  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  useEffect(() => {
    if (initialMessage) {
      setSuccess(initialMessage);
      setTimeout(() => setSuccess(null), 2000);
    }
  }, [initialMessage]);

  const handleSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      setError("Por favor, pedimos que preencha todos os campos.");
      return;
    }
  
    if (newPassword !== confirmPassword) {
      setError("As Palavra-passe não coincidem.");
      return;
    }
  
    if (newPassword.length < 6) {
      setError("A Palavra-passe deve ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(url_password, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: newPassword }),
      });

      const data = await response.json();

      if (data.success) {
        const msg = data.message || "A palavra‑passe foi associada à sua conta com sucesso!";
        if (Platform.OS !== "web") {
          ToastAndroid.show(msg, ToastAndroid.LONG);
          navigation.navigate("SelectTurma", { email, initialMessage: "" });
        }else {
          window.alert(msg);
          navigation.navigate("SelectTurma", {email, initialMessage: msg });
        }
      } else {
        setError(data.message || "Ocorreu um erro enquanto tentavamos guardar a palavra-passe. Pedimos que tente novamente mais tarde.");
        if (Platform.OS !== "web") {
          ToastAndroid.show(data.message || "Erro ao guardar a palavra-passe.", ToastAndroid.LONG);
        } else {
          window.alert(data.message || "Erro ao guardar a palavra-passe.");
        }
      }
    } catch (error) {
      setError("Não foi possível conectar-se ao servidor. Tente novamente mais tarde.");
      if (Platform.OS !== "web") {
        ToastAndroid.show("Não foi possível conectar-se ao servidor.", ToastAndroid.LONG);
      } else {
        window.alert("Não foi possível conectar-se ao servidor.");
      }
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
      {success && (
        <View style={styles.toastContainer}>
          <View style={styles.toastBox}>
            <Text style={styles.toastText}>{success}</Text>
          </View>
        </View>
      )}
      <View style={styles.box}>
        <Text variant="headlineMedium" style={styles.title}>
          Pedimos que defina uma Palavra-passe
        </Text>
        {error && <HelperText type="error">{error}</HelperText>}
        <TextInput
          label="Palavra-passe"
          secureTextEntry={!isPasswordVisible}
          style={styles.input}
          value={newPassword}
          onChangeText={setNewPassword}
          mode="outlined"
          outlineColor="#47AD4D"
          activeOutlineColor="#47AD4D"
          right={
            <TextInput.Icon
              icon={() => (
                <Image
                  source={
                    isPasswordVisible
                      ? require("../../assets/icons/eye-off.png")
                      : require("../../assets/icons/eye.png")
                  }
                  style={{ width: 24, height: 24 }}
                />
              )}
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            />
          }
        />
        <TextInput
          label="Confirmar a palavra-passe"
          secureTextEntry={!isConfirmPasswordVisible}
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          mode="outlined"
          outlineColor="#47AD4D"
          activeOutlineColor="#47AD4D"
          right={
          <TextInput.Icon
            icon={() => (
              <Image
                source={
                  isConfirmPasswordVisible
                    ? require("../../assets/icons/eye-off.png")
                    : require("../../assets/icons/eye.png")
                }
                style={{ width: 24, height: 24 }}
              />
            )}
            onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
          />
          }
        />
        <Button mode="contained" onPress={handleSubmit} style={styles.saveButton}>
          Guardar Palavra-passe
        </Button>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    padding: 16,
  },
  box: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    alignItems: "center",
  },
  title: {
    marginBottom: 16,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
  },
  input: {
    width: "100%",
    marginBottom: 16,
    backgroundColor: "white",
  },
  saveButton: {
    width: "100%",
    marginTop: 10,
    backgroundColor: "#47AD4D",
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

export default UserDetailsPassword;