import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Platform,
  TouchableOpacity,
  Image,
  ImageBackground,
  Alert,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Dimensions,
  ViewStyle,
} from 'react-native';
import {
  TextInput,
  Button,
  useTheme,
  Text,
  Divider,
} from 'react-native-paper';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import config from '../../config/config_db';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import ModalConfig from '../../components/modalConfig';

type RootStackParamList = {
  SuggestionsResponse: { email: string };
  Aluno: undefined;
};
type SuggestionsResponseRouteProp = RouteProp<
  RootStackParamList,
  'SuggestionsResponse'
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

const SuggestionsResponseScreen: React.FC = () => {
  const { width: screenWidth } = Dimensions.get('window');
  const CARD_WIDTH = screenWidth * 0.9;
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SuggestionsResponseRouteProp>();
  const { email: responderEmail } = route.params;

  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [userTheme, setUserTheme] = useState<'light' | 'dark'>('light');

  const [unanswered, setUnanswered] = useState<Suggestion[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(true);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<boolean>(false);
  const [modalContaVisivel, setModalContaVisivel] = useState<boolean>(false);

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
      } catch {}
    })();
  }, []);

  const fetchUnanswered = async () => {
    setLoadingList(true);
    try {
      const res = await axios.get(
        `${config.baseUrl}/calendarioFiles/suggest/fetch_unanswered_suggestions.php`,
        { params: { email: responderEmail } }
      );
      if (res.data.success) {
        setUnanswered(res.data.data);
      } else {
        Alert.alert('Erro', res.data.message || 'Falha ao carregar sugestões');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível comunicar com o servidor.');
    } finally {
      setLoadingList(false);
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    width: CARD_WIDTH,
    maxWidth: 400,
  };

  useEffect(() => {
    fetchUnanswered();
  }, []);

  // guarda todas as respostas preenchidas
  const handleSave = async () => {
    const payload = Object.entries(responses)
      .filter(([, resp]) => resp.trim() !== '')
      .map(([id, resp]) => ({ id, response: resp }));
    if (payload.length === 0) {
      Alert.alert('Atenção', 'Nenhuma resposta para guardar.');
      return;
    }
    setSaving(true);
    try {
      const res = await axios.post(
        `${config.baseUrl}/calendarioFiles/suggest/submit_responses.php`,
        { responder: responderEmail, responses: payload }
      );
      if (res.data.success) {
        Alert.alert('Sucesso', 'Respostas guardadas com sucesso.');
        setResponses({});
        fetchUnanswered();
      } else {
        Alert.alert('Erro', res.data.message || 'Falha ao guardar respostas');
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Erro', 'Não foi possível comunicar com o servidor.');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: Suggestion }) => (
    <View style={styles.card}>
      <Text style={styles.msgTitle}>Sugestão de {item.email}</Text>
      <Text style={styles.msgDate}>{item.date_sent}</Text>
      <Text style={styles.msgBody}>{item.message}</Text>
      <TextInput
        mode="outlined"
        label="Responder"
        placeholder="Escreve aqui a tua resposta..."
        value={responses[item.id] || ''}
        onChangeText={text =>
          setResponses(prev => ({ ...prev, [item.id]: text }))
        }
        multiline
        style={styles.responseInput}
        outlineColor="#CCCCCC"
        activeOutlineColor="#47AD4D"
      />
      <Divider />
    </View>
  );

  return (
    <ImageBackground
      source={
        backgroundUrl
          ? { uri: backgroundUrl }
          : require('../../assets/images/bg1.jpg')
      }
      style={styles.bgImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safe}>
        <View
          style={[
            styles.header,
            {
              paddingTop:
                Platform.OS === 'web'
                  ? 40
                  : StatusBar.currentHeight || 20,
            },
          ]}
        >
          <TouchableOpacity onPress={() => navigation.navigate('Administrador')} style={{ flex: 1 }}>
            <Image
              source={require('../../assets/icons/angle-left.png')}
              style={[
                styles.icon,
                { tintColor: userTheme === 'dark' ? '#FFF' : '#000' },
              ]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setModalContaVisivel(true)}
            style={{ flex: 1, alignItems: 'flex-end' }}
          >
            <Image
              source={require('../../assets/icons/user.png')}
              style={[
                styles.icon,
                { tintColor: userTheme === 'dark' ? '#FFF' : '#000' },
              ]}
            />
          </TouchableOpacity>
        </View>

       <View style={{ flex: 1, backgroundColor: '#F5F5F5', top: 200 }}>
      {loadingList ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#47AD4D" />
        </View>

      ) : unanswered.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <View style={cardStyle}>
            <Text
              style={{
                fontSize: 16,
                color: '#777777',
                textAlign: 'center',
                marginBottom: 20,
              }}
            >
              Não há sugestões por responder por enquanto.
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Administrador')}
              contentStyle={{ height: 48 }}
              labelStyle={{ fontSize: 16, fontWeight: '600' }}
              style={{ borderRadius: 8 }}
              buttonColor="#47AD4D"
              textColor="#FFFFFF"
            >
              Voltar
            </Button>
          </View>
        </View>

      ) : (
        <View style={{
          flex: 1,
          margin: 16,
        }}>
          <View style={cardStyle}>
            <FlatList
              data={unanswered}
              keyExtractor={item => item.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 80 }}
              showsVerticalScrollIndicator={false}
              ListFooterComponent={
                saving ? (
                  <ActivityIndicator
                    size="large"
                    color="#47AD4D"
                    style={{ marginTop: 20 }}
                  />
                ) : (
                  <Button
                    mode="contained"
                    onPress={handleSave}
                    contentStyle={{ height: 48 }}
                    labelStyle={{ fontSize: 16, fontWeight: '600' }}
                    style={{ borderRadius: 8, marginTop: 16 }}
                    buttonColor="#47AD4D"
                    textColor="#FFFFFF"
                  >
                    Guardar Respostas
                  </Button>
                )
              }
            />
          </View>
        </View>
      )}
    </View>

        <ModalConfig
          visible={modalContaVisivel}
          dynamicHeaderBackground="white"
          dynamicTextColor="black"
          onClose={() => setModalContaVisivel(false)}
          navigation={navigation}
          email={responderEmail}
        />
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  bgImage: { flex: 1 },
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 10,
    position: 'absolute',
    top: 0,
    zIndex: 10,
    backgroundColor: 'white',
  },
  icon: {
    width: Platform.OS === 'web' ? 35 : 23,
    height: Platform.OS === 'web' ? 35 : 25,
    marginLeft: 3,
    marginTop: Platform.OS === 'web' ? -15 : 3,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  msgTitle: { fontWeight: 'bold', marginBottom: 4 },
  msgDate: { fontSize: 12, marginBottom: 8, color: '#666' },
  msgBody: { marginBottom: 12 },
  responseInput: { minHeight: 60, marginBottom: 8 },
  saveButton: { margin: 16 },
});

export default SuggestionsResponseScreen;