// src/screens/VerifyCodeForgetPassword.tsx
import config from '../../config/config_db';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, ImageBackground, ActivityIndicator, TouchableOpacity, Platform,} from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';

let ToastAndroid: any = null;
if (Platform.OS === "android") {
  // Só importa ToastAndroid no Android
  ToastAndroid = require("react-native").ToastAndroid;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface RouteParams {
  email?: string;
  initialMessage?: string;
}

const VerifyCodeForgetPassword = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();

  const { email: initialEmail = '', initialMessage = '' } = route.params as RouteParams;

  const url_validateCode = `${config.baseUrl}/forgetPasswordfiles/validateCodeForgetPassword.php`;
  const url_sendEmail = `${config.baseUrl}/forgetPasswordfiles/sendEmailForgetPassword.php`;

  const [formData, setFormData] = useState({ email: initialEmail, code: '' });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (initialMessage) {
      setSuccessMessage(initialMessage);
      setTimeout(() => {
        setSuccessMessage('');
      }, 2000);
    }
  }, [initialMessage]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleCodeSubmit = async () => {
    if (!formData.code) {
      setErrorMessage('Pedimos que insira o código enviado para o seu email.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch(url_validateCode, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: formData.email, code: formData.code }),});
      const result = await response.json();
      if (result.success) {
        setSuccessMessage('Código verificado com sucesso!');
        if (Platform.OS !== 'web') {
          ToastAndroid.show('Código verificado com sucesso!', ToastAndroid.LONG);
        }
        setTimeout(() => setSuccessMessage(''), 2000);
        setTimeout(() => {
          navigation.navigate('PutNewPassForgetPassword', { email: formData.email });
        }, 1000);
      } else {
        setErrorMessage(result.message || 'Ocorreu um erro da nossa parte enquanto tentavamos validar o código. Pedimos que tente novamente.');
      }
    } catch {
      setErrorMessage('Ocorreu um erro enquanto o tentavamos conectar aos nossos servidores. Pedimos que tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await fetch(url_sendEmail, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: formData.email }), });
      const result = await response.json();
      if (result.success) {
        const msg = result.message || `Enviamos o código novamente para ${formData.email} com sucesso!`;
        setSuccessMessage(msg);
        if (Platform.OS !== 'web') {
          ToastAndroid.show(msg, ToastAndroid.LONG);
        }
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setErrorMessage(result.message || 'Não conseguimos enviar o código novamente. Pedimos que tente novamente.');
      }
    } catch {
      setErrorMessage('Ocorreu um erro enquanto o tentavamos conectar aos nossos servidores. Pedimos que tente novamente mais tarde.');
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
          <Text variant="headlineMedium" style={styles.title}>
            Código de verificação
          </Text>

          {successMessage !== '' && (
            <View style={styles.toastContainer}>
              <View style={styles.toastBox}>
                <Text style={styles.toastText}>{successMessage}</Text>
              </View>
            </View>
          )}
          {errorMessage !== '' && (
            <HelperText type="error" visible style={styles.errorText}>
              {errorMessage}
            </HelperText>
          )}

          <TextInput
            label="Código"
            value={formData.code}
            onChangeText={text => handleChange('code', text)}
            mode="outlined"
            style={styles.input}
            keyboardType="number-pad"
            outlineColor="#47AD4D"
            activeOutlineColor="#47AD4D"
          />
          <Button
            mode="contained"
            onPress={handleCodeSubmit}
            style={styles.verifyButton}
            labelStyle={{ color: '#fff' }}
          >
            Verificar Código
          </Button>

          <Button
            mode="text"
            onPress={handleResendCode}
            disabled={resendCooldown > 0}
            style={styles.link}
            labelStyle={{ color: '#47AD4D' }}
          >
            {resendCooldown > 0 ? `Reenviar código (${resendCooldown}s)` : 'Reenviar código'}
          </Button>

          <TouchableOpacity onPress={() => navigation.replace('Login')}>
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>
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
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    elevation: 3,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'center',
  },
  title: {
    marginBottom: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  input: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: 'white',
  },
  link: {
    textAlign: 'center',
    marginTop: -8,
  },
  verifyButton: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#47AD4D',
  },
  errorText: {
    color: 'red',
    marginBottom: 8,
  },
  backText: {
    color: 'red',
    marginTop: 8,
  },
  toastContainer: {
    position: 'absolute',
    top: -200,     
    left: 16,       
    right: 16,
    alignItems: 'center',
    zIndex: 10,
  },
  toastBox: {
    backgroundColor: '#47AD4D',
    borderRadius: 14,            
    paddingVertical: 12,
    paddingHorizontal: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  toastText: {
    color: '#FFF',
    fontSize: 14,
  },
});

export default VerifyCodeForgetPassword;