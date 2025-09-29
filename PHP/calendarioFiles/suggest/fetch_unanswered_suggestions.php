<?php
    header("Content-Type: application/json");
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");

    // lê email do GET
    $email = isset($_GET['email']) ? trim($_GET['email']) : '';
    if (empty($email)) {
        echo json_encode(["success" => false, "message" => "Email em falta"]);
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

    $stmt = $conn->prepare("
        SELECT id, email, message, date_sent
        FROM sugestoes_users
        WHERE response IS NULL
        ORDER BY date_sent ASC
    ");
    $stmt->execute();
    $result = $stmt->get_result();

    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }

    echo json_encode(["success" => true, "data" => $data]);

    $stmt->close();
    $conn->close();
?>