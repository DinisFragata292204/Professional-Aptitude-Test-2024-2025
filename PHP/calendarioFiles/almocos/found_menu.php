<?php 
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

// Responde à requisição preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
    exit(0);
}

$config = include '../../config_api.php';

if (!isset($config['base_url'])) {
    echo json_encode(["success" => false, "message" => "Configuração inválida"]);
    exit();
}

$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

// Consulta os registros na tabela "almocos"
$sql = "SELECT id, dia, sopa, prato_principal, sobremesa FROM almocos";
$result = $conn->query($sql);
$almocos = array();
if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $almocos[] = $row;
    }
}

echo json_encode(["success" => true, "data" => $almocos]);
$conn->close();
?>