<?php 
// fetchStudentGrades.php

// CORS & Preflight
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header('Content-Type: application/json');
$config = include '../../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro no BD"]);
    exit();
}

$in = json_decode(file_get_contents('php://input'), true);
$profEmail   = $in['professor_email'] ?? '';
$alunoId     = intval($in['aluno_id'] ?? 0);
if (!$profEmail || !$alunoId) {
    echo json_encode(["success" => false, "message" => "Parâmetros incorretos"]);
    exit();
}

// 1) encontra professor_id
$stmt = $conn->prepare("
    SELECT p.id
    FROM professores p
    JOIN dadosdoutilizador d ON d.id = p.user_id
    WHERE d.email = ?
");
$stmt->bind_param("s", $profEmail);
$stmt->execute();
$rp = $stmt->get_result();
if ($rp->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Professor não encontrado"]);
    exit();
}
$profId = $rp->fetch_assoc()['id'];
$stmt->close();

// 2) procura notas diretamente por aluno_id e professor_id
$sql = "
    SELECT n.id, d.disciplina, m.nome AS modulo, n.nota, n.data_lancamento
    FROM notas n
    JOIN disciplinas d ON d.id = n.disciplina
    JOIN modulos m ON m.id = n.modulo_id
    WHERE n.aluno_id = ? AND n.professor_id = ?
    ORDER BY n.data_lancamento DESC
";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $alunoId, $profId);
$stmt->execute();
$res = $stmt->get_result();

$grades = [];
while ($row = $res->fetch_assoc()) {
    $grades[] = [
        "id"              => (int)$row['id'],
        "disciplina"      => $row['disciplina'],
        "modulo"          => $row['modulo'],
        "nota"            => (float)$row['nota'],
        "data_lancamento" => $row['data_lancamento'],
    ];
}

echo json_encode(["success" => true, "grades" => $grades]);

$stmt->close();
$conn->close();
?>