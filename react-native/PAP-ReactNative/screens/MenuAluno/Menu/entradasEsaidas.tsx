import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  ImageBackground,
  Image,
  StatusBar,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { Button as PaperButton } from "react-native-paper";
import { Calendar as BigCalendar } from "react-native-big-calendar";
import * as SecureStore from "expo-secure-store";
import config from "../../../config/config_db";
import ModalConfig from "../../../components/modalConfig";

let ToastAndroid: any = null;
if (Platform.OS === "android") {
  // Só importa ToastAndroid no Android
  ToastAndroid = require("react-native").ToastAndroid;
}

type RootStackParamList = {
  EntradasEsaidas: { email: string };
};

type EntradasEsaidasRouteProp = RouteProp<RootStackParamList, "EntradasEsaidas">;

type RecordType = {
  id: number;
  type: string;
  data_do_registo: string;
};

type DayData = {
  date: string;
  status: string;
  records: RecordType[];
};

type EventType = {
  title: string;
  start: Date;
  end: Date;
  color: string;
};

/* Definição das cores usadas */
const COLORS = {
  entrada: "#47AD4D",
  saida: "#E74C3C",
  statusNormal: "rgba(71,173,77,0.3)",
  statusAtraso: "rgba(255,165,0,0.3)",
  statusErro: "rgba(255,0,0,0.3)",
  indicador: "#999",
  darkText: "#e0dede",
  lightText: "#000",
  darkBackground: "rgba(0, 0, 0, 0.5)",
};

/**
 * Converte uma data no formato "DD-MM-YYYY" ou "YYYY-MM-DD" (com ou sem tempo)
 * para um objeto Date. Se a data estiver no formato ISO ("YYYY-MM-DD"), ela será
 * convertida corretamente, incluindo a parte do tempo, se presente.
 */
const parseDateString = (dateStr: string): Date => {
  const [datePart, timePart] = dateStr.split(" ");
  const dateParts = datePart.split("-");
  let year: number, month: number, day: number;
  if (dateParts[0].length === 4) {
    [year, month, day] = dateParts.map(Number);
  } else {
    [day, month, year] = dateParts.map(Number);
  }
  let hour = 0, minute = 0, second = 0;
  if (timePart) {
    const timeParts = timePart.split(":").map(Number);
    hour = timeParts[0] || 0;
    minute = timeParts[1] || 0;
    second = timeParts[2] || 0;
  }
  return new Date(year, month - 1, day, hour, minute, second);
};

