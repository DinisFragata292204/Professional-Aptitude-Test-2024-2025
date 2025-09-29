import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Image,
  ImageBackground,
  Modal,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Dimensions,
  Alert,
  Platform,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  IconButton,
  useTheme,
  TextInput,
  Button,
} from "react-native-paper";
import { useRoute } from "@react-navigation/native";
import axios from "axios";
import RNPickerSelect from "react-native-picker-select";
import { Calendar as BigCalendar } from "react-native-big-calendar";
import config from "../../config/config_db";
import ModalConfig from "../../components/modalConfig";
import {
  titleColor,
  boxColor,
  iconColor,
  textColor,
  backgroundColor,
  modalOverlayColor,
  color,
} from "../../components/colors";

const defaultColors = [
  { value: "#FF6347", name: "Tomate" },
  { value: "#DC143C", name: "Carmesim" },
  { value: "#FF4500", name: "Vermelho-Laranja" },
  { value: "#8A2BE2", name: "Azul-Violeta" },
  { value: "#5F9EA0", name: "Azul-Cadete" },
  { value: "#2E8B57", name: "Verde-Mar" },
  { value: "#FF8C00", name: "Laranja-Escuro" },
  { value: "#9932CC", name: "Orquídea-Escura" },
  { value: "#20B2AA", name: "Verde-Mar-Claro" },
  { value: "#4682B4", name: "Azul-Aço" },
];

interface IMyEvent {
  title: string;
  start: Date;
  end: Date;
  color?: string;
  isTask?: boolean;
  taskDetails?: any;
  id?: number;
  descricao?: string;
}

