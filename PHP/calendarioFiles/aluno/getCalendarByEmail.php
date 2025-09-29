<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

session_start();

// Inclui configurações da API
$config = include '../../config_api.php';
if (!isset($config['base_url'])) {
    echo json_encode(["success" => false, "message" => "Configuração inválida"]);
    exit();
}

// Conexão com a base de dados
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

// 1️⃣ Verifica se o email foi enviado e sanitiza a entrada
$email = filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL);
if (!$email) {
    echo json_encode(["success" => false, "message" => "Email não fornecido ou inválido"]);
    exit();
}

// 2️⃣ Procurar o ID do utilizador na tabela dadosdoutilizador
$sqlUser = "SELECT id FROM dadosdoutilizador WHERE email = ?";
$stmtUser = $conn->prepare($sqlUser);
$stmtUser->bind_param("s", $email);
$stmtUser->execute();
$resultUser = $stmtUser->get_result();
if ($resultUser->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Nenhum utilizador encontrado com esse email"]);
    exit();
}
$userRow = $resultUser->fetch_assoc();
$userId = $userRow['id'];
$stmtUser->close();

// 3️⃣ Procurar os turma_ids na tabela alunos para o utilizador
$sqlAluno = "SELECT turma_id FROM alunos WHERE user_id = ?";
$stmtAluno = $conn->prepare($sqlAluno);
$stmtAluno->bind_param("i", $userId);
$stmtAluno->execute();
$resultAluno = $stmtAluno->get_result();
if ($resultAluno->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Nenhuma turma encontrada para este utilizador"]);
    exit();
}

$turmaIds = [];
while ($row = $resultAluno->fetch_assoc()) {
    $turmaIds[] = $row['turma_id'];
}
$stmtAluno->close();

// 4️⃣ Obter a "turma de referência" do utilizador
// Selecionamos a turma com o maior valor do campo "ano", presumindo que é a turma ativa atual.
$activeTurma = null;
if (count($turmaIds) > 0) {
    $placeholders = implode(',', array_fill(0, count($turmaIds), '?'));
    $sqlTurma = "SELECT id, ano, turma, ano_inicio, ano_fim, status 
                 FROM turmas 
                 WHERE id IN ($placeholders)
                 ORDER BY ano DESC LIMIT 1";
    $stmtTurma = $conn->prepare($sqlTurma);
    $types = str_repeat('i', count($turmaIds));
    $stmtTurma->bind_param($types, ...$turmaIds);
    $stmtTurma->execute();
    $resultTurma = $stmtTurma->get_result();
    if ($resultTurma->num_rows > 0) {
        $activeTurma = $resultTurma->fetch_assoc();
    }
    $stmtTurma->close();
}

if (!$activeTurma) {
    echo json_encode(["success" => false, "message" => "Não foi possível determinar a turma ativa do utilizador"]);
    exit();
}

// 5️⃣ Procurar os calendários (pdf's) com JOIN na tabela turmas
// Seleciona todos os calendários que pertencem a turmas com os mesmos ano_inicio, ano_fim e turma (letra)
// Utilizamos CAST para o campo t.ano para padronizar o tipo (string)
$calendariosResult = [];
$sqlCalendar = "SELECT 
                    c.id, 
                    c.turma_id, 
                    c.pdf, 
                    c.data_de_upload, 
                    CAST(t.ano AS CHAR) AS ano, 
                    t.turma, 
                    t.ano_inicio, 
                    t.ano_fim, 
                    t.status 
                FROM calendarios c 
                INNER JOIN turmas t ON c.turma_id = t.id 
                WHERE t.ano_inicio = ? AND t.ano_fim = ? AND t.turma = ?
                ORDER BY c.data_de_upload DESC";
$stmtCal = $conn->prepare($sqlCalendar);
$stmtCal->bind_param("iis", $activeTurma['ano_inicio'], $activeTurma['ano_fim'], $activeTurma['turma']);
$stmtCal->execute();
$resCal = $stmtCal->get_result();
while ($calRow = $resCal->fetch_assoc()) {
    $pdfUrl = $config['base_url'] . "/uploads/" . $calRow['pdf'];
    $calendariosResult[] = [
        "id" => $calRow['id'],
        "turma_id" => $calRow['turma_id'],
        "pdf" => $calRow['pdf'],
        "pdf_url" => $pdfUrl,
        "data_de_upload" => $calRow['data_de_upload'],
        "ano" => $calRow['ano'],
        "turma" => $calRow['turma'],
        "ano_inicio" => $calRow['ano_inicio'],
        "ano_fim" => $calRow['ano_fim'],
        "status" => $calRow['status']
    ];
}
$stmtCal->close();
$conn->close();

echo json_encode([
    "success" => true,
    "message" => count($calendariosResult) > 0 ? "Calendários encontrados" : "Nenhum calendário encontrado",
    "data" => $calendariosResult
]);
?>