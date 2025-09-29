import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  Image,
  Modal,
  TextInput,
  ScrollView,
  SafeAreaView,
  StatusBar,
  FlatList,
  Dimensions,
  Platform,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useTheme } from "react-native-paper";
import { PieChart, LineChart } from "react-native-chart-kit";
import * as SecureStore from "expo-secure-store";
import { captureRef } from "react-native-view-shot";
import * as Print from "expo-print";
import DateTimePicker from "@react-native-community/datetimepicker";

import config from "../../../config/config_db";
import ModalConfig from "../../../components/modalConfig";

// ------------------------------
// Tipos de Dados
// ------------------------------
interface INota {
  nota_id?: number;
  disciplina_nome: string;
  data_lancamento: string;
  professor_email: string;
  nota: string;
  modulo?: string;
}

interface IGroupedData {
  name: string;
  population: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
  notes: INota[];
}

type RootStackParamList = {
  Notas: { email: string };
};

type NotasScreenRouteProp = RouteProp<RootStackParamList, "Notas">;

// Largura da tela para os gráficos
const screenWidth = Dimensions.get("window").width;

// ------------------------------
// Configuração dos Gráficos
// ------------------------------
const chartConfig = (theme: any) => ({
  backgroundGradientFrom: "#fff",
  backgroundGradientFromOpacity: 0,
  backgroundGradientTo: "#fff",
  backgroundGradientToOpacity: 0.5,
  color: (opacity = 1) => (opacity === 1 ? "#47AD4D" : theme.colors.primary),
  strokeWidth: 2,
  barPercentage: 0.5,
  useShadowColorFromDataset: false,
});