const AlunoScreen = ({ navigation }) => {
  const route = useRoute<{
    key: string;
    name: string;
    params: {
      fromLogin?: any;
      email?: string;
      theme?: "light" | "dark";
      backgroundUrl?: string;
    };
  }>();

  const url_searchEvents = `${config.baseUrl}/calendarioFiles/aluno/fetch_events.php`;
  const url_fetchTasksData = `${config.baseUrl}/calendarioFiles/aluno/fetch_tasks.php`;
  const url_saveUserEvents = `${config.baseUrl}/calendarioFiles/aluno/update_events_config.php`;
  const url_saveUserTasks = `${config.baseUrl}/calendarioFiles/aluno/update_tasks_config.php`;
  const { height } = Dimensions.get("window");

  const [formData, setFormData] = useState({ email: "", aluno_id: null });

  const [bigCalendarEvents, setBigCalendarEvents] = useState<IMyEvent[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<IMyEvent | null>(null);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [taskColor, setTaskColor] = useState("#47AD4D");
  const [showColorModal, setShowColorModal] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (route.params?.email) {
      setFormData((prev) => ({ ...prev, email: route.params.email }));
    }
    const email = route.params?.email;
    if (email) {
      fetchTasks();
      fetchEvents();
    }
  }, [route.params?.email]);

  const email = route.params?.email;
  const userTheme = route.params?.theme || "light";
  const backgroundPath = route.params?.backgroundUrl || "";
  const backgroundUrl = `${config.baseUrl}/${backgroundPath}`;

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
    fetchTasks();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleQRCodeScan = async () => {
    setMenuModalVisible(false);
    navigation.navigate("QRCodeScannerScreen", { email });
  };

  // Buscar eventos no backend
  const fetchEvents = useCallback(() => {
    if (!email) return;
    axios
      .post(url_searchEvents, { email })
      .then((response) => {
        if (Array.isArray(response.data)) {
          const newEvents: IMyEvent[] = response.data.map((event: any) => {
            const [startDateStr, startTimeStr] =
              event.start_datetime.split(" ");
            const [endDateStr, endTimeStr] = event.end_datetime.split(" ");
            const [year, month, day] = startDateStr.split("-");
            const [startHour, startMinute] = startTimeStr.split(":");
            const [endHour, endMinute] = endTimeStr.split(":");
            const startDate = new Date(
              parseInt(year),
              parseInt(month) - 1,
              parseInt(day),
              parseInt(startHour),
              parseInt(startMinute)
            );
            const endDate = new Date(
              parseInt(year),
              parseInt(month) - 1,
              parseInt(day),
              parseInt(endHour),
              parseInt(endMinute)
            );
            return {
              title: event.title || "Evento",
              start: startDate,
              end: endDate,
              color:
                event.cores && event.cores.trim() ? event.cores : "#47AD4D",
              id: event.id,
              descricao: event.descricao || "",
            };
          });
          setBigCalendarEvents(newEvents);
        } else {
          console.error("Formato inesperado dos eventos:", response.data);
        }
      })
      .catch(() => {
        console.error("Erro ao procurar eventos na base de dados.");
      });
  }, [email]);

  // Buscar tarefas
  const fetchTasks = () => {
    if (!email) return;
    axios
      .post(
        url_fetchTasksData,
        { email },
        { headers: { "Content-Type": "application/json" } }
      )
      .then((response) => {
        if (response.data.success && Array.isArray(response.data.tasks)) {
          setTasks(response.data.tasks);
        } else {
          setTasks([]);
        }
      })
      .catch((error) => {
        console.error("Erro ao procurar as tarefas:", error);
      });
  };

  // Ao clicar na célula do calendário (modo month)
  const handleCalendarCellPress = (date: Date) => {
    setSelectedDay(date);
    setDayModalVisible(true);
  };

  // Ao clicar no retângulo (evento/tarefa)
  const handleCalendarEventPress = (event: any) => {
    if (event.isTask) {
      setSelectedTask(event.taskDetails);
    } else {
      setSelectedEvent(event);
    }
  };

  // Mapear tarefas para eventos (ajustando a hora de início)
  const taskEvents = tasks.map((task) => {
    const taskTime = new Date(task.data_da_tarefa);
    const startDate = new Date(taskTime.getTime() - 30 * 60000);
    const endDate = taskTime;
    return {
      title: task.titulo || "Tarefa",
      start: startDate,
      end: endDate,
      color: task.cor && task.cor.trim() ? task.cor : "#47AD4D",
      isTask: true,
      taskDetails: task,
    };
  });

  // Combinar eventos e tarefas
  const combinedEvents = [...bigCalendarEvents, ...taskEvents];

  // Filtrar eventos do dia selecionado (para modal day)
  const dayEvents = combinedEvents.filter((ev) => {
    if (!selectedDay) return false;
    return ev.start.toDateString() === selectedDay.toDateString();
  });

  // Função para converter data para o formato "07 de Abril de 2025 às 19:12"
  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, "0");
    const monthNames = [
      "Janeiro",
      "Fevereiro",
      "Março",
      "Abril",
      "Maio",
      "Junho",
      "Julho",
      "Agosto",
      "Setembro",
      "Outubro",
      "Novembro",
      "Dezembro",
    ];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    const hour = date.getHours().toString().padStart(2, "0");
    const minute = date.getMinutes().toString().padStart(2, "0");
    return `${day} de ${month} de ${year} às ${hour}:${minute}`;
  };

  // Atualizar configurações do evento
  const updateEventConfig = () => {
    if (!selectedEvent) return;
    Alert.alert(
      "Confirmação",
      "Ao guardar estas configurações vão mudar apenas para si!",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Guardar",
          onPress: () => {
            const notification_times = notifications.map((notif) => {
              let total = notif.timeValue;
              if (notif.unit === "hours") total = notif.timeValue * 60;
              if (notif.unit === "days") total = notif.timeValue * 1440;
              if (notif.unit === "weeks") total = notif.timeValue * 10080;
              return total;
            });
            const payload = {
              event_id: selectedEvent.id,
              email,
              cor: taskColor,
              notificacao_tipo: "notificacao",
              notification_times,
            };

            axios
              .post(url_saveUserEvents, payload)
              .then((response) => {
                if (response.data.success) {
                  Alert.alert("Sucesso", response.data.message);
                  fetchEvents();
                  setSelectedEvent(null);
                } else {
                  Alert.alert("Erro", response.data.message);
                }
              })
              .catch((error) => {
                console.error(
                  "Erro ao atualizar configuração do evento:",
                  error
                );
                Alert.alert(
                  "Erro",
                  "Erro ao atualizar configuração do evento."
                );
              });
          },
        },
      ]
    );
  };

  // Atualizar configurações da tarefa
  const updateTaskConfig = () => {
    if (!selectedTask) return;
    Alert.alert(
      "Confirmação",
      "Ao guardar estas configurações vão mudar apenas para si!",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Guardar",
          onPress: () => {
            const notification_times = notifications.map((notif) => {
              let total = notif.timeValue;
              if (notif.unit === "hours") total = notif.timeValue * 60;
              if (notif.unit === "days") total = notif.timeValue * 1440;
              if (notif.unit === "weeks") total = notif.timeValue * 10080;
              return total;
            });
            const payload = {
              tarefa_id: selectedTask.tarefa_id,
              email,
              cor: taskColor,
              notificacao_tipo: "notificacao",
              notification_times,
            };

            axios
              .post(url_saveUserTasks, payload)
              .then((response) => {
                if (response.data.success) {
                  Alert.alert("Sucesso", response.data.message);
                  fetchTasks();
                  setSelectedTask(null);
                } else {
                  Alert.alert(
                    "Erro",
                    response.data.message ||
                      "Ocorreu um erro. Tente novamente mais tarde."
                  );
                }
              })
              .catch((error) => {
                console.error(
                  "Erro ao atualizar configuração da tarefa:",
                  error
                );
                Alert.alert(
                  "Erro",
                  "Erro ao atualizar configuração da tarefa."
                );
              });
          },
        },
      ]
    );
  };

  // Modal com calendário em modo "day"
  const renderDayModal = () => (
    <Modal
      visible={dayModalVisible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setDayModalVisible(false)}
    >
      <SafeAreaView
        style={[
          styles.dayModalContainer,
          { backgroundColor: backgroundColor(userTheme) },
        ]}
      >
        <View style={styles.dayModalHeader}>
          <Text style={[styles.dayModalTitle, { color: color(userTheme) }]}>
            {selectedDay ? selectedDay.toDateString() : ""}
          </Text>
          <TouchableOpacity
            onPress={() => setDayModalVisible(false)}
            style={{ padding: 8 }}
          >
            <Image
              source={require("../../assets/icons/cross.png")}
              style={[
                Platform.OS === "web"
                  ? { width: 20, height: 20 }
                  : { width: 15, height: 15, marginTop: 3 },
                { tintColor: color(userTheme) },
              ]}
            />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <BigCalendar
            date={selectedDay!}
            events={dayEvents}
            height={600}
            mode="day"
            swipeEnabled={true}
            showTime={true}
            eventCellStyle={(event) =>
              event.color ? { backgroundColor: event.color } : {}
            }
            onPressEvent={handleCalendarEventPress}
            calendarContainerStyle={{
              backgroundColor: backgroundColor(userTheme),
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // Modal de configurações (detalhes de evento/tarefa)
  // Agora o header inclui o ícone de utilizador que abre o ModalConfig
  const renderConfigModal = () => {
    if (!(selectedTask || selectedEvent)) return null;

    return (
      <Modal visible={true} animationType="slide">
        {/* Header com ícone de voltar à esquerda e ícone de utilizador à direita */}
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
            onPress={() => {
              // Fecha o modal de configurauração limpando os estados
              setSelectedEvent(null);
              setSelectedTask(null);
              setShowColorModal(false);
              // Se houver outros modais abertos, pode-se fechá-los aqui também
            }}
          >
            <Image
              source={require("../../assets/icons/angle-left.png")}
              style={{
                width: Platform.OS === "web" ? 35 : 23,
                height: Platform.OS === "web" ? 35 : 25,
                tintColor: iconColor(userTheme),
              }}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAccountModalVisible(true)}>
            <Image
              source={require("../../assets/icons/user.png")}
              style={{
                width: Platform.OS === "web" ? 35 : 23,
                height: Platform.OS === "web" ? 35 : 25,
                tintColor: iconColor(userTheme),
              }}
            />
          </TouchableOpacity>
        </View>

        {/* Conteúdo do modal com espaçamento para não ficar sob o header */}
        <ScrollView
          contentContainerStyle={[
            styles.configModalContainer,
            {
              backgroundColor: backgroundColor(userTheme),
              paddingTop: 80,
              paddingHorizontal: 20,
              paddingBottom: 20,
            },
          ]}
        >
          {/* Texto de aviso */}
          <Text
            style={[
              styles.warningText,
              {
                textAlign: "center",
                fontSize: 16,
                fontWeight: "bold",
                marginBottom: 20,
                color: color(userTheme),
              },
            ]}
          >
            As configurações abaixo são apenas para si e não afetam o{" "}
            {selectedTask ? "tarefa" : "evento"} original.
          </Text>

          {selectedTask ? (
            <>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Título:</Text>
                <Text style={styles.fieldValue}>
                  {selectedTask.titulo || `Tarefa ${selectedTask.tarefa_id}`}
                </Text>
              </View>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Criado por:</Text>
                <Text style={styles.fieldValue}>
                  {selectedTask.professor_email}
                </Text>
              </View>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Data da Tarefa:</Text>
                <Text style={styles.fieldValue}>
                  {selectedTask.data_da_tarefa}
                </Text>
              </View>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Descrição:</Text>
                <Text style={styles.fieldValue}>
                  {selectedTask.descricao || "Não há descrição."}
                </Text>
              </View>

              {/* Box para campos editáveis */}
              <View style={styles.editableBox}>
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Cor:</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.selectedColorDisplay,
                      { paddingVertical: 10 },
                    ]}
                    onPress={() => setShowColorModal(true)}
                  >
                    <View
                      style={[
                        styles.colorCircle,
                        { backgroundColor: taskColor, marginRight: 10 },
                      ]}
                    />
                    <Text style={{ fontSize: 16, color: color(userTheme) }}>
                      Alterar Cor
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Notificações:2</Text>
                  {notifications.map((notif, index) => (
                    <View style={[styles.notificationRow]} key={index}>
                      {/* Tipo de alerta */}
                      <View style={{ flex: 1, minWidth: 100, marginRight: 8 }}>
                        <RNPickerSelect
                          onValueChange={(value) => {
                            if (value) {
                              setNotifications((prev) => {
                                const copy = [...prev];
                                copy[index].alertType = value;
                                return copy;
                              });
                            }
                          }}
                          items={[
                            { label: "Email", value: "email" },
                            { label: "Notificação", value: "notification" },
                          ]}
                          placeholder={{}}
                          value={notif.alertType}
                          useNativeAndroidPickerStyle={false}
                          style={pickerSelectStyles}
                        />
                      </View>
                      <TextInput
                        style={{
                          width: Platform.OS === "web" ? 60 : "20%",
                          height: "auto",
                          textAlign: "center",
                          paddingVertical: 8,
                          fontSize: 16,
                          color: color(userTheme),
                          backgroundColor: backgroundColor(userTheme),
                          borderRightWidth: 1,
                          borderColor: "#ccc",
                        }}
                        keyboardType="numeric"
                        value={
                          notif.timeValue !== null
                            ? String(notif.timeValue)
                            : ""
                        }
                        onChangeText={(text) => {
                          if (text === "") {
                            setNotifications((prev) => {
                              const copy = [...prev];
                              copy[index].timeValue = null;
                              return copy;
                            });
                          } else {
                            const num = parseInt(text, 10);
                            if (!isNaN(num) && num >= 1 && num <= 60) {
                              setNotifications((prev) => {
                                const copy = [...prev];
                                copy[index].timeValue = num;
                                return copy;
                              });
                            }
                          }
                        }}
                        onBlur={() => {
                          setNotifications((prev) => {
                            const copy = [...prev];
                            if (copy[index].timeValue === null) {
                              copy[index].timeValue = 1;
                            }
                            return copy;
                          });
                        }}
                      />
                      <View style={{ flexDirection: "column" }}>
                        <TouchableOpacity
                          onPress={() => incrementTime(index)}
                          style={styles.stepButton}
                        >
                          <Text style={styles.stepButtonText}>▲</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => decrementTime(index)}
                          style={styles.stepButton}
                        >
                          <Text style={styles.stepButtonText}>▼</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Unidade de tempo */}
                      <View style={{ flex: 1, minWidth: 100, marginRight: 8 }}>
                        <RNPickerSelect
                          onValueChange={(value) => {
                            if (value) {
                              setNotifications((prev) => {
                                const copy = [...prev];
                                copy[index].unit = value;
                                return copy;
                              });
                            }
                          }}
                          items={[
                            {
                              label: getUnitLabel("minutes"),
                              value: "minutes",
                            },
                            { label: getUnitLabel("hours"), value: "hours" },
                            { label: getUnitLabel("days"), value: "days" },
                            { label: getUnitLabel("weeks"), value: "weeks" },
                          ]}
                          placeholder={{}}
                          value={notif.unit}
                          useNativeAndroidPickerStyle={false}
                          style={pickerSelectStyles}
                        />
                      </View>
                      {Platform.OS === "web" ? (
                        <TouchableOpacity
                          onPress={() =>
                            setNotifications((prev) =>
                              prev.filter((_, i) => i !== index)
                            )
                          }
                          style={{
                            padding: 8,
                          }}
                        >
                          <Image
                            source={require("../../assets/icons/cross.png")}
                            style={{ width: 20, height: 20 }}
                          />
                        </TouchableOpacity>
                      ) : (
                        <IconButton
                          icon="close"
                          size={20}
                          onPress={() =>
                            setNotifications((prev) =>
                              prev.filter((_, i) => i !== index)
                            )
                          }
                          iconColor={iconColor(userTheme)}
                          style={{ marginLeft: -28 }}
                        />
                      )}
                    </View>
                  ))}
                  <Button
                    mode="outlined"
                    onPress={handleAddNotificationRow}
                    style={[styles.addTimeButton, { borderColor: "#47AD4D" }]}
                    labelStyle={{ color: "#47AD4D", fontWeight: "bold" }}
                  >
                    + Adicionar notificação
                  </Button>
                </View>
              </View>
              <Button
                mode="contained"
                onPress={updateTaskConfig}
                style={[
                  styles.saveButton,
                  { backgroundColor: "#47AD4D", marginTop: 20 },
                ]}
                labelStyle={{ color: "#FFF", fontWeight: "bold" }}
              >
                Salvar Configurações
              </Button>
            </>
          ) : (
            <>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Título:</Text>
                <Text style={styles.fieldValue}>{selectedEvent!.title}</Text>
              </View>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Criado por:</Text>
                <Text style={styles.fieldValue}>-</Text>
              </View>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Data de Início:</Text>
                <Text style={styles.fieldValue}>
                  {formatDate(selectedEvent!.start)}
                </Text>
              </View>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Data de Fim:</Text>
                <Text style={styles.fieldValue}>
                  {formatDate(selectedEvent!.end)}
                </Text>
              </View>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Descrição:</Text>
                <Text style={styles.fieldValue}>
                  {selectedEvent!.descricao || "Não há descrição."}
                </Text>
              </View>
              <View style={styles.editableBox}>
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Cor:</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.selectedColorDisplay,
                      { paddingVertical: 10 },
                    ]}
                    onPress={() => setShowColorModal(true)}
                  >
                    <View
                      style={[
                        styles.colorCircle,
                        { backgroundColor: taskColor, marginRight: 10 },
                      ]}
                    />
                    <Text style={{ fontSize: 16, color: color(userTheme) }}>
                      Alterar Cor
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Notificações:1</Text>
                  {notifications.map((notif, index) => (
                    <View
                      style={[
                        styles.notificationRow,
                        // Em mobile permitimos quebra de linha para não sair do ecrã
                        Platform.OS !== "web" && {
                          flexWrap: "wrap",
                          alignItems: "flex-start",
                        },
                      ]}
                      key={index}
                    >
                      {/* Tipo de alerta */}
                      <View style={{ flex: 1, minWidth: 100, marginRight: 8 }}>
                        <RNPickerSelect
                          onValueChange={(value) => {
                            if (value) {
                              setNotifications((prev) => {
                                const copy = [...prev];
                                copy[index].alertType = value;
                                return copy;
                              });
                            }
                          }}
                          items={[
                            { label: "Email", value: "email" },
                            { label: "Notificação", value: "notification" },
                          ]}
                          placeholder={{}}
                          value={notif.alertType}
                          useNativeAndroidPickerStyle={false}
                          style={pickerSelectStyles}
                        />
                      </View>

                      {/* Controlo de valor e botões ± */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          borderWidth: 1,
                          borderColor: "#ccc",
                          borderRadius: 4,
                          overflow: "hidden",
                          marginVertical: 8,
                        }}
                      >
                        <TextInput
                          style={{
                            width: Platform.OS === "web" ? 60 : "40%",
                            textAlign: "center",
                            paddingVertical: 8,
                            fontSize: 16,
                            color: color(userTheme),
                            backgroundColor: color(userTheme),
                            borderRightWidth: 1,
                            borderColor: "#ccc",
                          }}
                          keyboardType="numeric"
                          value={
                            notif.timeValue !== null
                              ? String(notif.timeValue)
                              : ""
                          }
                          onChangeText={(text) => {
                            if (text === "") {
                              setNotifications((prev) => {
                                const copy = [...prev];
                                copy[index].timeValue = null;
                                return copy;
                              });
                            } else {
                              const num = parseInt(text, 10);
                              if (!isNaN(num) && num >= 1 && num <= 60) {
                                setNotifications((prev) => {
                                  const copy = [...prev];
                                  copy[index].timeValue = num;
                                  return copy;
                                });
                              }
                            }
                          }}
                          onBlur={() => {
                            setNotifications((prev) => {
                              const copy = [...prev];
                              if (copy[index].timeValue === null) {
                                copy[index].timeValue = 1;
                              }
                              return copy;
                            });
                          }}
                        />
                        <View style={{ flexDirection: "column" }}>
                          <TouchableOpacity
                            onPress={() => incrementTime(index)}
                            style={styles.stepButton}
                          >
                            <Text style={styles.stepButtonText}>▲</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => decrementTime(index)}
                            style={styles.stepButton}
                          >
                            <Text style={styles.stepButtonText}>▼</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Unidade de tempo */}
                      <View style={{ flex: 1, minWidth: 100, marginRight: 8 }}>
                        <RNPickerSelect
                          onValueChange={(value) => {
                            if (value) {
                              setNotifications((prev) => {
                                const copy = [...prev];
                                copy[index].unit = value;
                                return copy;
                              });
                            }
                          }}
                          items={[
                            {
                              label: getUnitLabel("minutes"),
                              value: "minutes",
                            },
                            { label: getUnitLabel("hours"), value: "hours" },
                            { label: getUnitLabel("days"), value: "days" },
                            { label: getUnitLabel("weeks"), value: "weeks" },
                          ]}
                          placeholder={{}}
                          value={notif.unit}
                          useNativeAndroidPickerStyle={false}
                          style={pickerSelectStyles}
                        />
                      </View>

                      {/* Botão Remover */}
                      {Platform.OS === "web" ? (
                        <TouchableOpacity
                          onPress={() =>
                            setNotifications((prev) =>
                              prev.filter((_, i) => i !== index)
                            )
                          }
                          style={{ padding: 8 }}
                        >
                          <Image
                            source={require("../../assets/icons/cross.png")}
                            style={{ width: 20, height: 20 }}
                          />
                        </TouchableOpacity>
                      ) : (
                        <IconButton
                          icon="close"
                          size={20}
                          onPress={() =>
                            setNotifications((prev) =>
                              prev.filter((_, i) => i !== index)
                            )
                          }
                          iconColor={iconColor(userTheme)}
                        />
                      )}
                    </View>
                  ))}
                  <Button
                    mode="outlined"
                    onPress={handleAddNotificationRow}
                    style={[styles.addTimeButton, { borderColor: "#47AD4D" }]}
                    labelStyle={{ color: "#47AD4D", fontWeight: "bold" }}
                  >
                    + Adicionar notificação
                  </Button>
                </View>
              </View>
              <Button
                mode="contained"
                onPress={updateEventConfig}
                style={[
                  styles.saveButton,
                  { backgroundColor: "#47AD4D", marginTop: 20 },
                ]}
                labelStyle={{ color: "#FFF", fontWeight: "bold" }}
              >
                Salvar Configurações
              </Button>
            </>
          )}
        </ScrollView>
      </Modal>
    );
  };

  // Funções auxiliares para incremento/decremento de tempo e labels
  const incrementTime = (index: number) => {
    setNotifications((prev) => {
      const copy = [...prev];
      if (copy[index].timeValue < 60) copy[index].timeValue += 1;
      return copy;
    });
  };

  const decrementTime = (index: number) => {
    setNotifications((prev) => {
      const copy = [...prev];
      if (copy[index].timeValue > 1) copy[index].timeValue -= 1;
      return copy;
    });
  };

  const handleAddNotificationRow = () => {
    setNotifications((prev) => [
      ...prev,
      { alertType: "notification", timeValue: 15, unit: "minutes" },
    ]);
  };

  const getUnitLabel = (unit: string) => {
    if (unit === "minutes") return `minutos`;
    if (unit === "hours") return `horas`;
    if (unit === "days") return `dias`;
    if (unit === "weeks") return `semanas`;
    return "";
  };

  // Helper para definir a cor do texto conforme o tema
  const dynamicTextColor = () => textColor(userTheme);

  /* if (settingsLoading) {
    return (
      <ImageBackground
        source={ backgroundUrl ? { uri: backgroundUrl } : require("../../assets/images/bg1.jpg") }
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#6200ea" />
          <Text style={styles.loadingText}>
            Estamos a processar o seu pedido de registo. Pedimos que aguarde...
          </Text>
        </View>
      </ImageBackground>
    );
  }*/

  return (
    <ImageBackground
      source={
        backgroundUrl
          ? { uri: backgroundUrl }
          : require("../../assets/images/bg1.jpg")
      }
      style={styles.background}
    >
      {userTheme === "dark" && <View style={styles.overlay} />}
      <StatusBar
        backgroundColor={userTheme === "dark" ? "#000000" : "#ffffff"}
        translucent
        barStyle={userTheme === "dark" ? "light-content" : "dark-content"}
      />


      <SafeAreaView style={styles.safeContainer}>
        <View
          style={[
            styles.header,
            { backgroundColor: "#ffffff" },
          ]}
        >
          <TouchableOpacity
            onPress={() => setMenuModalVisible(true)}
            style={styles.menuIcon}
          >
            <Image
              source={require("../../assets/icons/menu-burger.png")}
              style={[
                Platform.OS === "web"
                  ? { width: 35, height: 35, marginLeft: 3, marginTop: -15 }
                  : { width: 23, height: 25, marginLeft: 3, marginTop: 3 },
                { tintColor: iconColor(userTheme) },
              ]}
            />
          </TouchableOpacity>
          <View style={styles.headerButtons}>
            <View style={{ position: "relative" }}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("PersonalizarTarefa", {
                    email: formData.email,
                    theme: userTheme,
                    backgroundUrl: backgroundUrl,
                  })
                }
                style={styles.todoIcon}
              >
                <Image
                  source={require("../../assets/icons/list-check.png")}
                  style={[
                    Platform.OS === "web"
                      ? {
                          width: 30,
                          height: 30,
                          marginRight: 20,
                          marginTop: -3,
                        }
                      : {
                          width: 25,
                          height: 25,
                          marginRight: 15,
                          marginTop: 3,
                        },
                    { tintColor: iconColor(userTheme) },
                  ]}
                />
              </TouchableOpacity>
              {tasks.length + bigCalendarEvents.length > 0 &&
                Platform.OS !== "web" && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {tasks.length + bigCalendarEvents.length}
                    </Text>
                  </View>
                )}
            </View>
            <TouchableOpacity
              onPress={() => setAccountModalVisible(true)}
              style={styles.accountIcon}
            >
              <Image
                source={require("../../assets/icons/user.png")}
                style={[
                  Platform.OS === "web"
                    ? { width: 30, height: 30, marginTop: -5 }
                    : { width: 25, height: 25, marginTop: 3 },
                  { tintColor: iconColor(userTheme) },
                ]}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Conteúdo principal – calendário em modo "month" */}
        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.calendarBox}>
            <BigCalendar
              events={combinedEvents}
              height={height * 0.84}
              mode="month"
              swipeEnabled={true}
              weekStartsOn={1}
              showTime={false}
              onPressCell={handleCalendarCellPress}
              onPressEvent={handleCalendarEventPress}
              calendarContainerStyle={{
                backgroundColor: backgroundColor(userTheme),
                height: 350,
              }}
              renderEvent={(event) => (
                <View
                  style={[
                    styles.eventRectangle,
                    { backgroundColor: event.color },
                  ]}
                >
                  <Text style={styles.eventRectangleText} numberOfLines={1}>
                    {event.title}
                  </Text>
                </View>
              )}
            />
          </View>
        </ScrollView>
        {renderDayModal()}
        {renderConfigModal()}

        <Modal
          visible={menuModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setMenuModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.menuOverlay}
            activeOpacity={1}
            onPressOut={() => setMenuModalVisible(false)}
          >
            <View
              style={[
                styles.menuContent,
                { backgroundColor: backgroundColor(userTheme) },
              ]}
            >
              <Text style={[styles.menuTitle, { color: dynamicTextColor() }]}>
                Menu
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setMenuModalVisible(false);
                  navigation.navigate("disciplinasAluno", {
                    email: formData.email,
                  });
                }}
                style={[
                  styles.menuLink,
                  { flexDirection: "row", alignItems: "center" },
                ]}
              >
                {Platform.OS !== "web" && (
                  <IconButton
                    icon="book-open"
                    size={24}
                    iconColor={dynamicTextColor()}
                  />
                )}
                <Text style={[styles.menuText, { color: dynamicTextColor() }]}>
                  Disciplinas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setMenuModalVisible(false);
                  navigation.navigate("entradasEsaidas", {
                    email: formData.email,
                  });
                }}
                style={[
                  styles.menuLink,
                  { flexDirection: "row", alignItems: "center" },
                ]}
              >
                {Platform.OS !== "web" && (
                  <IconButton
                    icon="calendar"
                    size={24}
                    iconColor={dynamicTextColor()}
                  />
                )}
                <Text style={[styles.menuText, { color: dynamicTextColor() }]}>
                  Entradas e saídas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setMenuModalVisible(false);
                  navigation.navigate("NotasScreen", { email: formData.email });
                }}
                style={[
                  styles.menuLink,
                  { flexDirection: "row", alignItems: "center" },
                ]}
              >
                {Platform.OS !== "web" && (
                  <IconButton
                    icon="clipboard-list"
                    size={24}
                    iconColor={dynamicTextColor()}
                  />
                )}
                <Text style={[styles.menuText, { color: dynamicTextColor() }]}>
                  Notas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setMenuModalVisible(false);
                  navigation.navigate("HorariosScreen", {
                    email: formData.email,
                  });
                }}
                style={[
                  styles.menuLink,
                  { flexDirection: "row", alignItems: "center" },
                ]}
              >
                {Platform.OS !== "web" && (
                  <IconButton
                    icon="clock"
                    size={24}
                    iconColor={dynamicTextColor()}
                  />
                )}
                <Text style={[styles.menuText, { color: dynamicTextColor() }]}>
                  Horários
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setMenuModalVisible(false);
                  navigation.navigate("AlmocosScreen", {
                    email: formData.email,
                  });
                }}
                style={[
                  styles.menuLink,
                  { flexDirection: "row", alignItems: "center" },
                ]}
              >
                {Platform.OS !== "web" && (
                  <IconButton
                    icon="silverware-fork-knife"
                    size={24}
                    iconColor={dynamicTextColor()}
                  />
                )}
                <Text style={[styles.menuText, { color: dynamicTextColor() }]}>
                  Almoços
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleQRCodeScan}
                style={[
                  styles.menuLink,
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: "auto",
                  },
                ]}
              >
                {Platform.OS !== "web" && (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <IconButton
                      icon="qrcode"
                      size={24}
                      iconColor={dynamicTextColor()}
                    />
                    <Text
                      style={[styles.menuText, { color: dynamicTextColor() }]}
                    >
                      Scan QR Code
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showColorModal} animationType="slide" transparent>
          <View style={styles.colorModalOverlay}>
            <View style={styles.colorModalContainer}>
              <Text style={[styles.modalTitle, { color: dynamicTextColor() }]}>
                Selecionar Cor
              </Text>
              {!defaultColors.find((opt) => opt.value === taskColor) && (
                <TouchableOpacity
                  style={styles.colorOptionRow}
                  onPress={() => {
                    setTaskColor(taskColor);
                    setShowColorModal(false);
                  }}
                >
                  <View
                    style={[styles.colorCircle, { backgroundColor: taskColor }]}
                  />
                  <Text
                    style={[styles.colorName, { color: dynamicTextColor() }]}
                  >
                    Cor Atual
                  </Text>
                </TouchableOpacity>
              )}
              {defaultColors.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.colorOptionRow}
                  onPress={() => {
                    setTaskColor(opt.value);
                    setShowColorModal(false);
                  }}
                >
                  <View
                    style={[styles.colorCircle, { backgroundColor: opt.value }]}
                  />
                  <Text
                    style={[styles.colorName, { color: dynamicTextColor() }]}
                  >
                    {opt.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <Button
                mode="contained"
                onPress={() => setShowColorModal(false)}
                style={styles.modalCloseButton}
              >
                Fechar
              </Button>
            </View>
          </View>
        </Modal>
        <ModalConfig
          visible={accountModalVisible}
          dynamicHeaderBackground="white"
          dynamicTextColor="black"
          onClose={() => setAccountModalVisible(false)}
          navigation={navigation}
          email={formData.email}
        />
      </SafeAreaView>
    </ImageBackground>
  );
};

