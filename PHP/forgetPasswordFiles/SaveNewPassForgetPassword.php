<?php
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

$config = include '../config_api.php';

$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
    
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
$email = $data['email'] ?? null;
$newPassword = $data['newPassword'] ?? null;

if (!$email || !$newPassword) {
    die(json_encode(["success" => false, "message" => "Dados incompletos."]));
}

// Seleciona a password do utilizador
$stmt = $conn->prepare("SELECT password FROM dadosdoutilizador WHERE email = ?");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    die(json_encode(["success" => false, "message" => "Não encontramos o seu utilizador na nossa base de dados."]));
}

$row = $result->fetch_assoc();
$hashedPassword = $row['password'];

// Impede que a nova senha seja igual à atual
if (password_verify($newPassword, $hashedPassword)) {
    die(json_encode(["success" => false, "message" => "A nova palavra-passe não pode ser igual à atual."]));
}

// Encripta a nova senha com PASSWORD_BCRYPT
$newHashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);

// Atualiza a senha, mas não altera o estado
$updateStmt = $conn->prepare("UPDATE dadosdoutilizador SET password = ? WHERE email = ?");
$updateStmt->bind_param("ss", $newHashedPassword, $email);

if ($updateStmt->execute()) {
    if ($updateStmt->affected_rows > 0) {
        echo json_encode(["success" => true, "message" => "Palavra-passe atualizada com sucesso."]);
    } else {
        echo json_encode(["success" => false, "message" => "Nenhum utilizador atualizado. Verifique se o email está correto."]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Erro ao atualizar a palavra-passe. Erro MySQL: " . $updateStmt->error]);
}

$updateStmt->close();
$stmt->close();
$conn->close();
?>
