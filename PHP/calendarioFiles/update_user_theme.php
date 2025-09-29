<?php 
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

$config = include '../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);

// Verifica se a conexão foi bem-sucedida
if ($conn->connect_error) {
    echo json_encode([
        'success' => false,
        'message' => 'Erro de conexão com o base de dados.'
    ]);
    exit;
}

// Recebe os dados JSON enviados via POST
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['email']) || !isset($data['theme'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Parâmetros inválidos.'
    ]);
    exit;
}

$email = $data['email'];
$theme = $data['theme'];

// Validação: aceita somente "dark" ou "light"
if ($theme !== "dark" && $theme !== "light") {
    echo json_encode([
        'success' => false,
        'message' => 'Valor de tema inválido.'
    ]);
    exit;
}

// procura o user_id na tabela dadosdoutilizador usando o email
$sql = "SELECT id FROM dadosdoutilizador WHERE email = ?";
if ($stmt = $conn->prepare($sql)) {
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->store_result();
    
    if ($stmt->num_rows > 0) {
        $stmt->bind_result($user_id);
        $stmt->fetch();
        $stmt->close();
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Utilizador não encontrado.'
        ]);
        exit;
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Erro na preparação da consulta de utilizador.'
    ]);
    exit;
}

// Verifica se o utilizador já tem um registro na tabela backgrounds_utilizador
$sql = "SELECT theme FROM backgrounds_utilizador WHERE user_id = ?";
if ($stmt = $conn->prepare($sql)) {
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $stmt->store_result();
    
    if ($stmt->num_rows > 0) {
        // Se já existe um registro, faz UPDATE
        $stmt->close();
        $sql_update = "UPDATE backgrounds_utilizador SET theme = ? WHERE user_id = ?";
        if ($stmt_update = $conn->prepare($sql_update)) {
            $stmt_update->bind_param("si", $theme, $user_id);
            $stmt_update->execute();
            $stmt_update->close();
            echo json_encode(['success' => true, 'message' => 'Tema atualizado com sucesso.']);
        }
    } else {
        // Se não existe, insere um novo registro
        $stmt->close();
        $sql_insert = "INSERT INTO backgrounds_utilizador (user_id, theme) VALUES (?, ?)";
        if ($stmt_insert = $conn->prepare($sql_insert)) {
            $stmt_insert->bind_param("is", $user_id, $theme);
            $stmt_insert->execute();
            $stmt_insert->close();
            echo json_encode(['success' => true, 'message' => 'Tema adicionado com sucesso.']);
        }
    }
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Erro na verificação do tema do utilizador.'
    ]);
}


$conn->close();
?>
