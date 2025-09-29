<?php
session_start();

// Define os cabeçalhos para requisições CORS e o retorna em JSON
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("HTTP/1.1 200 OK");
    exit();
}
// Garante que somente o método POST seja aceito
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método não permitido"]);
    exit();
}

// Inclui a configuração e estabelece a conexão com a base de dados
$config = include '../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

// Decodifica os dados do corpo da requisição
$data = json_decode(file_get_contents("php://input"));
if (!isset($data->email)) {
    echo json_encode(["success" => false, "message" => "Email não fornecido"]);
    exit();
}

$email = $conn->real_escape_string($data->email);

// procura o id do utilizador com base no email fornecido
$queryUser = "SELECT id FROM dadosdoutilizador WHERE email = '$email' LIMIT 1";
$resultUser = $conn->query($queryUser);
if (!$resultUser || $resultUser->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "utilizador não encontrado"]);
    exit();
}

$rowUser = $resultUser->fetch_assoc();
$user_id = $rowUser['id'];

// Consulta os dados de personalização (background e tema) para o utilizador
$queryTheme = "SELECT background_user, tema_user FROM personalizacao_utilizador WHERE user_id = '$user_id' LIMIT 1";
$resultTheme = $conn->query($queryTheme);

if ($resultTheme && $resultTheme->num_rows > 0) {
    $rowTheme = $resultTheme->fetch_assoc();
    echo json_encode([
        "success" => true, 
        "background_user" => $rowTheme['background_user'], 
        "tema_user" => $rowTheme['tema_user']
    ]);
} else {
    // Se não houver personalização definida, retorna valores padrão
    echo json_encode([
        "success" => true, 
        "background_user" => "", 
        "tema_user" => "light"
    ]);
}

$conn->close();
?>