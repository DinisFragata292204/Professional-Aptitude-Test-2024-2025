<?php
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {    
    $config = include '../config_api.php';
    $conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
    
    if ($conn->connect_error) {
        echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data["email"]) || !isset($data["password"])) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "O servidor não recebeu o email ou a password"]);
        exit();
    }

    $email = $data["email"];
    $password = $data["password"];
    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

    $stmtSave = $conn->prepare("UPDATE dadosdoutilizador SET password = ? WHERE email = ?");
    $stmtSave->bind_param("ss", $hashedPassword, $email);
    if ($stmtSave->execute()) {
        http_response_code(200);
        echo json_encode(["success" => true, "message" => "Palavra-passe associada à sua conta com sucesso!"]);
    } else {
        http_response_code(500);
        echo json_encode(["success" => false, "message" => "Houve problemas a criar a palavra-passe"]);
    }
    $conn->close();
}
?>