const pickerSelectStyles = {
  inputIOS: {
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: "black",
    paddingRight: 30,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "black",
    paddingRight: 30,
  },
};

const styles = StyleSheet.create({
  configModalContainer: {
    padding: 20,
    minHeight: "100%",
  },
  configHeader: {
    width: "100%",
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
  warningText: {
    marginVertical: 10,
  },
  fieldContainer: {
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  fieldValue: {
    fontSize: 16,
    color: "#555",
  },
  editableBox: {
    backgroundColor: "#EFEFEF",
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    elevation: 1,
  },
  selectedColorDisplay: {
    flexDirection: "row",
    alignItems: "center",
  },
  colorCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
  },
  spinnerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 5,
  },
  spinnerInput: {
    width: 40,
    backgroundColor: "#F0F0F0",
    textAlign: "center",
    marginRight: 5,
  },
  spinnerButtons: {
    flexDirection: "column",
  },
  stepButton: {
    paddingHorizontal: 5,
  },
  stepButtonText: {
    fontSize: 12,
  },
  addTimeButton: {
    marginVertical: 10,
  },
  saveButton: {
    marginVertical: 10,
    borderRadius: 8,
  },
  colorModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  colorModalContainer: {
    width: "80%",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  colorOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  colorName: { fontSize: 16, marginLeft: 10 },
  modalCloseButton: { marginTop: 10, backgroundColor: "#47AD4D" },
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#000",
    textAlign: "center",
  },
  header: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    elevation: 4,
  },
  menuIcon: { marginRight: 10, marginTop: 35 },
  todoIcon: { marginRight: 0, marginTop: 35 },
  accountIcon: { marginRight: 0, marginTop: 35 },
  headerButtons: { flexDirection: "row", marginLeft: "auto" },
  container: { flex: 1, marginTop: 6 },
  calendarBox: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 10,
    margin: 10,
    elevation: 3,
  },
  badge: {
    position: "absolute",
    marginTop: 60,
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    backgroundColor: "red",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { color: "white", fontSize: 12, fontWeight: "bold" },
  eventRectangle: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    marginVertical: 1,
    opacity: 0.9,
  },
  eventRectangleText: { fontSize: 10, color: "#FFF", fontWeight: "bold" },
  dayModalContainer: { flex: 1 },
  dayModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  dayModalTitle: { fontSize: 20, fontWeight: "bold" },
  fullScreenModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "95%",
    height: "90%",
    borderRadius: 15,
    padding: 20,
  },
  calendarContainer: {
    marginTop: 20,
    height: 250,
  },
  bigCalendarContainer: {
    height: 450,
  },
  selectedDatesScroll: {
    marginTop: 20,
  },
  selectedDatesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  selectedDateItem: {
    backgroundColor: "#47AD4D",
    padding: 8,
    margin: 5,
    borderRadius: 5,
  },
  selectedDateText: {
    color: "#FFF",
    fontSize: 16,
  },
  configHeaderTitle: { fontSize: 20, fontWeight: "bold" },
  label: { fontSize: 16, marginTop: 10 },
  input: { marginBottom: 10, backgroundColor: "#F0F0F0" },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  menuContent: {
    width: "65%",
    height: "100%",
    padding: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    justifyContent: "flex-start",
  },
  menuTitle: { fontSize: 22, fontWeight: "bold", marginBottom: 30 },
  menuLink: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  menuText: { fontSize: 18 },
  backButton: { marginTop: 35 },
});

export default AlunoScreen;
