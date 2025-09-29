<?php
// Cabeçalhos CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

session_start(); // Caso use sessões

// Inclui configurações da API
$config = include '../config_api.php';

// Verifica se base_url está definida
if (!isset($config['base_url'])) {
    echo json_encode(["success" => false, "message" => "Configuração inválida"]);
    exit();
}

// Conexão com a base de dados
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

error_log("[DEBUG] Conexão com a base de dados estabelecida");

// Lê os dados enviados via JSON
$data = json_decode(file_get_contents("php://input"), true);
error_log("[DEBUG] Dados recebidos: " . json_encode($data));

if (!$data) {
    error_log("[DEBUG] Nenhum dado recebido.");
    echo json_encode([
        "success" => false,
        "message" => "Nenhum dado recebido."
    ]);
    exit();
}

if (!isset($data['dia'], $data['sopa'], $data['prato_principal'], $data['sobremesa'])) {
    error_log("[DEBUG] Dados incompletos: " . json_encode($data));
    echo json_encode([
        "success" => false,
        "message" => "Dados incompletos. Verifique se 'dia', 'sopa', 'prato_principal' e 'sobremesa' foram enviados."
    ]);
    exit();
}

$dia = $data['dia'];
$sopa = $data['sopa'];
$prato_principal = $data['prato_principal'];
$sobremesa = $data['sobremesa'];

// Prepara e executa o comando SQL para inserir os dados na tabela "almocos"
$stmt = $conn->prepare("INSERT INTO almocos (dia, sopa, prato_principal, sobremesa) VALUES (?, ?, ?, ?)");
if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Erro na preparação da query: " . $conn->error
    ]);
    exit();
}

$stmt->bind_param("ssss", $dia, $sopa, $prato_principal, $sobremesa);

// Executa a query
if ($stmt->execute()) {
    error_log("[DEBUG] Menu salvo com sucesso para o dia $dia");
    echo json_encode([
        "success" => true,
        "message" => "Menu salvo com sucesso."
    ]);
} else {
    error_log("[DEBUG] Erro ao salvar o menu: " . $stmt->error);
    echo json_encode([
        "success" => false,
        "message" => "Erro ao salvar o menu: " . $stmt->error
    ]);
}

$stmt->close();
$conn->close();
?>