import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  ImageBackground,
  Image,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { Text, Button, useTheme, TextInput } from "react-native-paper";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import config from "../../../config/config_db";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import RNPickerSelect from "react-native-picker-select";
import ModalConfig from "../../../components/modalConfig";

// Parâmetros da rota
type PersonalizarTarefaScreenRouteParams = {
  email: string;
  theme?: string;
  backgroundUrl?: string;
};

const PersonalizarTarefaScreen = () => {
  const route = useRoute<RouteProp<{ PersonalizarTarefa: PersonalizarTarefaScreenRouteParams }, 'PersonalizarTarefa'>>();
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = getStyles(theme);

  const { email, theme: userThemeParam, backgroundUrl: backgroundUrlParam } = route.params;

  // URLs para chamadas à API
  const url_fetchTasks = `${config.baseUrl}/calendarioFiles/aluno/fetch_tasks.php`;
  const url_fetchEvents = `${config.baseUrl}/calendarioFiles/aluno/fetch_events.php`;
  const url_saveUserEvents = `${config.baseUrl}/calendarioFiles/aluno/update_events_config.php`;
  const url_saveUserTasks = `${config.baseUrl}/calendarioFiles/aluno/update_tasks_config.php`;

  // Estados de modais e configuração
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  
  // Estados para armazenar tarefas, eventos e configurações
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [taskColor, setTaskColor] = useState("#DC143C");
  const [taskDescription, setTaskDescription] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>( backgroundUrlParam );
  const [userTheme, setUserTheme] = useState<"light" | "dark">( userThemeParam === "dark" ? "dark" : "light" );
  const [loading, setLoading] = useState(false);

  // Lista de cores padrão
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

  // Funções para buscar tarefas e eventos
  const fetchTasks = () => {
    axios
      .post(url_fetchTasks, { email })
      .then((response) => {
        if (response.data.success && Array.isArray(response.data.tasks)) {
          setTasks(response.data.tasks);
        } else {
          setTasks([]);
        }
      })
      .catch((error) => {
        console.error("Erro ao buscar tarefas:", error);
      });
  };

  const fetchEvents = () => {
    axios
      .post(url_fetchEvents, { email })
      .then((response) => {
        if (Array.isArray(response.data)) {
          setEvents(response.data);
        } else if (response.data.success && Array.isArray(response.data.events)) {
          setEvents(response.data.events);
        } else {
          setEvents([]);
        }
      })
      .catch((error) => {
        console.error("Erro ao buscar eventos:", error);
      });
  };

  useEffect(() => {
    fetchTasks();
    fetchEvents();
  }, []);

  const dynamicTextColor = userTheme === "dark" ? "#E0E0E0" : "#000";
  const dynamicHeaderBg = userTheme === "dark" ? "#000" : "#FFF";

  // Spinner de loading enquanto carrega as configurações
  if (loading) {
    return (
      <ImageBackground
        source={
          backgroundUrl
            ? { uri: backgroundUrl }
            : require("../../../assets/images/bg1.jpg")
        }
        style={styles.loadingBackground}
      >
        {userTheme === "dark" && <View style={styles.loadingOverlay} />}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={dynamicTextColor} />
          <Text style={[styles.loadingText, { color: dynamicTextColor }]}>
            Carregando registros...
          </Text>
        </View>
      </ImageBackground>
    );
  }

  // Sanitiza input (básico)
  const sanitizeInput = (text) => {
    return text.replace(/['";]/g, "");
  };

  // Ao selecionar uma tarefa, traz as configurações atuais
  const handleSelectTask = (task) => {
    setSelectedTask(task);
    axios
      .post(url_fetchTasks, { tarefa_id: task.tarefa_id, email })
      .then((response) => {
        if (
          response.data.success &&
          response.data.tasks &&
          response.data.tasks.length > 0
        ) {
          const configData = response.data.tasks[0];
          setTaskColor(configData.cor || "#47AD4D");
          setTaskDescription(configData.descricao || "");
          if (configData.notification_times && Array.isArray(configData.notification_times)) {
            const newNotifications = configData.notification_times.map((minutes) => ({
              timeValue: minutes,
              unit: "minutes",
              alertType: "notification",
            }));
            setNotifications(newNotifications);
          } else {
            setNotifications([]);
          }
        } else {
          setTaskColor("#47AD4D");
          setTaskDescription("");
          setNotifications([]);
        }
      })
      .catch((error) => {
        console.error("Erro ao buscar configuração da tarefa:", error);
        setTaskColor("#47AD4D");
        setTaskDescription("");
        setNotifications([]);
      });
  };

  // Ao selecionar um evento, traz as configurações atuais
  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setTaskColor(event.cores || "#DC143C");
    setTaskDescription(event.descricao || "");
    if (event.notification_times && Array.isArray(event.notification_times)) {
      const newNotifications = event.notification_times.map((minutes) => ({
        timeValue: minutes,
        unit: "minutes",
        alertType: "notification",
      }));
      setNotifications(newNotifications);
    } else {
      setNotifications([]);
    }
  };

  // Atualiza configurações para tarefa
  const updateTaskConfig = () => {
    if (!selectedTask) return;
    Alert.alert(
      "Confirmação",
      "Ao guardar estas configurações, elas mudarão apenas para si!",
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
              descricao: sanitizeInput(taskDescription),
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
                  Alert.alert("Erro", response.data.message);
                }
              })
              .catch((error) => {
                console.error("Erro ao atualizar configuração da tarefa:", error);
                Alert.alert("Erro", "Não foi possível atualizar a configuração da tarefa.");
              });
          },
        },
      ]
    );
  };

  // Atualiza configurações para evento
  const updateEventConfig = () => {
    if (!selectedEvent) return;
    Alert.alert(
      "Confirmação",
      "Ao guardar estas configurações, elas mudarão apenas para si!",
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
              descricao: sanitizeInput(taskDescription),
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
                console.error("Erro ao atualizar configuração do evento:", error);
                Alert.alert("Erro", "Não foi possível atualizar a configuração do evento.");
              });
          },
        },
      ]
    );
  };

  // Retorna o label para as unidades de tempo
  const getUnitLabel = (value, quantity = 1) => {
    const units = {
      minutes: ["minuto", "minutos"],
      hours: ["hora", "horas"],
      days: ["dia", "dias"],
      weeks: ["semana", "semanas"],
    };
    return quantity === 1 ? units[value][0] : units[value][1];
  };

  // Gerencia linha de notificação
  const handleAddNotificationRow = () => {
    setNotifications((prev) => [
      ...prev,
      { timeValue: 15, unit: "minutes", alertType: "notification" },
    ]);
  };

  const incrementTime = (index) => {
    setNotifications((prev) => {
      const copy = [...prev];
      if (copy[index].timeValue < 60) {
        copy[index].timeValue += 1;
      }
      return copy;
    });
  };

  const decrementTime = (index) => {
    setNotifications((prev) => {
      const copy = [...prev];
      if (copy[index].timeValue > 1) {
        copy[index].timeValue -= 1;
      }
      return copy;
    });
  };

  return (
    <ImageBackground
      source={
        backgroundUrl
          ? { uri: backgroundUrl }
          : require("../../../assets/images/bg1.jpg")
      }
      style={styles.background}
    >
      {/* Cabeçalho com margem inferior, sombra e cores de acordo com o tema */}
      <View style={[styles.header, { backgroundColor: dynamicHeaderBg }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image
            source={require("../../../assets/icons/angle-left.png")}
            style={{
              width: Platform.OS === "web" ? 35 : 23,
              height: Platform.OS === "web" ? 35 : 25,
              tintColor: userTheme === "dark" ? "#FFF" : "#5F6368",
            }}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAccountModalVisible(true)}>
          <Image
            source={require("../../../assets/icons/user.png")}
            style={{
              width: Platform.OS === "web" ? 35 : 23,
              height: Platform.OS === "web" ? 35 : 25,
              tintColor: userTheme === "dark" ? "#FFF" : "#5F6368",
            }}
          />
        </TouchableOpacity>
      </View>

      {/* Espaçamento extra entre o header e o conteúdo principal */}
      <View style={styles.contentWrapper}>
        {Platform.OS === "web" ? (
          <View style={styles.webContainer}>
            <View style={styles.tasksContainer}>
              <Text style={styles.sectionHeader}>As Minhas Tarefas</Text>
              {tasks.map((task, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleSelectTask(task)}
                  style={styles.listItem}
                >
                  <Text style={styles.itemTitle}>
                    {task.titulo || task.tarefa_id}
                  </Text>
                  <Text style={styles.itemInfo}>
                    {task.professor_email} | {task.data_da_tarefa}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.eventsContainer}>
              <Text style={styles.sectionHeader}>Os Meus Eventos</Text>
              {events.map((event, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleSelectEvent(event)}
                  style={styles.listItem}
                >
                  <Text style={styles.itemTitle}>{event.title}</Text>
                  <Text style={styles.itemInfo}>
                    {event.professor_email} | {event.start_datetime} - {event.end_datetime}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.mobileContainer}>
            <Text style={styles.sectionHeader}>As Minhas Tarefas</Text>
            {tasks.map((task, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleSelectTask(task)}
                style={styles.listItem}
              >
                <Text style={styles.itemTitle}>
                  {task.titulo || task.tarefa_id}
                </Text>
                <Text style={styles.itemInfo}>
                  {task.professor_email} | {task.data_da_tarefa}
                </Text>
              </TouchableOpacity>
            ))}
            <Text style={[styles.sectionHeader, { marginTop: 20 }]}>Os Meus Eventos</Text>
            {events.map((event, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleSelectEvent(event)}
                style={styles.listItem}
              >
                <Text style={styles.itemTitle}>{event.title}</Text>
                <Text style={styles.itemInfo}>
                  {event.professor_email} | {event.start_datetime} - {event.end_datetime}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Modal de configurações para Tarefa/Evento */}
      {(selectedTask || selectedEvent) && (
        <Modal visible={true} animationType="slide" transparent>
                  <Modal visible={showColorModal} animationType="slide" transparent>
                <View style={styles.colorModalOverlay}>
                  <View style={styles.colorModalContent}>
                    <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
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
                        <View style={[styles.colorCircle, { backgroundColor: taskColor }]} />
                        <Text style={[styles.colorName, { color: theme.colors.onSurface }]}>
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
                        <View style={[styles.colorCircle, { backgroundColor: opt.value }]} />
                        <Text style={[styles.colorName, { color: theme.colors.onSurface }]}>
                          {opt.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <Button mode="contained" onPress={() => setShowColorModal(false)} style={styles.modalCloseButton}>
                      Fechar
                    </Button>
                  </View>
                </View>
              </Modal>
          <View style={styles.modalOverlay}>
            <ScrollView
              contentContainerStyle={[
                styles.modalContent,
                { backgroundColor: userTheme === "dark" ? "#000" : "#FFF" },
              ]}
            >
              {/* Cabeçalho do Modal */}
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedTask(null);
                    setSelectedEvent(null);
                    setShowColorModal(false);
                  }}
                >
                  <Image
                    source={require("../../../assets/icons/angle-left.png")}
                    style={{
                      width: Platform.OS === "web" ? 35 : 23,
                      height: Platform.OS === "web" ? 35 : 25,
                      tintColor: userTheme === "dark" ? "#FFF" : "#5F6368",
                    }}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setAccountModalVisible(true)}>
                  <Image
                    source={require("../../../assets/icons/user.png")}
                    style={{
                      width: Platform.OS === "web" ? 35 : 23,
                      height: Platform.OS === "web" ? 35 : 25,
                      tintColor: userTheme === "dark" ? "#FFF" : "#5F6368",
                    }}
                  />
                </TouchableOpacity>
              </View>

              {/* Conteúdo do Modal com campos profissionais */}
              <Text style={styles.modalWarning}>
                As configurações abaixo são apenas para si e não afetam a{" "}
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

                  <View style={styles.editableBox}>
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Cor:</Text>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={[styles.selectedColorDisplay, styles.colorButton]}
                        onPress={() => setShowColorModal(true)}
                      >
                        <View style={[styles.colorCircle, { backgroundColor: taskColor }]} />
                        <Text style={styles.editText}>Alterar Cor</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Notificações:</Text>
                      {notifications.map((notif, index) => (
                        <View style={styles.notificationRow} key={index}>
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
                            style={pickerSelectStyles(theme)}
                          />
                          <View style={styles.spinnerContainer}>
                            <TextInput
                              style={styles.spinnerInput}
                              keyboardType="numeric"
                              value={notif.timeValue !== null ? String(notif.timeValue) : ""}
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
                            <View style={styles.spinnerButtons}>
                              <TouchableOpacity onPress={() => incrementTime(index)} style={styles.stepButton}>
                                <Text style={styles.stepButtonText}>▲</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => decrementTime(index)} style={styles.stepButton}>
                                <Text style={styles.stepButtonText}>▼</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
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
                              { label: getUnitLabel("minutes"), value: "minutes" },
                              { label: getUnitLabel("hours"), value: "hours" },
                              { label: getUnitLabel("days"), value: "days" },
                              { label: getUnitLabel("weeks"), value: "weeks" },
                            ]}
                            placeholder={{}}
                            value={notif.unit}
                            useNativeAndroidPickerStyle={false}
                            style={pickerSelectStyles(theme)}
                          />
                          <TouchableOpacity onPress={() => setNotifications((prev) => prev.filter((_, i) => i !== index))}>
                          <Image
                            source={require("../../../assets/icons/cross.png")}
                            style={{
                              width: Platform.OS === "web" ? 25 : 20,
                              height: Platform.OS === "web" ? 25 : 20,
                              tintColor: userTheme === "dark" ? "#FFF" : "#5F6368",
                            }}
                          />
                          </TouchableOpacity>
                        </View>
                      ))}
                      <Button
                        mode="outlined"
                        onPress={handleAddNotificationRow}
                        style={styles.addTimeButton}
                        labelStyle={styles.addTimeButtonLabel}
                      >
                        + Adicionar notificação
                      </Button>
                    </View>
                  </View>
                  <Button
                    mode="contained"
                    onPress={updateTaskConfig}
                    style={styles.saveButton}
                    labelStyle={styles.saveButtonLabel}
                  >
                    Salvar Configurações
                  </Button>
                </>
              ) : (
                <>
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Título:</Text>
                    <Text style={styles.fieldValue}>{selectedEvent?.title}</Text>
                  </View>
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Criado por:</Text>
                    <Text style={styles.fieldValue}>-</Text>
                  </View>
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Data de Início:</Text>
                    <Text style={styles.fieldValue}>{selectedEvent?.start_datetime}</Text>
                  </View>
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Data de Fim:</Text>
                    <Text style={styles.fieldValue}>{selectedEvent?.end_datetime}</Text>
                  </View>
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Descrição:</Text>
                    <Text style={styles.fieldValue}>
                      {selectedEvent?.descricao || "Não há descrição."}
                    </Text>
                  </View>
                  <View style={styles.editableBox}>
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Cor:</Text>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={[styles.selectedColorDisplay, styles.colorButton]}
                        onPress={() => setShowColorModal(true)}
                      >
                        <View style={[styles.colorCircle, { backgroundColor: taskColor }]} />
                        <Text style={styles.editText}>Alterar Cor</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Notificações:</Text>
                      {notifications.map((notif, index) => (
                        <View style={styles.notificationRow} key={index}>
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
                            style={pickerSelectStyles(theme)}
                          />
                          <View style={styles.spinnerContainer}>
                            <TextInput
                              style={styles.spinnerInput}
                              keyboardType="numeric"
                              value={notif.timeValue !== null ? String(notif.timeValue) : ""}
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
                            <View style={styles.spinnerButtons}>
                              <TouchableOpacity onPress={() => incrementTime(index)} style={styles.stepButton}>
                                <Text style={styles.stepButtonText}>▲</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => decrementTime(index)} style={styles.stepButton}>
                                <Text style={styles.stepButtonText}>▼</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
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
                              { label: getUnitLabel("minutes"), value: "minutes" },
                              { label: getUnitLabel("hours"), value: "hours" },
                              { label: getUnitLabel("days"), value: "days" },
                              { label: getUnitLabel("weeks"), value: "weeks" },
                            ]}
                            placeholder={{}}
                            value={notif.unit}
                            useNativeAndroidPickerStyle={false}
                            style={pickerSelectStyles(theme)}
                          />
                          <TouchableOpacity onPress={() => setNotifications((prev) => prev.filter((_, i) => i !== index))}>
                            <Image
                              source={require("../../../assets/icons/cross.png")}
                              style={{
                                width: Platform.OS === "web" ? 25 : 20,
                                height: Platform.OS === "web" ? 25 : 20,
                                tintColor: userTheme === "dark" ? "#FFF" : "#5F6368",
                              }}
                            />
                          </TouchableOpacity>
                        </View>
                      ))}
                      <Button
                        mode="outlined"
                        onPress={handleAddNotificationRow}
                        style={styles.addTimeButton}
                        labelStyle={styles.addTimeButtonLabel}
                      >
                        + Adicionar notificação
                      </Button>
                    </View>
                  </View>
                  <Button
                    mode="contained"
                    onPress={updateEventConfig}
                    style={styles.saveButton}
                    labelStyle={styles.saveButtonLabel}
                  >
                    Salvar Configurações
                  </Button>
                </>
              )}
            </ScrollView>
          </View>
        </Modal>
      )}


      <ModalConfig
        visible={accountModalVisible}
        dynamicHeaderBackground={dynamicHeaderBg}
        dynamicTextColor={userTheme === "dark" ? "#FFF" : "#000"}
        onClose={() => setAccountModalVisible(false)}
        navigation={navigation}
        email={email}
      />
    </ImageBackground>
  );
};

