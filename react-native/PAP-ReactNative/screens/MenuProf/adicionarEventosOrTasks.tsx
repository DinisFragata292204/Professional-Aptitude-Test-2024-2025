import React, { useState, useEffect } from "react";
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Platform, 
  ImageBackground, 
  ActivityIndicator, 
  Modal, 
  TouchableOpacity, 
  Alert, 
  Image, 
  StatusBar
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Text, TextInput, Button, useTheme, IconButton } from "react-native-paper";
import { Calendar as BigCalendar } from "react-native-big-calendar";
import axios from "axios";
import config from "../../config/config_db";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import ModalConfig from "../../components/modalConfig";

let ToastAndroid: any = null;
if (Platform.OS === "android") {
  ToastAndroid = require("react-native").ToastAndroid;
}

type RootStackParamList = {
  AddEventsScreen: { email: string };
};

type AddEventsScreenRouteProp = RouteProp<RootStackParamList, "AddEventsScreen">;

const colorOptions = [
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

const getWeekNumber = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const getCalendarMode = (start: Date, end: Date, isTask: boolean) => {
  if (isTask) return "day";
  if (start.toDateString() === end.toDateString()) return "day";
  const startWeek = getWeekNumber(start);
  const endWeek = getWeekNumber(end);
  if (start.getDay() === 6 && end.getDay() === 1) return "month";
  if (startWeek === endWeek) return "week";
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 7) return "month";
  return "week";
};

const validateTimesAndDates = (
  startDate: Date,
  startTime: Date,
  endTime: Date,
  isTask: boolean
) => {
  const warnings: string[] = [];
  const parseTime = (timeObj: Date) => {
    const hours = timeObj.getHours();
    const minutes = timeObj.getMinutes();
    return { hours, minutes };
  };
  if (isTask) {
    const { hours, minutes } = parseTime(startTime);
    if (hours > 17 || (hours === 17 && minutes >= 15)) {
      warnings.push("A hora da tarefa é após 17:15.");
    }
  } else {
    const { hours: startH, minutes: startM } = parseTime(startTime);
    const { hours: endH, minutes: endM } = parseTime(endTime);
    if (startH > 17 || (startH === 17 && startM >= 15)) {
      warnings.push("A hora de início é após 17:15.");
    }
    if (endH > 17 || (endH === 17 && endM >= 15)) {
      warnings.push("A hora de fim é após 17:15.");
    }
  }
  const dayOfWeek = startDate.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    warnings.push("A data selecionada é no fim de semana.");
  }
  return warnings;
};

const AddEventsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<AddEventsScreenRouteProp>();
  const { email } = route.params;

  const url_adicionarEventos = `${config.baseUrl}/calendarioFiles/professor/eventos/add_event.php`;
  const url_addTask = `${config.baseUrl}/calendarioFiles/professor/tarefas/add_task.php`;
  const url_profInfo = `${config.baseUrl}/calendarioFiles/professor/fetchProfessorInfo.php`;

  const [newEvent, setNewEvent] = useState({ title: "", description: "" });
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const isTask = selectedType === "Tarefa";
  const [selectedColor, setSelectedColor] = useState<string>("#DC143C");
  const [showColorModal, setShowColorModal] = useState<boolean>(false);

  // Estados de datas e horas iniciam com o valor atual
  const [startDate, setStartDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [turmas, setTurmas] = useState<any[]>([]);
  const [selectedTurmas, setSelectedTurmas] = useState<any[]>([]);
  const [showTurmaModal, setShowTurmaModal] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [userTheme, setUserTheme] = useState<"light" | "dark">(theme.dark ? "dark" : "light");
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        let bg: string | null;
        let mode: string | null;
        // Se for web, usamos localStorage; se não, usamos SecureStore
        if (Platform.OS === "web") {
          bg = localStorage.getItem("backgroundUrl");
          mode = localStorage.getItem("userTheme");
        } else {
          bg = await SecureStore.getItemAsync("backgroundUrl");
          mode = await SecureStore.getItemAsync("userTheme");
        }
        // Se o background existir e não começar com "http", concatenamos com o baseUrl
        if (bg && !bg.startsWith("http")) {
          bg = `${config.baseUrl}/${bg}`;
        }
        setBackgroundUrl(bg);
        setUserTheme(mode === "dark" ? "dark" : "light");
      } catch (error) {
        console.log("Erro ao carregar configurações.", error);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);  

  // Modal para quando não houver turmas
  const showNoTurmasModal = turmas.length === 0;

  const displayError = (msg: string) => {
    setError(msg);
    if (Platform.OS === "web") {
      window.alert(msg);
    } else {
      ToastAndroid.show(msg, ToastAndroid.LONG);
    }
  };

  const displaySuccess = (msg: string) => {
    setSuccess(msg);
    if (Platform.OS === "web") {
      // Para web, mostra um alert simples
      window.alert(msg);
    } else {
      ToastAndroid.show(msg, ToastAndroid.LONG);
    }
  };

  const validateFields = () => {
    const errorsObj: { [key: string]: boolean } = {};
  
    if (isTask) {
      if (!selectedCategory) errorsObj.category = true;
      if (selectedCategory === "Outro" && !customCategory.trim())
        errorsObj.customCategory = true;
      if (!newEvent.title.trim()) errorsObj.title = true;
      if (!startDate) errorsObj.startDate = true;
      if (!startTime) errorsObj.startTime = true;
    } else {
      if (!newEvent.title.trim()) errorsObj.title = true;
      if (!startDate) errorsObj.startDate = true;
      if (!startTime) errorsObj.startTime = true;
      if (!endDate) errorsObj.endDate = true;
      if (!endTime) errorsObj.endTime = true;
      if (selectedTurmas.length === 0) errorsObj.turmas = true;
    }
  
    return errorsObj;
  };

  // Handlers para DateTimePicker
  const onChangeStartDate = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (event.type !== "dismissed" && selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onChangeStartTime = (event: any, selectedTime?: Date) => {
    setShowStartTimePicker(false);
    if (event.type !== "dismissed" && selectedTime) {
      setStartTime(selectedTime);
    }
  };

  const onChangeEndDate = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (event.type !== "dismissed" && selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const onChangeEndTime = (event: any, selectedTime?: Date) => {
    setShowEndTimePicker(false);
    if (event.type !== "dismissed" && selectedTime) {
      setEndTime(selectedTime);
    }
  };

  const formatDate = (dateObj: Date) => dateObj.toLocaleDateString("pt-PT");
  const formatTime = (timeObj: Date) =>
    timeObj.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

  // Busca as turmas associadas ao professor
  useEffect(() => {
    axios
      .post(url_profInfo, { email })
      .then((response) => {
        console.log("Response:", response.data);
        if (response.data && Array.isArray(response.data.turmas)) {
          setTurmas(response.data.turmas);
        } else {
          setTurmas([]);
        }
      })
      .catch(() => {
        setTurmas([]);
      });
  }, [email]);

  // Define o tipo padrão conforme a categoria selecionada
  useEffect(() => {
    if (selectedCategory) {
      if (selectedCategory === "Trabalho de casa") {
        if (!selectedType) setSelectedType("Tarefa");
      } else {
        if (!selectedType) setSelectedType("Evento");
      }
    } else {
      setSelectedType("");
    }
  }, [selectedCategory]);

  const toggleTurma = (turma: any) => {
    if (selectedTurmas.some((item) => item.turma === turma.turma && item.ano === turma.ano)) {
      setSelectedTurmas(selectedTurmas.filter((item) => !(item.turma === turma.turma && item.ano === turma.ano)));
    } else {
      setSelectedTurmas([...selectedTurmas, turma]);
    }
  };

  const handlePreview = () => {
    const errorsObj = validateFields();
    if (Object.keys(errorsObj).length > 0) {
      setFieldErrors(errorsObj);
      displayError("Por favor, preencha todos os campos obrigatórios.");
      return;
    } else {
      setFieldErrors({});
    }

    // Para eventos, se a data/hora de fim for anterior à de início, ajusta para os valores escolhidos
    if (!isTask) {
      const startDateTime = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate(),
        startTime.getHours(),
        startTime.getMinutes()
      );
      const endDateTime = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        endTime.getHours(),
        endTime.getMinutes()
      );
      if (startDateTime > endDateTime || startDateTime.getTime() === endDateTime.getTime()) {
        Alert.alert(
          "Erro de Data/Hora",
          "A data e hora de início não pode ser posterior ou igual à data e hora de fim."
        );
        return;
      }
      if (endDateTime < startDateTime) {
        setEndDate(startDate);
        setEndTime(startTime);
      }
    }
    setError("");
    const warnings = validateTimesAndDates(startDate, startTime, endTime, isTask);
    if (warnings.length > 0) {
      const warningMessage = warnings.join("\n") + "\nTem certeza que deseja continuar?";
      Alert.alert("Aviso", warningMessage, [
        { text: "Cancelar", style: "cancel" },
        { text: "Continuar", onPress: () => setShowPreview(true) }
      ]);
    } else {
      setShowPreview(true);
    }
  };

  const handleCreateEventOrTask = () => {
    const eventData: any = {
      email: email || "",
      title: newEvent.title,
      description: newEvent.description.trim() ? newEvent.description : "",
      category: selectedCategory === "Outro" ? customCategory : selectedCategory,
      type: selectedType,
      color: selectedColor
    };
  
    if (isTask) {
      eventData.data_da_tarefa = `${formatDate(startDate)} ${formatTime(startTime)}`;
    } else {
      eventData.start_date = formatDate(startDate);
      eventData.start_time = formatTime(startTime);
      eventData.end_date = formatDate(endDate);
      eventData.end_time = formatTime(endTime);
    }
  
    if (selectedTurmas.length > 0) {
      eventData.turma = selectedTurmas[0].turma;
      eventData.ano = selectedTurmas[0].ano;
    } else {
      displayError("Pedimos que selecione pelo menos uma turma.");
      return;
    }
  
    const endpoint = isTask ? url_addTask : url_adicionarEventos;
  
    axios
      .post(endpoint, eventData)
      .then((response) => {
        if (response.data.success !== true) {
          displayError(response.data.message || "Ocorreu um erro ao tentar adicionar um novo evento/tarefa, pedimos que tente novamente mais tarde.");
          return;
        } else {
          const successMessage = isTask ? "Você conseguiu criar uma nova tarefa com sucesso!" : "Você conseguiu criar um novo evento com sucesso!";
          displaySuccess(successMessage);
          setTimeout(() => {
            navigation.goBack();
          }, 1000);
        }
      })
      .catch(() => {
        displayError("Erro ao adicionar. Tente novamente mais tarde.");
      });
  };
    
  // Calcula o bloco para tarefas: 
  // Se a hora selecionada for entre 00:00 e 00:29, o bloco será do horário selecionado até 30 minutos depois;
  // Caso contrário, será das 30 minutos antes até o horário selecionado.
  let taskBlockStart = new Date(startDate);
  let taskBlockEnd = new Date(startDate);
  if (isTask) {
    const selectedHour = startTime.getHours();
    const selectedMinutes = startTime.getMinutes();
    // Define a hora selecionada
    taskBlockEnd.setHours(selectedHour, selectedMinutes, 0, 0);
    if (selectedHour === 0 && selectedMinutes < 30) {
      // Bloco de 30 minutos para baixo
      taskBlockStart = new Date(taskBlockEnd.getTime());
      taskBlockEnd = new Date(taskBlockEnd.getTime() + 30 * 60000);
    } else {
      // Bloco de 30 minutos antes
      taskBlockStart = new Date(taskBlockEnd.getTime() - 30 * 60000);
    }
  }
  
  // Define os eventos do dia para o calendário
  const dayEvents = [
    {
      // Concatena o título com o horário selecionado
      title: `${newEvent.title} - ${formatTime(startTime)}`,
      start: isTask
        ? taskBlockStart
        : new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate(),
            startTime.getHours(),
            startTime.getMinutes()
          ),
      end: isTask
        ? taskBlockEnd
        : new Date(
            endDate.getFullYear(),
            endDate.getMonth(),
            endDate.getDate(),
            endTime.getHours(),
            endTime.getMinutes()
          ),
      color: selectedColor
    }
  ];  

  const dynamicTextColor = userTheme === "dark" ? "#e0dede" : "#000";
  if (loading) { 
    return (
      <ImageBackground
        source={
          backgroundUrl
            ? { uri: backgroundUrl }
            : require("../../assets/images/bg1.jpg")
        }
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
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
          <ActivityIndicator size="large" color={"#47AD4D"} />
        </View>
      </ImageBackground>
    );
  }

  if (showPreview) {
    return (
      <ImageBackground source={backgroundUrl ? { uri: backgroundUrl } : require("../../assets/images/bg1.jpg")} style={styles.background}>
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
                    borderBottomWidth: 1,
                    borderBottomColor: "#ddd",
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      navigation.goBack();
                    }}
                    style={{ flex: 1 }}
                  >
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
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <BigCalendar
              date={startDate}
              events={dayEvents}
              height={500}
              mode={getCalendarMode(startDate, isTask ? startDate : endDate, isTask)}
              swipeEnabled={true}
              showTime={false}
              eventCellStyle={(event) => (event.color ? { backgroundColor: event.color } : {})}
            />
            <View style={styles.previewDetails}>
              <Text style={styles.previewText}>Título: {newEvent.title}</Text>
              {isTask ? (
                <Text style={styles.previewText}>
                  Data da Tarefa: {formatDate(startDate)} às {formatTime(startTime)}
                </Text>
              ) : (
                <>
                  <Text style={styles.previewText}>
                    Início: {formatDate(startDate)} às {formatTime(startTime)}
                  </Text>
                  <Text style={styles.previewText}>
                    Fim: {formatDate(endDate)} às {formatTime(endTime)}
                  </Text>
                </>
              )}
              <Text style={styles.previewText}>
                Turmas Selecionadas:{" "}
                {selectedTurmas.map((t, index) => (
                  <Text key={index}>
                    {t.ano} - {t.turma}
                    {index < selectedTurmas.length - 1 ? ", " : ""}
                  </Text>
                ))}
              </Text>
              <Text style={styles.previewText}>
                Categoria: {selectedCategory === "Outro" ? customCategory : selectedCategory}
              </Text>
              <Text style={styles.previewText}>Tipo: {selectedType}</Text>
              <View style={styles.selectedColorDisplay}>
                <View style={[styles.colorCircle, { backgroundColor: selectedColor }]} />
                <Text style={styles.previewText}>Cor Selecionada</Text>
              </View>
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Button mode="contained" onPress={handleCreateEventOrTask} style={[styles.button, { backgroundColor: "#47AD4D" }]}>
              Confirmar
            </Button>
            <Button mode="contained" onPress={() => setShowPreview(false)} style={[styles.button, { backgroundColor: "red", marginTop: 10 }]}>
              Editar
            </Button>
        </ScrollView>
      </ImageBackground>
    );
  }

  // Tela de formulário
  return (
    <ImageBackground
      source={backgroundUrl ? { uri: backgroundUrl } : require("../../assets/images/bg1.jpg")}
      style={styles.background} 
    >
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
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.formContainer}>
          {turmas.length === 0 && (
            <Text style={styles.infoText}>
              Nenhuma turma encontrada para si. Por favor, pedimos que tente mais tarde, ou peça para ter uma turma.
            </Text>
          )}
          <ScrollView style={styles.innerScroll} contentContainerStyle={{ paddingBottom: 100 }} nestedScrollEnabled>
            <View style={[styles.inputGroup, fieldErrors.category && styles.errorBorder]}>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedCategory}
              onValueChange={(itemValue) => {
                setSelectedCategory(itemValue);
                if (itemValue !== "Outro") setCustomCategory("");
                setSelectedType("");
              }}
              style={styles.picker}
              dropdownIconColor="#47AD4D"        // cor do ícone
              itemStyle={styles.pickerItem}      // estilo dos itens (Android)
              mode="dropdown"                    // ou "dialog"
            >
              <Picker.Item label="Selecione a categoria" value="" />
              <Picker.Item label="Teste" value="Teste" />
              <Picker.Item label="Trabalho de casa" value="Trabalho de casa" />
              <Picker.Item label="Atividade" value="Atividade" />
              <Picker.Item label="Visita de estudo" value="Visita de estudo" />
              <Picker.Item label="Outro" value="Outro" />
            </Picker>
          </View>
            </View>
            {selectedCategory !== "" && (
              <>
                {selectedCategory === "Outro" && (
                  <View style={[styles.inputGroup, fieldErrors.customCategory && styles.errorBorder]}>
                    <TextInput
                      label="Categoria personalizada *"
                      value={customCategory}
                      onChangeText={(text) => setCustomCategory(text)}
                      mode="outlined"
                      error={!!fieldErrors.customCategory}
                      style={styles.input}
                      theme={{ colors: { text: "#000", primary: "#47AD4D", placeholder: "#000" } }}
                    />
                  </View>
                )}
                <View style={[styles.inputGroup, fieldErrors.type && styles.errorBorder]}>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={selectedType}
                      onValueChange={(itemValue) => setSelectedType(itemValue)}
                      style={styles.picker}
                      dropdownIconColor="#47AD4D"
                      itemStyle={styles.pickerItem}
                      mode="dropdown"
                    >
                      <Picker.Item label="Evento" value="evento" />
                      <Picker.Item label="Tarefa" value="Tarefa" />
                    </Picker>
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <TouchableOpacity onPress={() => setShowColorModal(true)} style={styles.selectedColorDisplay}>
                    <View style={[styles.colorCircle, { backgroundColor: selectedColor }]} />
                    <Text style={styles.colorText}>Cor Selecionada</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  label="Título *"
                  value={newEvent.title}
                  onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
                  mode="outlined"
                  error={!!fieldErrors.title}
                  style={styles.input}
                  theme={{ colors: { text: "#000", primary: "#47AD4D", placeholder: "#000" } }}
                />
                <View style={styles.inputGroup}>
                  <TextInput
                    label="Descrição"
                    value={newEvent.description}
                    onChangeText={(text) => setNewEvent({ ...newEvent, description: text })}
                    mode="outlined"
                    style={styles.input}
                    theme={{ colors: { text: "#000", primary: "#47AD4D", placeholder: "#000" } }}
                  />
                </View>
              </>
            )}
            
            {/* Campos de Data/Hora */}
            <View style={styles.inputGroup}>
              <TextInput
                label={isTask ? "Data da Tarefa *" : "Data de Início *"}
                value={formatDate(startDate)}
                mode="outlined"
                style={styles.input}
                editable={false}
                onPressIn={() => setShowStartDatePicker(true)}
                right={<TextInput.Icon icon="calendar" onPress={() => setShowStartDatePicker(true)} />}
                theme={{ colors: { text: "#000", primary: "#47AD4D", placeholder: "#000" } }}
              />
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "calendar"}
                  onChange={onChangeStartDate}
                />
              )}
            </View>
            <View style={styles.inputGroup}>
              <TextInput
                label={isTask ? "Hora da Tarefa *" : "Hora de Início *"}
                value={formatTime(startTime)}
                mode="outlined"
                style={styles.input}
                editable={false}
                onPressIn={() => setShowStartTimePicker(true)}
                right={<TextInput.Icon icon="clock" onPress={() => setShowStartTimePicker(true)} />}
                theme={{ colors: { text: "#000", primary: "#47AD4D", placeholder: "#000" } }}
              />
              {showStartTimePicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "clock"}
                  is24Hour={true}
                  onChange={onChangeStartTime}
                />
              )}
            </View>
            {!isTask && (
              <>
                <View style={styles.inputGroup}>
                  <TextInput
                    label="Data de Fim *"
                    value={formatDate(endDate)}
                    mode="outlined"
                    style={styles.input}
                    editable={false}
                    onPressIn={() => setShowEndDatePicker(true)}
                    right={<TextInput.Icon icon="calendar" onPress={() => setShowEndDatePicker(true)} />}
                    theme={{ colors: { text: "#000", primary: "#47AD4D", placeholder: "#000" } }}
                  />
                  {showEndDatePicker && (
                    <DateTimePicker
                      value={endDate}
                      mode="date"
                      display={Platform.OS === "ios" ? "spinner" : "calendar"}
                      onChange={onChangeEndDate}
                    />
                  )}
                </View>
                <View style={styles.inputGroup}>
                  <TextInput
                    label="Hora de Fim *"
                    value={formatTime(endTime)}
                    mode="outlined"
                    style={styles.input}
                    editable={false}
                    onPressIn={() => setShowEndTimePicker(true)}
                    right={<TextInput.Icon icon="clock" onPress={() => setShowEndTimePicker(true)} />}
                    theme={{ colors: { text: "#000", primary: "#47AD4D", placeholder: "#000" } }}
                  />
                  {showEndTimePicker && (
                    <DateTimePicker
                      value={endTime}
                      mode="time"
                      display={Platform.OS === "ios" ? "spinner" : "clock"}
                      is24Hour={true}
                      onChange={onChangeEndTime}
                    />
                  )}
                </View>
              </>
            )}
            {selectedTurmas.length > 0 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Turmas Selecionadas:</Text>
                {selectedTurmas.map((turma, index) => (
                  <View key={index} style={styles.selectedTurmaRow}>
                    <Text>{turma.ano} - {turma.turma}</Text>
                    <IconButton
                      icon="close"
                      size={20}
                      onPress={() => toggleTurma(turma)}
                    />
                  </View>
                ))}
              </View>
            )}
            <Button
              mode="outlined"
              onPress={() => setShowTurmaModal(true)}
              style={styles.addTurmaButton}
              labelStyle={{ color: "#47AD4D" }}
            >
              + Adicionar turma
            </Button>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {success ? <Text style={styles.successText}>{success}</Text> : null}
            <Button mode="contained" onPress={handlePreview} style={[styles.button, { backgroundColor: "#47AD4D" }]}>
              Visualizar Preview
            </Button>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Modal de Seleção de Turmas */}
      <Modal visible={showTurmaModal} onRequestClose={() => setShowTurmaModal(false)} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Selecione uma Turma</Text>
            {turmas.length === 0 ? (
              <Text style={styles.infoText}>Não há turmas disponíveis para este professor.</Text>
            ) : (
              <ScrollView>
                {turmas.map((turma, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.turmaRow} 
                    onPress={() => {
                      toggleTurma(turma);
                      setShowTurmaModal(false);
                    }}
                  >
                    <Text>{turma.ano} - {turma.turma}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <Button mode="contained" onPress={() => setShowTurmaModal(false)} style={styles.modalCloseButton}>
              Fechar
            </Button>
          </View>
        </View>
      </Modal>

      {/* Modal de Seleção de Cor */}
      <Modal visible={showColorModal} animationType="slide" transparent>
        <View style={styles.colorModalOverlay}>
          <View style={styles.colorModalContainer}>
            <Text style={[styles.modalTitle, { color: "#000" }]}>Selecionar Cor</Text>
            {colorOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={styles.colorOptionRow}
                onPress={() => {
                  setSelectedColor(opt.value);
                  setShowColorModal(false);
                }}
              >
                <View style={[styles.colorCircle, { backgroundColor: opt.value }]} />
                <Text style={[styles.colorName, { color: "#000" }]}>{opt.name}</Text>
              </TouchableOpacity>
            ))}
            <Button mode="contained" onPress={() => setShowColorModal(false)} style={styles.modalCloseButton}>
              Fechar
            </Button>
          </View>
        </View>
      </Modal>
        <Modal
          visible={showNoTurmasModal}
          animationType="fade"
          transparent
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: '80%',
                backgroundColor: userTheme === 'dark' ? '#333' : '#fff',
                padding: 20,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              {/* Bolinha a girar */}
              <ActivityIndicator
                size="large"
                color="#47AD4D"
                style={{ marginBottom: 16 }}
              />

              {/* Texto de aviso */}
              <Text
                style={{
                  fontSize: 16,
                  textAlign: 'center',
                  marginBottom: 24,
                  color: dynamicTextColor,
                }}
              >
                Não é possível criar nenhum evento porque não foram encontradas turmas.
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  width: '100%',
                }}
              >
                {/* Tentar novamente: fecha o modal */}
                <TouchableOpacity
                  onPress={() => setShowTurmaModal(false)}
                  style={{
                    flex: 1,
                    backgroundColor: '#47AD4D',
                    paddingVertical: 10,
                    borderRadius: 6,
                    alignItems: 'center',
                    marginRight: 8,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                    Tentar novamente
                  </Text>
                </TouchableOpacity>

                {/* Ícone voltar: faz goBack */}
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={{
                    padding: 10,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Image
                    source={require('../../assets/icons/angle-left.png')}
                    style={{
                      width: 24,
                      height: 24,
                      tintColor: '#47AD4D',
                    }}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
   pickerContainer: {
    borderWidth: 1,
    borderColor: "#47AD4D",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 12,
    backgroundColor: "#f5f5f5",  
  },
  picker: {
    height: 50,                    // altura uniforme
    width: "100%",
    color: "#000",                 // texto escuro
    paddingHorizontal: 8,
  },
  // opcional: aumenta o espaçamento dos itens (só Android)
  pickerItem: {
    height: 50,
  },
  loadingText: { marginTop: 16, fontSize: 16, color: "#000", textAlign: "center" },
  background: { flex: 1 },
  scrollContainer: { flexGrow: 1, padding: 5, marginTop: 70, paddingBottom: 100 },
  formContainer: { flex: 1, alignSelf: "stretch" },
  innerScroll: { flexGrow: 1 },
  previewContainer: { flex: 1 },
  previewDetails: { marginVertical: 15 },
  previewText: { fontSize: 16, marginVertical: 2, color: "#000" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  input: { marginBottom: 15, backgroundColor: "#f5f5f5", color: "#000", borderRadius: 8, paddingHorizontal: 10 },
  inputGroup: { marginBottom: 10 },
  label: { marginBottom: 5, fontWeight: "bold" },
  button: { borderRadius: 8 },
  errorText: { color: "red", textAlign: "center", marginBottom: 10 },
  successText: { color: "green", textAlign: "center", marginBottom: 10 },
  infoText: { color: "red", textAlign: "center", marginBottom: 10 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  colorModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  colorModalContainer: { width: "80%", backgroundColor: "#fff", borderRadius: 10, padding: 20 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContainer: { width: "80%", backgroundColor: "#fff", borderRadius: 10, padding: 20, maxHeight: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  colorOptionRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  colorCircle: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
  colorName: { fontSize: 16 },
  modalCloseButton: { backgroundColor: "#47AD4D", marginTop: 10 },
  selectedColorDisplay: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  colorText: { fontSize: 16, color: "#47AD4D" },
  backButton: { alignSelf: "flex-start" },
  errorBorder: { borderWidth: 1, borderColor: "red", borderRadius: 8, marginBottom: 10 },
  turmaRow: { flexDirection: "row", alignItems: "center", paddingVertical: 5 },
  selectedTurmaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "#ccc", padding: 8, borderRadius: 8, marginVertical: 3 },
  addTurmaButton: { borderRadius: 8, marginVertical: 10 },
  noTurmaOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(255, 255, 255, 0.5)", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  noTurmaModal: { 
    width: "80%", 
    backgroundColor: "#fff", 
    borderRadius: 10, 
    padding: 20, 
    alignItems: "center" 
  },
  noTurmaText: { 
    fontSize: 16, 
    textAlign: "center", 
    marginBottom: 20 
  },
  noTurmaButton: { 
    backgroundColor: "#47AD4D" 
  }
});

export default AddEventsScreen;