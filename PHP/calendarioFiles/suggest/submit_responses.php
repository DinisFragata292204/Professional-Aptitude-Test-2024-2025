<?php
    header("Content-Type: application/json");
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");

    // lê JSON
    $input = json_decode(file_get_contents('php://input'), true);
    $responder = isset($input['responder']) ? trim($input['responder']) : '';
    $responses = $input['responses'] ?? [];

    if (empty($responder) || !is_array($responses)) {
        echo json_encode(["success" => false, "message" => "Parâmetros inválidos"]);
        exit();
    }

    $config = include '../../config_api.php';
    $conn = new mysqli(
        $config['db_host'],
        $config['db_user'],
        $config['db_pass'],
        $config['db_name']
    );
    if ($conn->connect_error) {
        echo json_encode(["success" => false, "message" => "Erro na conexão"]);
        exit();
    }

    // prepara UPDATE
    $stmt = $conn->prepare("
        UPDATE sugestoes_users
        SET response = ?, responder = ?, date_response = NOW()
        WHERE id = ?
    ");

    if (!$stmt) {
        echo json_encode(["success" => false, "message" => "Erro na preparação"]);
        exit();
    }

    // executa para cada resposta
    foreach ($responses as $r) {
        $id = intval($r['id']);
        $respText = trim($r['response']);
        $stmt->bind_param("ssi", $respText, $responder, $id);
        $stmt->execute();
    }

    echo json_encode(["success" => true, "message" => "Respostas registadas"]);

    $stmt->close();
    $conn->close();
?>