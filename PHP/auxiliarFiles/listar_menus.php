<?php
header("Access-Control-Allow-Origin: *"); // Permite requisições de qualquer origem
header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); // Permite esses métodos HTTP
header("Access-Control-Allow-Headers: Content-Type, Authorization"); // Permite esses cabeçalhos
header("Access-Control-Allow-Credentials: true"); // Permite credenciais, se necessário

// Responder a requisições OPTIONS
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
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

$sql = "SELECT dia, sopa, prato_principal, sobremesa FROM almocos ORDER BY dia DESC";
$result = $conn->query($sql);

$menus = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $menus[] = $row;
    }
}

echo json_encode(["success" => true, "menus" => $menus]);

$conn->close();
?>