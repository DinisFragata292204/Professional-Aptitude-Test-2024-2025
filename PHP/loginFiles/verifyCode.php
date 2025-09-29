<?php
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    exit(0);
}

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$config = include '../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$email = $data['email'] ?? null;
$code = $data['code'] ?? null;
if (!$email || !$code) {
    echo json_encode(["success" => false, "message" => "Dados incompletos."]);
    exit();
}

// Seleciona o código mais recente para o email
$stmt = $conn->prepare("SELECT auth_code FROM codigosautenticacao WHERE email = ? ORDER BY id DESC LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Código não encontrado."]);
    exit();
}
$row = $result->fetch_assoc();

// Converte e compara os códigos como strings, removendo espaços extras
$storedCode = trim((string)$row['auth_code']);
$inputCode = trim((string)$code);

if ($storedCode !== $inputCode) {
    echo json_encode(["success" => false, "message" => "Código de verificação incorreto."]);
    exit();
}
$stmt->close();

// Recupera o cargo do utilizador para redirecionamento
$stmt2 = $conn->prepare("SELECT cargoUtilizador FROM dadosdoutilizador WHERE email = ?");
$stmt2->bind_param("s", $email);
$stmt2->execute();
$result2 = $stmt2->get_result();
if ($result2->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Utilizador não encontrado."]);
    exit();
}
$row2 = $result2->fetch_assoc();

echo json_encode([
    "success" => true,
    "message" => "Código verificado.",
    "cargoUtilizador" => $row2['cargoUtilizador']
]);

$stmt2->close();
$conn->close();
?>
