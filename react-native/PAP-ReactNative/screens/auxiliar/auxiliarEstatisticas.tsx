import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import { Button, Icon } from "react-native-paper";
import config from "../../config/config_db";

interface utilizador {
  id: number;
  email: string;
  cargo: string;
  dias: string[];
  turma?: { ano: string; turma: string };
}

interface EstatisticasResponse {
  success: boolean;
  headline: string;
  alunosCount: number;
  professoresCount: number;
  administradoresCount: number;
  total: number;
  alunos: utilizador[];
  professores: utilizador[];
  administradores: utilizador[];
  sugestoes: string;
}

export default function AuxiliarEstatisticas({ navigation }: any) {
  const [dados, setDados] = useState<EstatisticasResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [secaoAtiva, setSecaoAtiva] = useState<"alunos" | "professores" | "administradores" | "sugestoes" | null>(null);
  const [subDetalhe, setSubDetalhe] = useState<any>(null);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  useEffect(() => {
    fetch(`${config.baseUrl}/auxiliarFiles/fetchEstatisticasAlmoco.php`)
      .then(async (res) => {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          if (json.success) {
            setDados(json);
          } else {
            showAlert("Erro", "Não foi possível carregar as estatísticas. Pedimos que tente novamente mais tarde.");
          }
        } catch (parseError) {
        }
      })
      .catch((error) => {
        showAlert("Erro", "Ocorreu um erro enquanto o tentavamos conectar aos nossos servidores. Pedimos que tente novamente mais tarde.");
      })
      .finally(() => setLoading(false));
  }, []);

  const agruparAlunosPorTurma = () => {
    const grupos: { [key: string]: utilizador[] } = {};
    dados?.alunos.forEach((aluno) => {
      if (aluno.turma) {
        const chave = `${aluno.turma.ano} - ${aluno.turma.turma}`;
        if (!grupos[chave]) {
          grupos[chave] = [];
        }
        grupos[chave].push(aluno);
      }
    });
    return grupos;
  };

  // Renderização dos detalhes (quando uma seção é selecionada)
  const renderDetalhes = () => {
    if (!dados) return null;
    if (secaoAtiva === "alunos" && subDetalhe === null) {
      // Agrupa alunos por turma e exibe botões maiores e mais apelativos
      const grupos = agruparAlunosPorTurma();
      return (
        <View style={styles.detailContainer}>
          <Text style={styles.detailTitle}>Turmas com alunos que almoçam</Text>
          {Object.keys(grupos).map((chave, index) => {
            const alunosTurma = grupos[chave];
            // extraímos a lógica de navegação para não repetir
            const handlePress = () =>
              setSubDetalhe({ tipo: "turma", turma: chave, alunos: alunosTurma });

            return (
              <TouchableOpacity
                key={index}
                style={styles.turmaItem}
                onPress={handlePress}       
              >
                <TouchableOpacity
                  style={styles.greenSquare}
                  onPress={handlePress}     
                  activeOpacity={0.7}
                >
                  <Icon source="check-circle" size={24} />
                </TouchableOpacity>

                <Text style={styles.turmaText}>{chave}</Text>
                <Text style={styles.turmaText}>({alunosTurma.length})</Text>
              </TouchableOpacity>
            );
          })}
          <Button
            mode="outlined"
            onPress={() => {
              setSecaoAtiva(null);
              setSubDetalhe(null);
            }}
            style={styles.voltarBotao}
            labelStyle={styles.voltarBotaoText}
          >
            Voltar
          </Button>
        </View>
      );
    }
    if (secaoAtiva === "alunos" && subDetalhe && subDetalhe.tipo === "turma") {
      return (
        <View style={styles.detailContainer}>
          <Text style={styles.detailTitle}>Alunos de {subDetalhe.turma}</Text>
          {subDetalhe.alunos.map((aluno: utilizador, idx: number) => (
            <View key={idx} style={styles.detailItem}>
              <Text style={styles.detailItemText}>Email: {aluno.email}</Text>
              <Text style={styles.detailItemText}>
                Dias: {aluno.dias.join(", ")}
              </Text>
            </View>
          ))}
          <Button
            mode="outlined"
            onPress={() => setSubDetalhe(null)}
            style={styles.voltarBotao}
            labelStyle={styles.voltarBotaoText}
          >
            Voltar
          </Button>
        </View>
      );
    }
    if (secaoAtiva === "professores" || secaoAtiva === "administradores" || secaoAtiva === "sugestoes") {
        const lista =
  secaoAtiva === "professores" ? dados.professores :
  secaoAtiva === "administradores" ? dados.administradores :
  secaoAtiva === "sugestoes" ? dados.sugestoes : []
if (secaoAtiva === "sugestoes") {
  return (
    <View style={styles.detailContainer}>
      <Text style={styles.detailTitle}>Sugestões de quem almoçou (16-07-2025)</Text>
      <Text style={styles.detailItemText}>{dados.sugestoes}</Text>

      <Button
        mode="outlined"
        onPress={() => setSecaoAtiva(null)}
        style={styles.voltarBotao}
        labelStyle={styles.voltarBotaoText}
      >
        Voltar
      </Button>
    </View>
  );
}

      return (
        <View style={styles.detailContainer}>
         <Text style={styles.detailTitle}>
            {secaoAtiva === "professores"
              ? "Professores que almoçam"
              : secaoAtiva === "administradores"
              ? "Administradores que almoçam"
              : secaoAtiva === "sugestoes"
              ? "Sugestões de quem almoçou"
              : ""}
          </Text>
          {lista.map((user: utilizador, idx: number) => (
            <View key={idx} style={styles.detailItem}>
              <Text style={styles.detailItemText}>Email: {user.email}</Text>
              <Text style={styles.detailItemText}>
                Dias: {user.dias.join(", ")}
              </Text>
            </View>
          ))}
          <Button
            mode="outlined"
            onPress={() => setSecaoAtiva(null)}
            style={styles.voltarBotao}
            labelStyle={styles.voltarBotaoText}
          >
            Voltar
          </Button>
        </View>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#47AD4D" />
      </View>
    );
  }

  // Layout principal: menu vertical à esquerda e dados estatísticos à direita
  const renderMenuEHeadline = () => {
    return (
      <View style={styles.mainContainer}>
        {/* Menu Vertical */}
        <View style={styles.menuVertical}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setSecaoAtiva("alunos")}
          >
            <Text style={styles.menuButtonText}>Alunos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setSecaoAtiva("professores")}
          >
            <Text style={styles.menuButtonText}>Professores</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setSecaoAtiva("administradores")}
          >
            <Text style={styles.menuButtonText}>Administradores</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setSecaoAtiva("sugestoes")}
          >
            <Text style={styles.menuButtonText}>Sugestões</Text>
          </TouchableOpacity>
        </View>
        {/* Dados Estatísticos à Direita */}
        <View style={styles.headlineContainer}>
          <Text style={styles.headline}>{dados?.headline}</Text>
          <Text style={styles.infoText}>Alunos: {dados?.alunosCount}</Text>
          <Text style={styles.infoText}>Professores: {dados?.professoresCount}</Text>
          <Text style={styles.infoText}>
            Administradores: {dados?.administradoresCount}
          </Text>
          <Text style={styles.totalText}>Total: {dados?.total}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!secaoAtiva && renderMenuEHeadline()}
      {secaoAtiva && renderDetalhes()}
      {!secaoAtiva && (
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.voltarBotao}
          labelStyle={styles.voltarBotaoText}
        >
          Voltar
        </Button>
      )}
    </ScrollView>
  );
  
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 15,
        backgroundColor: "#fff",
      },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    mainContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "stretch", // estica as colunas
        justifyContent: "space-between",
        paddingVertical: 20,
      },
    menuVertical: {
      flex: 1,
      marginRight: 30,
      justifyContent: "center",
    },
    menuButton: {
      backgroundColor: "#47AD4D",
      paddingVertical: 18,
      paddingHorizontal: 10,
      marginBottom: 12,
      borderRadius: 10,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    menuButtonText: {
      color: "#fff",
      fontSize: 18,
      fontWeight: "bold",
    },
    headlineContainer: {
        flex: 1,
        justifyContent: "space-evenly",
        padding: 20,
        backgroundColor: "#F9F9F9",
        borderRadius: 10,
        elevation: 2,
        minHeight: 300, // aumenta o preenchimento vertical
      },
      headline: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        borderBottomWidth: 1,
        borderColor: "#ccc",
        paddingBottom: 10,
        textAlign: "center",
      },
      infoText: {
        fontSize: 20,
        marginVertical: 6,
        textAlign: "center",
      },
      totalText: {
        fontSize: 22,
        fontWeight: "bold",
        marginTop: 16,
        textAlign: "center",
        color: "#2E7D32",
      },
    detailContainer: {
      marginTop: 20,
      alignItems: "center",
      paddingHorizontal: 10,
    },
    detailTitle: {
      fontSize: 22,
      fontWeight: "bold",
      marginBottom: 20,
      textAlign: "center",
    },
    detailItem: {
      backgroundColor: "#F1F8E9",
      padding: 12,
      borderRadius: 8,
      marginVertical: 6,
      width: "95%",
      elevation: 1,
    },
    detailItemText: {
      fontSize: 16,
    },
    turmaItem: {
      backgroundColor: "#E8F5E9",
      borderRadius: 12,
      paddingVertical: 18,
      paddingHorizontal: 20,
      marginVertical: 8,
      width: "95%",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      elevation: 3,
    },
    turmaText: {
      fontSize: 18,
      fontWeight: "bold",
      color: "#2E7D32",
    },
    voltarBotao: {
      marginTop: 25,
      alignSelf: "center",
      width: "60%",
    },
    voltarBotaoText: {
       color: "#47AD4D",
    },
    greenSquare: {
      width: 30,
      height: 30,
      backgroundColor: "#47AD4D",
      borderRadius: 4,
      justifyContent: "center",
      alignItems: "center",
      // não aceita clics: passa tudo para o pai
    },    
  })
