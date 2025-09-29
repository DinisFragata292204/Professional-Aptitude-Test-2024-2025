import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Text,
  Alert,
  StyleSheet,
  Platform,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ImageBackground,
  TouchableWithoutFeedback,
  Dimensions,
  Image,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { IconButton, Button as PaperButton } from 'react-native-paper';
import { Calendar } from 'react-native-big-calendar';
import config from "../../config/config_db";
import * as SecureStore from 'expo-secure-store';
import ModalConfig from '../../components/modalConfig';

interface RouteParams {
  email: string;
}

interface LunchEvent {
  id?: string;
  title: string;
  start: Date;
  end: Date;
  fromDB?: boolean;
  isManual?: boolean;
  hasMenu?: boolean;
}

interface MenuEvent {
  dia: string;
  sopa: string;
  prato_principal: string;
  sobremesa: string;
}

const normalizeDate = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const getDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = ('0' + (date.getMonth() + 1)).slice(-2);
  const d = ('0' + date.getDate()).slice(-2);
  return `${y}-${m}-${d}`;
};

const AlmocoProfScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { email } = route.params as RouteParams;

  const [selectedLunchDates, setSelectedLunchDates] = useState<Date[]>([]);
  const [dbLunchDates, setDbLunchDates] = useState<LunchEvent[]>([]);
  const [removedLunchDates, setRemovedLunchDates] = useState<Date[]>([]);
  const [almocosMenu, setAlmocosMenu] = useState<MenuEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<MenuEvent | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [userTheme, setUserTheme] = useState<"light" | "dark">("light");
  const [loading, setLoading] = useState<boolean>(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  const urlFound = `${config.baseUrl}/calendarioFiles/almocos/found_lunch.php`;
  const urlMenu = `${config.baseUrl}/calendarioFiles/almocos/found_menu.php`;
  const urlUpdate = `${config.baseUrl}/calendarioFiles/almocos/update_lunch.php`;

  // Carregar configurações do SecureStore
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
      } catch {
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);  

  const fetchLunchReservations = useCallback(() => {
    fetch(urlFound, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          const dbEvents: LunchEvent[] = json.data.map((row: any) => {
            const rawDate = new Date(row.dia + "T00:00:00");
            const eventDate = normalizeDate(rawDate);
            return {
              id: getDateString(eventDate),
              title: row.turma || "",
              start: eventDate,
              end: eventDate,
              fromDB: true
            };
          });
          setDbLunchDates(dbEvents);
        } else {
          Alert.alert("Erro", json.message);
        }
      })
      .catch;
  }, [email]);

  // Busca menus cadastrados
  const fetchMenus = useCallback(() => {
    fetch(urlMenu)
      .then(res => res.json())
      .then(json => {
        if (json.success) {
          const menus: MenuEvent[] = json.data.map((row: any) => ({
            dia: row.dia,
            sopa: row.sopa,
            prato_principal: row.prato_principal,
            sobremesa: row.sobremesa,
          }));
          setAlmocosMenu(menus);
        }
      })
      .catch;
  }, []);

  if (loading) { 
    const dynamicTextColor = userTheme === "dark" ? "white" : "black";
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
          <ActivityIndicator size="large" color={dynamicTextColor} />
          <Text style={{ fontSize: 18, marginTop: 10, color: dynamicTextColor }}>
            Carregando registros...
          </Text>
        </View>
      </ImageBackground>
    );
  }
  
  // Pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setSelectedLunchDates([]);
    setRemovedLunchDates([]);
    setSelectedMenu(null);
    setMenuModalVisible(false);

    Promise.all([fetchLunchReservations(), fetchMenus()])
      .then(() => setRefreshing(false))
      .catch(err => {
        setRefreshing(false);
      });
  }, [fetchLunchReservations, fetchMenus]);

  useEffect(() => {
    fetchLunchReservations();
  }, [fetchLunchReservations]);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const confirmBack = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Tem a certeza que deseja sair?");
      if (confirmed) navigation.navigate("Professor", { email });
    } else {
      Alert.alert(
        "Confirmação",
        "Tem a certeza que deseja sair?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Sim", onPress: () => navigation.navigate("Professor", { email }) }
        ]
      );
    }
  };

  const findMenuForDate = (date: Date): MenuEvent | undefined => {
    const dateStr = getDateString(date);
    return almocosMenu.find(menu => menu.dia === dateStr);
  };

  const onPressDate = (date: Date) => {
    const normalizedDate = normalizeDate(date);
    const dateStr = getDateString(normalizedDate);
    const today = normalizeDate(new Date());
    const maxDate = normalizeDate(new Date(new Date().setMonth(new Date().getMonth() + 1)));

    if (normalizedDate < today || normalizedDate > maxDate) {
      Platform.OS === "web"
        ? window.alert("Data inválida: Só é possível selecionar entre hoje e um mês depois.")
        : Alert.alert("Data inválida", "Só é possível selecionar entre hoje e um mês depois.");
      return;
    }
    
    if (normalizedDate.getDay() === 0 || normalizedDate.getDay() === 6) {
      Platform.OS === "web"
        ? window.alert("Data inválida: Não é possível selecionar fins de semana.")
        : Alert.alert("Data inválida", "Não é possível selecionar fins de semana.");
      return;
    }    

    const menu = findMenuForDate(normalizedDate);
    if (menu) {
      setSelectedMenu(menu);
      setMenuModalVisible(true);
      return;
    }

    const dateStrExistsInDB = dbLunchDates.some(event => getDateString(event.start) === dateStr) &&
                              !removedLunchDates.some(d => getDateString(d) === dateStr);
    const dateStrExistsInManual = selectedLunchDates.some(d => getDateString(d) === dateStr);
    const isInRemoved = removedLunchDates.some(d => getDateString(d) === dateStr);

    if (dateStrExistsInDB || dateStrExistsInManual) {
      if (dateStrExistsInDB)
        setRemovedLunchDates(prev => [...prev, normalizedDate]);
      if (dateStrExistsInManual)
        setSelectedLunchDates(prev => prev.filter(d => getDateString(d) !== dateStr));
    } else if (isInRemoved) {
      setRemovedLunchDates(prev => prev.filter(d => getDateString(d) !== dateStr));
    } else {
      setSelectedLunchDates(prev => [...prev, normalizedDate]);
    }
  };

  const handleMenuModalAction = () => {
    if (!selectedMenu) return;
    const date = new Date(selectedMenu.dia + "T00:00:00");
    const dateStr = getDateString(date);
    const isReservedInDB = dbLunchDates.some(event => getDateString(event.start) === dateStr) &&
                           !removedLunchDates.some(d => getDateString(d) === dateStr);
    const isReservedManual = selectedLunchDates.some(d => getDateString(d) === dateStr);
    const isRemoved = removedLunchDates.some(d => getDateString(d) === dateStr);
    
    if (isReservedInDB || isReservedManual) {
      if (isReservedInDB)
        setRemovedLunchDates(prev => [...prev, date]);
      if (isReservedManual)
        setSelectedLunchDates(prev => prev.filter(d => getDateString(d) !== dateStr));
    } else if (isRemoved) {
      setRemovedLunchDates(prev => prev.filter(d => getDateString(d) !== dateStr));
    } else {
      setSelectedLunchDates(prev => [...prev, date]);
    }
    setMenuModalVisible(false);
    setSelectedMenu(null);
  };

  const dbSelectedEvents: LunchEvent[] = dbLunchDates.filter(event =>
    !removedLunchDates.some(d => getDateString(d) === getDateString(event.start))
  );
  const manualEvents: LunchEvent[] = selectedLunchDates.map(date => ({
    id: getDateString(date),
    title: "",
    start: date,
    end: date,
    isManual: true,
  }));
  const selectedDatesSet = new Set([
    ...dbSelectedEvents.map(e => getDateString(e.start)),
    ...manualEvents.map(e => getDateString(e.start))
  ]);
  const menuEvents: LunchEvent[] = almocosMenu
    .filter(menu => !selectedDatesSet.has(menu.dia))
    .map(menu => ({
      id: menu.dia,
      title: "",
      start: new Date(menu.dia + "T00:00:00"),
      end: new Date(menu.dia + "T00:00:00"),
      hasMenu: true,
    }));
  const calendarEvents: LunchEvent[] = [...dbSelectedEvents, ...manualEvents, ...menuEvents];
  const calendarHeight = Platform.OS === 'web'
    ? Dimensions.get('window').width * 0.6
    : 450;

  // Renderiza cada evento (ícone) no calendário
  const renderEvent = (event: LunchEvent) => {
    const dateStr = getDateString(event.start);
    const isSelected = (event.isManual || event.fromDB) &&
                        !removedLunchDates.some(d => getDateString(d) === dateStr);
    const hasMenu = event.hasMenu || !!findMenuForDate(event.start);
    const eventContainerStyle = Platform.OS === 'web' ? styles.webEventContainer : {};

    return (
      <TouchableOpacity onPress={() => onPressDate(event.start)}>
        {isSelected ? (
          <View style={[styles.selectedEventContainer, eventContainerStyle]}>
            <Text style={[styles.eventText, { color: userTheme === "dark" ? "#FFF" : "#000" }]}>✓</Text>
          </View>
        ) : hasMenu ? (
          <View style={[styles.menuEventContainer, eventContainerStyle]}>
            <Text style={[styles.eventText, { color: userTheme === "dark" ? "#FFF" : "#000" }]}>🍴</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const allSelectedDates = Array.from(new Set([
    ...dbSelectedEvents.map(e => getDateString(e.start)),
    ...selectedLunchDates.map(d => getDateString(d))
  ])).sort();

  // Cores dinâmicas
  const dynamicTextColor = userTheme === "dark" ? "#FFF" : "#000";

  // Estilo dinâmico para os itens de datas selecionadas
  const selectedDateItemStyle = {
    backgroundColor: userTheme === "dark" ? "#222" : "#e0e0e0",
    borderColor: userTheme === "dark" ? "#444" : "transparent",
    borderWidth: userTheme === "dark" ? 1 : 0,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
  };

  // Estilo dinâmico para o container do calendário
  const calendarWrapperStyle = {
    backgroundColor: userTheme === "dark" ? "#000" : "#FFF",
    borderRadius: 8,
    padding: 10,
    marginTop: 15, // margem entre header e calendário
    marginHorizontal: -5, // ocupando mais espaço horizontalmente
    marginBottom: 15,
  };

  // Ação para salvar alterações
  const handleSave = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Tem a certeza que deseja guardar as alterações?");
      if (!confirmed) return;
      if (selectedLunchDates.length === 0 && removedLunchDates.length === 0) {
        window.alert("Atenção: Nenhuma alteração foi realizada.");
        return;
      }
      const diasParaAdicionar = selectedLunchDates.map(date => getDateString(date));
      const diasParaRemover = removedLunchDates.map(date => getDateString(date));
      const payload = { email, diasParaAdicionar, diasParaRemover };

      fetch(urlUpdate, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(res => res.json())
        .then(json => {
          if (json.success) {
            setRemovedLunchDates([]);
            onRefresh();
            window.alert("Sucesso: Alterações guardadas com sucesso!");
          } else {
            window.alert("Erro: " + (json.message || "Não foi possível guardar as alterações."));
          }
        })
        .catch(err => {
          window.alert("Não foi possível guardar as alterações. Pedimos que tente novamente mais tarde.");
        });
    } else {
      Alert.alert(
        "Confirmação",
        "Tem a certeza que deseja guardar as alterações?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Sim",
            onPress: () => {
              if (selectedLunchDates.length === 0 && removedLunchDates.length === 0) {
                Alert.alert("Atenção", "Nenhuma alteração foi realizada.");
                return;
              }
              const diasParaAdicionar = selectedLunchDates.map(date => getDateString(date));
              const diasParaRemover = removedLunchDates.map(date => getDateString(date));
              const payload = { email, diasParaAdicionar, diasParaRemover };

              fetch(urlUpdate, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
              })
                .then(res => res.json())
                .then(json => {
                  if (json.success) {
                    setRemovedLunchDates([]);
                    onRefresh();
                    Alert.alert("Sucesso", "Alterações guardadas com sucesso!");
                  } else {
                    Alert.alert("Erro", json.message || "Não foi possível guardar as alterações.");
                  }
                })
                .catch(err => {
                  Alert.alert("Ocorreu um erro", "Não foi possível guardar as alterações. Pedimos que tente novamente mais tarde.");
                });
            }
          }
        ]
      );
    }
  };

  return (
    <ImageBackground
      source={backgroundUrl ? { uri: backgroundUrl } : require("../../assets/images/bg1.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.fullScreenContainer}>
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
          <TouchableOpacity onPress={() => confirmBack()} style={{ flex: 1 }}>
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
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={calendarWrapperStyle}>
            <Calendar
              events={calendarEvents}
              height={calendarHeight}
              mode="month"
              swipeEnabled={true}
              weekStartsOn={1}
              showTime={false}
              onPressCell={date => onPressDate(date)}
              renderEvent={renderEvent}
              calendarContainerStyle={styles.bigCalendarContainer}
            />
          </View>
          {/* Exibição das datas selecionadas */}
          {allSelectedDates.length > 0 && (
            <ScrollView style={styles.selectedDatesScroll}>
              <View style={styles.selectedDatesInnerContainer}>
                {allSelectedDates.map((dateStr, index) => (
                  <View key={index} style={selectedDateItemStyle}>
                    <Text style={[styles.selectedDateText, { color: dynamicTextColor }]}>{dateStr}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Guardar</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Modal para detalhes do menu */}
        <Modal
          visible={menuModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => {
            setMenuModalVisible(false);
            setSelectedMenu(null);
          }}
        >
          <TouchableWithoutFeedback onPress={() => { setMenuModalVisible(false); setSelectedMenu(null); }}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalContent, { backgroundColor: userTheme === "dark" ? "#333" : "#fff" }]}>
                  {selectedMenu && (
                    <>
                      <Text style={[styles.modalTitle, { color: dynamicTextColor }]}>Detalhes do Almoço</Text>
                      <View style={styles.detailRow}>
                        {Platform.OS !== 'web' && <IconButton icon="bowl" size={20} iconColor={dynamicTextColor} />}
                        <Text style={[styles.detailText, { color: dynamicTextColor }]}>Sopa: {selectedMenu.sopa}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        {Platform.OS !== 'web' && <IconButton icon="food-variant" size={20} iconColor={dynamicTextColor} />}
                        <Text style={[styles.detailText, { color: dynamicTextColor }]}>Prato Principal: {selectedMenu.prato_principal}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        {Platform.OS !== 'web' && <IconButton icon="cupcake" size={20} iconColor={dynamicTextColor} />}
                        <Text style={[styles.detailText, { color: dynamicTextColor }]}>Sobremesa: {selectedMenu.sobremesa}</Text>
                      </View>
                      <PaperButton
                        mode="contained"
                        onPress={handleMenuModalAction}
                        style={styles.modalActionButton}
                        labelStyle={styles.modalActionButtonLabel}
                      >
                        {(dbLunchDates.some(event => getDateString(event.start) === selectedMenu.dia) &&
                          !removedLunchDates.some(d => getDateString(d) === selectedMenu.dia)) ||
                        selectedLunchDates.some(d => getDateString(d) === selectedMenu.dia)
                          ? "Desmarcar"
                          : "Marcar"}
                      </PaperButton>
                    </>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
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
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  fullScreenContainer: {
    flex: 1,
    paddingBottom: 15,
    backgroundColor: 'transparent'
  },
  container: {
    flex: 1,
    paddingHorizontal: 10,
    marginTop: 50
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  backButton: {
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  bigCalendarContainer: {
    flex: 1,
  },
  selectedDatesScroll: {
    maxHeight: 100,
  },
  selectedDatesInnerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  selectedDateText: {
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: "#47AD4D",
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    borderRadius: 8,
    padding: 20,
    width: "80%",
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: 'center'
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  detailText: {
    fontSize: 16,
    marginLeft: 8,
  },
  modalActionButton: {
    backgroundColor: "#47AD4D",
    marginTop: 20,
    borderRadius: 5,
  },
  modalActionButtonLabel: {
    color: "#fff",
    fontSize: 16,
  },
  selectedEventContainer: {
    backgroundColor: "#47AD4D",
    borderRadius: 4,
    marginTop: 5,
    marginLeft: 1,
    width: 45,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  menuEventContainer: {
    backgroundColor: Platform.OS === "web" ? "#abedde" : "#8a9b9c",
    borderRadius: 4,
    marginTop: 5,
    marginLeft: 1,
    width: 45,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
  },
  webEventContainer: {
    width: '90%',
    height: '90%',
    alignSelf: 'center'
  },
  eventText: {
    ...Platform.select({
      ios: { fontSize: 20 },
      android: { fontSize: 20 },
      default: { fontSize: 20 }
    }),
    margin: 0,
  }
});

export default AlmocoProfScreen;