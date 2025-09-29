<?php
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método não permitido']);
    exit;
}

$config = include '../../config_api.php';
$conn = new mysqli(
    $config['db_host'],
    $config['db_user'],
    $config['db_pass'],
    $config['db_name']
);
if ($conn->connect_error) {
    echo json_encode(['success' => false, 'message' => 'Erro na conexão com a base de dados']);
    exit;
}

if (empty($_GET['email'])) {
    echo json_encode(['success' => false, 'message' => 'Email não fornecido']);
    exit;
}
$email = $_GET['email'];

// 1) procura dados básicos do utilizador
$stmt = $conn->prepare("
    SELECT id, email, cargoUtilizador, data_criacao
    FROM dadosdoutilizador
    WHERE email = ?
    LIMIT 1
");
$stmt->bind_param("s", $email);
$stmt->execute();
$res = $stmt->get_result();
if ($res->num_rows === 0) {
    echo json_encode(['success' => false, 'message' => 'Utilizador não encontrado']);
    exit;
}
$user = $res->fetch_assoc();
$stmt->close();

$cargo = strtolower($user['cargoUtilizador']);

if ($cargo === 'aluno') {
    // 2A) Dados de aluno
    $stmtA = $conn->prepare("
        SELECT t.turma, t.ano
        FROM alunos a
        JOIN turmas t ON a.turma_id = t.id
        WHERE a.user_id = ?
        LIMIT 1
    ");
    $stmtA->bind_param("i", $user['id']);
    $stmtA->execute();
    $resA = $stmtA->get_result();
    $user['alunoData'] = $resA->num_rows
        ? $resA->fetch_assoc()
        : null;
    $stmtA->close();

} elseif ($cargo === 'professor') {
    // 2B) Dados de professor, agora com JOIN na tabela disciplinas
    $stmtP = $conn->prepare("
        SELECT
            p.id AS professor_id,
            d.disciplina AS disciplina_nome
        FROM professores p
        JOIN disciplinas d
          ON p.disciplina = d.id
        WHERE p.user_id = ?
        LIMIT 1
    ");
    $stmtP->bind_param("i", $user['id']);
    $stmtP->execute();
    $resP = $stmtP->get_result();

    if ($resP->num_rows > 0) {
        $rowP        = $resP->fetch_assoc();
        $professorId = (int)$rowP['professor_id'];
        $disciplina  = $rowP['disciplina_nome'];
    } else {
        $professorId = null;
        $disciplina  = null;
    }
    $stmtP->close();

    if ($professorId) {
        // 3) Turmas onde dá aulas
        $stmtT = $conn->prepare("
            SELECT t.turma, t.ano
            FROM professor_turmas pt
            JOIN turmas t ON pt.turma_id = t.id
            WHERE pt.professor_id = ?
        ");
        $stmtT->bind_param("i", $professorId);
        $stmtT->execute();
        $resT = $stmtT->get_result();
        $turmas = [];
        while ($r = $resT->fetch_assoc()) {
            $turmas[] = $r;
        }
        $stmtT->close();

        $user['professorData'] = [
            'disciplina' => $disciplina,
            'turmas'     => $turmas
        ];
    } else {
        $user['professorData'] = null;
    }
}

// 4) Retorna o JSON final
echo json_encode([
    'success' => true,
    'user'    => $user
]);

$conn->close();
?>