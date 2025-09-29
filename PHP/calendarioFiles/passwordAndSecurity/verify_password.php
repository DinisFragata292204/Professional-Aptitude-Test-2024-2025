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
        echo json_encode(['success' => false, 'message' => 'Erro ao conectar à base de dados.']);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['email']) || !isset($data['password'])) {
        echo json_encode(['success' => false, 'message' => 'O servidor não conseguiu receber os dados, tente novamente mais tarde.']);
        exit;
    }

    $email = $data['email'];
    $password = $data['password'];

    try {
        $query = "SELECT password FROM dadosdoutilizador WHERE email = ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $hashedPassword = $row['password'];

            if (password_verify($password, $hashedPassword)) {
                echo json_encode(['success' => true, 'message' => 'A password está correta!', 'password_verified' => true ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'A password não está correta.']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'O utilizador não foi encontrado.']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Ocorreu um erro no servidor.']);
    } finally {
        if (isset($stmt) && $stmt) {
            $stmt->close();
        }
        $conn->close();
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Método inválido.']);
}
?>