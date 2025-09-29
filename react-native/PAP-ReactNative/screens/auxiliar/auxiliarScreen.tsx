import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Platform,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Button, TextInput, useTheme } from "react-native-paper";
import { Calendar as BigCalendar } from "react-native-big-calendar";
import ModalConfig from "../../components/modalConfig";
import config from "../../config/config_db";
import * as SecureStore from "expo-secure-store";

interface StatsData {
  totalPessoas: number;
  turmas: Array<{ nome: string; quantidade: number; horario: string }>;
}

interface MenuArmazenado {
  date: string;
  pratoPrincipal: string;
  sopa: string;
  sobremesa: string;
}

const { width, height } = Dimensions.get("window");

// Função auxiliar para converter um objeto Date em string ISO (YYYY-MM-DD)
const getISODate = (date: Date): string | null => {
  return date instanceof Date && !isNaN(date.getTime())
    ? date.toISOString().split("T")[0]
    : null;
};

const AuxiliarScreen = ({ navigation }: any) => {
  const theme = useTheme();
  const urlSalvar = `${config.baseUrl}/auxiliarFiles/salvar_menu.php`;
  const urlListar = `${config.baseUrl}/auxiliarFiles/listar_menus.php`;

  // Estados
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [errorDates, setErrorDates] = useState<Date[]>([]); // Datas com erro (fins de semana)
  const [pratoPrincipal, setPratoPrincipal] = useState("");
  const [sopa, setSopa] = useState("");
  const [sobremesa, setSobremesa] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [menusArmazenados, setMenusArmazenados] = useState<MenuArmazenado[]>(
    []
  );
  const [modalContaVisivel, setModalContaVisivel] = useState(false);
  const [dadosFormulario] = useState({ email: "exemplo@dominio.com" });
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [userTheme, setUserTheme] = useState<"light" | "dark">(
    theme.dark ? "dark" : "light"
  );
  const [refreshing, setRefreshing] = useState(false);

  // Carregar configurações iniciais
  useEffect(() => {
    const loadSettings = async () => {
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
        if (bg && !bg.startsWith("http")) {
          bg = `${config.baseUrl}/${bg}`;
        }
        setBackgroundUrl(bg);
        setUserTheme(mode === "dark" ? "dark" : "light");
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Datas bloqueadas (ex.: feriados e férias)
  const feriados = ["2025-04-25", "2025-05-01"];
  const periodoFerias = { inicio: "2025-08-01", fim: "2025-08-31" };

  // Compara duas datas (apenas ano, mês e dia)
  const areDatesEqual = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Alterna a seleção de uma data (caso seja válida)
  const toggleDateSelection = (date: Date) => {
    if (isNaN(date.getTime())) {
      console.error("Tentativa de alternar data inválida:", date);
      return;
    }
    setSelectedDates((prevDates) => {
      const alreadySelected = prevDates.some((d) => areDatesEqual(d, date));
      return alreadySelected
        ? prevDates.filter((d) => !areDatesEqual(d, date))
        : [...prevDates, date];
    });
  };

  // Lidar com o clique numa célula do calendário
  const handleDayPress = (date: Date) => {
    if (isNaN(date.getTime())) {
      console.error("Data inválida no onPressCell:", date);
      return;
    }
    const dayOfWeek = date.getDay();
    const dateString = getISODate(date);
    console.log("Pressed date:", dateString);

    // Validações para fins de semana, feriados e período de férias
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      Alert.alert("Aviso", "Não é possível selecionar fins de semana.");
      setErrorDates((prev) => [...prev, date]);
      setTimeout(() => {
        setErrorDates((prev) => prev.filter((d) => !areDatesEqual(d, date)));
      }, 3000);
      return;
    }
    if (dateString && feriados.includes(dateString)) {
      Alert.alert("Aviso", "Não é possível selecionar feriados.");
      return;
    }
    if (
      dateString &&
      dateString >= periodoFerias.inicio &&
      dateString <= periodoFerias.fim
    ) {
      Alert.alert("Aviso", "Não é possível selecionar datas nas férias.");
      return;
    }
    toggleDateSelection(date);
  };

  // Gerar os eventos do calendário conforme o estado:
  // - Para os dias que o usuário tocou (selecionados) e que ainda não foram salvos,
  //   adiciona um evento com título "✓".
  // - Para os dias já com menu armazenado (vindos da base de dados), adiciona um evento com título "🍴".
  const getCalendarEvents = () => {
    const selectedEvents = selectedDates
      .filter(
        (date) =>
          !menusArmazenados.some((menu) => menu.date === getISODate(date))
      )
      .map((date) => ({
        id: "selected-" + getISODate(date),
        title: "✓",
        start: date,
        end: date,
      }));
    const menuEvents = menusArmazenados.map((menu) => ({
      id: "menu-" + menu.date,
      title: "🍴",
      start: new Date(menu.date),
      end: new Date(menu.date),
    }));
    return [...selectedEvents, ...menuEvents];
  };

  // Renderização customizada do evento
  const renderEvent = (event: any) => {
    // Se o título for "✓" (selecionado mas não salvo) ou "🍴" (menu já salvo)
    const containerStyle =
      event.title === "✓"
        ? styles.selectedEventContainer
        : styles.menuEventContainer;
    return (
      <View style={containerStyle}>
        <Text
          style={[
            styles.eventText,
            { color: userTheme === "dark" ? "#FFF" : "#000" },
          ]}
        >
          {event.title}
        </Text>
      </View>
    );
  };

  // Função de pull-to-refresh (exemplo)
  const onRefresh = () => {
    setRefreshing(true);
    listarMenus();
    setRefreshing(false);
  };

  // Salvar menu para os dias selecionados
  const guardarMenu = async () => {
    if (selectedDates.length === 0) {
      Alert.alert("Atenção", "Nenhum dia selecionado.");
      return;
    }
    if (!pratoPrincipal || !sopa || !sobremesa) {
      Alert.alert("Atenção", "Preencha todos os campos do menu.");
      return;
    }
    try {
      setLoading(true);
      for (const date of selectedDates) {
        const dia = getISODate(date);
        if (!dia) continue;
        const response = await fetch(urlSalvar, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dia,
            sopa,
            prato_principal: pratoPrincipal,
            sobremesa,
          }),
        });
        const result = await response.json();
        if (!result.success) {
          Alert.alert(
            "Erro",
            `Falha ao salvar o menu para o dia ${dia}: ${result.message}`
          );
        }
      }
      await listarMenus();
      // Após salvar, limpa as datas selecionadas
      setSelectedDates([]);
      setPratoPrincipal("");
      setSopa("");
      setSobremesa("");
      Alert.alert("Sucesso", "Menu(s) guardado(s) para os dias selecionados!");
    } catch (error) {
      console.error("[ERROR] guardarMenu ->", error);
      Alert.alert("Erro", "Ocorreu um erro ao guardar o menu.");
    } finally {
      setLoading(false);
    }
  };

  // Listar menus armazenados via API
  const listarMenus = async () => {
    try {
      const response = await fetch(urlListar, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();
      if (result.success && result.menus) {
        const menusFormatados: MenuArmazenado[] = result.menus.map(
          (menu: any) => ({
            date: menu.dia,
            pratoPrincipal: menu.prato_principal,
            sopa: menu.sopa,
            sobremesa: menu.sobremesa,
          })
        );
        setMenusArmazenados(menusFormatados);
      } else {
        Alert.alert("Aviso", "Nenhum menu encontrado.");
      }
    } catch (error) {}
  };

  useEffect(() => {
    listarMenus();
  }, []);

  // Header com botões de voltar e configuração de conta
  const renderHeader = () => (
    <View
      style={{
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: Platform.OS === "web" ? 40 : StatusBar.currentHeight || 20,
        paddingHorizontal: 10,
        paddingBottom: 10,
        position: "absolute",
        top: 0,
        zIndex: 10,
        backgroundColor: "white",
      }}
    >
      <TouchableOpacity
        onPress={() => setModalContaVisivel(true)}
        style={{ flex: 1, alignItems: "flex-end" }}
      >
        <Image
          source={require("../../assets/icons/user.png")}
          style={{
            width: Platform.OS === "web" ? 30 : 25,
            height: Platform.OS === "web" ? 30 : 25,
            marginTop: Platform.OS === "web" ? -5 : 3,
            tintColor: userTheme === "dark" ? "#FFFFFF" : "#000",
          }}
        />
      </TouchableOpacity>
    </View>
  );

  const dynamicTextColor = userTheme === "dark" ? "#e0dede" : "#000";

  return (
    <ImageBackground
      source={
        backgroundUrl
          ? { uri: backgroundUrl }
          : require("../../assets/images/bg1.jpg")
      }
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar backgroundColor="transparent" translucent barStyle="#000000" />
      {loading ? (
        <View style={styles.loadingContainer}>
          {userTheme === "dark" && <View style={styles.overlayDark} />}
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={dynamicTextColor} />
            <Text style={[styles.loadingText, { color: dynamicTextColor }]}>
              Carregando registros...
            </Text>
          </View>
        </View>
      ) : (
        <>
          {renderHeader()}
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <View style={styles.calendarWrapper}>
              <Text style={styles.titulo}>Calendário</Text>
              <BigCalendar
                events={getCalendarEvents()}
                height={height * 0.75}
                mode="month"
                swipeEnabled={true}
                weekStartsOn={1}
                showTime={false}
                onPressCell={handleDayPress}
                onPressEvent={(event) => {
                  if (event.title === "✓") {
                    handleDayPress(event.start);
                  }
                }}
                renderEvent={renderEvent}
              />
            </View>

            <View style={styles.box}>
              <Text style={styles.titulo}>Criar um Menu</Text>
              <TextInput
                label="Prato Principal"
                value={pratoPrincipal}
                onChangeText={setPratoPrincipal}
                mode="outlined"
                outlineColor="green"
                activeOutlineColor="green"
                style={styles.input}
              />
              <TextInput
                label="Sopa"
                value={sopa}
                onChangeText={setSopa}
                mode="outlined"
                outlineColor="green"
                activeOutlineColor="green"
                style={styles.input}
              />
              <TextInput
                label="Sobremesa"
                value={sobremesa}
                onChangeText={setSobremesa}
                mode="outlined"
                outlineColor="green"
                activeOutlineColor="green"
                style={styles.input}
              />
              <Button
                mode="contained"
                onPress={guardarMenu}
                style={styles.botao}
              >
                Guardar Menu
              </Button>
            </View>
            <View style={styles.box}>
              <Text style={styles.titulo}>Estatísticas de Almoço</Text>
              <Button
                mode="contained"
                onPress={() => navigation.navigate("auxiliarEstatisticas")}
                style={styles.botao}
              >
                Estatísticas de Almoço
              </Button>
              {stats && (
                <View style={styles.statsContainer}>
                  <Text style={styles.statsTexto}>
                    Total: {stats.totalPessoas} pessoas
                  </Text>
                  {stats.turmas.map((turma, index) => (
                    <Text key={index} style={styles.statsTexto}>
                      {turma.nome}: {turma.quantidade} ({turma.horario})
                    </Text>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.box}>
              <Text style={styles.titulo}>Menus Já inseridos</Text>
              {menusArmazenados.length === 0 ? (
                <Text style={styles.statsTexto}>
                  Nenhum menu armazenado ainda.
                </Text>
              ) : (
                menusArmazenados.map((menu, index) => (
                  <View key={index} style={styles.menuItem}>
                    <Text style={styles.statsTexto}>Dia: {menu.date}</Text>
                    <Text style={styles.statsTexto}>
                      Prato Principal: {menu.pratoPrincipal}
                    </Text>
                    <Text style={styles.statsTexto}>Sopa: {menu.sopa}</Text>
                    <Text style={styles.statsTexto}>
                      Sobremesa: {menu.sobremesa}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
          <ModalConfig
            visible={modalContaVisivel}
            dynamicHeaderBackground="white"
            dynamicTextColor="black"
            onClose={() => setModalContaVisivel(false)}
            navigation={navigation}
            email={dadosFormulario.email}
          />
        </>
      )}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  scrollContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20,
    paddingTop: 80, // Espaço para o header
  },
  headerContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "web" ? 40 : StatusBar.currentHeight || 20,
    paddingHorizontal: 10,
    paddingBottom: 10,
    position: "absolute",
    top: 0,
    zIndex: 10,
    backgroundColor: "white",
  },
  headerButton: {
    flex: 1,
  },
  headerIcon: {
    width: Platform.OS === "web" ? 35 : 23,
    height: Platform.OS === "web" ? 35 : 25,
    tintColor: "#5F6368",
  },
  calendarWrapper: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 10,
    marginVertical: 15,
  },
  box: {
    backgroundColor: "#ffffffaa",
    marginBottom: 20,
    borderRadius: 8,
    padding: 15,
  },
  titulo: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#000",
  },
  input: {
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  botao: {
    backgroundColor: "green",
    marginTop: 10,
  },
  statsContainer: {
    marginTop: 10,
  },
  statsTexto: {
    fontSize: 14,
    color: "#000",
    marginBottom: 5,
  },
  menuItem: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: "#ccc",
    paddingBottom: 5,
  },
  selectedEventContainer: {
    backgroundColor: "rgba(0,128,0,0.7)",
    borderRadius: 4,
    padding: 2,
    alignSelf: "center",
    marginRight: 2,
    height: 50,
    width: 50,
  },
  menuEventContainer: {
    backgroundColor: "rgba(0,128,0,0.7)",
    borderRadius: 4,
    padding: 2,
    alignSelf: "center",
    marginRight: 2,
    height: 50,
    width: 50,
  },
  eventText: {
    fontSize: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContent: {
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  overlayDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
});

export default AuxiliarScreen;
