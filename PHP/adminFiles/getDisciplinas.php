<?php

session_start();

$allowedOrigins = [
    'https://minhaapp.loca.lt', // Para HTTPS
    'http://localhost:19006',
    'http://localhost:3000'
];
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
} else {
    error_log("[" . date('Y-m-d H:i:s') . "] Origin não permitido: " . $origin);
}
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$config = include '../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro de conexão: " . $conn->connect_error]);
    exit();
}

$sql = "SELECT id, disciplina FROM disciplinas";
$result = $conn->query($sql);
$disciplinas = array();

if ($result) {
    while ($row = $result->fetch_assoc()) {
        $disciplinas[] = $row;
    }
    echo json_encode(["success" => true, "disciplinas" => $disciplinas]);
} else {
    echo json_encode(["success" => false, "message" => "Erro na consulta: " . $conn->error]);
}

$conn->close();
?>
