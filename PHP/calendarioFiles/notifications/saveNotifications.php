<?php
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {    
    $config = include '../../config_api.php';
    $conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
    
    if ($conn->connect_error) {
        echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
        exit();
    }
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['email']) || !isset($data['todas_notificacoes']) || !isset($data['notificacoes_eventos']) || !isset($data['notificacoes_tarefas']) || !isset($data['tipo_notificacao']) || !isset($data['created_at'])) {
        echo json_encode(['success' => false, 'message' => 'O servidor não recebeu o email!']);
        exit;
    }

    $email = $data['email'];

    $stmt = $conn->prepare("SELECT id FROM dadosdoutilizador WHERE email = ? LIMIT 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();
        $user_id = $user['id'];
    } else {
        echo json_encode(['success' => false,'message' => 'O seu utilizador não está na nossa bse de dados.']);
        exit;
    }

    $todas_notificacoes = $data['todas_notificacoes'];
    $notificacoes_eventos = $data['notificacoes_eventos'];
    $notificacoes_tarefas = $data['notificacoes_tarefas'];
    $tipo_notificacao = $data['tipo_notificacao'];
    $created_at = $data['created_at'];

    $stmt = $conn->prepare("SELECT user_id FROM preferencias_notificacoes WHERE user_id = ? LIMIT 1");
    $stmt->bind_param("i", $user_id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        // Atualiza a linha existente
        $stmt = $conn->prepare("UPDATE preferencias_notificacoes SET todas_notificacoes = ?, notificacoes_eventos = ?, notificacoes_tarefas = ?, tipo_notificacao = ?, created_at = ? WHERE user_id = ?");
        $stmt->bind_param("sssssi", $todas_notificacoes, $notificacoes_eventos, $notificacoes_tarefas, $tipo_notificacao, $created_at, $user_id);
    } else {
        // Insere um novo registro
        $stmt = $conn->prepare("INSERT INTO preferencias_notificacoes (user_id, todas_notificacoes, notificacoes_eventos, notificacoes_tarefas, tipo_notificacao, created_at) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->bind_param("isssss", $user_id, $todas_notificacoes, $notificacoes_eventos, $notificacoes_tarefas, $tipo_notificacao, $created_at);
    }

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Preferências de notificações salvas com sucesso.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Erro ao salvar as preferências: ' . $stmt->error]);
    }

    $stmt->close();
    $conn->close();
}
?>