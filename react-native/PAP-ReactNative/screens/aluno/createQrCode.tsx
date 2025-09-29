import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

const GenerateQRCodeScreen = () => {
  // Você pode definir o valor estático ou, por exemplo, concatenar a data atual
  const qrData = "entrada-saida"; // ou, por exemplo: `entrada-saida-${new Date().toISOString().slice(0,10)}`;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>QR Code de Entrada/Saída</Text>
      <QRCode value={qrData} size={200} />
      <Text style={styles.info}>Faça scan este código para registrar sua entrada/saída</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#fff' 
  },
  title: { 
    fontSize: 24, 
    marginBottom: 20 
  },
  info: {
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});

export default GenerateQRCodeScreen;