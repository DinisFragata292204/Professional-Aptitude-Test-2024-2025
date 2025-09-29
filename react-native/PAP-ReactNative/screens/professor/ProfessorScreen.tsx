import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  Image,
  ImageBackground,
  Modal,
  StatusBar,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import {
  Text,
  IconButton,
  useTheme,
  TextInput,
  Button,
} from "react-native-paper";
import { Picker } from "@react-native-picker/picker";
import { useRoute } from "@react-navigation/native";
import axios from "axios";
import { Calendar as BigCalendar } from "react-native-big-calendar";
import * as SecureStore from "expo-secure-store";
import config from "../../config/config_db";
import ModalConfig from "../../components/modalConfig";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as DocumentPicker from "expo-document-picker";

interface IMyEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color?: string;
  type?: "task" | "event";
  professor_email?: string;
  descricao?: string;
  data_da_tarefa?: string;
  turma_id?: number;
  fileUri?: string;
  fileName?: string;
}

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

const CustomIconButton = ({ icon, onPress, style, label, ...rest }: any) => {
  if (Platform.OS === "web") {
    return (
      <TouchableOpacity onPress={onPress} style={style}>
        <Text style={rest.iconColor ? { color: rest.iconColor } : {}}>
          {label || icon}
        </Text>
      </TouchableOpacity>
    );
  }
  return <IconButton icon={icon} onPress={onPress} style={style} {...rest} />;
};

