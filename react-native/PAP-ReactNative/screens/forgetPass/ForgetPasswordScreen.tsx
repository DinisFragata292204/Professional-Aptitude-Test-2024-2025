import config from '../../config/config_db';
import React, { useState } from 'react';
import {View, StyleSheet, KeyboardAvoidingView, ImageBackground, Platform, ActivityIndicator,} from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { RootStackParamList } from '../../types';
let ToastAndroid: any = null;
if (Platform.OS === "android") {
  // Só importa ToastAndroid no Android
  ToastAndroid = require("react-native").ToastAndroid;
}

const ForgetPasswordScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const url = `${config.baseUrl}/forgetPasswordFiles/sendEmailForgetPassword.php`;

  const [email, setEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleResetPassword = async () => {
    setErrorMessage('');
    if (!email) {
      setErrorMessage('Pedimos que coloque o seu email no campo.');
      return;
    }
    if (!email.includes('@etps.com.pt')) {
      setErrorMessage('Pedimos que insira um email válido.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })});
      const data = await response.json();
      if (data.success) {
        if (Platform.OS === 'web') {
          navigation.navigate('VerifyCodeForgetPassword', {
            email, initialMessage: data.message || 'Pedimos que verifique o código que enviamos para o seu email.'});
        } else {
          ToastAndroid.show('Pedimos que verifique o código que enviamos para o seu email.', ToastAndroid.LONG);
          navigation.navigate('VerifyCodeForgetPassword', { email });
        }
      } else if (data.emailNaoExiste === true) {
        setErrorMessage('Não foi possível encontrar o email fornecido na nossa base de dados. Se quiser pode criar uma conta.');
        navigation.navigate('Login');
      } else {
        setErrorMessage('Não foi possível encontrar o email fornecido na nossa base de dados. Se quiser pode criar uma conta.');
      }
    } catch (error) {
      setErrorMessage('Ocorreu um erro da nossa parte enquanto tentavamos enviar um código para o seu email. Pedimos que tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ImageBackground
        source={require('../../assets/images/bg1.jpg')}
        style={styles.background}
      >
          <ActivityIndicator size="large" color="#47AD4D" />
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/images/bg1.jpg')}
      style={styles.background}
    >
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <View style={styles.box}>
          <Text variant="titleLarge" style={styles.title}>Recuperar a palavra-passe</Text>
          <Text variant="bodySmall" style={styles.title}>Insira o seu email, em seguida será enviado um código para o seu email para validar a sua identidade e por fim poderá alterar a palavra-passe.</Text>
          
          {errorMessage !== '' && (
            <HelperText type="error" visible>
              {errorMessage}
            </HelperText>
          )}

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            keyboardType="email-address"
            outlineColor="#47AD4D"
            activeOutlineColor="#47AD4D"
          />

          <Button
            mode="contained"
            onPress={handleResetPassword}
            style={styles.sendLinkButton}
          >
            Enviar código para o email
          </Button>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            style={styles.backToLoginButton}
            textColor="red"
          >
            Voltar
          </Button>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: 16,
  },
  box: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'center',
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    marginBottom: 16,
  },
  sendLinkButton: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#47AD4D',
  },
  backToLoginButton: {
    alignSelf: 'center',
    marginTop: 4,
  },
});

export default ForgetPasswordScreen;