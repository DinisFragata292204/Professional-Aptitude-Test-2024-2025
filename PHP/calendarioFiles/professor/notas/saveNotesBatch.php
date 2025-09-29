<?php
// saveNotesBatch.php

session_start();
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Verifica se o método é POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "Método inválido"]);
    exit();
}

// Dados obrigatórios: professor_id, disciplina, modulo, comment_type, comment, notes (array)
$postData = json_decode(file_get_contents("php://input"), true);
$requiredFields = ['professor_id', 'disciplina', 'modulo', 'comment_type', 'notes'];
foreach ($requiredFields as $field) {
    if (!isset($postData[$field])) {
        echo json_encode(["success" => false, "message" => "Campo '{$field}' não fornecido"]);
        exit();
    }
}

$professor_id = $postData['professor_id'];
$disciplina = $postData['disciplina']; // Deve ser o ID
$modulo = $postData['modulo'];
$comment_type = $postData['comment_type'];
$comment = isset($postData['comment']) ? $postData['comment'] : "";
$notes = $postData['notes'];

$config = include '../../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

$inserted = 0;
$stmt = $conn->prepare("INSERT INTO notas (aluno_id, professor_id, disciplina, modulo, nota, comentario, comentario_privado, data_lancamento) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())");

foreach ($notes as $noteData) {
    if (!isset($noteData['aluno_id']) || !isset($noteData['nota'])) {
        continue;
    }
    $aluno_id = $noteData['aluno_id'];
    $nota = $noteData['nota'];
    
    if ($comment_type === 'privado') {
        // Comentário aplicado individualmente (privado)
        $comentario = "";
        $comentario_privado = $comment;
    } else {
        // Comentário geral para todos
        $comentario = $comment;
        $comentario_privado = "";
    }
    // Binding: aluno_id (i), professor_id (i), disciplina (i), modulo (s), nota (d), comentario (s), comentario_privado (s)
    $stmt->bind_param("iiisdss", $aluno_id, $professor_id, $disciplina, $modulo, $nota, $comentario, $comentario_privado);
    if ($stmt->execute()) {
        $inserted++;
    }
}

$stmt->close();
$conn->close();

echo json_encode(["success" => true, "message" => "Notas guardadas com sucesso", "inserted" => $inserted]);
?>