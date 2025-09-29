<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

// Responde à requisição preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type");
    exit(0);
}

$config = include '../../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (isset($data["email"]) && isset($data["diasParaAdicionar"]) && isset($data["diasParaRemover"])) {
    $email = $conn->real_escape_string($data["email"]);
    $diasParaAdicionar = $data["diasParaAdicionar"];
    $diasParaRemover = $data["diasParaRemover"];

    // procura o utilizador
    $sqlUser = "SELECT id, cargoUtilizador FROM dadosdoutilizador WHERE email = '$email' LIMIT 1";
    $resultUser = $conn->query($sqlUser);
    if ($resultUser->num_rows === 0) {
        echo json_encode(["success" => false, "message" => "Utilizador não encontrado"]);
        exit();
    }
    $userData = $resultUser->fetch_assoc();
    $user_id = $userData["id"];
    $cargo = $userData["cargoUtilizador"];

    // Para utilizadores com cargo 'aluno', Procurar o valor de turma_id na tabela alunos
    $turma_id = null;
    if ($cargo === "aluno") {
        $sqlAluno = "SELECT turma_id FROM alunos WHERE user_id = '$user_id' LIMIT 1";
        $resultAluno = $conn->query($sqlAluno);
        if ($resultAluno->num_rows > 0) {
            $alunoData = $resultAluno->fetch_assoc();
            $turma_id = $alunoData["turma_id"];
        }
    }

    // Insere os dias novos
    $successAdd = true;
    foreach ($diasParaAdicionar as $dia) {
        if ($cargo === "aluno") {
            $stmt = $conn->prepare("INSERT INTO quem_almoca (user_id, dia, turma_id) VALUES (?, ?, ?)");
            if ($stmt) {
                $stmt->bind_param("isi", $user_id, $dia, $turma_id);
                if (!$stmt->execute()) {
                    $successAdd = false;
                }
                $stmt->close();
            } else {
                $successAdd = false;
            }
        } else {
            $stmt = $conn->prepare("INSERT INTO quem_almoca (user_id, dia) VALUES (?, ?)");
            if ($stmt) {
                $stmt->bind_param("is", $user_id, $dia);
                if (!$stmt->execute()) {
                    $successAdd = false;
                }
                $stmt->close();
            } else {
                $successAdd = false;
            }
        }
    }

    // Remove os dias desmarcados
    $successRemove = true;
    foreach ($diasParaRemover as $dia) {
        $stmt = $conn->prepare("DELETE FROM quem_almoca WHERE user_id = ? AND dia = ?");
        if ($stmt) {
            $stmt->bind_param("is", $user_id, $dia);
            if (!$stmt->execute()) {
                $successRemove = false;
            }
            $stmt->close();
        } else {
            $successRemove = false;
        }
    }

    $finalSuccess = $successAdd && $successRemove;
    echo json_encode(["success" => $finalSuccess]);
} else {
    echo json_encode(["success" => false, "message" => "Dados insuficientes"]);
}
$conn->close();
?>