// ------------------------------
// Funções Auxiliares – Cores, Hash e Estatísticas Gerais
// ------------------------------
const getRandomColor = () => {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const hashCode = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

const getDisciplineColor = (
  discipline: string,
  themeMode: "light" | "dark"
) => {
  const hash = hashCode(discipline);
  const hue = Math.abs(hash) % 360;
  const saturation = themeMode === "dark" ? 90 : 50;
  const lightness = themeMode === "dark" ? 50 : 70;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const groupNotesByDiscipline = (notes: INota[]) =>
  notes.reduce(
    (acc, nota) => {
      const key = nota.disciplina_nome;
      if (!acc[key]) acc[key] = [];
      acc[key].push(nota);
      return acc;
    },
    {} as Record<string, INota[]>
  );

const groupNotesByYear = (notes: INota[]) =>
  notes.reduce(
    (acc, nota) => {
      const year = new Date(nota.data_lancamento).getFullYear();
      if (!acc[year]) acc[year] = [];
      acc[year].push(nota);
      return acc;
    },
    {} as Record<number, INota[]>
  );

const calculateStats = (notes: INota[]) => {
  const values = notes.map((n) => parseFloat(n.nota));
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = values.length ? sum / values.length : 0;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { avg, min, max };
};

const calculateMode = (notes: INota[]) => {
  const freq: Record<string, number> = {};
  let mode = "";
  let maxCount = 0;
  notes.forEach((n) => {
    const valor = n.nota;
    freq[valor] = (freq[valor] || 0) + 1;
    if (freq[valor] > maxCount) {
      maxCount = freq[valor];
      mode = valor;
    }
  });
  return mode;
};

// Calcula o "standout" geral entre todas as notas – a nota com o maior desvio positivo e a com o maior desvio negativo, em relação à média geral.
const calculateGlobalStandout = (notes: INota[]) => {
  if (notes.length === 0) return { positive: null, negative: null };
  const { avg } = calculateStats(notes);
  let globalPositive: INota | null = null;
  let globalNegative: INota | null = null;
  let maxPosDiff = 0;
  let maxNegDiff = 0;
  notes.forEach((n) => {
    const valor = parseFloat(n.nota);
    const diff = valor - avg;
    if (diff > maxPosDiff) {
      maxPosDiff = diff;
      globalPositive = n;
    }
    if (diff < maxNegDiff) {
      maxNegDiff = diff;
      globalNegative = n;
    }
  });
  return { positive: globalPositive, negative: globalNegative };
};

// Estatísticas avançadas por disciplina – utiliza todas as notas da consulta PHP para a média global e por disciplina.
const computeAdvancedStatistics = (
  allNotas: INota[],
  filteredNotas: INota[]
) => {
  const disciplineGroupsAll = groupNotesByDiscipline(allNotas);
  const disciplineGroupsFiltered = groupNotesByDiscipline(filteredNotas);
  const disciplineStats: {
    [discipline: string]: {
      overallAvg: number;
      filteredAvg: number;
      percentageChange: number;
      highestFiltered: number;
      lowestFiltered: number;
      notesOrdered?: INota[];
    };
  } = {};

  for (const discipline in disciplineGroupsFiltered) {
    // Aqui a média global é calculada com todas as notas da disciplina (allNotas)
    const overallStats = calculateStats(disciplineGroupsAll[discipline] || []);
    // A média da disciplina filtrada é calculada com os dados filtrados (p.ex.: por período ou outra opção)
    const filteredStats = calculateStats(
      disciplineGroupsFiltered[discipline] || []
    );
    const percentageChange =
      overallStats.avg > 0
        ? ((filteredStats.avg - overallStats.avg) / overallStats.avg) * 100
        : 0;
    const notesOrdered = [...(disciplineGroupsFiltered[discipline] || [])].sort(
      (a, b) =>
        new Date(a.data_lancamento).getTime() -
        new Date(b.data_lancamento).getTime()
    );
    disciplineStats[discipline] = {
      overallAvg: overallStats.avg,
      filteredAvg: filteredStats.avg,
      percentageChange,
      highestFiltered: filteredStats.max,
      lowestFiltered: filteredStats.min,
      notesOrdered,
    };
  }

  let highestIncrease: { discipline: string; percentageChange: number } | null =
    null;
  let highestDecline: { discipline: string; percentageChange: number } | null =
    null;
  for (const discipline in disciplineStats) {
    const stat = disciplineStats[discipline];
    if (stat.percentageChange >= 0) {
      if (
        !highestIncrease ||
        stat.percentageChange > highestIncrease.percentageChange
      ) {
        highestIncrease = {
          discipline,
          percentageChange: stat.percentageChange,
        };
      }
    } else {
      if (
        !highestDecline ||
        stat.percentageChange < highestDecline.percentageChange
      ) {
        highestDecline = {
          discipline,
          percentageChange: stat.percentageChange,
        };
      }
    }
  }

  return { disciplineStats, highestIncrease, highestDecline };
};

//////////////////////////////////////////////
// Componente Principal – NotasScreen
//////////////////////////////////////////////
const NotasScreen = ({ navigation }: { navigation: any }) => {
  const route = useRoute<NotasScreenRouteProp>();
  const { email } = route.params;
  const theme = useTheme();
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [userTheme, setUserTheme] = useState<"light" | "dark">(
    theme.dark ? "dark" : "light"
  );
  const [loadingBg, setLoadingBg] = useState<boolean>(true);

  // Estados das notas e modo de visualização
  const [allNotas, setAllNotas] = useState<INota[]>([]);
  const [notas, setNotas] = useState<INota[]>([]);
  const [viewMode, setViewMode] = useState<"chart" | "list" | "stats">("chart");
  const [chartType, setChartType] = useState<"bar" | "pie" | "line">("bar");

  // Estados para filtros de estatísticas
  const [selectedDisciplineFilter, setSelectedDisciplineFilter] =
    useState<string>("");
  const [dateInicio, setDateInicio] = useState<Date | null>(null);
  const [dateFim, setDateFim] = useState<Date | null>(null);
  const [showStatsFilter, setShowStatsFilter] = useState(false);
  const [showPickerInicio, setShowPickerInicio] = useState(false);
  const [showPickerFim, setShowPickerFim] = useState(false);
  const [disciplineOptions, setDisciplineOptions] = useState<string[]>([]);

  // Outros estados – modais, detalhes e configurações do utilizador
  const [showFilter, setShowFilter] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState<INota | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] =
    useState<IGroupedData | null>(null);
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  const pdfChartRef = useRef<View>(null);

  // Carrega configurações (background e tema)
  useEffect(() => {
    async function loadSettings() {
      try {
        let bg: string | null;
        let mode: string | null;
        if (Platform.OS === "web") {
          bg = localStorage.getItem("backgroundUrl");
          mode = localStorage.getItem("userTheme");
        } else {
          bg = await SecureStore.getItemAsync("backgroundUrl");
          mode = await SecureStore.getItemAsync("userTheme");
        }
        if (bg && !bg.startsWith("http")) {
          bg = `${config.baseUrl}/${bg}`;
        }
        setBackgroundUrl(bg);
        setUserTheme(mode === "dark" ? "dark" : "light");
      } catch (error) {
      } finally {
        setLoadingBg(false);
      }
    }
    loadSettings();
  }, []);

  // Busca as notas via API
  const url_fetchNotes = `${config.baseUrl}/calendarioFiles/fetch_notes.php`;
  const fetchNotas = async () => {
    try {
      const response = await fetch(url_fetchNotes, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await response.json();
      let fetchedNotas: INota[] = [];
      if (Array.isArray(json)) {
        fetchedNotas = json;
      } else if (json.notas) {
        fetchedNotas = json.notas;
      }
      setAllNotas(fetchedNotas);
      setNotas(fetchedNotas);
      const disciplines = Array.from(
        new Set(fetchedNotas.map((nota) => nota.disciplina_nome))
      );
      setDisciplineOptions(disciplines);
    } catch (error) {}
  };
  useEffect(() => {
    fetchNotas();
  }, []);

  // Filtra as notas conforme os filtros aplicados (sem módulo)
  const getFilteredStatsNotas = () => {
    return allNotas.filter((nota) => {
      let valid = true;
      if (selectedDisciplineFilter.trim()) {
        valid = valid && nota.disciplina_nome === selectedDisciplineFilter;
      }
      if (dateInicio) {
        valid = valid && new Date(nota.data_lancamento) >= dateInicio;
      }
      if (dateFim) {
        valid = valid && new Date(nota.data_lancamento) <= dateFim;
      }
      return valid;
    });
  };

  // Componente para gerar o PDF – Diferencia o comportamento para "Bar" e "Line"
  // Nota: Não gera PDF para "Pie" (botão oculto para este caso)
  const PdfChartLight = () => {
    const filtrosAplicados: string[] = [];
    if (selectedDisciplineFilter.trim())
      filtrosAplicados.push(`Disciplina: ${selectedDisciplineFilter}`);
    if (dateInicio)
      filtrosAplicados.push(
        `Data Início: ${dateInicio.toISOString().split("T")[0]}`
      );
    if (dateFim)
      filtrosAplicados.push(`Data Fim: ${dateFim.toISOString().split("T")[0]}`);
    const filtroMsg = filtrosAplicados.length
      ? `Filtro - ${filtrosAplicados.join(", ")}`
      : "";

    if (chartType === "bar") {
      return (
        <View
          style={[
            styles.chartWrapper,
            { backgroundColor: "#f0f0f0", padding: 5 },
          ]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {notas.map((item, index) => {
              const noteValue = parseFloat(item.nota);
              const barHeight = (noteValue / 20) * 200;
              return (
                <View
                  key={index.toString()}
                  style={[
                    styles.barContainer,
                    { width: 40, marginHorizontal: 4 },
                  ]}
                >
                  <View style={[styles.barWrapper, { height: 200 }]}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight,
                          backgroundColor: "rgba(71, 173, 77, 0.8)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.barValue,
                          { fontSize: 10, color: "#000" },
                        ]}
                      >
                        {item.nota}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[styles.barLabel, { fontSize: 10, color: "#000" }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {item.disciplina_nome}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
          {filtroMsg ? (
            <Text style={{ fontSize: 10, color: "#000", marginTop: 4 }}>
              {filtroMsg}
            </Text>
          ) : null}
        </View>
      );
    } else if (chartType === "line") {
      const sortedNotas = [...notas].sort(
        (a, b) =>
          new Date(a.data_lancamento).getTime() -
          new Date(b.data_lancamento).getTime()
      );
      const labels = sortedNotas.map((n) => {
        return new Date(n.data_lancamento).toLocaleDateString();
      });

      const dataPoints = sortedNotas.map((n) => parseFloat(n.nota));
      return (
        <View
          style={[styles.chartWrapper, { backgroundColor: "#FFF", padding: 5 }]}
        >
          <LineChart
            data={{
              labels,
              datasets: [{ data: dataPoints, color: () => "#000" }],
            }}
            width={screenWidth * 0.9}
            height={220}
            fromZero={true}
            chartConfig={{
              backgroundGradientFrom: "#FFF",
              backgroundGradientTo: "#FFF",
              color: () => "#000",
              strokeWidth: 2,
              decimalPlaces: 0,
              propsForDots: { r: "3", strokeWidth: "1", stroke: "#000" },
              propsForBackgroundLines: { stroke: "#e3e3e3" },
              propsForLabels: { fill: "#000" },
            }}
            bezier
          />
          {filtroMsg ? (
            <Text style={{ fontSize: 10, color: "#000", marginTop: 4 }}>
              {filtroMsg}
            </Text>
          ) : null}
        </View>
      );
    }
    return null;
  };

  // Geração do PDF – Integra imagem do gráfico e informações gerais
  const generatePdf = async () => {
    try {
      const uri = await captureRef(pdfChartRef, {
        format: "png",
        quality: 1,
        result: "base64",
      });
      const overallStats = calculateStats(allNotas);
      const overallMode = calculateMode(allNotas);
      const globalStandout = calculateGlobalStandout(allNotas);
      const currentDate = new Date();
      const formattedDate = `${("0" + currentDate.getDate()).slice(-2)}-${(
        "0" +
        (currentDate.getMonth() + 1)
      ).slice(
        -2
      )}-${currentDate.getFullYear()} ${("0" + currentDate.getHours()).slice(-2)}:${(
        "0" + currentDate.getMinutes()
      ).slice(-2)}`;

      const generateDisciplineNoteTable = () => {
        if (allNotas.length === 0) return "";
        return `
          <table style="width:100%; border-collapse: collapse; font-family: sans-serif; font-size: 10px;">
            <tr>
              <th style="border: 1px solid #ccc; padding: 2px;">Disciplina</th>
              <th style="border: 1px solid #ccc; padding: 2px;">Nota</th>
            </tr>
            ${allNotas
              .map(
                (nota) => `
              <tr>
                <td style="border: 1px solid #ccc; padding: 2px;">${nota.disciplina_nome}</td>
                <td style="border: 1px solid #ccc; padding: 2px;">${nota.nota}</td>
              </tr>
            `
              )
              .join("")}
          </table>
        `;
      };

      const disciplineNoteTable = generateDisciplineNoteTable();

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              @page { margin: 0; }
              body { margin: 0; padding: 0; font-family: sans-serif; background: #FFF; }
              header { position: fixed; top: 0; left: 0; right: 0; height: 60px; background: #FFF; border-bottom: 1px solid #ccc; display: flex; align-items: center; padding: 0 20px; z-index: 1000; }
              header img { height: 40px; }
              header h1 { flex: 1; text-align: center; font-size: 18px; margin: 0; }
              footer { position: fixed; bottom: 0; left: 0; right: 0; height: 40px; background: #FFF; border-top: 1px solid #ccc; padding-top: 4px; text-align: center; font-size: 12px; color: #000; z-index: 1000; }
              main { margin-top: 70px; margin-bottom: 50px; padding: 10px; }
              .chart-img { width: 100%; }
              .section-title { font-size: 16px; color: #000; margin: 10px 0 5px; }
              table, th, td { border: 1px solid #ccc; border-collapse: collapse; }
              th, td { padding: 8px; text-align: left; }
              .bar-chart { display: flex; flex-wrap: wrap; }
              .bar-column { width: 8%; min-width: 30px; margin: 4px; text-align: center; }
              .bar { width: 100%; background-color: rgba(71,173,77,0.8); }
            </style>
          </head>
          <body>
            <header>
              <img src="https://etps.pt/images/upload/630cb87edab43698c0a0e5f5678403d4.png" alt="Logo" />
              <h1>Resumo das Notas do Utilizador</h1>
            </header>
            <main>
              ${
                chartType === "bar"
                  ? `
              <div class="section-title">Gráfico de Barras</div>
              <div class="bar-chart">
                ${notas
                  .map((item) => {
                    const noteValue = parseFloat(item.nota);
                    const barHeight = (noteValue / 20) * 100;
                    return `<div class="bar-column">
                    <div class="bar" style="height: ${barHeight}px;"></div>
                    <div style="font-size:8px;">${item.disciplina_nome}</div>
                    <div style="font-size:8px;">${item.nota}</div>
                  </div>`;
                  })
                  .join("")}
              </div>
              `
                  : `
              <div class="section-title">Gráfico de Linha</div>
              <img class="chart-img" src="data:image/png;base64,${uri}" />
              `
              }
              <div class="section-title">Estatísticas Gerais</div>
              <p>Média Geral: ${overallStats.avg.toFixed(2)}</p>
              <p>Nota Máxima: ${overallStats.max.toFixed(2)}</p>
              <p>Moda: ${overallMode}</p>
              <p>
                ${globalStandout.positive ? `Nota que mais se destaca positivamente: ${globalStandout.positive.nota}` : "N/A"}
                &nbsp;|&nbsp;
                ${globalStandout.negative ? `Nota que mais se destaca negativamente: ${globalStandout.negative.nota}` : "N/A"}
              </p>
              <div class="section-title">Tabela Resumida – Disciplina e Nota</div>
              ${disciplineNoteTable}
            </main>
            <footer>
              Este documento contém dados e análises avançadas sobre as notas do ${email} emitido em ${formattedDate}.
            </footer>
          </body>
        </html>
      `;
      await Print.printAsync({ html });
    } catch (error) {}
  };

  // Componente para o gráfico de linha de cada disciplina (na tela)
  const DisciplineLineChart = ({
    notes,
    percentageChange,
  }: {
    notes: INota[];
    percentageChange: number;
  }) => {
    if (notes.length < 2) {
      return (
        <Text
          style={{
            color: userTheme === "dark" ? "#FFF" : "#000",
            marginVertical: 8,
          }}
        >
          Dados insuficientes para exibir evolução.
        </Text>
      );
    }
    const labels = notes.map((n, i) => {
      const baseDate = new Date(n.data_lancamento).toLocaleDateString();
      return i % 2 === 1 ? `${baseDate}\n` : baseDate;
    });
    const dataPoints = notes.map((n) => parseFloat(n.nota));
    const lineColor = percentageChange >= 0 ? "#47AD4D" : "#dc3545";
    const dynamicChartWidth = Math.max(screenWidth * 0.9, labels.length * 80);
    return (
      <ScrollView horizontal contentContainerStyle={{ paddingBottom: 10 }}>
        <LineChart
          data={{
            labels,
            datasets: [{ data: dataPoints, color: () => lineColor }],
          }}
          width={dynamicChartWidth}
          height={220}
          fromZero={true}
          chartConfig={{
            backgroundGradientFrom: userTheme === "dark" ? "#000" : "#FFF",
            backgroundGradientTo: userTheme === "dark" ? "#000" : "#FFF",
            color: () => lineColor,
            strokeWidth: 2,
            decimalPlaces: 2,
            propsForDots: { r: "4", strokeWidth: "2", stroke: lineColor },
            propsForBackgroundLines: {
              stroke: userTheme === "dark" ? "#424242" : "#e3e3e3",
            },
            propsForLabels: { fill: userTheme === "dark" ? "#FFF" : "#000" },
          }}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
          onDataPointClick={(data) => {
            const index = data.index;
            const note = notes[index];
            setSelectedNote(note);
            setShowDetailsModal(true);
          }}
        />
      </ScrollView>
    );
  };

  // Renderização dos gráficos na tela
  const renderBarChart = () => (
    <View>
      <View
        style={[
          styles.chartWrapper,
          {
            backgroundColor:
              userTheme === "dark" ? "rgba(0, 0, 0, 0.5)" : "#f0f0f0",
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chartContent}
        >
          {notas.map((item, index) => {
            const noteValue = parseFloat(item.nota);
            const barHeight = (noteValue / 20) * 350;
            return (
              <TouchableOpacity
                key={index.toString()}
                style={styles.barContainer}
                onPress={() => {
                  setSelectedNote(item);
                  setShowDetailsModal(true);
                }}
              >
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: barHeight,
                        backgroundColor:
                          userTheme === "dark"
                            ? "#47AD4D"
                            : "rgba(71, 173, 77, 0.8)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.barValue,
                        { color: userTheme === "dark" ? "#FFF" : "#000" },
                      ]}
                    >
                      {item.nota}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.barLabel,
                    { color: userTheme === "dark" ? "#FFF" : "#000" },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.disciplina_nome}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
      <TouchableOpacity
        onPress={generatePdf}
        style={[styles.pdfButton, { backgroundColor: "#47AD4D" }]}
      >
        <Text style={styles.pdfButtonText}>Gerar PDF</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPieChart = () => {
    const grouped = notas.reduce(
      (acc, nota) => {
        const key = nota.disciplina_nome;
        if (!acc[key]) {
          acc[key] = {
            name: nota.disciplina_nome,
            population: 0,
            color: getDisciplineColor(nota.disciplina_nome, userTheme),
            legendFontColor: userTheme === "dark" ? "#FFF" : "#000",
            legendFontSize: 12,
            notes: [],
          };
        }
        acc[key].population += 1;
        acc[key].notes.push(nota);
        return acc;
      },
      {} as Record<string, IGroupedData>
    );
    const pieData = Object.values(grouped);
    const chartBg = userTheme === "dark" ? "rgba(0, 0, 0, 0.5)" : "#FFF";
    return (
      <View>
        <View style={[styles.chartWrapper, { backgroundColor: chartBg }]}>
          {Platform.OS === "web" ? (
            <View style={styles.webPieContainer}>
              <PieChart
                data={pieData}
                width={screenWidth * 0.5}
                height={220}
                chartConfig={chartConfig(theme)}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                hasLegend={false}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                {pieData.length > 7 ? (
                  <ScrollView style={{ maxHeight: 200 }}>
                    {pieData.map((item, index) => (
                      <View key={index.toString()} style={styles.tableRow}>
                        <Text
                          style={[
                            styles.tableCell,
                            {
                              color: userTheme === "dark" ? "#FFF" : "#000",
                              flex: 1,
                            },
                          ]}
                        >
                          {item.name}
                        </Text>
                        <Text
                          style={[
                            styles.tableCell,
                            { color: userTheme === "dark" ? "#FFF" : "#000" },
                          ]}
                        >
                          {item.population}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  pieData.map((item, index) => (
                    <View key={index.toString()} style={styles.tableRow}>
                      <Text
                        style={[
                          styles.tableCell,
                          {
                            color: userTheme === "dark" ? "#FFF" : "#000",
                            flex: 1,
                          },
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.tableCell,
                          { color: userTheme === "dark" ? "#FFF" : "#000" },
                        ]}
                      >
                        {item.population}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          ) : (
            <>
              <PieChart
                data={pieData}
                width={screenWidth * 0.9}
                height={220}
                chartConfig={chartConfig(theme)}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="85"
                absolute
                hasLegend={false}
              />
              <ScrollView
                style={{ maxHeight: 200, width: "100%", marginTop: 10 }}
              >
                {pieData.map((item, index) => (
                  <View key={index.toString()} style={styles.tableRow}>
                    <Text
                      style={[
                        styles.tableCell,
                        {
                          color: userTheme === "dark" ? "#FFF" : "#000",
                          flex: 1,
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        { color: userTheme === "dark" ? "#FFF" : "#000" },
                      ]}
                    >
                      {item.population}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderLineChart = () => {
    const sortedNotas = [...notas].sort(
      (a, b) =>
        new Date(a.data_lancamento).getTime() -
        new Date(b.data_lancamento).getTime()
    );
    const labels = sortedNotas.map((n, i) => {
      const baseDate = new Date(n.data_lancamento).toLocaleDateString();
      return i % 2 === 1 ? `${baseDate}` : baseDate;
    });
    const dataPoints = sortedNotas.map((n) => parseFloat(n.nota));
    const isDark = userTheme === "dark";
    const background = isDark ? "#000" : "#FFF";
    const lineColor = isDark ? "#47AD4D" : "#000";
    const labelColor = isDark ? "#CCC" : "#000";
    const dynamicChartWidth = Math.max(
      screenWidth * 0.9,
      sortedNotas.length * 80
    );
    return (
      <View>
        <View style={[styles.chartWrapper, { backgroundColor: background }]}>
          <ScrollView horizontal contentContainerStyle={{ paddingBottom: 10 }}>
            <LineChart
              data={{
                labels,
                datasets: [{ data: dataPoints, color: () => lineColor }],
              }}
              width={dynamicChartWidth}
              height={220}
              fromZero={true}
              chartConfig={{
                backgroundGradientFrom: background,
                backgroundGradientTo: background,
                color: () => labelColor,
                strokeWidth: 2,
                decimalPlaces: 2,
                propsForDots: { r: "4", strokeWidth: "2", stroke: lineColor },
                propsForBackgroundLines: {
                  stroke: isDark ? "#424242" : "#e3e3e3",
                },
                propsForLabels: { fill: labelColor },
              }}
              bezier
              onDataPointClick={(data) => {
                const index = data.index;
                const note = sortedNotas[index];
                setSelectedNote(note);
                setShowDetailsModal(true);
              }}
              style={{ borderRadius: 16 }}
            />
          </ScrollView>
        </View>
        {sortedNotas.length > 0 &&
          (sortedNotas.length > 4 ? (
            <ScrollView style={{ maxHeight: 200 }}>
              <View style={styles.tableContainer}>
                <View style={styles.tableRow}>
                  <Text
                    style={[
                      styles.tableHeader,
                      { color: userTheme === "dark" ? "#FFF" : "#000" },
                    ]}
                  >
                    Disciplina
                  </Text>
                  <Text
                    style={[
                      styles.tableHeader,
                      { color: userTheme === "dark" ? "#FFF" : "#000" },
                    ]}
                  >
                    Nota
                  </Text>
                </View>
                {sortedNotas.map((nota, index) => (
                  <View key={index.toString()} style={styles.tableRow}>
                    <Text
                      style={[
                        styles.tableCell,
                        { color: userTheme === "dark" ? "#FFF" : "#000" },
                      ]}
                    >
                      {nota.disciplina_nome}
                    </Text>
                    <Text
                      style={[
                        styles.tableCell,
                        { color: userTheme === "dark" ? "#FFF" : "#000" },
                      ]}
                    >
                      {nota.nota}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.tableContainer}>
              <View style={styles.tableRow}>
                <Text
                  style={[
                    styles.tableHeader,
                    { color: userTheme === "dark" ? "#FFF" : "#000" },
                  ]}
                >
                  Disciplina
                </Text>
                <Text
                  style={[
                    styles.tableHeader,
                    { color: userTheme === "dark" ? "#FFF" : "#000" },
                  ]}
                >
                  Nota
                </Text>
              </View>
              {sortedNotas.map((nota, index) => (
                <View key={index.toString()} style={styles.tableRow}>
                  <Text
                    style={[
                      styles.tableCell,
                      { color: userTheme === "dark" ? "#FFF" : "#000" },
                    ]}
                  >
                    {nota.disciplina_nome}
                  </Text>
                  <Text
                    style={[
                      styles.tableCell,
                      { color: userTheme === "dark" ? "#FFF" : "#000" },
                    ]}
                  >
                    {nota.nota}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        <TouchableOpacity
          onPress={generatePdf}
          style={[styles.pdfButton, { backgroundColor: "#47AD4D" }]}
        >
          <Text style={styles.pdfButtonText}>Gerar PDF</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Seção de Estatísticas com filtro aprimorado e scroll vertical
  const renderStatistics = () => {
    const stats = computeAdvancedStatistics(allNotas, getFilteredStatsNotas());
    return (
      <ScrollView style={{ flex: 1 }}>
        <View
          style={[
            styles.statsContainer,
            { backgroundColor: userTheme === "dark" ? "#000" : "#FFF" },
          ]}
        >
          <TouchableOpacity
            onPress={() => setShowStatsFilter(true)}
            style={styles.professionalFilterButton}
          >
            <Text style={styles.professionalFilterButtonText}>
              Filtrar Estatísticas
            </Text>
          </TouchableOpacity>
          {stats && Object.keys(stats.disciplineStats).length ? (
            Object.keys(stats.disciplineStats).map((discipline) => {
              const stat = stats.disciplineStats[discipline];
              return (
                <View key={discipline} style={styles.statItem}>
                  <Text style={styles.statTitle}>{discipline}</Text>
                  <Text style={styles.statDescription}>
                    A média global é {stat.overallAvg.toFixed(2)} e a média da
                    disciplina é {stat.filteredAvg.toFixed(2)}, o que significa
                    que houve{" "}
                    {stat.percentageChange > 0 ? (
                      <Text style={{ color: "#47AD4D" }}>
                        um aumento de {stat.percentageChange.toFixed(2)}%
                      </Text>
                    ) : stat.percentageChange < 0 ? (
                      <Text style={{ color: "#dc3545" }}>
                        uma diminuição de{" "}
                        {Math.abs(stat.percentageChange).toFixed(2)}%
                      </Text>
                    ) : (
                      <Text>nenhuma alteração</Text>
                    )}
                    .
                  </Text>
                  <Text style={styles.statDescription}>
                    Nota mais alta: {stat.highestFiltered.toFixed(2)}; Nota mais
                    baixa: {stat.lowestFiltered.toFixed(2)}.
                  </Text>
                  {stat.notesOrdered && stat.notesOrdered.length >= 2 ? (
                    <DisciplineLineChart
                      notes={stat.notesOrdered}
                      percentageChange={stat.percentageChange}
                    />
                  ) : (
                    <Text
                      style={{
                        marginTop: 8,
                        color: userTheme === "dark" ? "#FFF" : "#000",
                      }}
                    >
                      Dados insuficientes para gráfico.
                    </Text>
                  )}
                </View>
              );
            })
          ) : (
            <Text
              style={{
                color: userTheme === "dark" ? "#FFF" : "#000",
                marginTop: 10,
              }}
            >
              Sem dados suficientes para as estatísticas avançadas.
            </Text>
          )}
          <View style={{ marginTop: 20 }}></View>
        </View>
      </ScrollView>
    );
  };

  // Renderiza a lista de notas
  const renderList = () => (
    <FlatList
      data={notas}
      keyExtractor={(item, index) =>
        item.nota_id ? item.nota_id.toString() : index.toString()
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[
            styles.listItemContainer,
            userTheme === "dark" && {
              backgroundColor: "#222",
              borderColor: "#444",
            },
          ]}
          onPress={() => {
            setSelectedNote(item);
            setShowDetailsModal(true);
          }}
        >
          <View style={styles.listItemHeader}>
            <Text
              style={[
                styles.listItemTitle,
                { color: userTheme === "dark" ? "#FFF" : "#000" },
              ]}
            >
              {item.disciplina_nome}
            </Text>
            <Text
              style={[
                styles.listItemDate,
                { color: userTheme === "dark" ? "#CCC" : "#555" },
              ]}
            >
              {new Date(item.data_lancamento).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.listItemContent}>
            <View style={styles.listItemRow}>
              <Text style={styles.listItemLabel}>Nota:</Text>
              <Text style={styles.listItemValue}>{item.nota}</Text>
            </View>
            <View style={styles.listItemRow}>
              <Text style={styles.listItemLabel}>Professor:</Text>
              <Text style={styles.listItemValue}>{item.professor_email}</Text>
            </View>
          </View>
        </TouchableOpacity>
      )}
      ListFooterComponent={
        <View style={{ marginTop: 10 }}>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: "#47AD4D" }]}
            onPress={() => setShowFilter(true)}
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: theme.colors.onPrimary },
              ]}
            >
              Filtrar
            </Text>
          </TouchableOpacity>
        </View>
      }
      contentContainerStyle={{ paddingBottom: 20 }}
    />
  );

  if (loadingBg) {
    return (
      <ImageBackground
        source={
          backgroundUrl
            ? { uri: backgroundUrl }
            : require("../../../assets/images/bg1.jpg")
        }
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#6200ea" />
          <Text style={{ marginTop: 16, fontSize: 16, textAlign: "center" }}>
            Estamos a processar o seu pedido de registo. Pedimos que aguarde...
          </Text>
        </View>
      </ImageBackground>
    );
  }

  const headerBackgroundColor = userTheme === "dark" ? "#000" : "#FFF";
  const headerTextColor = userTheme === "dark" ? "#FFF" : "#000";

  return (
    <ImageBackground
      source={
        backgroundUrl
          ? { uri: backgroundUrl }
          : require("../../../assets/images/bg1.jpg")
      }
      style={{
        flex: 1,
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {userTheme === "dark" && (
        <View style={styles.darkOverlay} pointerEvents="none" />
      )}
      <StatusBar
        backgroundColor={userTheme === "dark" ? "#000000" : "#ffffff"}
        translucent
        barStyle={userTheme === "dark" ? "light-content" : "dark-content"}
      />

      <SafeAreaView style={{ flex: 1, width: "97%" }}>
        <View
          style={[
            styles.internalHeader,
            {
              backgroundColor: headerBackgroundColor,
              width: Platform.OS === "web" ? "103.2%" : "105%",
            },
          ]}
        >
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Image
              source={require("../../../assets/icons/angle-left.png")}
              style={
                Platform.OS === "web"
                  ? {
                      width: 35,
                      height: 35,
                      tintColor: userTheme === "dark" ? "#FFF" : undefined,
                      marginTop: 30,
                    }
                  : {
                      width: 23,
                      height: 25,
                      tintColor: userTheme === "dark" ? "#FFF" : undefined,
                      marginTop: 30,
                    }
              }
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAccountModalVisible(true)}>
            <Image
              source={require("../../../assets/icons/user.png")}
              style={
                Platform.OS === "web"
                  ? {
                      width: 30,
                      height: 30,
                      tintColor: userTheme === "dark" ? "#FFF" : undefined,
                      marginTop: 30,
                    }
                  : {
                      width: 25,
                      height: 25,
                      tintColor: userTheme === "dark" ? "#FFF" : undefined,
                      marginTop: 30,
                    }
              }
            />
          </TouchableOpacity>
        </View>
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity
            onPress={() => setViewMode("list")}
            style={[
              styles.viewToggleButton,
              viewMode === "list" && styles.viewToggleButtonActive,
            ]}
          >
            <Text style={styles.viewToggleButtonText}>Lista</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode("chart")}
            style={[
              styles.viewToggleButton,
              viewMode === "chart" && styles.viewToggleButtonActive,
            ]}
          >
            <Text style={styles.viewToggleButtonText}>Gráfico</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode("stats")}
            style={[
              styles.viewToggleButton,
              viewMode === "stats" && styles.viewToggleButtonActive,
            ]}
          >
            <Text style={styles.viewToggleButtonText}>Estatísticas</Text>
          </TouchableOpacity>
        </View>
        {viewMode === "chart" && (
          <View style={styles.chartTypeToggleContainer}>
            <TouchableOpacity
              onPress={() => setChartType("bar")}
              style={[
                styles.chartTypeButton,
                chartType === "bar" && styles.chartTypeButtonActive,
              ]}
            >
              <Text style={{ color: theme.colors.onSurface }}>Barra</Text>
            </TouchableOpacity>
            {notas.length > 1 && (
              <TouchableOpacity
                onPress={() => setChartType("line")}
                style={[
                  styles.chartTypeButton,
                  chartType === "line" && styles.chartTypeButtonActive,
                ]}
              >
                <Text style={{ color: theme.colors.onSurface }}>Linha</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {notas.length === 0 ? (
          <Text style={{ color: theme.colors.onSurface, textAlign: "center" }}>
            Sem notas por enquanto.
          </Text>
        ) : viewMode === "list" ? (
          renderList()
        ) : viewMode === "chart" ? (
          chartType === "bar" ? (
            renderBarChart()
          ) : chartType === "pie" ? (
            renderPieChart()
          ) : (
            renderLineChart()
          )
        ) : (
          renderStatistics()
        )}
        {viewMode !== "list" && viewMode !== "stats" && chartType !== "pie" && (
          <View style={{ marginTop: 10 }}>
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: "#47AD4D" }]}
              onPress={() => setShowFilter(true)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  { color: theme.colors.onPrimary },
                ]}
              >
                Filtrar
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <Modal visible={showFilter} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text
                style={[styles.modalTitle, { color: theme.colors.onSurface }]}
              >
                Filtrar Notas
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    color: theme.colors.onSurface,
                    borderColor: theme.colors.outline,
                  },
                ]}
                placeholder="Disciplina (técnico)"
                placeholderTextColor="#999"
              />
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#47AD4D" }]}
                  onPress={() => setShowFilter(false)}
                >
                  <Text style={styles.modalButtonText}>Aplicar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#dc3545" }]}
                  onPress={() => setShowFilter(false)}
                >
                  <Text style={styles.modalButtonText}>Limpar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#6c757d" }]}
                  onPress={() => setShowFilter(false)}
                >
                  <Text style={styles.modalButtonText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <Modal visible={showStatsFilter} animationType="slide" transparent>
          <View style={styles.modalContainer}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Text
                style={[styles.modalTitle, { color: theme.colors.onSurface }]}
              >
                Filtrar Estatísticas
              </Text>
              <Text
                style={{
                  marginBottom: 8,
                  fontWeight: "bold",
                  color: theme.colors.onSurface,
                }}
              >
                Selecione a Disciplina:
              </Text>
              <ScrollView
                horizontal
                contentContainerStyle={{ marginBottom: 10 }}
              >
                {disciplineOptions.map((disc, index) => (
                  <TouchableOpacity
                    key={index.toString()}
                    style={[
                      styles.filterOptionButton,
                      selectedDisciplineFilter === disc && {
                        backgroundColor: "#47AD4D",
                      },
                    ]}
                    onPress={() => setSelectedDisciplineFilter(disc)}
                  >
                    <Text
                      style={{
                        color:
                          selectedDisciplineFilter === disc
                            ? "#FFF"
                            : theme.colors.onSurface,
                      }}
                    >
                      {disc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text
                style={{
                  marginBottom: 8,
                  fontWeight: "bold",
                  color: theme.colors.onSurface,
                }}
              >
                Data Início:
              </Text>
              <TouchableOpacity
                onPress={() => setShowPickerInicio(true)}
                style={styles.datePickerButton}
              >
                <Text style={{ color: theme.colors.onSurface }}>
                  {dateInicio
                    ? dateInicio.toISOString().split("T")[0]
                    : "Selecionar Data"}
                </Text>
              </TouchableOpacity>
              {showPickerInicio && (
                <DateTimePicker
                  value={dateInicio || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowPickerInicio(false);
                    if (selectedDate) setDateInicio(selectedDate);
                  }}
                />
              )}
              <Text
                style={{
                  marginBottom: 8,
                  fontWeight: "bold",
                  color: theme.colors.onSurface,
                }}
              >
                Data Fim:
              </Text>
              <TouchableOpacity
                onPress={() => setShowPickerFim(true)}
                style={styles.datePickerButton}
              >
                <Text style={{ color: theme.colors.onSurface }}>
                  {dateFim
                    ? dateFim.toISOString().split("T")[0]
                    : "Selecionar Data"}
                </Text>
              </TouchableOpacity>
              {showPickerFim && (
                <DateTimePicker
                  value={dateFim || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowPickerFim(false);
                    if (selectedDate) setDateFim(selectedDate);
                  }}
                />
              )}
              <View style={styles.modalButtonRow}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#47AD4D" }]}
                  onPress={() => setShowStatsFilter(false)}
                >
                  <Text style={styles.modalButtonText}>Aplicar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#dc3545" }]}
                  onPress={() => {
                    setSelectedDisciplineFilter("");
                    setDateInicio(null);
                    setDateFim(null);
                    setShowStatsFilter(false);
                  }}
                >
                  <Text style={styles.modalButtonText}>Limpar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: "#6c757d" }]}
                  onPress={() => setShowStatsFilter(false)}
                >
                  <Text style={styles.modalButtonText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <Modal visible={showDetailsModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.detailModalContent,
                { backgroundColor: userTheme === "dark" ? "#000" : "#FFF" },
              ]}
            >
              {selectedNote ? (
                <>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: userTheme === "dark" ? "#FFF" : "#000" },
                    ]}
                  >
                    Detalhes da Nota
                  </Text>
                  <Text
                    style={[
                      styles.detailText,
                      { color: userTheme === "dark" ? "#FFF" : "#000" },
                    ]}
                  >
                    <Text style={styles.detailLabel}>Nota: </Text>
                    {selectedNote.nota}
                  </Text>
                  <Text
                    style={[
                      styles.detailText,
                      { color: userTheme === "dark" ? "#FFF" : "#000" },
                    ]}
                  >
                    <Text style={styles.detailLabel}>Disciplina: </Text>
                    {selectedNote.disciplina_nome}
                  </Text>
                  <Text
                    style={[
                      styles.detailText,
                      { color: userTheme === "dark" ? "#FFF" : "#000" },
                    ]}
                  >
                    <Text style={styles.detailLabel}>Data: </Text>
                    {selectedNote.data_lancamento}
                  </Text>
                  <Text
                    style={[
                      styles.detailText,
                      { color: userTheme === "dark" ? "#FFF" : "#000" },
                    ]}
                  >
                    <Text style={styles.detailLabel}>Professor: </Text>
                    {selectedNote.professor_email}
                  </Text>
                </>
              ) : selectedDiscipline ? (
                <>
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: userTheme === "dark" ? "#FFF" : "#000" },
                    ]}
                  >
                    Detalhes da Disciplina
                  </Text>
                  <Text
                    style={[
                      styles.detailText,
                      { color: userTheme === "dark" ? "#FFF" : "#000" },
                    ]}
                  >
                    <Text style={styles.detailLabel}>Disciplina: </Text>
                    {selectedDiscipline.name}
                  </Text>
                  <Text
                    style={[
                      styles.detailText,
                      { color: userTheme === "dark" ? "#FFF" : "#000" },
                    ]}
                  >
                    <Text style={styles.detailLabel}>Total de Notas: </Text>
                    {selectedDiscipline.population}
                  </Text>
                </>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.closeModalButton,
                  { backgroundColor: "#47AD4D" },
                ]}
                onPress={() => {
                  setShowDetailsModal(false);
                  setSelectedNote(null);
                  setSelectedDiscipline(null);
                }}
              >
                <Text style={{ color: theme.colors.onPrimary }}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <ModalConfig
          visible={accountModalVisible}
          dynamicHeaderBackground={headerBackgroundColor}
          dynamicTextColor={headerTextColor}
          onClose={() => setAccountModalVisible(false)}
          navigation={navigation}
          email={email}
        />
        {viewMode === "chart" && chartType !== "pie" && (
          <View
            ref={pdfChartRef}
            style={{ position: "absolute", top: -10000, left: 0, opacity: 0 }}
          >
            <PdfChartLight />
          </View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
};

//////////////////////////////////////////////
// Estilos – Design Profissional
//////////////////////////////////////////////
const styles = StyleSheet.create({
  listItemContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 15,
    marginVertical: 8,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  listItemTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  listItemDate: {
    fontSize: 14,
  },
  listItemContent: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },
  listItemRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  listItemLabel: {
    fontWeight: "600",
    fontSize: 16,
    marginRight: 4,
  },
  listItemValue: {
    fontSize: 16,
    color: "#333",
  },
  tableContainer: { width: "100%", paddingHorizontal: 10 },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  tableHeader: { fontSize: 16, fontWeight: "bold" },
  tableCell: { fontSize: 16 },
  loaderContainer: {
    borderRadius: 12,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    elevation: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  internalHeader: {
    top: 0,
    left: 0,
    right: 0,
    marginLeft: Platform.OS === "web" ? -25 : -10,
    width: Platform.OS === "web" ? "103.2%" : "105%",
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    elevation: 4,
    zIndex: 10,
    paddingTop: Platform.OS === "ios" ? 40 : 0,
  },
  internalHeaderText: { fontSize: 22, fontWeight: "bold" },
  viewToggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
    marginTop: 10,
  },
  viewToggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: "rgba(231,229,229,0.6)",
  },
  viewToggleButtonActive: { backgroundColor: "rgba(82,82,82,0.7)" },
  viewToggleButtonText: { fontWeight: "bold", color: "#000" },
  chartTypeToggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 15,
  },
  chartTypeButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 15,
    marginHorizontal: 5,
    backgroundColor: "rgba(200,200,200,0.6)",
  },
  chartTypeButtonActive: { backgroundColor: "rgba(120,120,120,0.8)" },
  chartWrapper: {
    width: screenWidth * 0.95,
    marginHorizontal: "auto",
    padding: 10,
    borderRadius: 8,
    marginVertical: 20,
    alignItems: "center",
  },
  chartContent: { alignItems: "flex-end" },
  barContainer: { width: 60, alignItems: "center", marginHorizontal: 10 },
  barWrapper: {
    height: 350,
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
  },
  bar: {
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barValue: { fontWeight: "bold", padding: 2, fontSize: 12 },
  barLabel: {
    marginTop: 5,
    fontWeight: "bold",
    textAlign: "center",
    width: 60,
  },
  statsContainer: {
    padding: 20,
    alignItems: "center",
    borderRadius: 8,
    marginVertical: 10,
  },
  statsText: { fontSize: 18, marginVertical: 4 },
  filterButton: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 5,
    elevation: 2,
  },
  filterButtonText: { fontWeight: "bold", fontSize: 16 },
  professionalFilterButton: {
    backgroundColor: "#47AD4D",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 3,
    marginBottom: 15,
  },
  professionalFilterButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  statItem: {
    marginVertical: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    width: "100%",
  },
  statTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 4 },
  statDescription: { fontSize: 14, color: "#333" },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: { width: "85%", borderRadius: 10, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  modalButtonRow: { flexDirection: "row", justifyContent: "space-between" },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  modalButtonText: { color: "#fff", fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  detailModalContent: { width: "80%", borderRadius: 10, padding: 20 },
  detailText: { fontSize: 16, marginBottom: 10 },
  detailLabel: { fontWeight: "bold" },
  closeModalButton: {
    alignSelf: "center",
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  pdfButton: {
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 5,
    alignSelf: "center",
  },
  pdfButtonText: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  webPieContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  filterOptionButton: {
    marginRight: 10,
    padding: 8,
    borderRadius: 5,
    backgroundColor: "#e3e3e3",
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
});

export default NotasScreen;
