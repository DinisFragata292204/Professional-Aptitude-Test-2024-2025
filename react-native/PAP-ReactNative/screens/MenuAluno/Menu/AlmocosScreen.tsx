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
  StatusBar,
  TextInput
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { IconButton, Button as PaperButton } from 'react-native-paper';
import { Calendar } from 'react-native-big-calendar';
import config from "../../../config/config_db";
import * as SecureStore from 'expo-secure-store';
import ModalConfig from '../../../components/modalConfig';

interface RouteParams {
  email: string;
}

interface LunchEvent {
  id: string;
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

const normalizeDate = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getDateString = (date: Date): string => {
  const y = date.getFullYear();
  const m = ('0' + (date.getMonth() + 1)).slice(-2);
  const d = ('0' + date.getDate()).slice(-2);
  return `${y}-${m}-${d}`;
};

const AlmocosScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { email } = useRoute().params as RouteParams;
  const isWeb = Platform.OS === 'web';

  const [dbLunchDates, setDbLunchDates] = useState<LunchEvent[]>([]);
  const [selectedLunchDates, setSelectedLunchDates] = useState<Date[]>([]);  const [removedLunchDates, setRemovedLunchDates] = useState<Date[]>([]);
  const [almocosMenu, setAlmocosMenu] = useState<MenuEvent[]>([]);
  const [feedbackDoneDates, setFeedbackDoneDates] = useState<string[]>([]);

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<MenuEvent | null>(null);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);
  const [avaliacao, setAvaliacao] = useState<number | null>(null);
  const [opiniao, setOpiniao] = useState<string>('');
  const [userTheme, setUserTheme] = useState<'light' | 'dark'>('light');
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);

  const urlFound = `${config.baseUrl}/calendarioFiles/almocos/found_lunch.php`;
  const urlMenu = `${config.baseUrl}/calendarioFiles/almocos/found_menu.php`;
  const urlUpdate = `${config.baseUrl}/calendarioFiles/almocos/update_lunch.php`;
  const urlFoundFeedbacks = `${config.baseUrl}/calendarioFiles/almocos/found_feedbacks.php`;
  const urlSubmitFeedback = `${config.baseUrl}/calendarioFiles/almocos/submit_feedback.php`;

  const horaAtual = new Date().getHours(); 

  const podeMarcarAlmoco = (date: Date) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataAlmoco = new Date(date);
    dataAlmoco.setHours(0, 0, 0, 0);
    return dataAlmoco => hoje;
  };

  const handlePress = () => {
    if (podeMarcarAlmoco(new Date())) {
      handleSave();
    } else {
      showAlert('Erro', 'Não é possível marcar o almoço para hoje ou para datas passadas.');
    }
};

  const showAlert = (title: string, message?: string) => {
  if (isWeb) {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
};

  // Carrega configurações de tema/background
  useEffect(() => {
    (async () => {
      try {
        let bg: string | null;
        let mode: string | null;
        if (Platform.OS === 'web') {
          bg = localStorage.getItem('backgroundUrl');
          mode = localStorage.getItem('userTheme');
        } else {
          bg = await SecureStore.getItemAsync('backgroundUrl');
          mode = await SecureStore.getItemAsync('userTheme');
        }
        if (bg && !bg.startsWith('http')) bg = `${config.baseUrl}/${bg}`;
        setBackgroundUrl(bg);
        setUserTheme(mode === 'dark' ? 'dark' : 'light');
      } catch (err) {
        console.error('Erro ao carregar configurações', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch das reservas
  const fetchLunchReservations = useCallback(() => {
    return fetch(urlFound, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then(res => res.json())
      .then(json => {
        if (!json.success) throw new Error(json.message);
        const eventos: LunchEvent[] = json.data.map((row: any) => {
          const d = normalizeDate(new Date(row.dia + 'T00:00:00'));
          return {
            id: getDateString(d),
            title: row.turma || '',
            start: d,
            end: d,
            fromDB: true,
          };
        });
        setDbLunchDates(eventos);
      });
  }, [email]);

  // Fetch dos menus
  const fetchMenus = useCallback(() => {
    return fetch(urlMenu)
      .then(res => res.json())
      .then(json => {
        if (!json.success) throw new Error('Erro no fetch de menus');
        const menus: MenuEvent[] = json.data.map((r: any) => ({
          dia: r.dia,
          sopa: r.sopa,
          prato_principal: r.prato_principal,
          sobremesa: r.sobremesa,
        }));
        setAlmocosMenu(menus);
      });
  }, []);

  // Fetch dos feedbacks já dados
  const fetchFeedbacks = useCallback(() => {
    return fetch(urlFoundFeedbacks, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then(res => res.json())
      .then(json => {
        if (!json.success) throw new Error('Erro no fetch de feedbacks');
        setFeedbackDoneDates(json.data.map((r: any) => r.dia));
      });
  }, [email]);

  // Refresh geral
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([fetchLunchReservations(), fetchMenus(), fetchFeedbacks()])
      .then(() => {
        setSelectedLunchDates([]);
        setRemovedLunchDates([]);
      })
      .catch(err => console.error(err))
      .finally(() => setRefreshing(false));
  }, [fetchLunchReservations, fetchMenus, fetchFeedbacks]);

  // No mount, carrega tudo
  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  if (loading) return <Text style={{ padding: 20 }}>A carregar...</Text>;

  // Funções auxiliares
  const findMenuForDate = (date: Date) =>
    almocosMenu.find(m => m.dia === getDateString(date));

  const dbSelectedEvents = dbLunchDates.filter(
    e => !removedLunchDates.some(d => getDateString(d) === getDateString(e.start))
  );
  const manualEvents: LunchEvent[] = selectedLunchDates.map(d => ({
    id: getDateString(d),
    title: '',
    start: d,
    end: d,
    isManual: true,
  }));
  const selectedSet = new Set([
    ...dbSelectedEvents.map(e => getDateString(e.start)),
    ...manualEvents.map(e => getDateString(e.start)),
  ]);
  const menuEvents: LunchEvent[] = almocosMenu
    .filter(m => !selectedSet.has(m.dia))
    .map(m => ({
      id: m.dia,
      title: '',
      start: new Date(m.dia + 'T00:00:00'),
      end: new Date(m.dia + 'T00:00:00'),
      hasMenu: true,
    }));
  const calendarEvents = [...dbSelectedEvents, ...manualEvents, ...menuEvents];

  const onPressDate = (date: Date) => {
    const d = normalizeDate(date);
    const str = getDateString(d);
    const today = normalizeDate(new Date());
    const max = normalizeDate(new Date(Date.now() + 30 * 24 * 3600 * 1000));
    if (d < today || d > max) {
      showAlert('Data inválida', 'Só entre hoje e 1 mês depois.');
      return;
    }
    if ([0, 6].includes(d.getDay())) {
      showAlert('Data inválida', 'Não é possível marcar a senha da refeição aos fins de semana.');
      return;
    }
    const menu = findMenuForDate(d);
    if (menu) {
      setSelectedMenu(menu);
      setMenuModalVisible(true);
      return;
    }
    const inDB = dbSelectedEvents.some(e => getDateString(e.start) === str);
    const inManual = selectedLunchDates.some(d2 => getDateString(d2) === str);
    const inRemoved = removedLunchDates.some(d2 => getDateString(d2) === str);

    if (inDB || inManual) {
      if (inDB) setRemovedLunchDates(a => [...a, d]);
      if (inManual) setSelectedLunchDates(a => a.filter(d2 => getDateString(d2) !== str));
    } else if (inRemoved) {
      setRemovedLunchDates(a => a.filter(d2 => getDateString(d2) !== str));
    } else {
      setSelectedLunchDates(a => [...a, d]);
    }
  };

  const handleMenuModalAction = () => {
    if (!selectedMenu) return;
    const d = new Date(selectedMenu.dia + 'T00:00:00');
    const str = getDateString(d);
    const inDB = dbSelectedEvents.some(e => getDateString(e.start) === str);
    const inManual = selectedLunchDates.some(d2 => getDateString(d2) === str);
    if (inDB) setRemovedLunchDates(a => [...a, d]);
    if (inManual) setSelectedLunchDates(a => a.filter(d2 => getDateString(d2) !== str));
    if (!inDB && !inManual) setSelectedLunchDates(a => [...a, d]);
    setMenuModalVisible(false);
    setSelectedMenu(null);
  };

  const handleSave = () => {
    const toAdd = selectedLunchDates.map(d => getDateString(d));
    const toRem = removedLunchDates.map(d => getDateString(d));
    if (toAdd.length + toRem.length === 0) {
      showAlert('Atenção', 'Nenhuma alteração.');
      return;
    }
    const action = () => {
      fetch(urlUpdate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, diasParaAdicionar: toAdd, diasParaRemover: toRem }),
      })
        .then(res => res.json())
        .then(j => {
          if (!j.success) throw new Error(j.message);
          onRefresh();
          showAlert('Sucesso', 'Alterações guardadas.');
        })
        .catch(err => {
          console.error(err);
          showAlert('Erro', 'Não foi possível guardar.');
        });
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Guardar alterações?')) action();
    } else {
      Alert.alert('Confirmar', 'Guardar alterações?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sim', onPress: action },
      ]);
    }
  };

  const handleSubmitFeedback = () => {
    if (avaliacao === null) return;
    const dia = getDateString(new Date());
    fetch(urlSubmitFeedback, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, dia, avaliacao, opiniao }),
    })
      .then(res => res.json())
      .then(j => {
        if (!j.success) throw new Error(j.message);
        setFeedbackDoneDates(a => [...a, dia]);
        setFeedbackModalVisible(false);
        showAlert('Obrigado', 'Feedback registado.');
      })
      .catch(err => {
        console.error(err);
        showAlert('Erro', 'Não foi possível enviar.');
      });
  };

  const todayStr = getDateString(new Date());
  const temAlmocoHoje = dbSelectedEvents.some(e => getDateString(e.start) === todayStr);
  const jaFezFeedback = feedbackDoneDates.includes(todayStr);

  return (
    <ImageBackground
      source={backgroundUrl ? { uri: backgroundUrl } : require('../../../assets/images/bg1.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.fullScreenContainer}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('Aluno', { email })}>
            <Image
              source={require('../../../assets/icons/angle-left.png')}
              style={[styles.icon, { tintColor: userTheme === 'dark' ? '#FFF' : '#000' }]}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAccountModalVisible(true)}>
            <Image
              source={require('../../../assets/icons/user.png')}
              style={[styles.icon, { tintColor: userTheme === 'dark' ? '#FFF' : '#000' }]}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.container}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingTop: 10, paddingBottom: 20 }}
        >
          {/* Calendário */}
          <View style={[styles.calendarWrapper, { backgroundColor: userTheme === 'dark' ? '#000' : '#FFF' }]}>
            <Calendar
              events={calendarEvents}
              height={Platform.OS === 'web' ? Dimensions.get('window').width * 0.4 : 450}
              mode="month"
              weekStartsOn={1}
              showTime={false}
              onPressCell={onPressDate}
              renderEvent={event => {
                const str = getDateString(event.start);
                const selected = (event.fromDB || event.isManual) && !removedLunchDates.some(d => getDateString(d) === str);
                const hasMenu = event.hasMenu || !!findMenuForDate(event.start);
                const style = Platform.OS === 'web' ? styles.webEventContainer : {};
                return (
                  <TouchableOpacity onPress={() => onPressDate(event.start)}>
                    {selected ? (
                      <View style={[styles.selectedEventContainer, style]}>
                        <Text style={[styles.eventText, { color: userTheme === 'dark' ? '#FFF' : '#000' }]}>✓</Text>
                      </View>
                    ) : hasMenu ? (
                      <View style={[styles.menuEventContainer, style]}>
                        <Text style={[styles.eventText, { color: userTheme === 'dark' ? '#FFF' : '#000' }]}>🍴</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
       <View style={styles.buttonsRow}>
        {temAlmocoHoje && !jaFezFeedback && horaAtual >= 12 && (
          <TouchableOpacity
            style={styles.smallFeedbackButton}
            onPress={() => setFeedbackModalVisible(true)}
          >
            <Text style={styles.smallFeedbackButtonText}>
              {`Opinião (${todayStr})`}
            </Text>
          </TouchableOpacity>
        )}
        <View style={styles.spacer} />
        <TouchableOpacity style={styles.saveButton} onPress={handlePress}>
          <Text style={styles.saveButtonText}>Guardar</Text>
        </TouchableOpacity>
      </View>

        <View style={styles.selectedDatesWrapper}>
          {Array.from(selectedSet)
            .sort()
            .map(str => (
              <View
                key={str}
                style={[
                  styles.selectedDateItem,
                  { backgroundColor: userTheme === 'dark' ? '#222' : '#e0e0e0' }
                ]}
              >
                <Text style={{ color: userTheme === 'dark' ? '#FFF' : '#000' }}>
                  {str}
                </Text>
              </View>
            ))}
        </View>
        </ScrollView>

        {/* Modal detalhes do menu */}
        <Modal visible={menuModalVisible} transparent animationType="slide" onRequestClose={() => setMenuModalVisible(false)}>
          <TouchableWithoutFeedback onPress={() => setMenuModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalContent, { backgroundColor: userTheme === 'dark' ? '#333' : '#FFF' }]}>
                  <Text style={[styles.modalTitle, { color: userTheme === 'dark' ? '#FFF' : '#000' }]}>Detalhes do Almoço</Text>
                  {selectedMenu && (
                    <>
                      <View style={styles.detailRow}>
                        <IconButton icon="bowl" size={20} iconColor={userTheme === 'dark' ? '#FFF' : '#000'} />
                        <Text style={[styles.detailText, { color: userTheme === 'dark' ? '#FFF' : '#000' }]}>
                          Sopa: {selectedMenu.sopa}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <IconButton icon="food-variant" size={20} iconColor={userTheme === 'dark' ? '#FFF' : '#000'} />
                        <Text style={[styles.detailText, { color: userTheme === 'dark' ? '#FFF' : '#000' }]}>
                          Prato: {selectedMenu.prato_principal}
                        </Text>
                      </View>
                      <View style={styles.detailRow}>
                        <IconButton icon="cupcake" size={20} iconColor={userTheme === 'dark' ? '#FFF' : '#000'} />
                        <Text style={[styles.detailText, { color: userTheme === 'dark' ? '#FFF' : '#000' }]}>
                          Sobremesa: {selectedMenu.sobremesa}
                        </Text>
                      </View>
                      <PaperButton mode="contained" onPress={handleMenuModalAction} style={styles.modalActionButton}>
                        {(dbSelectedDates => dbSelectedDates.some(e => getDateString(e.start) === selectedMenu.dia)
                          ? 'Desmarcar'
                          : 'Marcar')(dbSelectedEvents)}
                      </PaperButton>
                    </>
                  )}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

          <Modal
            visible={feedbackModalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => {
              setFeedbackModalVisible(false);
              setAvaliacao(null);
            }}
          >
            <TouchableWithoutFeedback
              onPress={() => {
                setFeedbackModalVisible(false);
                setAvaliacao(null);
              }}
            >
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Avalie o almoço</Text>
                  <View style={styles.ratingRow}>
                    {[0,1,2,3,4,5].map(n => (
                      <TouchableOpacity key={n} onPress={() => setAvaliacao(n)}>
                        <Text style={[styles.ratingNumber, avaliacao === n && styles.ratingSelected]}>
                          {n}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Comentário (opcional)"
                    value={opiniao}
                    onChangeText={setOpiniao}
                    multiline
                    numberOfLines={3}
                  />
                  <PaperButton mode="contained" disabled={avaliacao === null} onPress={handleSubmitFeedback} style={styles.modalActionButton}>
                    Enviar
                  </PaperButton>
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
  background: { flex: 1 },
  fullScreenContainer: { flex: 1, backgroundColor: 'transparent' },
  headerContainer: {
    position: 'absolute',
    top: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'web' ? 30 : (StatusBar.currentHeight || 20),
    paddingHorizontal: 10,
    backgroundColor: '#FFF',
    zIndex: 10,
  },
  icon: { width: 30, height: 30 },
  container: { flex: 1, paddingHorizontal: 10 },
  calendarWrapper: { borderRadius: 8, padding: 10, marginTop: 80 },
  webEventContainer: { width: '90%', height: '90%', alignSelf: 'center' },
  selectedEventContainer: {
    backgroundColor: '#47AD4D',
    borderRadius: 4,
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
    marginLeft: 1,
  },
  menuEventContainer: {
    backgroundColor: Platform.OS === 'web' ? '#abedde' : '#8a9b9c',
    borderRadius: 4,
    width: 45,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
    marginLeft: 1,
  },
  eventText: { fontSize: 20, margin: 0 },
  selectedDateItem: {
    margin: 4,
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  feedbackButton: {
    backgroundColor: '#FF9000',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginVertical: 5,
  },
  feedbackButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingNumber: {
    fontSize: 20,
    fontWeight: 'normal',
    width: 30,
    textAlign: 'center',
  },
  ratingSelected: {
    fontWeight: 'bold',
    borderWidth: 2,
    borderColor: '#47AD4D',
    borderRadius: 4,
    padding: 2,
  },
  selectedDatesWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  modalContent: { backgroundColor: '#FFF', borderRadius: 8, padding: 20, width: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  detailText: { fontSize: 16, marginLeft: 8 },
  modalActionButton: { backgroundColor: '#47AD4D', marginTop: 20, borderRadius: 5 },
  textInput: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 4,
    padding: 8,
    textAlignVertical: 'top',
    marginTop: 10,
  },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 10, // se quiseres algum padding lateral
  },
  spacer: {
    flex: 1,
  },
  smallFeedbackButton: {
    backgroundColor: '#FF9000',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  smallFeedbackButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#47AD4D',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default AlmocosScreen;