const ProfessorScreen = ({ navigation }: { navigation: any }) => {
  const theme = useTheme();
  const route = useRoute<{
    key: string;
    name: string;
    params: { fromLogin: any; email?: string };
  }>();
  const { height } = Dimensions.get("window");

  const url_searchEvents = `${config.baseUrl}/calendarioFiles/professor/eventos/fetch_events.php`;
  const url_fetchTasksData = `${config.baseUrl}/calendarioFiles/professor/tarefas/fetch_tasks.php`;
  const url_deleteTask = `${config.baseUrl}/calendarioFiles/professor/tarefas/delete_task.php`;
  const url_deleteEvent = `${config.baseUrl}/calendarioFiles/professor/eventos/delete_event.php`;
  const url_updateTask = `${config.baseUrl}/calendarioFiles/professor/tarefas/update_task.php`;
  const url_updateEvent = `${config.baseUrl}/calendarioFiles/professor/eventos/update_event.php`;
  const url_fetchTurmas = `${config.baseUrl}/calendarioFiles/professor/fetch_turmas.php`;

  const [formData, setFormData] = useState({ email: "", aluno_id: null });
  const [userThemeLocal, setUserThemeLocal] = useState<"light" | "dark">(
    "light"
  );
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [userTheme, setUserTheme] = useState<"light" | "dark">(
    theme.dark ? "dark" : "light"
  );
  const [loading, setLoading] = useState(true);

  const [bigCalendarEvents, setBigCalendarEvents] = useState<IMyEvent[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmationModalVisible, setConfirmationModalVisible] =
    useState(false);
  const [updateConfirmModalVisible, setUpdateConfirmModalVisible] =
    useState(false);
  const [selectedItem, setSelectedItem] = useState<IMyEvent | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescricao, setEditedDescricao] = useState("");
  const [editedDataTarefa, setEditedDataTarefa] = useState<Date>(new Date());
  const [editedStart, setEditedStart] = useState<Date>(new Date());
  const [editedEnd, setEditedEnd] = useState<Date>(new Date());
  const [taskColor, setTaskColor] = useState("#47AD4D");
  const [showColorModal, setShowColorModal] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"date" | "time">("date");
  const [datePickerTarget, setDatePickerTarget] = useState<
    "dataTarefa" | "start" | "end" | null
  >(null);

  const [turmas, setTurmas] = useState<
    { id: number; turma: string; ano: number }[]
  >([]);
  const [editedTurmaId, setEditedTurmaId] = useState<number | null>(null);
  const [editedFile, setEditedFile] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filePreviewModalVisible, setFilePreviewModalVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    uri: string;
    name: string;
    type?: string;
  } | null>(null);

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
      } catch {
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  useEffect(() => {
    if (selectedItem) {
      setEditedTitle(selectedItem.title);
      setEditedDescricao(selectedItem.descricao || "");
      if (selectedItem.type === "task" && selectedItem.data_da_tarefa) {
        setEditedDataTarefa(
          new Date(selectedItem.data_da_tarefa.replace(" ", "T"))
        );
      }
      if (selectedItem.type === "event") {
        setEditedStart(new Date(selectedItem.start));
        setEditedEnd(new Date(selectedItem.end));
      }
      if (selectedItem.color) {
        setTaskColor(selectedItem.color);
      }
      if (selectedItem.turma_id) {
        setEditedTurmaId(selectedItem.turma_id);
      }
    }
  }, [selectedItem]);

  useEffect(() => {
    if (route.params?.email) {
      setFormData((prev) => ({ ...prev, email: route.params.email }));
      fetchTasks(route.params.email);
      fetchEvents(route.params.email);
    }
  }, [route.params?.email]);

  useEffect(() => {
    setUserThemeLocal(userTheme);
  }, [userTheme]);

  const fetchTurmas = useCallback(() => {
    axios
      .post(url_fetchTurmas, { email: formData.email })
      .then((res) => {
        if (res.data.success) {
          setTurmas(res.data.turmas);
        }
      })
      .catch((err) => console.log("", err));
  }, [url_fetchTurmas, formData.email]);

  useEffect(() => {
    fetchTurmas();
  }, [fetchTurmas]);

  const onRefresh = () => {
    setRefreshing(true);
    if (formData.email) {
      fetchEvents(formData.email);
      fetchTasks(formData.email);
    }
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleQRCodeScan = () => {
    navigation.navigate("GenerateQRCodeScreen", { email: formData.email });
  };

  const handleDeleteTask = () => {
    if (!selectedItem || !selectedItem.id) return;
    axios
      .post(url_deleteTask, {
        tarefa_id: selectedItem.id,
        email: formData.email,
      })
      .then((response) => {
        if (response.data.success) {
          setBigCalendarEvents((prev) =>
            prev.filter((ev) => ev.id !== selectedItem.id)
          );
          setTasks((prev) =>
            prev.filter((task) => task.id !== selectedItem.id)
          );
          setDetailModalVisible(false);
          setSelectedItem(null);
          Alert.alert("Tarefa apagada com sucesso.");
        } else {
          Alert.alert("Erro", response.data.message);
        }
      })
      .catch((error) => {
        Alert.alert("Erro ao apagar a tarefa.");
      });
  };

  const handleDeleteEvent = () => {
    if (!selectedItem || !selectedItem.id) return;
    axios
      .post(url_deleteEvent, {
        event_id: selectedItem.id,
        email: formData.email,
      })
      .then((response) => {
        if (response.data.success) {
          setBigCalendarEvents((prev) =>
            prev.filter((ev) => ev.id !== selectedItem.id)
          );
          setDetailModalVisible(false);
          setSelectedItem(null);
          Alert.alert("Evento apagado com sucesso.");
        } else {
          Alert.alert("Erro", response.data.message);
        }
      })
      .catch((error) => {
        Alert.alert("Erro ao apagar o evento.");
      });
  };

  const handleDeleteItem = () => {
    if (selectedItem?.type === "task") {
      handleDeleteTask();
    } else if (selectedItem?.type === "event") {
      handleDeleteEvent();
    }
  };

  const confirmDelete = () => {
    setConfirmationModalVisible(true);
  };

  const onConfirmDelete = () => {
    setConfirmationModalVisible(false);
    handleDeleteItem();
  };

  const fetchEvents = useCallback((email: string) => {
    if (!email) return;
    axios
      .post(url_searchEvents, { email })
      .then((response) => {
        if (Array.isArray(response.data)) {
          const newEvents: IMyEvent[] = response.data.map((event: any) => {
            const start = new Date(event.start_datetime.replace(" ", "T"));
            const end = new Date(event.end_datetime.replace(" ", "T"));
            return {
              id: event.id || `${event.start_datetime}-${event.title}`,
              title: event.title,
              start,
              end,
              color: event.color || "#47AD4D",
              type: "event",
              descricao: event.descricao,
              turma_id: event.turma_id,
            };
          });
          setBigCalendarEvents(newEvents);
        }
      })
      .catch(() => {});
  }, []);

  const fetchTasks = (email: string) => {
    if (!email) return;
    axios
      .post(url_fetchTasksData, { email })
      .then((response) => {
        if (response.data.success && Array.isArray(response.data.tasks)) {
          setTasks(response.data.tasks);
        } else {
          setTasks([]);
        }
      })
      .catch((error) => {});
  };

  const handleCalendarCellPress = (date: Date) => {
    setSelectedDay(date);
  };

  const handleCalendarEventPress = (event: IMyEvent) => {
    setSelectedItem(event);
    setIsEditing(false);
    setDetailModalVisible(true);
  };

  const taskEvents = tasks.map((task): IMyEvent => {
    const rawDate = new Date(task.data_da_tarefa.replace(" ", "T"));
    const minutes = rawDate.getMinutes();
    let startDate: Date;
    let endDate: Date;
    if (minutes < 30) {
      startDate = rawDate;
      endDate = new Date(rawDate.getTime() + 30 * 60 * 1000);
    } else {
      startDate = new Date(rawDate.getTime() - 30 * 60 * 1000);
      endDate = rawDate;
    }
    return {
      id: task.id.toString(),
      title: task.titulo,
      start: startDate,
      end: endDate,
      color: task.cores,
      type: "task",
      descricao: task.descricao,
      data_da_tarefa: task.data_da_tarefa,
      turma_id: task.turma_id,
    };
  });

  const combinedEvents = [...bigCalendarEvents, ...taskEvents];
  const dayEvents = combinedEvents.filter((ev) => {
    if (!selectedDay) return false;
    return ev.start.toDateString() === selectedDay.toDateString();
  });

  const pickFile = async () => {
    if (Platform.OS === "web") {
      fileInputRef.current?.click();
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: "*/*",
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const { uri, name, mimeType } = asset;

        const fileObj = {
          uri,
          name,
          type: mimeType ?? "application/octet-stream",
        };

        setEditedFile(fileObj);
        setPreviewFile(fileObj);
        setFilePreviewModalVisible(true);
      }
    } catch (err) {}
  };

  const handleEditPress = () => {
    if (!isEditing) {
      setIsEditing(true);
    } else {
      setUpdateConfirmModalVisible(true);
    }
  };

  const handleUpdate = () => {
    if (!selectedItem) return;

    const data = new FormData();

    if (selectedItem.type === "task") {
      data.append("tarefa_id", selectedItem.id);
      data.append("email", formData.email);
      data.append("titulo", editedTitle);
      data.append("color", taskColor);
      data.append("descricao", editedDescricao);
      data.append("data_da_tarefa", formatDateTime(editedDataTarefa));
      data.append("turma_id", String(editedTurmaId));
    } else {
      data.append("event_id", selectedItem.id);
      data.append("email", formData.email);
      data.append("title", editedTitle);
      data.append("descricao", editedDescricao);
      data.append("start_datetime", formatDateTime(editedStart));
      data.append("end_datetime", formatDateTime(editedEnd));
      data.append("turma_id", String(editedTurmaId));
      if (editedFile) {
        data.append("file", {
          uri: editedFile.uri,
          name: editedFile.name,
          type: editedFile.type || "application/octet-stream",
        } as any);
      }
    }

    const url = selectedItem.type === "task" ? url_updateTask : url_updateEvent;

    axios
      .post(url, data, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((response) => {
        if (response.data.success) {
          Alert.alert(
            selectedItem.type === "task"
              ? "Tarefa atualizada."
              : "Evento atualizado.",
            "Agora os alunos as alterações feitas agora por si. "
          );
          setIsEditing(false);
          setUpdateConfirmModalVisible(false);
          if (selectedItem.type === "task") {
            fetchTasks(formData.email);
            fetchEvents(formData.email);
          } else {
            fetchEvents(formData.email);
          }
          setDetailModalVisible(false);
        } else {
          Alert.alert("Erro", response.data.message);
        }
      })
      .catch(() => {
        Alert.alert(
          "problemas",
          "Ocorreu um erro enquanto o tentavamso conectar aos nossos servidores. Pedimos que tente novamente mais tarde."
        );
      });
  };

  const formatDateTime = (date: Date) => {
    const pad = (n: number) => (n < 10 ? "0" + n : n);
    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      " " +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes())
    );
  };

  const openDateTimePicker = (
    target: "dataTarefa" | "start" | "end",
    mode: "date" | "time"
  ) => {
    setDatePickerTarget(target);
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const onDateTimeChange = (event: any, selected?: Date) => {
    // se o utilizador cancelou
    if (event.type === "dismissed" || !selected) {
      setShowDatePicker(false);
      setDatePickerMode("date");
      setDatePickerTarget(null);
      return;
    }

    const picked = selected;
    // qual campo estamos a editar?
    switch (datePickerTarget) {
      case "dataTarefa":
        if (datePickerMode === "date") {
          // guardamos a data mantendo a hora antiga
          setEditedDataTarefa((prev) => {
            const d = new Date(picked);
            d.setHours(prev.getHours(), prev.getMinutes());
            return d;
          });
          // avança para escolher hora
          setDatePickerMode("time");
          setShowDatePicker(true);
        } else {
          // hora
          setEditedDataTarefa((prev) => {
            const d = new Date(prev);
            d.setHours(picked.getHours(), picked.getMinutes());
            return d;
          });
          setShowDatePicker(false);
          setDatePickerMode("date");
          setDatePickerTarget(null);
        }
        break;

      case "start":
        if (datePickerMode === "date") {
          setEditedStart((prev) => {
            const d = new Date(picked);
            d.setHours(prev.getHours(), prev.getMinutes());
            return d;
          });
          setDatePickerMode("time");
          setShowDatePicker(true);
        } else {
          setEditedStart((prev) => {
            const d = new Date(prev);
            d.setHours(picked.getHours(), picked.getMinutes());
            return d;
          });
          setShowDatePicker(false);
          setDatePickerMode("date");
          setDatePickerTarget(null);
        }
        break;

      case "end":
        if (datePickerMode === "date") {
          setEditedEnd((prev) => {
            const d = new Date(picked);
            d.setHours(prev.getHours(), prev.getMinutes());
            return d;
          });
          setDatePickerMode("time");
          setShowDatePicker(true);
        } else {
          setEditedEnd((prev) => {
            const d = new Date(prev);
            d.setHours(picked.getHours(), picked.getMinutes());
            return d;
          });
          setShowDatePicker(false);
          setDatePickerMode("date");
          setDatePickerTarget(null);
        }
        break;

      default:
        setShowDatePicker(false);
        setDatePickerMode("date");
        setDatePickerTarget(null);
    }
  };

  const renderConfirmationModal = () => (
    <Modal visible={confirmationModalVisible} animationType="fade" transparent>
      <View style={styles.confirmationOverlay}>
        <View style={styles.confirmationContainer}>
          <Text style={styles.confirmationText}>
            Tem a certeza que deseja apagar este{" "}
            {selectedItem?.type === "task" ? "a tarefa" : "o evento"}?
          </Text>
          <View style={styles.confirmationButtons}>
            <Button
              mode="contained"
              onPress={() => setConfirmationModalVisible(false)}
              style={styles.cancelButton}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={onConfirmDelete}
              style={styles.confirmButton}
            >
              Confirmar
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderUpdateConfirmModal = () => (
    <Modal visible={updateConfirmModalVisible} animationType="fade" transparent>
      <View style={styles.confirmationOverlay}>
        <View style={styles.confirmationContainer}>
          <Text style={styles.confirmationText}>
            Tem a certeza que deseja guardar as alterações?
          </Text>
          <View style={styles.confirmationButtons}>
            <Button
              mode="contained"
              onPress={() => setUpdateConfirmModalVisible(false)}
              style={styles.cancelButton}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleUpdate}
              style={styles.confirmButton}
            >
              Confirmar
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDetailModal = () => {
    if (!selectedItem) return null;

    const isWeb = Platform.OS === "web";
    const modalBg = styles.modalBg;
    const boxStyle = isWeb ? styles.webModalBox : styles.mobileModalBox;

    return (
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <ImageBackground
          source={
            backgroundUrl
              ? { uri: backgroundUrl }
              : require("../../assets/images/bg1.jpg")
          }
          style={modalBg}
        >
          {/* Cabeçalho */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                setSelectedItem(null);
                setDetailModalVisible(false);
                setIsEditing(false);
              }}
              style={{ flex: 1 }}
            >
              <Image
                source={require("../../assets/icons/angle-left.png")}
                style={[styles.backIcon, { tintColor: dynamicTextColor }]}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAccountModalVisible(true)}
              style={{ flex: 1, alignItems: "flex-end" }}
            >
              <Image
                source={require("../../assets/icons/user.png")}
                style={[styles.userIcon, { tintColor: dynamicTextColor }]}
              />
            </TouchableOpacity>
          </View>

          {/* Conteúdo */}
          <View style={boxStyle}>
            <ScrollView contentContainerStyle={styles.configModalContainer}>
              <Text style={styles.warningText}>
                {selectedItem.type === "task"
                  ? isEditing
                    ? "Editar tarefa"
                    : "Visualização da tarefa"
                  : isEditing
                    ? "Editar evento"
                    : "Visualização do evento"}
              </Text>

              {!isEditing ? (
                // **Resumo**
                <View style={styles.summaryContainer}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Título:</Text>
                    <Text style={styles.summaryValue}>
                      {selectedItem.title}
                    </Text>
                  </View>
                  {selectedItem.type === "task" ? (
                    <>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Descrição:</Text>
                        <Text style={styles.summaryValue}>
                          {selectedItem.descricao || "—"}
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Data/Hora:</Text>
                        <Text style={styles.summaryValue}>
                          {selectedItem.data_da_tarefa}
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Turma/Ano:</Text>
                        <Text style={styles.summaryValue}>
                          {turmas.find((t) => t.id === selectedItem.turma_id)
                            ? `Turma ${turmas.find((t) => t.id === selectedItem.turma_id)!.turma} (Ano ${turmas.find((t) => t.id === selectedItem.turma_id)!.ano})`
                            : "—"}
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Cor:</Text>
                        <View
                          style={[
                            styles.colorCircle,
                            { backgroundColor: selectedItem.color || "#000" },
                          ]}
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Início:</Text>
                        <Text style={styles.summaryValue}>
                          {new Date(selectedItem.start).toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Fim:</Text>
                        <Text style={styles.summaryValue}>
                          {new Date(selectedItem.end).toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Descrição:</Text>
                        <Text style={styles.summaryValue}>
                          {selectedItem.descricao || "—"}
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Turma/Ano:</Text>
                        <Text style={styles.summaryValue}>
                          {turmas.find((t) => t.id === selectedItem.turma_id)
                            ? `Turma ${turmas.find((t) => t.id === selectedItem.turma_id)!.turma} (Ano ${turmas.find((t) => t.id === selectedItem.turma_id)!.ano})`
                            : "—"}
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Cor:</Text>
                        <View
                          style={[
                            styles.colorCircle,
                            { backgroundColor: selectedItem.color || "#000" },
                          ]}
                        />
                      </View>
                    </>
                  )}

                  <Button
                    mode="outlined"
                    onPress={() => setIsEditing(true)}
                    style={styles.editButton}
                    labelStyle={{ color: "#47AD4D" }}
                  >
                    Editar
                  </Button>
                </View>
              ) : (
                // **Formulário de Edição**
                <>
                  {/* TÍTULO */}
                  <Text style={[styles.label, { color: dynamicTextColor }]}>
                    Título
                  </Text>
                  <TextInput
                    mode="outlined"
                    value={editedTitle}
                    onChangeText={setEditedTitle}
                    style={styles.input}
                  />

                  {selectedItem.type === "task" ? (
                    <>
                      {/* DATA + HORA DA TAREFA */}
                      {isWeb ? (
                        <>
                          <Text
                            style={[styles.label, { color: dynamicTextColor }]}
                          >
                            Data
                          </Text>
                          <Text style={styles.webInput}>
                            <input
                              type="date"
                              value={editedDataTarefa
                                .toISOString()
                                .slice(0, 10)}
                              onChange={(e) => {
                                const [y, m, d] = e.target.value.split("-");
                                const dt = new Date(editedDataTarefa);
                                dt.setFullYear(+y, +m - 1, +d);
                                setEditedDataTarefa(dt);
                              }}
                            />
                          </Text>
                          <Text
                            style={[styles.label, { color: dynamicTextColor }]}
                          >
                            Hora
                          </Text>
                          <Text style={styles.webInput}>
                            <input
                              type="time"
                              value={formatDateTime(editedDataTarefa).slice(11)}
                              onChange={(e) => {
                                const [h, min] = e.target.value.split(":");
                                const dt = new Date(editedDataTarefa);
                                dt.setHours(+h, +min);
                                setEditedDataTarefa(dt);
                              }}
                            />
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text
                            style={[styles.label, { color: dynamicTextColor }]}
                          >
                            Data da Tarefa
                          </Text>
                          <TextInput
                            mode="outlined"
                            value={formatDateTime(editedDataTarefa)}
                            editable={false}
                            right={
                              <TextInput.Icon
                                icon="calendar"
                                onPress={() =>
                                  openDateTimePicker("dataTarefa", "date")
                                }
                              />
                            }
                            style={styles.input}
                          />
                        </>
                      )}

                      {/* DESCRIÇÃO */}
                      <Text style={[styles.label, { color: dynamicTextColor }]}>
                        Descrição
                      </Text>
                      <TextInput
                        mode="outlined"
                        value={editedDescricao}
                        onChangeText={setEditedDescricao}
                        multiline
                        style={[styles.input, { minHeight: 60 }]}
                      />
                    </>
                  ) : (
                    <>
                      {/* INÍCIO / FIM do EVENTO */}
                      {isWeb ? (
                        <>
                          <Text
                            style={[styles.label, { color: dynamicTextColor }]}
                          >
                            Data Início
                          </Text>
                          <Text style={styles.webInput}>
                            <input
                              type="date"
                              value={editedStart.toISOString().slice(0, 10)}
                              onChange={(e) => {
                                const [y, m, d] = e.target.value.split("-");
                                const dt = new Date(editedStart);
                                dt.setFullYear(+y, +m - 1, +d);
                                setEditedStart(dt);
                              }}
                            />
                          </Text>
                          <Text
                            style={[styles.label, { color: dynamicTextColor }]}
                          >
                            Hora Início
                          </Text>
                          <Text style={styles.webInput}>
                            <input
                              type="time"
                              value={formatDateTime(editedStart).slice(11)}
                              onChange={(e) => {
                                const [h, min] = e.target.value.split(":");
                                const dt = new Date(editedStart);
                                dt.setHours(+h, +min);
                                setEditedStart(dt);
                              }}
                            />
                          </Text>

                          <Text
                            style={[styles.label, { color: dynamicTextColor }]}
                          >
                            Data Fim
                          </Text>
                          <Text style={styles.webInput}>
                            <input
                              type="date"
                              value={editedEnd.toISOString().slice(0, 10)}
                              onChange={(e) => {
                                const [y, m, d] = e.target.value.split("-");
                                const dt = new Date(editedEnd);
                                dt.setFullYear(+y, +m - 1, +d);
                                setEditedEnd(dt);
                              }}
                            />
                          </Text>
                          <Text
                            style={[styles.label, { color: dynamicTextColor }]}
                          >
                            Hora Fim
                          </Text>
                          <Text style={styles.webInput}>
                            <input
                              type="time"
                              value={formatDateTime(editedEnd).slice(11)}
                              onChange={(e) => {
                                const [h, min] = e.target.value.split(":");
                                const dt = new Date(editedEnd);
                                dt.setHours(+h, +min);
                                setEditedEnd(dt);
                              }}
                            />
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text
                            style={[styles.label, { color: dynamicTextColor }]}
                          >
                            Data de Início
                          </Text>
                          <TextInput
                            mode="outlined"
                            value={formatDateTime(editedStart)}
                            editable={false}
                            right={
                              <TextInput.Icon
                                icon="calendar"
                                onPress={() =>
                                  openDateTimePicker("start", "date")
                                }
                              />
                            }
                            style={styles.input}
                          />
                          <Text
                            style={[styles.label, { color: dynamicTextColor }]}
                          >
                            Data de Fim
                          </Text>
                          <TextInput
                            mode="outlined"
                            value={formatDateTime(editedEnd)}
                            editable={false}
                            right={
                              <TextInput.Icon
                                icon="calendar"
                                onPress={() =>
                                  openDateTimePicker("end", "date")
                                }
                              />
                            }
                            style={styles.input}
                          />
                        </>
                      )}
                      {/* Descrição do evento */}
                      <Text style={[styles.label, { color: dynamicTextColor }]}>
                        Descrição
                      </Text>
                      <TextInput
                        mode="outlined"
                        value={editedDescricao}
                        onChangeText={setEditedDescricao}
                        style={styles.input}
                      />
                    </>
                  )}

                  {/* TURMA / ANO */}
                  <Text style={[styles.label, { color: dynamicTextColor }]}>
                    Turma / Ano
                  </Text>
                  <View style={[styles.inputContainer]}>
                    <Picker
                      selectedValue={editedTurmaId}
                      onValueChange={(val) => setEditedTurmaId(val)}
                    >
                      {turmas.map((t) => (
                        <Picker.Item
                          key={t.id}
                          label={`Turma ${t.turma} (Ano ${t.ano})`}
                          value={t.id}
                        />
                      ))}
                    </Picker>
                  </View>

                  {/* COR */}
                  <Text style={[styles.label, { color: dynamicTextColor }]}>
                    Cor
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowColorModal(true)}
                    style={styles.selectedColorDisplay}
                  >
                    <View
                      style={[
                        styles.colorCircle,
                        { backgroundColor: taskColor },
                      ]}
                    />
                    <Text style={{ color: dynamicTextColor }}>
                      Clique para alterar cor
                    </Text>
                  </TouchableOpacity>

                  {/* Botões */}
                  <View style={styles.buttonsRow}>
                    <Button
                      mode="contained"
                      onPress={handleUpdate}
                      style={styles.saveButtonSmall}
                    >
                      Salvar
                    </Button>
                    <Button
                      mode="contained"
                      onPress={handleDeleteItem}
                      style={styles.deleteButtonSmall}
                    >
                      Apagar
                    </Button>
                  </View>

                  <Button
                    mode="text"
                    onPress={() => setIsEditing(false)}
                    labelStyle={{ color: "#47AD4D" }}
                  >
                    Cancelar
                  </Button>
                </>
              )}
            </ScrollView>
          </View>

          {/* DateTimePicker Mobile */}
          {!isWeb && showDatePicker && (
            <DateTimePicker
              value={
                datePickerTarget === "dataTarefa"
                  ? editedDataTarefa
                  : datePickerTarget === "start"
                    ? editedStart
                    : editedEnd
              }
              mode={datePickerMode}
              is24Hour
              display="default"
              onChange={onDateTimeChange}
            />
          )}
        </ImageBackground>
      </Modal>
    );
  };

  const dynamicTextColor = userTheme === "dark" ? "#e0dede" : "#000";
  if (loading) {
    return (
      <ImageBackground
        source={
          backgroundUrl
            ? { uri: backgroundUrl }
            : require("../../assets/images/bg1.jpg")
        }
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
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
          <Text
            style={{ fontSize: 18, marginTop: 10, color: dynamicTextColor }}
          >
            A Carregar os registros...
          </Text>
        </View>
      </ImageBackground>
    );
  }

  const dynamicHeaderBackground =
    userThemeLocal === "dark" ? "#222" : theme.colors.surface;

  return (
    <ImageBackground
      source={
        backgroundUrl
          ? { uri: backgroundUrl }
          : require("../../assets/images/bg1.jpg")
      }
      style={styles.background}
    >
      {userThemeLocal === "dark" && <View style={styles.overlay} />}
     <StatusBar
        backgroundColor={userTheme === "dark" ? "#000000" : "#ffffff"}
        translucent
        barStyle={userTheme === "dark" ? "light-content" : "dark-content"}
      />

      <SafeAreaView style={styles.safeContainer}>
        <View
          style={{
            width: "100%",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop:
              Platform.OS === "web" ? 40 : StatusBar.currentHeight || 20,
            paddingHorizontal: 10,
            paddingBottom: 10,
            position: "absolute",
            top: 0,
            zIndex: 10,
            backgroundColor: "white",
          }}
        >
          <TouchableOpacity onPress={() => setMenuModalVisible(true)}>
            <Image
              source={require("../../assets/icons/menu-burger.png")}
              style={{
                width: Platform.OS === "web" ? 35 : 23,
                height: Platform.OS === "web" ? 35 : 25,
                marginLeft: 3,
                marginTop: Platform.OS === "web" ? -15 : 3,
                tintColor: userTheme === "dark" ? "#FFFFFF" : "#000",
              }}
            />
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("PersonalizarTarefaProf", {
                  email: formData.email,
                })
              }
              style={{ marginRight: 20 }}
            >
              <Image
                source={require("../../assets/icons/list-check.png")}
                style={{
                  width: Platform.OS === "web" ? 30 : 23,
                  height: Platform.OS === "web" ? 30 : 25,
                  tintColor: userTheme === "dark" ? "#FFFFFF" : "#000",
                }}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAccountModalVisible(true)}>
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
        </View>

        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.calendarBox}>
            <BigCalendar
              events={combinedEvents}
              height={Platform.OS === "web" ? height * 0.8 : height * 0.75}
              mode="month"
              swipeEnabled={true}
              weekStartsOn={1}
              showTime={false}
              onPressCell={handleCalendarCellPress}
              onPressEvent={handleCalendarEventPress}
              eventCellStyle={(event) =>
                event.color ? { backgroundColor: event.color } : {}
              }
            />
          </View>
          {selectedDay && (
            <View style={{ padding: 10 }}>
              <Text style={styles.dayHeader}>
                Eventos e tarefas de {selectedDay.toLocaleDateString()}
              </Text>
              <ScrollView style={{ maxHeight: 200 }}>
                {combinedEvents
                  .filter(
                    (ev) =>
                      ev.start.toDateString() === selectedDay.toDateString()
                  )
                  .sort((a, b) => a.start.getTime() - b.start.getTime())
                  .map((ev) => (
                    <TouchableOpacity
                      key={ev.id}
                      style={[styles.eventItem, { backgroundColor: ev.color }]}
                      onPress={() => handleCalendarEventPress(ev)}
                    >
                      <Text style={styles.eventTitle}>{ev.title}</Text>
                      <Text style={styles.eventTime}>
                        {ev.start.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" – "}
                        {ev.end.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </TouchableOpacity>
                  ))}
                {combinedEvents.filter(
                  (ev) => ev.start.toDateString() === selectedDay.toDateString()
                ).length === 0 && (
                  <Text style={styles.noEventsText}>
                    Nenhum evento ou tarefa neste dia.
                  </Text>
                )}
              </ScrollView>
            </View>
          )}
          <TouchableOpacity
            onPress={() =>
              navigation.navigate(
                Platform.OS === "web"
                  ? "AddEventsScreenWeb"
                  : "addEventListener",
                { email: formData.email }
              )
            }
            style={[
              styles.plusButtonContainer,
              { backgroundColor: userTheme === "dark" ? "#FFF" : "#000" },
            ]}
          >
            <Image
              source={require("../../assets/icons/plus.png")}
              style={[
                styles.plusIcon,
                { tintColor: userTheme === "dark" ? "#000" : "#FFF" },
              ]}
            />
          </TouchableOpacity>
        </ScrollView>
        {renderDetailModal()}

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
                { backgroundColor: dynamicHeaderBackground },
              ]}
            >
              <Text style={[styles.menuTitle, { color: dynamicTextColor }]}>
                Menu
              </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("alunosDoProfScreen", {
                    email: formData.email,
                  })
                }
                style={[
                  styles.menuLink,
                  { flexDirection: "row", alignItems: "center" },
                ]}
              >
                {Platform.OS !== "web" && (
                  <CustomIconButton
                    icon="book-open"
                    label="Disciplinas"
                    size={24}
                    iconColor={dynamicTextColor}
                  />
                )}
                <Text style={[styles.menuText, { color: dynamicTextColor }]}>
                  Alunos que dou aulas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("AdicionarNotas", {
                    email: formData.email,
                  })
                }
                style={[
                  styles.menuLink,
                  { flexDirection: "row", alignItems: "center" },
                ]}
              >
                {Platform.OS !== "web" && (
                  <CustomIconButton
                    icon="book-open"
                    label="Disciplinas"
                    size={24}
                    iconColor={dynamicTextColor}
                  />
                )}
                <Text style={[styles.menuText, { color: dynamicTextColor }]}>
                  Atribuir notas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("almocoProfScreen", {
                    email: formData.email,
                  })
                }
                style={[
                  styles.menuLink,
                  { flexDirection: "row", alignItems: "center" },
                ]}
              >
                {Platform.OS !== "web" && (
                  <CustomIconButton
                    icon="calendar-clock"
                    label="Eventos"
                    size={24}
                    iconColor={dynamicTextColor}
                  />
                )}
                <Text style={[styles.menuText, { color: dynamicTextColor }]}>
                  Marcar almoço
                </Text>
              </TouchableOpacity>
              {Platform.OS !== "web" && (
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
                  <CustomIconButton
                    icon="qrcode"
                    label="QrCode"
                    size={24}
                    iconColor={dynamicTextColor}
                  />
                  <Text style={[styles.menuText, { color: dynamicTextColor }]}>
                    QrCode
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
        </Modal>
        <ModalConfig
          visible={accountModalVisible}
          dynamicHeaderBackground="white"
          dynamicTextColor="black"
          onClose={() => setAccountModalVisible(false)}
          navigation={navigation}
          email={formData.email}
        />
        <Modal visible={showColorModal} animationType="slide" transparent>
          <View style={styles.colorModalOverlay}>
            <View style={styles.colorModalContainer}>
              <Text style={[styles.modalTitle, { color: dynamicTextColor }]}>
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
                  <Text style={[styles.colorName, { color: dynamicTextColor }]}>
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
                  <Text style={[styles.colorName, { color: dynamicTextColor }]}>
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

        <Modal
          visible={filePreviewModalVisible}
          transparent
          animationType="slide"
        >
          <View style={styles.previewOverlay}>
            <View style={styles.previewContainer}>
              {previewFile?.uri.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                <Image
                  source={{ uri: previewFile.uri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.previewText}>{previewFile?.name}</Text>
              )}
              <View style={styles.previewButtons}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setEditedFile(null);
                    setPreviewFile(null);
                    setFilePreviewModalVisible(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={() => {
                    setFilePreviewModalVisible(false);
                  }}
                >
                  Escolher
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  modalBg: { flex: 1 },
  mobileModalBox: {
    flex: 1,
    marginTop: Platform.OS === "web" ? 90 : 70,
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    marginBottom: 190,
    padding: 20,
  },
  webModalBox: {
    marginTop: 120,
    width: "90%",
    maxWidth: 700,
    maxHeight: "85%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 40,
    alignSelf: "center",
  },
  configModalContainer: {
    padding: 30,
    paddingBottom: 50,
  },
  editButton: {
    alignSelf: "flex-end",
    marginTop: 10,
    borderColor: "#47AD4D",
    borderWidth: 1,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 16,
  },
  saveButtonSmall: { flex: 1, marginRight: 8, backgroundColor: "#47AD4D" },
  deleteButtonSmall: { flex: 1, marginLeft: 8, backgroundColor: "#FF5733" },
  label: { marginBottom: 8, fontSize: 18 },
  input: { marginBottom: 20, height: 50 },
  summaryContainer: {
    backgroundColor: "#F9F9F9",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  summaryLabel: {
    flex: 1,
    fontWeight: "600",
    fontSize: 16,
    color: "##000",
  },
  summaryValue: {
    flex: 2,
    fontSize: 16,
    color: "#000",
    textAlign: "right",
  },
  dayHeader: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  eventItem: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 6,
  },
  eventTitle: {
    fontWeight: "bold",
    color: "#fff",
  },
  eventTime: {
    color: "#fff",
    fontSize: 12,
  },
  noEventsText: {
    fontStyle: "italic",
    color: "#666",
  },
  closeButton: {
    position: "absolute",
    top: Platform.OS === "web" ? 20 : 10,
    right: 10,
    padding: 10,
    zIndex: 10,
  },
  closeIcon: { width: 24, height: 24 },
  colorModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  webInput: { marginBottom: 12, padding: 8, borderWidth: 1, borderRadius: 4 },
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
  colorCircle: { width: 24, height: 24, borderRadius: 12, marginRight: 10 },
  colorName: { fontSize: 16, marginLeft: 10 },
  modalCloseButton: { marginTop: 10, backgroundColor: "#47AD4D" },
  fab: {
    position: "absolute",
    bottom: -60,
    left: "52.5%",
    transform: [{ translateX: -50 }],
    borderRadius: 20,
    backgroundColor: "#47AD4D",
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedDatesScroll: { maxHeight: 550, marginTop: 10 },
  selectedDateItem: { width: "48%", marginBottom: 5, alignItems: "center" },
  selectedDatesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 150,
    paddingHorizontal: 10,
  },
  selectedDateText: {
    fontSize: 14,
    color: "black",
    width: "48%",
    textAlign: "center",
    padding: 5,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 5,
    marginBottom: 5,
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: { width: "95%", height: "90%", borderRadius: 15, padding: 20 },
  backButton: { position: "absolute", top: 30, left: 20, zIndex: 10 },
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
  background: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  safeContainer: { flex: 1 },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "web" ? 40 : StatusBar.currentHeight || 20,
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: "white",
    position: "absolute",
    top: 0,
    zIndex: 10,
  },
  menuIcon: { marginRight: 10, marginTop: 35 },
  plusButtonContainer: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    width: 45,
    height: 45,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  plusIcon: { width: 25, height: 25 },
  todoIcon: { marginRight: 0, marginTop: 35 },
  headerButtons: { flexDirection: "row", marginLeft: "auto" },
  accontIcon: { marginRight: 0, marginTop: 35 },
  container: {
    flex: 1,
    marginTop: Platform.OS === "web" ? 50 : StatusBar.currentHeight + 40 || 70,
  },
  calendarBox: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 10,
    margin: 10,
    elevation: 3,
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loaderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  dayModalContainer: { flex: 1, backgroundColor: "#fff" },
  dayModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    borderBottomWidth: 1,
    borderColor: "#ccc",
    height: 55,
  },
  dayModalTitle: { fontSize: 20, fontWeight: "bold" },
  badge: {
    marginTop: 60,
    position: "absolute",
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    backgroundColor: "red",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeOnListCheck: {
    position: "absolute",
    bottom: -11,
    right: -12,
    backgroundColor: "red",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  configHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  configHeaderTitle: { fontSize: 20, fontWeight: "bold", marginLeft: 10 },
  backIcon: {
    width: Platform.OS === "web" ? 35 : 25,
    height: Platform.OS === "web" ? 35 : 25,
    tintColor: "#000",
  },
  userIcon: {
    width: Platform.OS === "web" ? 35 : 25,
    height: Platform.OS === "web" ? 35 : 25,
    tintColor: "#000",
  },
  nonEditableInput: { backgroundColor: "#ddd" },
  warningText: { fontSize: 14, marginBottom: 10 },
  selectedColorDisplay: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    marginBottom: 15,
  },
  saveButton: { marginVertical: 10 },
  inputContainer: {
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginBottom: 15,
    minHeight: 40,
  },
  colorSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    padding: 13,
    borderRadius: 5,
    backgroundColor: "#47AD4D",
  },
  deleteButton: {
    backgroundColor: "red",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 10,
  },
  deleteButtonText: { color: "white", fontWeight: "bold" },
  confirmationOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmationContainer: {
    width: "80%",
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmationText: { fontSize: 18, marginBottom: 20, textAlign: "center" },
  confirmationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  cancelButton: { backgroundColor: "#ccc", marginRight: 10 },
  confirmButton: { backgroundColor: "#47AD4D" },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewContainer: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  previewImage: {
    width: 200,
    height: 200,
    marginBottom: 15,
  },
  previewText: {
    marginBottom: 15,
    fontSize: 16,
  },
  previewButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
});

export default ProfessorScreen;
