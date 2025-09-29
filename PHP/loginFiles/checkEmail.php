<?php
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

require '../vendor/autoload.php';

use \Firebase\JWT\JWT;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $config = include '../config_api.php';
    $conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
    
    if ($conn->connect_error) {
        echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
        exit();
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['email']) || $data['email'] === '') {
        echo json_encode(['success' => false, 'message' => 'O servidor não recebeu o seu email.']);
        exit;
    }

    $email = $data['email'];
    $password = isset($data['password']) ? $data['password'] : null;
    $deviceToken = isset($data['deviceToken']) ? $data['deviceToken'] : '';
    $deviceType = isset($data['deviceType']) ? $data['deviceType'] : 'unknown';

    try {
        $query = "SELECT id, password, cargoUtilizador, estado FROM dadosdoutilizador WHERE email = ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $user_id = $row['id'];
            $hashedPassword = $row['password'];
            $cargoUtilizador = $row['cargoUtilizador'];
            $estado = $row['estado'];

            // Se o estado for "pendente", redireciona para a tela de inscrição
            if ($estado === "pendente") {
                if (!empty($password)) {
                    echo json_encode([
                        'success' => false,
                        'message' => 'Não pode fazer login enquanto a conta estiver pendente. Complete a inscrição primeiro.'
                    ]);
                    exit;
                }
                echo json_encode([
                    'success' => false,
                    'estado' => 'pendente',
                    'email' => $email
                ]);
                exit;
            }   
            
            // Verifica a senha se fornecida
            if ($password !== null && password_verify($password, $hashedPassword)) {
                // Gera token JWT com expiração de 50 dias
                $key = $config['jwt_key'];
                $issuedAt = time();
                $expirationTime = $issuedAt + (50 * 24 * 60 * 60); // 50 dias
                $payload = array(
                    "user_id" => $user_id,
                    "email" => $email,
                    "cargoUtilizador" => $cargoUtilizador,
                    "iat" => $issuedAt,
                    "exp" => $expirationTime,
                    "deviceType" => $deviceType
                );

                $jwt = JWT::encode($payload, $key, 'HS256');

                // Insere a nova sessão na tabela sessoes_do_utilizador
                $insertQuery = "INSERT INTO sessoes_do_utilizador (user_id, token, device_type, expires_at) VALUES (?, ?, ?, FROM_UNIXTIME(?))";
                $insertStmt = $conn->prepare($insertQuery);
                $insertStmt->bind_param("issi", $user_id, $jwt, $deviceType, $expirationTime);
                $insertStmt->execute();
                $insertStmt->close();

                // Se houver deviceToken, pode atualizar a tabela de utilizadors (opcional)
                if (!empty($deviceToken)) {
                    $updateQuery = "UPDATE dadosdoutilizador SET device_token = ? WHERE email = ?";
                    $updateStmt = $conn->prepare($updateQuery);
                    $updateStmt->bind_param("ss", $deviceToken, $email);
                    $updateStmt->execute();
                    $updateStmt->close();
                }

                echo json_encode([
                    'success' => true,
                    'message' => 'Login efetuado com sucesso!',
                    'token' => $jwt,
                    'cargoUtilizador' => $cargoUtilizador,
                    'email' => $email
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'A palavra-passe não corresponde à fornecida anteriormente!']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'Verifique se inseriu o email corretamente ou crie uma conta!']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Pedimos desculpa, mas ocorreu um erro no nosso servidor.']);
    } finally {
        if (isset($stmt) && $stmt) {
            $stmt->close();
        }
        $conn->close();
    }
} else {
    echo json_encode(['success' => false, 'message' => 'A forma de envio gerou um erro.']);
}
?>