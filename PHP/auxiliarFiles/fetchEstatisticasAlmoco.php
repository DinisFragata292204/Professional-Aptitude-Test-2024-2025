<?php
session_start();
error_reporting(E_ALL);
ini_set('display_errors', '1');

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$config = include '../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Não foi possível conectar à base de dados."]);
    exit;
}

// 1. Procurar todos os utilizadores ativos
$sqlUsers = "SELECT id, email, cargoUtilizador FROM dadosdoutilizador WHERE estado = 'ativo' ORDER BY cargoUtilizador";
$resultUsers = $conn->query($sqlUsers);
if (!$resultUsers) {
    echo json_encode(["success" => false, "message" => "Erro na consulta de utilizadores: " . $conn->error]);
    exit;
}

$usuarios = [];
while ($row = $resultUsers->fetch_assoc()) {
    $usuarios[$row['id']] = [
        'id'    => $row['id'],
        'email' => $row['email'],
        'cargo' => strtolower($row['cargoUtilizador']),
        'dias'  => []  // para guardar os dias em que marcaram almoço
    ];
}

// 2. Procurar os registos de quem almoça na tabela "quem_almoca"
$sqlQuemAlmoca = "SELECT user_id, turma_id, dia FROM quem_almoca";
$resultQuemAlmoca = $conn->query($sqlQuemAlmoca);
if (!$resultQuemAlmoca) {
    echo json_encode(["success" => false, "message" => "Erro na consulta de quem almoça: " . $conn->error]);
    exit;
}

while ($row = $resultQuemAlmoca->fetch_assoc()) {
    $userId = $row['user_id'];
    // Verifica se o utilizador está entre os ativos
    if (!isset($usuarios[$userId])) {
        continue;
    }
    $dia = $row['dia'];
    // Aqui usamos a tabela "almocos" para confirmar que o almoço foi marcado
    $sqlAlmocos = "SELECT id FROM almocos WHERE dia = '" . $conn->real_escape_string($dia) . "'";
    $resultAlmocos = $conn->query($sqlAlmocos);
    if ($resultAlmocos && $resultAlmocos->num_rows > 0) {
        $usuarios[$userId]['dias'][] = $dia;
        $usuarios[$userId]['turma_id'] = (isset($row['turma_id']) && !empty($row['turma_id'])) ? $row['turma_id'] : null;
    }
}

// 3. Separar os utilizadores por tipo e, para os alunos, Procurar os dados da turma
$alunos = [];
$professores = [];
$administradores = [];

foreach ($usuarios as $user) {
    // Se você quiser exibir TODOS os utilizadores ativos, mesmo sem almoço marcado, remova o if (empty(...))
    if (empty($user['dias'])) {
        continue;
    }
    if ($user['cargo'] === 'aluno') {
        if (isset($user['turma_id']) && !empty($user['turma_id'])) {
            $turmaId = $user['turma_id'];
            $sqlTurma = "SELECT ano, turma FROM turmas WHERE id = '$turmaId' LIMIT 1";
            $resultTurma = $conn->query($sqlTurma);
            if ($resultTurma && $resultTurma->num_rows > 0) {
                $turmaData = $resultTurma->fetch_assoc();
                $user['turma'] = $turmaData;
            }
        }
        $alunos[] = $user;
    } else if ($user['cargo'] === 'professor') {
        $professores[] = $user;
    } else if ($user['cargo'] === 'admin' || $user['cargo'] === 'administrador') {
        $administradores[] = $user;
    }
}

$totalAlunos = count($alunos);
$totalProfessores = count($professores);
$totalAdministradores = count($administradores);
$totalGeral = $totalAlunos + $totalProfessores + $totalAdministradores;
$totalSugestoes = "alunoetps@etps.com.pt\n 4 - Muito bom o almoço.";

// Cria uma headline com a data atual (por exemplo, formato dd/mm/yyyy)
$headline = "Estatísticas de Almoço - " . date("d/m/Y");

$response = [
    "success" => true,
    "headline" => $headline,
    "alunosCount" => $totalAlunos,
    "professoresCount" => $totalProfessores,
    "administradoresCount" => $totalAdministradores,
    "total" => $totalGeral,
    "alunos" => $alunos,
    "professores" => $professores,
    "administradores" => $administradores,
    "sugestoes" => $totalSugestoes
];

echo json_encode($response);
$conn->close();
?>
