import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, ImageBackground, Image, Platform, ActivityIndicator, TouchableOpacity} from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import axios from 'axios';
import config from '../../config/config_db';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../types';
let ToastAndroid: any = null;
if (Platform.OS === "android") {
  // Só importa ToastAndroid no Android
  ToastAndroid = require("react-native").ToastAndroid;
}

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface RouteParams {
  email: string;
}

const PutNewPassForgetPassword = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { email } = route.params as RouteParams;

  const url = `${config.baseUrl}/forgetPasswordfiles/SaveNewPassForgetPassword.php`;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const showMessage = (msg: string) => {
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      ToastAndroid.show(msg, ToastAndroid.LONG);
    }
  };

  const handleSubmit = async () => {
    if (password.length < 6) {
      showMessage('Para a sua segurança pedimos que coloque uma palavra-passe com mais de 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      showMessage('As palavras-passes não são iguais.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const { data } = await axios.post( url, { email, newPassword: password });
      if (data.success) {
        const msg = 'A sua palavra‑passe atualizada com sucesso!';
        showMessage(msg);
        navigation.replace('Login');
      } else {
        setErrorMessage(data.message || 'Ocorreu um erro da nossa para enquanto tentavamos atualizar a sua palavra‑passe. Pedimos que tente novamente.');
      }
    } catch (e) {
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.box}>
          <Text variant="headlineMedium" style={[styles.title, { color: "#000" }]}>
            Atualizar a palavra‑passe
          </Text>

          {errorMessage !== '' && (
            <HelperText type="error" visible style={styles.errorText}>
              {errorMessage}
            </HelperText>
          )}

          <TextInput
            label="Palavra‑passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            mode="outlined"
            style={styles.input}
            outlineColor="#47AD4D"
            activeOutlineColor="#47AD4D"
            right={
                <TextInput.Icon
                  icon={() => (
                    <TouchableOpacity onPress={() => setShowPassword(prev => !prev)}>
                      <Image
                        source={
                          showPassword
                            ? require("../../assets/icons/eye-off.png")
                            : require("../../assets/icons/eye.png")
                        }
                        style={styles.iconStyle}
                      />
                    </TouchableOpacity>
                  )}
                />
            }
          />
          <TextInput
            label="Confirmar a palavra‑passe"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirm}
            mode="outlined"
            style={styles.input}
            outlineColor="#47AD4D"
            activeOutlineColor="#47AD4D"
            right={
              <TextInput.Icon
                icon={() => (
                  <TouchableOpacity onPress={() => setShowConfirm(prev => !prev)}>
                    <Image
                      source={
                        showConfirm
                          ? require("../../assets/icons/eye-off.png")
                          : require("../../assets/icons/eye.png")
                      }
                      style={styles.iconStyle}
                    />
                  </TouchableOpacity>
                )}
              />
          }
        />
          <Button
            mode="contained"
            onPress={handleSubmit}
            style={styles.submitButton}
            labelStyle={{ color: '#FFF' }}
            disabled={!password || !confirmPassword}
          >
            Atualizar a palavra-passe
          </Button>

          <TouchableOpacity onPress={() => navigation.replace('Login')}>
            <Text style={styles.backText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  iconStyle: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  background: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    width: '100%',
  },
  box: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'center',
  },
  title: {
    marginBottom: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: 'white',
  },
  submitButton: {
    width: '100%',
    marginTop: 8,
    backgroundColor: '#47AD4D',
  },
  errorText: {
    color: '#D9534F',
    marginBottom: 8,
    textAlign: 'center',
  },
  backText: {
    color: '#D9534F',
    marginTop: 12,
  },
});

export default PutNewPassForgetPassword;