/* Componente fixo de controles (Toolbar) para escolher modo e filtros */
const Toolbar = ({
  viewMode,
  setViewMode,
  filterType,
  setFilterType,
  dynamicTextColor,
}: {
  viewMode: "list" | "calendar";
  setViewMode: (mode: "list" | "calendar") => void;
  filterType: "todos" | "entrada" | "saida";
  setFilterType: (filter: "todos" | "entrada" | "saida") => void;
  dynamicTextColor: string;
}) => {
  return (
    <View style={styles.toolbarContainer}>
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          onPress={() => setViewMode("list")}
          style={[
            styles.viewModeButton,
            viewMode === "list" && styles.viewModeButtonActive,
          ]}
        >
          <Text style={[styles.viewModeText, { color: dynamicTextColor }]}>
            Lista
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode("calendar")}
          style={[
            styles.viewModeButton,
            viewMode === "calendar" && styles.viewModeButtonActive,
          ]}
        >
          <Text style={[styles.viewModeText, { color: dynamicTextColor }]}>
            Calendário
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          onPress={() => setFilterType("todos")}
          style={[
            styles.filterButton,
            filterType === "todos" && styles.filterButtonActive,
          ]}
        >
          <Text style={[styles.filterButtonText, { color: dynamicTextColor }]}>
            Todos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilterType("entrada")}
          style={[
            styles.filterButton,
            filterType === "entrada" && styles.filterButtonActive,
          ]}
        >
          <Text style={[styles.filterButtonText, { color: dynamicTextColor }]}>
            Entradas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setFilterType("saida")}
          style={[
            styles.filterButton,
            filterType === "saida" && styles.filterButtonActive,
          ]}
        >
          <Text style={[styles.filterButtonText, { color: dynamicTextColor }]}>
            Saídas
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const EntradasEsaidas = ({ navigation }: { navigation: any }) => {
  const route = useRoute<EntradasEsaidasRouteProp>();
  const { email } = route.params;
  const url = `${config.baseUrl}/calendarioFiles/entradasSaidas/getEntradasEsaidas.php`;

  const [days, setDays] = useState<DayData[]>([]);
  const [filterType, setFilterType] = useState<"todos" | "entrada" | "saida">("todos");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [weekendFeedback, setWeekendFeedback] = useState("");
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [userTheme, setUserTheme] = useState<"dark" | "light">("light");
  const [settingsLoading, setSettingsLoading] = useState<boolean>(true);
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  useEffect(() => {
    async function loadSettings() {
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
      } finally {
        setSettingsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const dynamicTextColor = userTheme === "dark" ? COLORS.darkText : COLORS.lightText;
  const dynamicModalBackground = userTheme === "dark" ? "#000" : "#fff";

  useEffect(() => {
    navigation.setOptions({
      headerTitle: "Entradas e Saídas",
      headerLeft: () => (
        <PaperButton
          onPress={() => navigation.goBack()}
          mode="text"
          contentStyle={{ padding: 8 }}
          icon={() => (
            <Image
              source={require("../../../assets/icons/angle-left.png")}
              style={
                Platform.OS === "web"
                  ? { width: 35, height: 35, tintColor: dynamicTextColor, marginTop: 30 }
                  : { width: 15, height: 15, tintColor: dynamicTextColor, marginTop: 15 }
              }
            />
          )}
          style={{ alignSelf: "flex-start" }}
          children={""}
        />
      ),
    });
  }, [navigation, dynamicTextColor]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (result.success) {
        const sortedDays: DayData[] = result.days.sort((a, b) => {
          return parseDateString(b.date).getTime() - parseDateString(a.date).getTime();
        });
        const sortedDaysWithRecords = sortedDays.map((day) => {
          const sortedRecords = day.records.sort((a, b) => {
            return parseDateString(b.data_do_registo).getTime() - parseDateString(a.data_do_registo).getTime();
          });
          return { ...day, records: sortedRecords };
        });
        setDays(sortedDaysWithRecords);
      }
    } catch (error) {
    }
  };

  const renderRecord = ({ item }: { item: RecordType }) => {
    if (filterType !== "todos" && item.type !== filterType) return null;
    const bgColor = item.type === "entrada" ? COLORS.entrada : COLORS.saida;
    return (
      <View style={[styles.recordItem, { backgroundColor: bgColor }]}>
        <Text style={[styles.recordText, { color: "#fff" }]}>{item.type.toUpperCase()}</Text>
        <Text style={[styles.recordText, { color: "#fff" }]}>{item.data_do_registo}</Text>
      </View>
    );
  };

  const renderDay = ({ item }: { item: DayData }) => {
    let bgColor = COLORS.statusNormal;
    if (item.status === "demasia") bgColor = COLORS.statusAtraso;
    else if (item.status === "demasiadas") bgColor = COLORS.statusErro;

    const filteredRecords = filterType === "todos"
      ? item.records
      : item.records.filter((r) => r.type === filterType);

    const capitalizedStatus =
      item.status.charAt(0).toUpperCase() +
      item.status.slice(1).toLowerCase();

    return (
      <View style={[styles.dayContainer, { backgroundColor: bgColor }]}>
        <View style={styles.dayHeader}>
          <Text style={[styles.dayHeaderText, { color: dynamicTextColor }]}>
            {item.date} - {capitalizedStatus}
          </Text>
        </View>
        <FlatList
          data={filteredRecords}
          keyExtractor={(record) => record.id.toString()}
          renderItem={renderRecord}
          scrollEnabled={false}
        />
      </View>
    );
  };

  const combinedEvents: EventType[] = [];
  days.forEach((day) => {
    day.records.forEach((record) => {
      const start = parseDateString(record.data_do_registo);
      const end = new Date(start.getTime() + 30 * 60000);
      const title = `${record.type.toUpperCase()} - ${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      combinedEvents.push({
        title,
        start,
        end,
        color: record.type === "entrada" ? COLORS.entrada : COLORS.saida,
      });
    });
  });

  const filteredCombinedEvents =
    filterType === "todos"
      ? combinedEvents
      : combinedEvents.filter((e) => e.title.toLowerCase().includes(filterType));

  const calendarEvents: EventType[] = [];
  const groups = filteredCombinedEvents.reduce(
    (acc: { [key: string]: EventType[] }, event) => {
      const dateKey = event.start.toISOString().split("T")[0];
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(event);
      return acc;
    },
    {}
  );
  Object.keys(groups).forEach((dayKey) => {
    const events = groups[dayKey].sort((a, b) => b.start.getTime() - a.start.getTime());
    if (events.length > 2) {
      const ellipsisStart = new Date(events[1].start.getTime() - 1);
      const ellipsisEnd = new Date(ellipsisStart.getTime() + 30 * 60000);
      calendarEvents.push(events[0], events[1], {
        title: "...",
        start: ellipsisStart,
        end: ellipsisEnd,
        color: COLORS.indicador,
      });
    } else {
      calendarEvents.push(...events);
    }
  });

  const dayEvents = selectedDay
    ? combinedEvents.filter((event) => {
        const eventDate = event.start.toISOString().split("T")[0];
        const selectedDate = selectedDay.toISOString().split("T")[0];
        return eventDate === selectedDate;
      })
    : [];

  const calendarHeight = Platform.OS === "web" ? 500 : 550;

  const renderContent = () => {
    if (viewMode === "list") {
      return (
        <FlatList
          data={days}
          keyExtractor={(item) => item.date}
          renderItem={renderDay}
          contentContainerStyle={styles.listContent}
        />
      );
    } else {
      return (
        <View style={styles.calendarWrapper}>
          {weekendFeedback !== "" && (
            <View style={styles.toast}>
              <Text style={styles.toastText}>{weekendFeedback}</Text>
            </View>
          )}
          <View
            style={{
              backgroundColor: userTheme === "dark" ? "rgba(0, 0, 0, 0.7)" : "#fff",
              height: calendarHeight,
              borderRadius: 5,
              overflow: "hidden",
            }}
          >
            <BigCalendar
              events={calendarEvents}
              height={calendarHeight}
              mode="month"
              swipeEnabled={true}
              weekStartsOn={1}
              showTime={false}
              onPressCell={(date) => {
                const clickedDate = new Date(date);
                const dayOfWeek = clickedDate.getDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                  if (Platform.OS === "android") {
                    ToastAndroid.show("Não pode selecionar um fim de semana", ToastAndroid.LONG);
                  } else {
                    setWeekendFeedback("Não pode selecionar um fim de semana");
                    setTimeout(() => setWeekendFeedback(""), 2000);
                  }
                  return;
                }
                setSelectedDay(clickedDate);
                setModalVisible(true);
              }}
              calendarContainerStyle={{
                height: calendarHeight,
                borderRadius: 5,
                overflow: "hidden",
              }}
              headerContainerStyle={{
                backgroundColor: userTheme === "dark" ? "rgba(0, 0, 0, 0.5)" : "#fff",
                borderTopLeftRadius: 5,
                borderTopRightRadius: 5,
                overflow: "hidden",
              }}
              renderEvent={(event: EventType) => (
                <View style={[styles.eventRectangle, { backgroundColor: event.color }]}>
                  <Text style={styles.eventRectangleText} numberOfLines={1}>
                    {event.title}
                  </Text>
                </View>
              )}
            />
          </View>
        </View>
      );
    }
  };

  if (settingsLoading || !days.length) {
    return (
      <ImageBackground
        source={
          backgroundUrl
            ? { uri: backgroundUrl }
            : require("../../../assets/images/bg1.jpg")
        }
        style={styles.loadingBackground}
      >
        {userTheme === "dark" && <View style={styles.darkOverlay} />}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={"#47AD4D"} />
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={
        backgroundUrl
          ? { uri: backgroundUrl }
          : require("../../../assets/images/bg1.jpg")
      }
      style={{ flex: 1 }}
    >
      {userTheme === "dark" && <View style={styles.darkOverlay} />}
       <View
        style={{
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: Platform.OS === "web" ? 40 : (StatusBar.currentHeight || 20),
          paddingHorizontal: 10,
          paddingBottom: 10,
          position: "absolute",
          top: 0,
          zIndex: 10,
          backgroundColor: "white",
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ flex: 1 }}>
          <Image
            source={require("../../../assets/icons/angle-left.png")}
            style={{
              width: Platform.OS === "web" ? 35 : 23,
              height: Platform.OS === "web" ? 35 : 25,
              marginLeft: 3,
              marginTop: Platform.OS === "web" ? -15 : 3,
              tintColor: userTheme === "dark" ? "#FFFFFF" : "#000",
            }}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAccountModalVisible(true)} style={{ flex: 1, alignItems: "flex-end" }}>
          <Image
            source={require("../../../assets/icons/user.png")}
            style={{
              width: Platform.OS === "web" ? 30 : 25,
              height: Platform.OS === "web" ? 30 : 25,
              marginTop: Platform.OS === "web" ? -5 : 3,
              tintColor: userTheme === "dark" ? "#FFFFFF" : "#000",
            }}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        <Toolbar 
          viewMode={viewMode}
          setViewMode={setViewMode}
          filterType={filterType}
          setFilterType={setFilterType}
          dynamicTextColor={dynamicTextColor}
        />
        {renderContent()}
      </View>
      {/* Modal para visualização do dia */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={[styles.modalContainer, { backgroundColor: dynamicModalBackground }]}>
          {/* Cabeçalho do modal com botões: esquerda fecha o modal, direita abre as configurações */}
          <View
            style={{
              width: "100%",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: Platform.OS === "web" ? 40 : (StatusBar.currentHeight || 20),
              paddingHorizontal: 10,
              paddingBottom: 10,
              position: "absolute",
              top: 0,
              zIndex: 10,
              backgroundColor: "white",
            }}
          >
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{ flex: 1 }}>
              <Image
                source={require("../../../assets/icons/angle-left.png")}
                style={{
                  width: Platform.OS === "web" ? 35 : 23,
                  height: Platform.OS === "web" ? 35 : 25,
                  marginLeft: 3,
                  marginTop: Platform.OS === "web" ? -15 : 3,
                  tintColor: userTheme === "dark" ? "#FFFFFF" : "#000",
                }}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAccountModalVisible(true)} style={{ flex: 1, alignItems: "flex-end" }}>
              <Image
                source={require("../../../assets/icons/user.png")}
                style={{
                  width: Platform.OS === "web" ? 30 : 25,
                  height: Platform.OS === "web" ? 30 : 25,
                  marginTop: Platform.OS === "web" ? -5 : 3,
                  tintColor: userTheme === "dark" ? "#FFFFFF" : "#000",
                }}
              />
            </TouchableOpacity>
          </View>
          {selectedDay && (
            <View style={styles.modalCalendarWrapper}>
              <BigCalendar
                date={selectedDay}
                events={dayEvents}
                height={500}
                mode="day"
                swipeEnabled={true}
                showTime={false}
                eventCellStyle={(event: EventType) => ({
                  backgroundColor: event.color,
                  height: 20,
                  marginVertical: 2,
                  paddingHorizontal: 2,
                  borderRadius: 3,
                })}
                headerContainerStyle={{
                  backgroundColor: dynamicModalBackground,
                  height: 40,
                  justifyContent: "center",
                  alignItems: "center",
                  ...(userTheme === "dark" && {
                    borderWidth: 1,
                    borderColor: "#fff",
                    borderRadius: 20,
                    paddingHorizontal: 10,
                  }),
                }}
                calendarContainerStyle={{ backgroundColor: "transparent" }}
              />
            </View>
          )}
        </View>
      </Modal>
      {/* Modal com configurações da conta */}
      <ModalConfig
        visible={accountModalVisible}
        dynamicHeaderBackground="white"
        dynamicTextColor="black"
        onClose={() => setAccountModalVisible(false)}
        navigation={navigation}
        email={email}
      />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  darkOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.darkBackground,
    zIndex: 1,
  },
  loadingBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    flex: 1,
    width: "97%",
    alignSelf: "center",
    marginTop: 80,
    zIndex: 2,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    marginTop: 10,
  },
  toolbarContainer: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  viewModeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
  viewModeButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: "rgba(194,194,194,0.6)",
    borderRadius: 20,
    marginHorizontal: 5,
  },
  viewModeButtonActive: {
    backgroundColor: "rgba(82,82,82,0.7)",
  },
  viewModeText: {
    fontWeight: "bold",
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: "rgba(194,194,194,0.6)",
    borderRadius: 20,
    marginHorizontal: 5,
  },
  filterButtonActive: {
    backgroundColor: "rgba(82,82,82,0.7)",
  },
  filterButtonText: {
    fontWeight: "bold",
  },
  listContent: {
    paddingBottom: 20,
  },
  dayContainer: {
    marginBottom: 15,
    borderRadius: 10,
    overflow: "hidden",
  },
  dayHeader: {
    padding: 10,
    borderBottomWidth: 2,
  },
  dayHeaderText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  recordItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    marginHorizontal: 2,
    marginVertical: 3,
    borderRadius: 5,
  },
  recordText: {
    fontSize: 16,
  },
  calendarWrapper: {
    flex: 1,
    margin: 0,
    padding: 0,
    backgroundColor: "transparent",
  },
  modalContainer: {
    flex: 1,
    paddingTop: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  modalCalendarWrapper: {
    flex: 1,
    backgroundColor: "transparent",
    margin: 10,
  },
  eventRectangle: {
    padding: 5,
    borderRadius: 5,
  },
  eventRectangleText: {
    color: "#fff",
    fontSize: 12,
  },
  toast: {
    position: "absolute",
    top: 5,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 20,
    zIndex: 1000,
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
  },
});

export default EntradasEsaidas;