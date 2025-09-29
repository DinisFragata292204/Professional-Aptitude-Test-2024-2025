import React, { useState, useEffect } from "react";
import {
  Modal,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Platform,
  ActivityIndicator
} from "react-native";
import axios from "axios";
import config from "../../config/config_db";
import * as SecureStore from "expo-secure-store";

const ModalConfig = ({ visible, dynamicHeaderBackground, dynamicTextColor, onClose, navigation, email }) => {
  const [loadingLogout, setLoadingLogout] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Carrega o cargo do utilizador
  useEffect(() => {
    (async () => {
      try {
        let role: string | null = null;
        if (Platform.OS === "web") {
          role = localStorage.getItem("userRole");
        } else {
          role = await SecureStore.getItemAsync("userRole");
        }
        setUserRole(role);
      } catch {
        setUserRole(null);
      }
    })();
  }, []);

  const openPersonalData = () => {
    onClose();
    navigation.navigate("PersonalDataScreen", { email });
  };

  const sugestAnything = () => {
    onClose();
    navigation.navigate("sugestAnythingScreen", { email });
  };

  const suggestionsScreen = () => {
    onClose();
    navigation.navigate("suggestionsScreen", { email });
  };

  const goToPasswordSecurity = () => {
    onClose();
    navigation.navigate("PasswordSecurityScreen", { email });
  };

  const goPersonalize = () => {
    onClose();
    navigation.navigate("TemaScreen", { email });
  };

  const handleLogout = async () => {
    setLoadingLogout(true);

    // Recupera o token do cliente
    let token = null;
    if (Platform.OS === "web") {
      token = localStorage.getItem("userToken");
    } else {
      token = await SecureStore.getItemAsync("userToken");
    }

    try {
      await axios.post(
        `${config.baseUrl}/calendarioFiles/logout.php`,
        { token },
        { headers: { "Content-Type": "application/json" } }
      );
    } catch {}

    try {
      if (Platform.OS === "web") {
        localStorage.removeItem("userToken");
        localStorage.removeItem("email");
        localStorage.removeItem("userRole");
        localStorage.removeItem("userTheme");
        localStorage.removeItem("backgroundUrl");
      } else {
        await SecureStore.deleteItemAsync("userToken");
        await SecureStore.deleteItemAsync("email");
        await SecureStore.deleteItemAsync("userRole");
        await SecureStore.deleteItemAsync("userTheme");
        await SecureStore.deleteItemAsync("backgroundUrl");
      }
    } catch {}

    setLoadingLogout(false);
    onClose();
    navigation.replace("Login");
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPressOut={onClose}
      >
        <View style={[styles.modalContent, { backgroundColor: dynamicHeaderBackground }]}>
          <Text style={[styles.modalTitle, { color: dynamicTextColor }]}>
            Configurações do Utilizador
          </Text>

          <TouchableOpacity style={styles.modalOption} onPress={openPersonalData} disabled={loadingLogout}>
            <Text style={[styles.modalOptionText, { color: dynamicTextColor }]}>
              Dados Pessoais
            </Text>
          </TouchableOpacity>
          <View style={styles.separator} />

          <TouchableOpacity style={styles.modalOption} onPress={goToPasswordSecurity} disabled={loadingLogout}>
            <Text style={[styles.modalOptionText, { color: dynamicTextColor }]}>
              Palavra-passe e Segurança
            </Text>
          </TouchableOpacity>
          <View style={styles.separator} />

          <TouchableOpacity style={styles.modalOption} onPress={goPersonalize} disabled={loadingLogout}>
            <Text style={[styles.modalOptionText, { color: dynamicTextColor }]}>
              Personalizar
            </Text>
          </TouchableOpacity>
          <View style={styles.separator} />

          {userRole === "admin" ? (
            <TouchableOpacity style={styles.modalOption} onPress={suggestionsScreen} disabled={loadingLogout}>
              <Text style={[styles.modalOptionText, { color: dynamicTextColor }]}>
                Sugestões
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.modalOption} onPress={sugestAnything} disabled={loadingLogout}>
              <Text style={[styles.modalOptionText, { color: dynamicTextColor }]}>
                Sugerir melhorias
              </Text>
            </TouchableOpacity>
          )}
          <View style={styles.separator} />

          {loadingLogout ? (
            <ActivityIndicator
              size="large"
              color="#47AD4D"
              style={{ marginTop: 20 }}
            />
          ) : (
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Terminar Sessão</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "flex-end",
  },
  modalContent: {
    width: "60%",
    height: "100%",
    padding: 20,
    justifyContent: "flex-start",
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    alignSelf: "flex-end",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
  },
  modalOption: {
    paddingVertical: 10,
  },
  modalOptionText: {
    fontSize: 18,
  },
  separator: {
    height: 1,
    backgroundColor: "#ccc",
    marginVertical: 5,
  },
  logoutButton: {
    marginTop: "auto",
    paddingVertical: 15,
    alignItems: "center",
    backgroundColor: "red",
    borderRadius: 10,
  },
  logoutButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default ModalConfig;