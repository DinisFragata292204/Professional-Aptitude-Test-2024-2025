<?php
session_start();

// ==================== CONFIGURAÇÃO CORS DINÂMICA ====================
$allowedOrigins = [
    'http://localhost:19006',
    'http://localhost:3000'
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

// Debug: Log do cabeçalho Origin recebido
error_log("[" . date('Y-m-d H:i:s') . "] Origin recebido: " . $origin);

if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
} else {
    error_log("[" . date('Y-m-d H:i:s') . "] Origin não permitido: " . $origin);
}

header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// ==================== TRATA DAS OPTIONS ====================
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    error_log("[" . date('Y-m-d H:i:s') . "] A responder à requisição OPTIONS");
    http_response_code(200);
    exit();
}

// ==================== VERIFICA O MÉTODO ====================
$method = $_SERVER['REQUEST_METHOD'];
error_log("[" . date('Y-m-d H:i:s') . "] Método da requisição: $method");

if ($method !== 'GET') {
    error_log("[" . date('Y-m-d H:i:s') . "] Método não permitido: $method");
    echo json_encode([
        'success' => false,
        'message' => 'Método não permitido'
    ]);
    http_response_code(405);
    exit();
}

// ==================== CONECTA COM A BASE DE DADOS ====================

$config = include '../config_api.php';
    $conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);

error_log("[" . date('Y-m-d H:i:s') . "] A tentar carregar config_api.php...");

if (!$config) {
    error_log("[" . date('Y-m-d H:i:s') . "] ERRO: Falha ao carregar config_api.php.");
    echo json_encode([
        'success' => false,
        'message' => 'Falha ao carregar configurações do base de dados.'
    ]);
    http_response_code(500);
    exit();
}

error_log("[" . date('Y-m-d H:i:s') . "] Configurações carregadas com sucesso. A conectar à base...");


if ($conn->connect_error) {
    error_log("[" . date('Y-m-d H:i:s') . "] ERRO de conexão: " . $conn->connect_error);
    echo json_encode([
        'success' => false,
        'message' => 'Erro de conexão: ' . $conn->connect_error
    ]);
    http_response_code(500);
    exit();
}

error_log("[" . date('Y-m-d H:i:s') . "] Conexão com o base estabelecida com sucesso.");

// ==================== CONSULTA PARA PROCURAR PROFESSORES ====================
$sql = "SELECT id, email FROM dadosdoutilizador WHERE cargoUtilizador = 'professor'";
error_log("[" . date('Y-m-d H:i:s') . "] A executar a query: $sql");

$result = $conn->query($sql);

if (!$result) {
    error_log("[" . date('Y-m-d H:i:s') . "] ERRO na consulta SQL: " . $conn->error);
    echo json_encode([
        'success' => false,
        'message' => 'Erro na consulta: ' . $conn->error
    ]);
    $conn->close();
    http_response_code(500);
    exit();
}

$professores = [];
while ($row = $result->fetch_assoc()) {
    error_log("[" . date('Y-m-d H:i:s') . "] Professor encontrado: " . print_r($row, true));
    $professores[] = $row;
}

$conn->close();
error_log("[" . date('Y-m-d H:i:s') . "] Total de professores encontrados: " . count($professores));

// ==================== ENVIO DA RESPOSTA ====================
echo json_encode([
    'success' => true,
    'professores' => $professores
]);
?>
