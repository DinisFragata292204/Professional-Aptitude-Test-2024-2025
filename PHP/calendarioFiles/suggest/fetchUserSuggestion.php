<?php
    header("Content-Type: application/json");
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");

    $email = "";
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $email = isset($_GET['email']) ? trim($_GET['email']) : "";
    } else {
        $input = json_decode(file_get_contents('php://input'), true);
        $email = isset($input['email']) ? trim($input['email']) : "";
    }
    if (empty($email)) {
        echo json_encode(["success" => false, "message" => "Email em falta"]);
        exit();
    }

    // conexão
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

    // query
    $stmt = $conn->prepare("
        SELECT id, email, message AS message, date_sent, response, responder, date_response
        FROM sugestoes_users
        WHERE email = ?
        ORDER BY date_sent DESC
    ");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }

    echo json_encode([
        "success" => true,
        "data"    => $data
    ]);

    $stmt->close();
    $conn->close();
?>