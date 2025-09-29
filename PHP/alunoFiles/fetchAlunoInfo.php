<?php
session_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "Método inválido"]);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);
if (!isset($data['email'])) {
    echo json_encode(["success" => false, "message" => "Email não fornecido"]);
    exit();
}

$email = $data['email'];
$config = include '../../config_api.php';

$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

// 1. Procurar o "utilizador" na tabela "dadosdoutilizador" (garante o cargo "aluno")
$stmt = $conn->prepare("SELECT id, email FROM dadosdoutilizador WHERE email = ? AND cargoUtilizador = 'aluno' AND estado = 'ativo' LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$result = $stmt->get_result();
if ($result->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Aluno não encontrado"]);
    exit();
}
$aluno = $result->fetch_assoc();
$aluno_id = $aluno['id'];
$stmt->close();

// 2. Procura as "disciplinas" associadas ao "aluno", através da tabela intermediária "aluno_disciplinas"
$stmt = $conn->prepare("SELECT disciplina_id FROM aluno_disciplinas WHERE aluno_id = ?");
$stmt->bind_param("i", $aluno_id);
$stmt->execute();
$result = $stmt->get_result();
$disciplina_ids = [];
while ($row = $result->fetch_assoc()) {
    $disciplina_ids[] = $row['disciplina_id'];
}
$stmt->close();

// Se não há disciplinas, retorna com mensagem
if (count($disciplina_ids) === 0) {
    echo json_encode([
        "success" => true,
        "message" => "Nenhuma disciplina encontrada para o aluno",
        "aluno" => $aluno,
        "disciplinas" => []
    ]);
    $conn->close();
    exit();
}

// 3. Procura os detalhes das "disciplinas" na tabela "disciplinas"
// Prepara a cláusula IN dinamicamente
$placeholders = implode(',', array_fill(0, count($disciplina_ids), '?'));
$types = str_repeat('i', count($disciplina_ids));
$sql = "SELECT id, disciplina FROM disciplinas WHERE id IN ($placeholders)";
$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$disciplina_ids);
$stmt->execute();
$result = $stmt->get_result();
$disciplinas = [];
while ($row = $result->fetch_assoc()) {
    $disciplinas[] = $row;
}
$stmt->close();
$conn->close();

echo json_encode([
    "success" => true,
    "aluno" => $aluno,
    "disciplinas" => $disciplinas
]);
?>
