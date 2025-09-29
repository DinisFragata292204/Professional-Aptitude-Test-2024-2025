import React, { useState, useEffect } from "react";
import { Platform, ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";
import config from "./config/config_db";
import { Provider as PaperProvider, DefaultTheme, MD3DarkTheme } from "react-native-paper";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const Stack = createStackNavigator();

// Importação das telas
import AdministradorScreen from "./screens/admin/AdministradorScreen";
import suggestionsScreen from "./screens/admin/suggestionsScreen";
import AlunoScreen from "./screens/aluno/AlunoScreen";
import ProfessorScreen from "./screens/professor/ProfessorScreen";
import LoginLayout from "./screens/login/LoginScreen";
import PutPasswordScreen from "./screens/signIn/PutPasswordScreen";
import SignInScreen from "./screens/signIn/SignInScreen";
import VerifyCodeScreen from "./screens/signIn/VerifyCodeScreen";
import ThemeScreen from "./screens/MenuAluno/Configuracoes/temaScreen";
import PersonalDataScreen from "./screens/MenuAluno/Configuracoes/dadosPessoaisScreen";
import sugestAnythingScreen from "./screens/MenuAluno/Configuracoes/sugestAnythingScreen";
import PasswordSecurityScreen from "./screens/MenuAluno/Configuracoes/passwordESegurancaScreen";
import NotasScreen from "./screens/MenuAluno/Menu/NotasScreen";
import AlmocosScreen from "./screens/MenuAluno/Menu/AlmocosScreen";
import HorariosScreen from "./screens/MenuAluno/Menu/HorariosScreen";
import entradasEsaidas from "./screens/MenuAluno/Menu/entradasEsaidas";
import AddEventsScreen from "./screens/MenuProf/adicionarEventosOrTasks";
import AdicionarNotasScreen from "./screens/MenuProf/adicionarNotas";
import PersonalizarTarefaScreen from "./screens/MenuAluno/tarefas/eventosETarefas";
import QRCodeScannerScreen from "./screens/aluno/qrcodeScanner";
import PersonalizarTaskOuEventProfScreen from "./screens/MenuProf/personalizar_tarefaOuEvento";
import InsertPassword from "./screens/login/InsertPasswordScreen";
import VerificationScreen from "./screens/login/VerificationScreen";
import PutNewPassForgetPassword from "./screens/forgetPass/PutNewPassForgetPassword";
import VerifyCodeForgetPassword from "./screens/forgetPass/VerifiyCodeForgetPassword";
import ForgetPasswordScreen from "./screens/forgetPass/ForgetPasswordScreen";
import GenerateQRCodeScreen from "./screens/aluno/createQrCode";
import PutCalendar from "./screens/admin/adminPutFiles";
import auxiliarScreen from "./screens/auxiliar/auxiliarScreen";
import alunosDoProfScreen from "./screens/MenuProf/alunosDoProfScreen";
import almocoProfScreen from "./screens/MenuProf/almocosProfScreen";
import disciplinasAluno from "./screens/MenuAluno/Menu/disciplinasAluno";
import NotasDisciplina from "./screens/MenuAluno/Menu/NotasDisciplina";
import auxiliarEstatisticas from "./screens/auxiliar/auxiliarEstatisticas";
import confirmacoesScreen from "./screens/admin/confirmacoesScreen";
import SelectTurma from "./screens/signIn/SelectTurma";
import AddEventsScreenWeb from "./screens/MenuProf/adicionarEventosOrTasksWeb";

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [themeData, setThemeData] = useState({ theme: "light", background_url: "" });
  const [userThemeName, setUserThemeName] = useState<"light" | "dark">("light");
  const paperTheme = userThemeName === "light" ? DefaultTheme : MD3DarkTheme;

  const endpoint = `${config.baseUrl}/backgroundFiles/getThemeAndBackground.php`;

  const fetchThemeAndBackground = async (email: string) => {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const json = await response.json();
      if (json.success) {
        setThemeData({
          theme: json.tema_user,
          background_url: json.background_user,
        });
      } else {
      }
    } catch (error) {
    }
  };

  useEffect(() => {
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const checkToken = async () => {
      try {
        let token: string | null, role: string | null, email: string | null;
        if (Platform.OS === "web") {
          token = localStorage.getItem("userToken");
          role = localStorage.getItem("userRole");
          email = localStorage.getItem("email");
        } else {
          token = await SecureStore.getItemAsync("userToken");
          role = await SecureStore.getItemAsync("userRole");
          email = await SecureStore.getItemAsync("email");
        }
        setUserToken(token);
        setUserRole(role);
        setUserEmail(email);

        if (email) {
          await fetchThemeAndBackground(email);
        }
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    };
    checkToken();
  }, []);

  const initialRoute = userToken
    ? userRole === "aluno"
      ? "Aluno"
      : userRole === "professor"
      ? "Professor"
      : userRole === "admin"
      ? "Administrador"
      : userRole === "auxiliar"
      ? "auxiliarScreen"
      : "Login"
    : "Login";

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName={initialRoute} id={undefined} screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginLayout} />
          <Stack.Screen name="Aluno" component={AlunoScreen} initialParams={{ email: userEmail, theme: themeData.theme, backgroundUrl: themeData.background_url }} />
          <Stack.Screen name="Professor" component={ProfessorScreen} initialParams={{ email: userEmail }} />
          <Stack.Screen name="Administrador" component={AdministradorScreen} initialParams={{ email: userEmail }} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="VerifyCode" component={VerifyCodeScreen} />
          <Stack.Screen name="PutPassword" component={PutPasswordScreen} />
          <Stack.Screen name="TemaScreen" component={ThemeScreen} />
          <Stack.Screen name="suggestionsScreen" component={suggestionsScreen} />
          <Stack.Screen name="PersonalDataScreen" component={PersonalDataScreen} />
          <Stack.Screen name="sugestAnythingScreen" component={sugestAnythingScreen} />
          <Stack.Screen name="PasswordSecurityScreen" component={PasswordSecurityScreen} />
          <Stack.Screen name="NotasScreen" component={NotasScreen} />
          <Stack.Screen name="AlmocosScreen" component={AlmocosScreen} />
          <Stack.Screen name="HorariosScreen" component={HorariosScreen} />
          <Stack.Screen name="entradasEsaidas" component={entradasEsaidas} />
          <Stack.Screen name="addEventListener" component={AddEventsScreen} />
          <Stack.Screen name="AddEventsScreenWeb" component={AddEventsScreenWeb} />
          <Stack.Screen name="AdicionarNotas" component={AdicionarNotasScreen} />
          <Stack.Screen name="PersonalizarTarefa" component={PersonalizarTarefaScreen} />
          <Stack.Screen name="QRCodeScannerScreen" component={QRCodeScannerScreen} />
          <Stack.Screen name="PersonalizarTarefaProf" component={PersonalizarTaskOuEventProfScreen} />
          <Stack.Screen name="InsertPasswordScreen" component={InsertPassword} />
          <Stack.Screen name="VerificationScreen" component={VerificationScreen} />
          <Stack.Screen name="PutNewPassForgetPassword" component={PutNewPassForgetPassword} />
          <Stack.Screen name="VerifyCodeForgetPassword" component={VerifyCodeForgetPassword} />
          <Stack.Screen name="ForgetPasswordScreen" component={ForgetPasswordScreen} />
          <Stack.Screen name="GenerateQRCodeScreen" component={GenerateQRCodeScreen} />
          <Stack.Screen name="PutCalendar" component={PutCalendar} />
          <Stack.Screen name="auxiliarScreen" component={auxiliarScreen} initialParams={{ email: userEmail }} />
          <Stack.Screen name="alunosDoProfScreen" component={alunosDoProfScreen} initialParams={{ email: userEmail }} />
          <Stack.Screen name="almocoProfScreen" component={almocoProfScreen} initialParams={{ email: userEmail }} />
          <Stack.Screen name="disciplinasAluno" component={disciplinasAluno} initialParams={{ email: userEmail }} />
          <Stack.Screen name="NotasDisciplina" component={NotasDisciplina} initialParams={{ email: userEmail }} />
          <Stack.Screen name="auxiliarEstatisticas" component={auxiliarEstatisticas} initialParams={{ email: userEmail }} />
          <Stack.Screen name="confirmacoesScreen" component={confirmacoesScreen} initialParams={{ email: userEmail }} />
          <Stack.Screen name="SelectTurma" component={SelectTurma} initialParams={{ email: userEmail }} />
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

export default App;