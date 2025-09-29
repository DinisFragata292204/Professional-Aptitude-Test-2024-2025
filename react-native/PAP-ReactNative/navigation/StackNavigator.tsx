import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import LoginScreen from "../screens/login/LoginScreen";
import ForgotPasswordScreen from "../screens/forgetPass/ForgetPasswordScreen";
import SignInScreen from "../screens/signIn/SignInScreen";
import AlunoScreen from "../screens/aluno/AlunoScreen";
import ProfessorScreen from "../screens/professor/ProfessorScreen";
import AdministradorScreen from "../screens/admin/AdministradorScreen";
import verifyCodeScreen from "../screens/signIn/VerifyCodeScreen";
import PutDataScreen from "../screens/signIn/PutDataScreen";

const Stack = createStackNavigator();

const StackNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
        <>
          <Stack.Screen name="Fazer login" component={LoginScreen} />
          <Stack.Screen
            name="Recuperar Password"
            component={ForgotPasswordScreen}
            options={{ headerShown: true, title: "Esqueci-me da password" }}
          />
          <Stack.Screen
            name="Registo"
            component={SignInScreen}
            options={{ headerShown: true, title: "Registrar-se" }}
          />
        </>
        <Stack.Screen name="Aluno" component={AlunoScreen} />
        <Stack.Screen name="Professor" component={ProfessorScreen} />
        <Stack.Screen name="Administrador" component={AdministradorScreen} />
        <Stack.Screen name="verifyCode" component={verifyCodeScreen} />
        <Stack.Screen name="putData" component={PutDataScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default StackNavigator;
