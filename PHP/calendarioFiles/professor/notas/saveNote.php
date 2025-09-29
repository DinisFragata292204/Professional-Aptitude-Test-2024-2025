<?php 
// saveNote.php

session_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

error_log("DEBUG: Início do saveNote.php");

// Verifica se o método é POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error_log("DEBUG: Método inválido: " . $_SERVER['REQUEST_METHOD']);
    echo json_encode(["success" => false, "message" => "Método inválido"]);
    exit();
}

// Obtém os dados enviados em JSON
$postData = json_decode(file_get_contents("php://input"), true);
error_log("DEBUG: Dados recebidos: " . print_r($postData, true));

// Verifica os campos obrigatórios
$requiredFields = ['professor_id', 'disciplina', 'modulo', 'turma', 'ano', 'alunos'];
foreach ($requiredFields as $field) {
    if (!isset($postData[$field])) {
        error_log("DEBUG: Campo '{$field}' não fornecido");
        echo json_encode(["success" => false, "message" => "Campo '{$field}' não fornecido"]);
        exit();
    }
}

$professor_id     = $postData['professor_id'];
$disciplina       = $postData['disciplina'];
$numero_do_modulo = $postData['modulo'];
$turma            = $postData['turma'];
$ano              = $postData['ano'];
$alunos           = $postData['alunos'];

$config = include '../../../config_api.php';

$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    error_log("DEBUG: Erro na conexão com o base: " . $conn->connect_error);
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

$stmtModulo = $conn->prepare("SELECT id FROM modulos WHERE numero_do_modulo = ?");
$stmtModulo->bind_param("i", $numero_do_modulo);
$stmtModulo->execute();
$resultModulo = $stmtModulo->get_result();
if ($resultModulo->num_rows === 0) {
    echo json_encode([
        "success" => false,
        "message" => "O '{$numero_do_modulo}' não está na nossa base de dados! Pedimos que solicite a um administrador para adicionar o módulo."
    ]);
    exit();
}
$modulo_id = $resultModulo->fetch_assoc()['id'];
$stmtModulo->close();

$stmt = $conn->prepare("
    INSERT INTO notas (
        aluno_id,
        professor_id,
        disciplina,
        modulo_id,
        nota,
        comentario_privado,
        data_lancamento
    ) VALUES (?, ?, ?, ?, ?, ?, NOW())
");
if ($stmt === false) {
    error_log("DEBUG: Erro ao preparar a query de notas: " . $conn->error);
    echo json_encode(["success" => false, "message" => "Erro ao preparar a query de notas"]);
    exit();
}

$stmtGetProf = $conn->prepare("
    SELECT id 
    FROM professores 
    WHERE user_id = ?
    LIMIT 1
");
if ($stmtGetProf === false) {
    error_log("DEBUG: Erro ao preparar stmtGetProf: " . $conn->error);
    echo json_encode(["success" => false, "message" => "Erro interno (stmtGetProf)"]);
    exit();
}
$stmtGetProf->bind_param("i", $professor_id);
$stmtGetProf->execute();
$resultGetProf = $stmtGetProf->get_result();

if ($resultGetProf->num_rows === 0) {
    error_log("DEBUG: Nenhum professor encontrado com user_id = $professor_id");
    echo json_encode([
        "success" => false,
        "message" => "Professor não existe ou não está autorizado"
    ]);
    $stmtGetProf->close();
    exit();
}

// atualiza a variável para o verdadeiro id da tabela 'professores'
$rowProf = $resultGetProf->fetch_assoc();
$professor_id = $rowProf['id'];

error_log("DEBUG: Traduzido user_id para id = $professor_id");
$stmtGetProf->close();

foreach ($alunos as $aluno) {
    $nota = $aluno['nota'];
    $comentario = isset($aluno['comentario_privado']) ? $aluno['comentario_privado'] : "";

    $stmtAluno = $conn->prepare("
        SELECT a.id 
        FROM alunos a 
        JOIN turmas t ON a.turma_id = t.id 
        WHERE t.turma = ? AND t.ano = ? LIMIT 1
    ");
    $stmtAluno->bind_param("si", $turma, $ano);
    $stmtAluno->execute();
    $resultAluno = $stmtAluno->get_result();
    $stmtAluno->close();

    if ($resultAluno->num_rows == 0) {
        error_log("DEBUG: Nenhum aluno encontrado para turma: $turma, ano: $ano");
        echo json_encode(["success" => false, "message" => "Nenhum aluno encontrado"]);
        exit();
    }

    $aluno_id = $resultAluno->fetch_assoc()['id'];
    $stmt->bind_param("iiiids", $aluno_id, $professor_id, $disciplina, $modulo_id, $nota, $comentario);

    if (!$stmt->execute()) {
        error_log("DEBUG: Erro ao inserir nota para aluno_id: $aluno_id, erro: " . $stmt->error);
        echo json_encode([
            "success" => false,
            "message" => "Erro ao guardar a nota para um aluno"
        ]);
        exit();
    }
}

$stmt->close();
$conn->close();

echo json_encode(["success" => true, "message" => "Notas guardadas com sucesso"]);
?>