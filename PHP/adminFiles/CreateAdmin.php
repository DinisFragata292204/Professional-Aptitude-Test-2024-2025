<?php  
session_start();

// Ativa a exibição de erros
ini_set('display_errors', 1);
error_reporting(E_ALL);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Obtém o JSON enviado no corpo da requisição
    $data = json_decode(file_get_contents("php://input"), true);

    // Verifica se os campos obrigatórios foram enviados
    if (!isset($data['email']) || !isset($data['cargoUtilizador'])) {
        echo json_encode([ 
            "success" => false, 
            "message" => "Parâmetros 'email' e 'cargoUtilizador' são obrigatórios." 
        ]);
        exit;
    }

    $email = $data['email'];
    $cargoUtilizador = $data['cargoUtilizador'];

    // Garante que apenas "admins" podem ser criados
    if ($cargoUtilizador !== 'admin') {
        echo json_encode([ 
            "success" => false, 
            "message" => "Apenas administradores podem ser criados neste endpoint." 
        ]);
        exit;
    }

    $config = include '../config_api.php';
    $conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
    if($conn->connect_error){
         echo json_encode(["success"=>false, "message"=>"Erro de conexão: " . $conn->connect_error]);
         exit;
    }

    // Prepara e executa a query de inserção
    $stmt = $conn->prepare("INSERT INTO dadosdoutilizador (email, cargoUtilizador) VALUES (?, ?)");
    if ($stmt === false) {
        echo json_encode([ 
            "success" => false, 
            "message" => "Erro ao preparar a query: " . $conn->error
        ]);
        exit;
    }

    $stmt->bind_param("ss", $email, $cargoUtilizador);

    if ($stmt->execute()) {
        echo json_encode([ 'success' => true ]);
    } else {
        echo json_encode([ 
            "success" => false, 
            "message" => "Erro ao inserir no base: " . $stmt->error 
        ]);
    }

    // Fecha a conexão
    $stmt->close();
    $conn->close();
} else {
    echo json_encode([ 
        "success" => false, 
        "message" => "Método não permitido." 
    ]);
}
?>
