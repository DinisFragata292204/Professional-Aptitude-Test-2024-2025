import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, Platform, ActivityIndicator, Image, ImageBackground, StatusBar, Text as RNText, SafeAreaView,} from "react-native";
import { Text, Button, useTheme, TextInput,} from "react-native-paper";
import axios from "axios";
import config from "../../config/config_db";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as SecureStore from "expo-secure-store";
import { useRoute, useNavigation } from "@react-navigation/native";
import ModalConfig from "../../components/modalConfig";

const PersonalizarTaskOuEventProfScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const isWeb = Platform.OS === "web";

  const { email } = (route.params as any);
  
  const url_fetchTasks     = `${config.baseUrl}/calendarioFiles/professor/tarefas/fetch_tasks.php`;
  const url_fetchTaskView  = `${config.baseUrl}/calendarioFiles/professor/tarefas/fetch_task_view.php`;
  const url_updateTask     = `${config.baseUrl}/calendarioFiles/professor/tarefas/update_task.php`;
  const url_deleteTask     = `${config.baseUrl}/calendarioFiles/professor/tarefas/delete_task.php`;
  const url_searchEvents   = `${config.baseUrl}/calendarioFiles/professor/eventos/fetch_events.php`;
  const url_updateEvent    = `${config.baseUrl}/calendarioFiles/professor/eventos/update_event.php`;
  const url_deleteEvent    = `${config.baseUrl}/calendarioFiles/professor/eventos/delete_event.php`;

  const [loading, setLoading] = useState(true);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [userTheme, setUserTheme] = useState<"light"|"dark">(theme.dark ? "dark" : "light");
  const [tasks, setTasks] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskDescription, setTaskDescription] = useState("");
  const [taskColor, setTaskColor] = useState("#000000");
  const [taskDate, setTaskDate] = useState<Date>(new Date());
  const [taskTime, setTaskTime] = useState<Date>(new Date());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventColor, setEventColor] = useState("#000000");
  const [showEventModal, setShowEventModal] = useState(false);
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [showEventColorModal, setShowEventColorModal] = useState(false);
  const [eventStartDateObj, setEventStartDateObj] = useState<Date>(new Date());
  const [eventStartTimeObj, setEventStartTimeObj] = useState<Date>(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [eventEndDateObj, setEventEndDateObj] = useState<Date>(new Date());
  const [eventEndTimeObj, setEventEndTimeObj] = useState<Date>(new Date());
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [toast, setToast] = useState<{visible: boolean; message: string; type: "success" | "error";}>({ visible: false, message: "", type: "success" });

  const dynamicTextColor = userTheme === "dark" ? "#e0dede" : theme.colors.onSurface;

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

  useEffect(() => {
    (async () => {
      try {
        let bg: string | null, mode: string | null;
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
      } catch (err) {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchEvents();
  }, []);

  const fetchTasks = () => {
    axios.post(url_fetchTasks, { email })
      .then(r => {
        setTasks(r.data.success && Array.isArray(r.data.tasks) ? r.data.tasks : []);
      })
      .catch();
  };

  const fetchEvents = () => {
    axios.post(url_searchEvents, { email })
      .then(r => {
        setEvents(Array.isArray(r.data) ? r.data : []);
      })
      .catch();
  };

  const sanitize = (s: string) => s.replace(/['";]/g, "");

  const handleSelectTask = (task: any) => {
    setSelectedTask(task);
    axios.post(url_fetchTaskView, { tarefa_id: task.id, email })
      .then(r => {
        if (r.data.success && r.data.config) {
          const cfg = r.data.config;
          setTaskDescription(cfg.descricao || "");
          const dt = new Date(cfg.data_da_tarefa);
          setTaskDate(dt);
          setTaskTime(dt);
          setTaskTitle(cfg.titulo || "");
          setTaskColor(cfg.cor || "#000000");
        } else {
          setTaskDescription("");
          setTaskColor("#000000");
        }
        setIsEditingTask(false);
        setShowConfigModal(true);
      })
      .catch(err => {
        setShowConfigModal(true);
      });
  };

  const updateTaskConfig = () => {
    if (!selectedTask) {
      return;
    }
    const confirmationMessage = 'Pretende atualizar os dados da tarefa?';

    if (Platform.OS === 'web') {
      if (window.confirm(confirmationMessage)) {
        saveTaskConfig();
      }
    } else {
      Alert.alert(
        'Confirmação',
        confirmationMessage,
        [
          { text: 'Não', style: 'cancel' },
          { text: 'Guardar', onPress: saveTaskConfig }
        ]
      );
    }
  };

  const saveTaskConfig = () => {
    const dateStr = taskDate.toISOString().slice(0,10);
    const [h, m] = taskTime.toTimeString().substr(0,5).split(':');
    const timeStr = `${h}:${m}:00`;
  
    axios.post(url_updateTask, {
      tarefa_id: selectedTask.id,
      email,
      titulo: sanitize(taskTitle),
      descricao: sanitize(taskDescription),
      cor: taskColor,
      data_da_tarefa: `${dateStr} ${timeStr}`,
    })
    .then(r => {
      if (r.data.success) {
        showFeedback(r.data.message, 'success');
        fetchTasks();
        setShowConfigModal(false);
        setSelectedTask(null);
      } else {
        showFeedback(r.data.message, 'error');
      }
    })
    .catch(() => {
      showFeedback('Ocorreu um erro da nossa parte enquanto tentávamos atualizar os dados da tarefa. Pedimos que tente novamente mais tarde.','error');
    });
  };

  const deleteTask = () => {
    if (!selectedTask) return;
  
    const confirmationMessage = 
      'Tem a certeza que pretende eliminar a tarefa permanentemente?';
  
    if (Platform.OS === 'web') {
      if (window.confirm(confirmationMessage)) {
        performDeleteTask();
      }
    } else {
      Alert.alert(
        'Confirmação',
        confirmationMessage,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sim, tenho a certeza', onPress: performDeleteTask }
        ]
      );
    }
  };

  const performDeleteTask = () => {
    axios.post(url_deleteTask, {
      tarefa_id: selectedTask.id,
      email
    })
    .then(r => {
      if (r.data.success) {
        showFeedback(r.data.message, 'success');
        fetchTasks();
        setShowConfigModal(false);
        setSelectedTask(null);
      } else {
        showFeedback(r.data.message, 'error');
      }
    })
    .catch(() => {
      showFeedback('Ocorreu um erro enquanto tentávamos remover a tarefa permanentemente. Pedimos que tente novamente mais tarde.','error');
    });
  };

  const handleSelectEvent = (ev: any) => {
    setSelectedEvent(ev);
    setEventTitle(ev.title);
    setEventDescription(ev.descricao || "");
    setEventColor(ev.color || "#000000");
    const ds = new Date(ev.start_datetime);
    setEventStartDateObj(ds);
    setEventStartTimeObj(ds);
    const de = new Date(ev.end_datetime);
    setEventEndDateObj(de);
    setEventEndTimeObj(de);
    setIsEditingEvent(false);
    setShowEventModal(true);
  };

  const updateEventConfig = () => {
    if (!selectedEvent) return;
  
    const confirmationMessage = 'Guardar alterações no evento?';
  
    if (Platform.OS === 'web') {
      if (window.confirm(confirmationMessage)) {
        performUpdateEvent();
      }
    } else {
      Alert.alert(
        'Confirmação',
        confirmationMessage,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Guardar', onPress: performUpdateEvent }
        ]
      );
    }
  };

  const performUpdateEvent = () => {
    const dateStart = eventStartDateObj.toISOString().slice(0, 10);
    const [hS, mS] = eventStartTimeObj.toTimeString().substr(0, 5).split(':');
    const startStr = `${dateStart} ${hS}:${mS}:00`;
  
    const dateEnd = eventEndDateObj.toISOString().slice(0, 10);
    const [hE, mE] = eventEndTimeObj.toTimeString().substr(0, 5).split(':');
    const endStr = `${dateEnd} ${hE}:${mE}:00`;
  
    axios.post(url_updateEvent, {
      event_id: selectedEvent.id,
      email,
      title: sanitize(eventTitle),
      start_datetime: startStr,
      end_datetime: endStr,
      descricao: sanitize(eventDescription),
      color: eventColor,
    })
    .then(r => {
      if (r.data.success) {
        showFeedback(r.data.message, 'success');
        fetchEvents();
        setShowEventModal(false);
        setSelectedEvent(null);
      } else {
        showFeedback(r.data.message, 'error');
      }
    })
    .catch(() => {
      showFeedback('Ocorreu um erro enquanto tentávamos alterar os dados do evento. Pedimos que tente novamente mais tarde.','error');
    });
  };

  const deleteEvent = () => {
    if (!selectedEvent) return;
  
    const confirmationMessage =
      'Tem a certeza que pretende eliminar o evento de forma permanente?';
  
    if (Platform.OS === 'web') {
      if (window.confirm(confirmationMessage)) {
        performDeleteEvent();
      }
    } else {
      Alert.alert(
        'Confirmação',
        confirmationMessage,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sim, tenho a certeza', onPress: performDeleteEvent }
        ]
      );
    }
  };

  const performDeleteEvent = () => {
    axios.post(url_deleteEvent, {
      event_id: selectedEvent.id,
      email
    })
    .then(r => {
      if (r.data.success) {
        showFeedback(r.data.message, 'success');
        fetchEvents();
        setShowEventModal(false);
        setSelectedEvent(null);
      } else {
        showFeedback(r.data.message, 'error');
      }
    })
    .catch(() => {
      showFeedback('Ocorreu um erro enquanto tentávamos eliminar o evento permanentemente. Pedimos que tente novamente mais tarde.','error');
    });
  };

  const showFeedback = (message: string, type: "success" | "error") => {
    if (Platform.OS === "web") {
      window.alert(message);
    } else {
      setToast({ visible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
    }
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#47AD4D" />
      </SafeAreaView>
    );
  }

  return (
    <ImageBackground source={ backgroundUrl ? { uri: backgroundUrl } : require("../../assets/images/bg1.jpg") } style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image source={require("../../assets/icons/angle-left.png")} style={styles.backIcon}/>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAccountModalVisible(true)}>
          <Image source={require("../../assets/icons/user.png")} style={styles.userIcon}/>
        </TouchableOpacity>
      </View>
      {toast.visible && (
        <View style={[
            styles.toast,
            toast.type === "success" ? styles.toastSuccess : styles.toastError
          ]}>
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={ isWeb ? styles.webLayout : styles.mobileLayout }>
          <View style={[styles.box, isWeb ? styles.boxWeb : styles.boxMobile]}>
            <Text style={[styles.sectionTitle, { color: dynamicTextColor }]}>Tarefas</Text>
            <ScrollView>
              {tasks.map((t, i) => (
                <TouchableOpacity key={i} onPress={() => handleSelectTask(t)} style={styles.item}>
                  <Text style={[styles.itemText, { color: dynamicTextColor }]}>{t.titulo} – {t.data_da_tarefa}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={[styles.box, isWeb ? styles.boxWeb : styles.boxMobile]}>
            <Text style={[styles.sectionTitle, { color: dynamicTextColor }]}>Eventos</Text>
            <ScrollView>
              {events.map((ev, i) => (
                <TouchableOpacity key={i} onPress={() => handleSelectEvent(ev)} style={styles.item}>
                  <Text style={[styles.itemText, { color: dynamicTextColor }]}>{ev.title} – {ev.start_datetime}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </ScrollView>
      <Modal visible={showConfigModal} animationType="slide" transparent>
        <ImageBackground source={ backgroundUrl ? { uri: backgroundUrl } : require("../../assets/images/bg1.jpg") } style={styles.modalBg}>
          <View
            style={{
              width: "100%",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: Platform.OS === "web" ? 40 : (StatusBar.currentHeight - 20 || 20),
              paddingHorizontal: 10,
              paddingBottom: 10,
              position: "absolute",
              top: 0,
              zIndex: 10,
              backgroundColor: "white",
            }}
          >
            <TouchableOpacity onPress={() => setShowConfigModal(false)} style={{ flex: 1 }}>
              <Image
                source={require("../../assets/icons/angle-left.png")}
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
          <View style={ isWeb ? styles.webModalBox : styles.mobileModalBox }>
            <ScrollView contentContainerStyle={styles.configModalContainer}>
              <Text style={styles.warningText}>
                {isEditingTask ? "Edição da tarefa." : "Detalhes da tarefa:"}
              </Text>
              {!isEditingTask ? (
                <>
                  <View style={styles.summaryContainer}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Título:</Text>
                      <Text style={styles.summaryValue}>{taskTitle}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Descrição:</Text>
                      <Text style={styles.summaryValue}>{taskDescription}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Data/Hora:</Text>
                      <Text style={styles.summaryValue}>
                        {taskDate.toISOString().slice(0,10)} {taskTime.toTimeString().slice(0,5)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Cor:</Text>
                      <View style={[styles.colorCircle, { backgroundColor: taskColor }]} />
                    </View>
                  </View>
                  <Button mode="outlined" onPress={() => setIsEditingTask(true)} style={styles.editButton} labelStyle={{ color: "#47AD4D" }}>  
                    Editar
                  </Button>
                </>
              ) : (
                <>
                  <Text style={[styles.label, { color: dynamicTextColor }]}>Título:</Text>
                    <TextInput
                      mode="outlined"
                      value={taskTitle}
                      onChangeText={t => setTaskTitle(sanitize(t))}
                      style={styles.input}
                    />
                  <Text style={[styles.label, { color: dynamicTextColor }]}>Descrição:</Text>
                  <TextInput
                    mode="outlined"
                    value={taskDescription}
                    onChangeText={t => setTaskDescription(sanitize(t))}
                    style={styles.input}
                  />
                  {isWeb ? (
                    <>
                      <RNText style={[styles.label, { color: dynamicTextColor }]}>Data da Tarefa:</RNText>
                      <input
                        type="date"
                        value={taskDate.toISOString().slice(0,10)}
                        onChange={e => setTaskDate(new Date(e.target.value))}
                        style={styles.webInput}
                      />
                      <RNText style={[styles.label, { color: dynamicTextColor }]}>Hora da Tarefa:</RNText>
                      <input
                        type="time"
                        value={taskTime.toTimeString().slice(0,5)}
                        onChange={e => {
                          const [h,m] = e.target.value.split(":");
                          const dt = new Date(taskTime);
                          dt.setHours(+h); dt.setMinutes(+m);
                          setTaskTime(dt);
                        }}
                        style={styles.webInput}
                      />
                    </>
                  ) : (
                    <>
                      <TextInput
                        mode="outlined"
                        label="Data da Tarefa"
                        value={taskDate.toISOString().slice(0,10)}
                        editable={false}
                        right={<TextInput.Icon icon="calendar" onPress={() => setShowDatePicker(true)} />}
                        style={styles.input}
                      />
                      {showDatePicker && (
                        <DateTimePicker
                          value={taskDate}
                          mode="date"
                          display="default"
                          onChange={(_, dt) => {
                            setShowDatePicker(false);
                            if (dt) setTaskDate(dt);
                          }}
                        />
                      )}
                      <TextInput
                        mode="outlined"
                        label="Hora da Tarefa"
                        value={taskTime.toTimeString().slice(0,5)}
                        editable={false}
                        right={<TextInput.Icon icon="clock-outline" onPress={() => setShowTimePicker(true)} />}
                        style={styles.input}
                      />
                      {showTimePicker && (
                        <DateTimePicker
                          value={taskTime}
                          mode="time"
                          display="default"
                          onChange={(_, dt) => {
                            setShowTimePicker(false);
                            if (dt) setTaskTime(dt);
                          }}
                        />
                      )}
                    </>
                  )}
                  <Text style={[styles.label, { color: dynamicTextColor }]}>Cor:</Text>
                  <TouchableOpacity onPress={() => setShowColorModal(true)} style={styles.selectedColorDisplay}>
                    <View style={[styles.colorCircle, { backgroundColor: taskColor }]} />
                    <Text style={{ color: dynamicTextColor }}>Clique para alterar cor</Text>
                  </TouchableOpacity>
                  <View style={styles.buttonsRow}>
                    <Button mode="contained" onPress={updateTaskConfig} style={styles.saveButtonSmall}>Salvar</Button>
                    <Button mode="contained" onPress={deleteTask} style={styles.deleteButtonSmall}>Apagar</Button>
                  </View>
                  <Button mode="text" onPress={() => setIsEditingTask(false)} labelStyle={{ color: "#47AD4D" }}>Cancelar</Button>
                </>
              )}
            </ScrollView>
          </View>
        </ImageBackground>
      </Modal>
      <Modal visible={showColorModal} animationType="slide" transparent>
        <View style={styles.colorModalOverlay}>
          <View style={styles.colorModalContainer}>
            <Text style={styles.modalTitle}>Selecionar Cor</Text>
            {defaultColors.map(opt => (
              <TouchableOpacity key={opt.value} style={styles.colorOptionRow} onPress={() => { setTaskColor(opt.value); setShowColorModal(false);}}>
                <View style={[styles.colorCircle, { backgroundColor: opt.value }]} />
                <Text>{opt.name}</Text>
              </TouchableOpacity>
            ))}
            <Button mode="contained" onPress={() => setShowColorModal(false)} style={{ backgroundColor: "#47AD4D" }}>Fechar</Button>
          </View>
        </View>
      </Modal>
      <Modal visible={showEventModal} animationType="slide" transparent>
        <ImageBackground source={ backgroundUrl ? { uri: backgroundUrl } : require("../../assets/images/bg1.jpg") } style={styles.modalBg}>
          <View
            style={{
              width: "100%",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: Platform.OS === "web" ? 40 : (StatusBar.currentHeight - 20 || 20),
              paddingHorizontal: 10,
              paddingBottom: 10,
              position: "absolute",
              top: 0,
              zIndex: 10,
              backgroundColor: "white",
            }}
          >
            <TouchableOpacity onPress={() => setShowEventModal(false)} style={{ flex: 1 }}>
              <Image
                source={require("../../assets/icons/angle-left.png")}
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
          <View style={ isWeb ? styles.webModalBox : styles.mobileModalBox }>
            <ScrollView contentContainerStyle={styles.configModalContainer}>
              <Text style={styles.warningText}>
                {isEditingEvent ? "Edite os campos e salve." : "Detalhes do evento:"}
              </Text>
              {!isEditingEvent ? (
                <>
                  <View style={styles.summaryContainer}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Título:</Text>
                      <Text style={styles.summaryValue}>{eventTitle}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Início:</Text>
                      <Text style={styles.summaryValue}>
                        {eventStartDateObj.toISOString().slice(0,10)} {eventStartTimeObj.toTimeString().slice(0,5)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Fim:</Text>
                      <Text style={styles.summaryValue}>
                        {eventEndDateObj.toISOString().slice(0,10)} {eventEndTimeObj.toTimeString().slice(0,5)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Descrição:</Text>
                      <Text style={styles.summaryValue}>{eventDescription}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Cor:</Text>
                      <View style={[styles.colorCircle, { backgroundColor: eventColor }]} />
                    </View>
                  </View>
                  <Button mode="outlined" onPress={() => setIsEditingEvent(true)} style={styles.editButton} labelStyle={{ color: "#47AD4D" }}>Editar</Button>
                </>
              ) : (
                <>
                  <Text style={[styles.label, { color: dynamicTextColor }]}>Título:</Text>
                  <TextInput
                    mode="outlined"
                    value={eventTitle}
                    onChangeText={t => setEventTitle(sanitize(t))}
                    style={styles.input}
                  />
                  {isWeb ? (
                    <>
                      <RNText style={[styles.label, { color: dynamicTextColor }]}>Data de Início:</RNText>
                      <input
                        type="date"
                        value={eventStartDateObj.toISOString().slice(0,10)}
                        onChange={e => setEventStartDateObj(new Date(e.target.value))}
                        style={styles.webInput}
                      />
                      <RNText style={[styles.label, { color: dynamicTextColor }]}>Hora de Início:</RNText>
                      <input
                        type="time"
                        value={eventStartTimeObj.toTimeString().slice(0,5)}
                        onChange={e => {
                          const [h,m] = e.target.value.split(":");
                          const dt = new Date(eventStartTimeObj);
                          dt.setHours(+h); dt.setMinutes(+m);
                          setEventStartTimeObj(dt);
                        }}
                        style={styles.webInput}
                      />
                      <RNText style={[styles.label, { color: dynamicTextColor }]}>Data de Fim:</RNText>
                      <input
                        type="date"
                        value={eventEndDateObj.toISOString().slice(0,10)}
                        onChange={e => setEventEndDateObj(new Date(e.target.value))}
                        style={styles.webInput}
                      />
                      <RNText style={[styles.label, { color: dynamicTextColor }]}>Hora de Fim:</RNText>
                      <input
                        type="time"
                        value={eventEndTimeObj.toTimeString().slice(0,5)}
                        onChange={e => {
                          const [h,m] = e.target.value.split(":");
                          const dt = new Date(eventEndTimeObj);
                          dt.setHours(+h); dt.setMinutes(+m);
                          setEventEndTimeObj(dt);
                        }}
                        style={styles.webInput}
                      />
                    </>
                  ) : (
                    <>
                      <TextInput
                        mode="outlined"
                        label="Data de Início"
                        value={eventStartDateObj.toISOString().slice(0,10)}
                        editable={false}
                        right={<TextInput.Icon icon="calendar" onPress={() => setShowStartDatePicker(true)} />}
                        style={styles.input}
                      />
                      {showStartDatePicker && (
                        <DateTimePicker
                          value={eventStartDateObj}
                          mode="date"
                          display="default"
                          onChange={(_, d) => {
                            setShowStartDatePicker(false);
                            if (d) setEventStartDateObj(d);
                          }}
                        />
                      )}
                      <TextInput
                        mode="outlined"
                        label="Hora de Início"
                        value={eventStartTimeObj.toTimeString().slice(0,5)}
                        editable={false}
                        right={<TextInput.Icon icon="clock-outline" onPress={() => setShowStartTimePicker(true)} />}
                        style={styles.input}
                      />
                      {showStartTimePicker && (
                        <DateTimePicker
                          value={eventStartTimeObj}
                          mode="time"
                          display="default"
                          onChange={(_, d) => {
                            setShowStartTimePicker(false);
                            if (d) setEventStartTimeObj(d);
                          }}
                        />
                      )}
                      <TextInput
                        mode="outlined"
                        label="Data de Fim"
                        value={eventEndDateObj.toISOString().slice(0,10)}
                        editable={false}
                        right={<TextInput.Icon icon="calendar" onPress={() => setShowEndDatePicker(true)} />}
                        style={styles.input}
                      />
                      {showEndDatePicker && (
                        <DateTimePicker
                          value={eventEndDateObj}
                          mode="date"
                          display="default"
                          onChange={(_, d) => {
                            setShowEndDatePicker(false);
                            if (d) setEventEndDateObj(d);
                          }}
                        />
                      )}
                      <TextInput
                        mode="outlined"
                        label="Hora de Fim"
                        value={eventEndTimeObj.toTimeString().slice(0,5)}
                        editable={false}
                        right={<TextInput.Icon icon="clock-outline" onPress={() => setShowEndTimePicker(true)} />}
                        style={styles.input}
                      />
                      {showEndTimePicker && (
                        <DateTimePicker
                          value={eventEndTimeObj}
                          mode="time"
                          display="default"
                          onChange={(_, d) => {
                            setShowEndTimePicker(false);
                            if (d) setEventEndTimeObj(d);
                          }}
                        />
                      )}
                    </>
                  )}
                  <Text style={[styles.label, { color: dynamicTextColor }]}>Descrição:</Text>
                  <TextInput
                    mode="outlined"
                    value={eventDescription}
                    onChangeText={t => setEventDescription(sanitize(t))}
                    style={styles.input}
                  />
                  <Text style={[styles.label, { color: dynamicTextColor }]}>Cor:</Text>
                  <TouchableOpacity onPress={() => setShowEventColorModal(true)} style={styles.selectedColorDisplay}>
                    <View style={[styles.colorCircle, { backgroundColor: eventColor }]} />
                    <Text style={{ color: dynamicTextColor }}>Clique para alterar cor</Text>
                  </TouchableOpacity>

                  <View style={styles.buttonsRow}>
                    <Button mode="contained" onPress={updateEventConfig} style={styles.saveButtonSmall}>Salvar</Button>
                    <Button mode="contained" onPress={deleteEvent} style={styles.deleteButtonSmall}>Apagar</Button>
                  </View>
                  <Button mode="text" onPress={() => setIsEditingEvent(false)} labelStyle={{ color: "#47AD4D" }}>Cancelar</Button>
                </>
              )}
            </ScrollView>
          </View>
        </ImageBackground>
      </Modal>
      <Modal visible={showEventColorModal} animationType="slide" transparent>
        <View style={styles.colorModalOverlay}>
          <View style={styles.colorModalContainer}>
            <Text style={styles.modalTitle}>Selecionar Cor do Evento</Text>
            {defaultColors.map(opt => (
              <TouchableOpacity key={opt.value} style={styles.colorOptionRow} onPress={() => {
                setEventColor(opt.value);
                setShowEventColorModal(false);
              }}>
                <View style={[styles.colorCircle, { backgroundColor: opt.value }]} />
                <Text>{opt.name}</Text>
              </TouchableOpacity>
            ))}
            <Button mode="contained" onPress={() => setShowEventColorModal(false)} style={{ backgroundColor: "#47AD4D" }}>Fechar</Button>
          </View>
        </View>
      </Modal>
      <ModalConfig
        visible={accountModalVisible}
        dynamicHeaderBackground="white"
        dynamicTextColor="black"
        onClose={() => setAccountModalVisible(false)}
        navigation={navigation as any}
        email={email}
      />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex:1 },
  loaderBg: { flex:1, justifyContent:"center", alignItems:"center" },
  header: { width:"100%", flexDirection:"row", justifyContent:"space-between", paddingTop: Platform.OS=== "web" ? 40 : (StatusBar.currentHeight||20), paddingHorizontal:10, paddingBottom:10, backgroundColor:"white", position:"absolute", top:0, zIndex:10},
  backIcon: { width: Platform.OS === "web" ? 35 : 25, height: Platform.OS === "web" ? 35 : 25, tintColor:"#000" },
  userIcon: { width: Platform.OS === "web" ? 35 : 25, height: Platform.OS === "web" ? 35 : 25, tintColor: "#000" },
  scroll: { marginTop: Platform.OS==="web"? 40 : (StatusBar.currentHeight + 20 || 70), paddingTop: Platform.OS==="web"? 90 : (StatusBar.currentHeight||70), padding:16},
  mobileLayout: { flexDirection:"column" },
  webLayout: { flexDirection:"row", justifyContent:"space-between" },
  box: { backgroundColor:"white", borderRadius:8, padding:12 },
  boxMobile: { width:"100%", height:300, marginBottom:20 },
  boxWeb: { width:"48%", height:400 },
  sectionTitle: { fontSize:24, fontWeight:"bold", marginBottom: 12 },
  item: { paddingVertical:8, borderBottomWidth:1, borderColor:"#ddd" },
  itemText: { fontSize:18, marginVertical:6,},
  modalBg: { flex:1 },
  mobileModalBox: { flex: 1, marginTop: Platform.OS==="web" ? 90 : 70, backgroundColor: "white", borderTopLeftRadius: 16, borderTopRightRadius: 16, marginBottom: 190, padding: 20 },
  webModalBox: { marginTop: 120, width: "90%", maxWidth: 700, maxHeight: "85%", backgroundColor: "white", borderRadius: 16, padding: 40, alignSelf: "center", justifyContent: "flex-start",},
  configModalContainer: {padding: 30, paddingBottom: 50, alignItems: "stretch",},
  warningText: { fontStyle:"italic", textAlign:"center", marginBottom:20 },
  summaryContainer: { backgroundColor: "#F9F9F9", borderRadius: 8, padding: 20, marginBottom: 24, minHeight: 100}, 
  summaryRow: {flexDirection:"row", alignItems:"center", marginBottom:12},
  summaryLabel: { flex: 1, fontWeight: "bold", fontSize: 18,                },
  summaryValue: { flex: 2,fontSize: 18},
  label: { marginBottom: 8, fontSize: 18},
  input: { marginBottom: 20, height: 50},
  webInput: { marginBottom:12, padding:8, borderWidth:1, borderRadius:4 },
  selectedColorDisplay: { flexDirection:"row", alignItems:"center", marginBottom:12},
  colorCircle: {width: 30, height:30, borderRadius:15, marginRight:10 },
  buttonsRow: { flexDirection:"row", justifyContent:"space-between", marginVertical:16 },
  saveButtonSmall: { flex:1, marginRight:8, backgroundColor:"#47AD4D" },
  deleteButtonSmall: { flex:1, marginLeft:8, backgroundColor:"#FF5733" },
  editButton: { alignSelf:"flex-end", marginBottom:16, borderColor:"#47AD4D", borderWidth:1},
  colorModalOverlay: {flex:1, backgroundColor:"rgba(0,0,0,0.5)", justifyContent:"center", alignItems:"center"},
  colorModalContainer: {width:"80%", backgroundColor:"#FFF", padding:20, borderRadius:10},
  modalTitle: { fontSize:20, fontWeight:"bold", marginBottom:15, textAlign:"center"},
  colorOptionRow: { flexDirection:"row", alignItems:"center", paddingVertical:8, borderBottomWidth:1, borderColor:"#ccc" },
  toast: { position: "absolute", top: Platform.OS === "web" ? 10 : (StatusBar.currentHeight || 20) + 10, alignSelf: "center", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, zIndex: 1000, maxWidth: "90%",},
  toastSuccess: {backgroundColor: "#4CAF50",},
  toastError: {backgroundColor: "#F44336",},
  toastText: {color: "#FFF",fontSize: 16,textAlign: "center",},
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
});

export default PersonalizarTaskOuEventProfScreen;