// Estilos personalizados
const getStyles = (theme) =>
  StyleSheet.create({
    background: {
      flex: 1,
    },
    loadingBackground: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    loadingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
    },
    loadingContainer: {
      alignItems: "center",
    },
    loadingText: {
      fontSize: 18,
      marginTop: 10,
    },
    header: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: StatusBar.currentHeight || 20,
      paddingHorizontal: 15,
      paddingBottom: 10,
      elevation: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
    },
    contentWrapper: {
      flex: 1,
      marginTop: 15,
      paddingHorizontal: 15,
    },
    webContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    tasksContainer: {
      flex: 1,
      marginRight: 10,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 10,
      elevation: 2,
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 1 },
      marginBottom: 15,
    },
    eventsContainer: {
      flex: 1,
      marginLeft: 10,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 10,
      elevation: 2,
      shadowColor: "#000",
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 1 },
      marginBottom: 15,
    },
    mobileContainer: {
      paddingBottom: 20,
    },
    sectionHeader: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 10,
      paddingVertical: 5,
      borderBottomWidth: 1,
      borderBottomColor: "#ccc",
      textShadowColor: "rgba(0, 0, 0, 0.1)",
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 1,
    },
    listItem: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#eee",
    },
    itemTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: theme.colors.text,
    },
    itemInfo: {
      fontSize: 14,
      color: theme.colors.disabled,
      marginTop: 3,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      padding: 20,
    },
    modalContent: {
      borderRadius: 10,
      paddingTop: 80,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    modalHeader: {
      position: "absolute",
      top: 20,
      left: 15,
      right: 15,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    modalWarning: {
      textAlign: "center",
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 20,
      color: theme.dark ? "#FFF" : theme.colors.onSurface,
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
      marginBottom: 5,
    },
    colorButton: {
      paddingVertical: 10,
    },
    colorCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      marginRight: 10,
    },
    editText: {
      fontSize: 16,
      color: theme.dark ? "#FFF" : theme.colors.onSurface,
    },
    notificationRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    spinnerContainer: {
      width: 70,
      marginHorizontal: 5,
      position: "relative",
    },
    spinnerInput: {
      width: "100%",
      height: 40,
      borderWidth: 1,
      borderColor: "#ccc",
      borderRadius: 5,
      textAlign: "center",
      fontSize: 16,
      backgroundColor: "#FFF",
      color: "#000",
    },
    spinnerButtons: {
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: "space-between",
      marginVertical: 3,
    },
    stepButton: {
      paddingHorizontal: 5,
    },
    stepButtonText: {
      fontSize: 14,
      fontWeight: "bold",
      color: "#000",
    },
    removeBtn: {
      fontSize: 20,
      fontWeight: "bold",
      marginLeft: 5,
      color: "#900",
    },
    addTimeButton: {
      marginVertical: 10,
      borderColor: "#47AD4D",
    },
    addTimeButtonLabel: {
      color: "#47AD4D",
      fontWeight: "bold",
    },
    saveButton: {
      backgroundColor: "#47AD4D",
      marginTop: 20,
    },
    saveButtonLabel: {
      color: "#FFF",
      fontWeight: "bold",
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 15,
      textAlign: "center",
    },
    colorModalOverlay: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    colorModalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      padding: 20,
      width: "80%",
      alignItems: "center",
    },
    colorOptionRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 8,
      width: "100%",
      borderBottomWidth: 1,
      borderBottomColor: "#ccc",
    },
    colorName: {
      fontSize: 16,
      marginLeft: 10,
      color: "#333",
    },
    modalCloseButton: {
      marginTop: 10,
      backgroundColor: "#47AD4D",
    },
  });

  const pickerSelectStyles = (theme) => {
    const commonMobile = {
      fontSize: 14,
      padding: 5,
      minWidth: 70,
      height: 40, // para alinhar com o TextInput do tempo
      borderWidth: 1,
      borderColor: theme.colors.placeholder,
      borderRadius: 5,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
      marginHorizontal: 5,
    };
  
    const commonWeb = {
      fontSize: 16,
      padding: 10,
      minWidth: 110,
      borderWidth: 1,
      borderColor: theme.colors.placeholder,
      borderRadius: 5,
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
      marginHorizontal: 5,
    };
  
    return Platform.OS === 'web'
      ? {
          inputIOS: commonWeb,       // para navegadores que possam usar inputIOS
          inputAndroid: commonWeb,   // para navegadores que possam identificar como Android
          inputWeb: commonWeb,       // chave específica para a web
        }
      : {
          inputIOS: commonMobile,
          inputAndroid: commonMobile,
        };
  };  

export default PersonalizarTarefaScreen;