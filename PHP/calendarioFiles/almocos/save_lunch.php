<?php 
error_reporting(0);
ini_set('display_errors', 0);

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

if (isset($data["email"]) && isset($data["dias"]) && is_array($data["dias"])) {
    $email = $conn->real_escape_string($data["email"]);
    $dias = $data["dias"]; // Array de datas no formato "YYYY-MM-DD"

    // Obter o utilizador na tabela dadosdoutilizador
    $sqlUser = "SELECT id, cargoUtilizador FROM dadosdoutilizador WHERE email = '$email' LIMIT 1";
    $resultUser = $conn->query($sqlUser);
    if ($resultUser->num_rows === 0) {
        echo json_encode(["success" => false, "message" => "Utilizador não encontrado"]);
        exit();
    }
    $userData = $resultUser->fetch_assoc();
    $user_id = $userData["id"];
    $cargo = $userData["cargoUtilizador"];

    // Se o cargo for 'aluno', Procurar o valor de turma_id na tabela alunos
    $turma_id = null;
    if ($cargo === "aluno") {
        $sqlAluno = "SELECT turma_id FROM alunos WHERE user_id = '$user_id' LIMIT 1";
        $resultAluno = $conn->query($sqlAluno);
        if ($resultAluno->num_rows > 0) {
            $alunoData = $resultAluno->fetch_assoc();
            $turma_id = $alunoData["turma_id"];
        }
    }

    $success = true;
    foreach ($dias as $dia) {
        if ($cargo === "aluno") {
            // Insere com o campo turma_id para alunos
            $stmt = $conn->prepare("INSERT INTO quem_almoca (user_id, dia, turma_id) VALUES (?, ?, ?)");
            if ($stmt) {
                $stmt->bind_param("isi", $user_id, $dia, $turma_id);
                if (!$stmt->execute()) {
                    $success = false;
                }
                $stmt->close();
            } else {
                $success = false;
            }
        } else {
            // Para outros cargos, insere apenas user_id e dia
            $stmt = $conn->prepare("INSERT INTO quem_almoca (user_id, dia) VALUES (?, ?)");
            if ($stmt) {
                $stmt->bind_param("is", $user_id, $dia);
                if (!$stmt->execute()) {
                    $success = false;
                }
                $stmt->close();
            } else {
                $success = false;
            }
        }
    }
    echo json_encode(["success" => $success]);
} else {
    echo json_encode(["success" => false, "message" => "Dados insuficientes"]);
}
$conn->close();
?>