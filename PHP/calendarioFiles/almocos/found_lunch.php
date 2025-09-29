<?php 
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

// Responde à requisição preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
    exit(0);
}

session_start();

$config = include '../../config_api.php';

if (!isset($config['base_url'])) {
    echo json_encode(["success" => false, "message" => "Configuração inválida"]);
    exit();
}

$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

// Obtém os dados enviados via POST (corpo da requisição)
$data = json_decode(file_get_contents("php://input"), true);
$email = isset($data['email']) ? $conn->real_escape_string($data['email']) : '';

if (empty($email)) {
    echo json_encode(["success" => false, "message" => "Email não fornecido"]);
    exit();
}

// procura o utilizador na tabela dadosdoutilizador
$sqlUser = "SELECT id, cargoUtilizador FROM dadosdoutilizador WHERE email = '$email' LIMIT 1";
$resultUser = $conn->query($sqlUser);
if ($resultUser->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Utilizador não encontrado"]);
    exit();
}

$userData = $resultUser->fetch_assoc();
$userId = $userData['id'];
$cargo = $userData['cargoUtilizador'];

// Consulta para alunos: faz JOIN com a tabela turmas para obter 'ano' e 'turma'
if ($cargo === 'aluno') {
    $sql = "SELECT qa.id, qa.user_id, qa.dia, t.ano, t.turma 
            FROM quem_almoca qa
            LEFT JOIN turmas t ON qa.turma_id = t.id
            WHERE qa.user_id = '$userId'";
} else {
    // Para outros cargos, não há necessidade de Procurar ano/turma
    $sql = "SELECT id, user_id, dia FROM quem_almoca WHERE user_id = '$userId'";
}

$result = $conn->query($sql);
$lunches = array();
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $lunches[] = $row;
    }
}

echo json_encode(["success" => true, "data" => $lunches]);
$conn->close();
?>