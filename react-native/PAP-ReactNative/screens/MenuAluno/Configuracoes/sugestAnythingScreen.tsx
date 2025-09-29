import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  ImageBackground,
  Alert,
  FlatList,
  Dimensions,
  ToastAndroid,
} from "react-native";
import {
  TextInput,
  Button,
  useTheme,
  Snackbar,
  Text,
  List,
  Divider,
} from "react-native-paper";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import config from "../../../config/config_db";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import ModalConfig from "../../../components/modalConfig";

type RootStackParamList = {
  ProximosEventos: { email: string };
  Aluno: undefined;
};
type SugestAnythingScreenRouteProp = RouteProp<
  RootStackParamList,
  "ProximosEventos"
>;
type NavigationProp = StackNavigationProp<RootStackParamList>;

interface Suggestion {
  id: string;
  email: string;
  message: string;
  date_sent: string;
  response?: string;
  responder?: string;
  date_response?: string;
}

const SugestAnythingScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SugestAnythingScreenRouteProp>();
  const { email } = route.params;
  const LAST_SENT_KEY = "lastSuggestionDate";

  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [userTheme, setUserTheme] = useState<"light" | "dark">("light");

  // estado do novo envio
  const [suggestion, setSuggestion] = useState<string>("");
  const [loadingSubmit, setLoadingSubmit] = useState<boolean>(false);
  const [snackbarVisible, setSnackbarVisible] = useState<boolean>(false);
  // lista de sugestões já enviadas
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [alreadySentToday, setAlreadySentToday] = useState<boolean>(false);

  const [accountModalVisible, setAccountModalVisible] =
    useState<boolean>(false);

  const showMessage = (msg: string) => {
    if (Platform.OS === "web") {
      window.alert(msg);
    } else if (Platform.OS === "android") {
      ToastAndroid.show(msg, ToastAndroid.LONG);
    } else {
      Alert.alert("", msg);
    }
  };

  const todayString = () => new Date().toISOString().slice(0, 10);

  async function getLastSentDate(): Promise<string | null> {
    if (Platform.OS === "web") {
      return localStorage.getItem(LAST_SENT_KEY);
    } else {
      return await SecureStore.getItemAsync(LAST_SENT_KEY);
    }
  }

  async function setLastSentDate(dateStr: string): Promise<void> {
    if (Platform.OS === "web") {
      localStorage.setItem(LAST_SENT_KEY, dateStr);
    } else {
      await SecureStore.setItemAsync(LAST_SENT_KEY, dateStr);
    }
  }

  useEffect(() => {
    (async () => {
      const last = await getLastSentDate();
      setAlreadySentToday(last === todayString());
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        let bg: string | null;
        let mode: string | null;
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
      } catch {}
    })();
  }, []);

  // busca sugestões do utilizador
  const fetchSuggestions = async () => {
    setLoadingList(true);
    try {
      const res = await axios.get(
        `${config.baseUrl}/calendarioFiles/suggest/fetchUserSuggestion.php`,
        { params: { email } }
      );
      if (res.data.success) {
        setSuggestions(res.data.data);
      } else {
        Alert.alert("Erro", res.data.message || "Falha ao carregar sugestões");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "Não foi possível comunicar com o servidor.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const confirmBack = () => {
    if (Platform.OS === "web") {
      if (window.confirm("Tem a certeza que deseja sair?"))
        navigation.goBack();
    } else {
      Alert.alert("Confirmação", "Tem a certeza que deseja sair?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Sim", onPress: () => navigation.goBack() },
      ]);
    }
  };

  const handleSubmit = async () => {

    const last = await getLastSentDate();
    if (last === todayString()) {
      showMessage("Para evitar sobrecarregar os administradores, só pode enviar uma sogestão por dia.");
      return;
    }
    if (!suggestion.trim()) {
      showMessage("Por favor, escreve alguma sugestão antes de enviar.");
      setSnackbarVisible(true);
      return;
    }
    setLoadingSubmit(true);
    try {
      const res = await axios.post(
        `${config.baseUrl}/calendarioFiles/suggest/submit_suggestion.php`,
        { email, suggestion }
      );
      if (res.data.success) {
        showMessage("Sugestão enviada com sucesso!");
        await setLastSentDate(todayString());
        setAlreadySentToday(true);
        setSuggestion("");
        await fetchSuggestions();
      } else {
        showMessage(res.data.message || "Falha ao enviar.");
      }
    } catch {
      showMessage("Falha ao enviar. Tenta de novo mais tarde.");
    } finally {
      setLoadingSubmit(false);
      setSnackbarVisible(true);
    }
  };

  const renderSuggestion = ({ item }: { item: Suggestion }) => (
    <View>
      <List.Item
        title={item.message}
        description={() => (
          <>
            <Text>Enviado: {item.date_sent}</Text>
            {item.response ? (
              <Text>
                Resposta ({item.responder} em {item.date_response}):{" "}
                {item.response}
              </Text>
            ) : (
              <Text style={{ fontStyle: "italic" }}>Sem resposta ainda</Text>
            )}
          </>
        )}
        left={(props) => <List.Icon {...props} icon="message-text-outline" />}
      />
      <Divider />
    </View>
  );

  return (
    <ImageBackground
      source={
        backgroundUrl
          ? { uri: backgroundUrl }
          : require("../../../assets/images/bg1.jpg")
      }
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.fullScreenContainer}>
        {/* HEADER */}
        <View
          style={[
            styles.header,
            {
              paddingTop:
                Platform.OS === "web" ? 40 : StatusBar.currentHeight || 20,
            },
          ]}
        >
          <TouchableOpacity onPress={confirmBack} style={{ flex: 1 }}>
            <Image
              source={require("../../../assets/icons/angle-left.png")}
              style={[
                styles.icon,
                { tintColor: userTheme === "dark" ? "#FFF" : "#000" },
              ]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAccountModalVisible(true)}
            style={{ flex: 1, alignItems: "flex-end" }}
          >
            <Image
              source={require("../../../assets/icons/user.png")}
              style={[
                styles.icon,
                { tintColor: userTheme === "dark" ? "#FFF" : "#000" },
              ]}
            />
          </TouchableOpacity>
        </View>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
        <StatusBar
          backgroundColor={userTheme === "dark" ? "#000000" : "#ffffff"}
          translucent
          barStyle={userTheme === "dark" ? "light-content" : "dark-content"}
        />


          <View
            style={{
              backgroundColor: "#FFFFFF",
              padding: 20,
              margin: 16,
              borderRadius: 12,
              // elevação pra Android
              elevation: 3,
              // sombra pra iOS
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: "#333333",
                marginBottom: 12,
              }}
            >
              Envia-nos uma sugestão de melhoria (email: {email})
            </Text>

            <TextInput
              mode="outlined"
              label="A tua sugestão"
              placeholder="Ex.: Adicionar um gráfico para ver as notas..."
              value={suggestion}
              onChangeText={setSuggestion}
              multiline
              numberOfLines={4}
              style={{
                backgroundColor: "#FFFFFF",
                marginBottom: 16,
              }}
              outlineColor="#CCCCCC"
              activeOutlineColor="#47AD4D"
            />

            {loadingSubmit ? (
              <ActivityIndicator
                animating
                size="large"
                style={{ marginTop: 8 }}
                color="#47AD4D"
              />
            ) : (
              <Button
                mode="contained"
                onPress={handleSubmit}
                contentStyle={{
                  height: 48,
                }}
                labelStyle={{
                  fontSize: 16,
                  fontWeight: "600",
                }}
                style={{
                  borderRadius: 8,
                }}
                buttonColor="#47AD4D"
                textColor="#FFFFFF"
              >
                {alreadySentToday ? "Só pode enviar 1 sugestão por dia" : "Enviar Sugestão"}
              </Button>
            )}
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: "#FFFFFF",
              margin: 16,
              padding: 16,
              borderRadius: 12,
              elevation: 3,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            {loadingList ? (
              <ActivityIndicator
                size="large"
                color="#47AD4D"
                style={{ marginTop: 20 }}
              />
            ) : (
              <FlatList
                data={suggestions}
                keyExtractor={(item) => item.id}
                renderItem={renderSuggestion}
                // separador suave entre itens
                ItemSeparatorComponent={() => (
                  <View
                    style={{
                      height: 1,
                      backgroundColor: "#E0E0E0",
                      marginVertical: 8,
                    }}
                  />
                )}
                // mostra mensagem se lista vazia
                ListEmptyComponent={() => (
                  <Text
                    style={{
                      textAlign: "center",
                      color: "#777777",
                      marginTop: 20,
                    }}
                  >
                    Ainda não enviaste sugestões.
                  </Text>
                )}
                // retira scroll bar e adiciona espaçamento no fim
                showsVerticalScrollIndicator={false}
                style={{ marginTop: 10 }}
                contentContainerStyle={{ paddingBottom: 80 }}
              />
            )}
          </View>
        </KeyboardAvoidingView>

        <ModalConfig
          visible={accountModalVisible}
          dynamicHeaderBackground="white"
          dynamicTextColor="black"
          onClose={() => setAccountModalVisible(false)}
          navigation={navigation}
          email={email}
        />
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: { flex: 1 },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingBottom: 10,
    position: "absolute",
    top: 0,
    zIndex: 10,
    backgroundColor: "white",
  },
  icon: {
    width: Platform.OS === "web" ? 35 : 23,
    height: Platform.OS === "web" ? 35 : 25,
    marginLeft: 3,
    marginTop: Platform.OS === "web" ? -15 : 3,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 80,
  },
  inner: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
  },
  input: {
    minHeight: 100,
    marginBottom: 16,
  },
  button: {
    alignSelf: "flex-start",
  },
  loader: {
    marginVertical: 16,
  },
  list: {
    flex: 1,
  },
});

export default SugestAnythingScreen;
