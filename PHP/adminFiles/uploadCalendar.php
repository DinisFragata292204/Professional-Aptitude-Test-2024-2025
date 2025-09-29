<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Apenas retorna os headers
    exit(0);
}
header("Content-Type: application/json");
session_start();

$config = include '../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

// Verifica se os dados foram enviados
if (isset($_POST['ano']) && isset($_POST['turma']) && isset($_FILES['pdf'])) {
    $ano = $_POST['ano'];
    $turma = $_POST['turma'];
    $pdf = $_FILES['pdf'];

    // Validação do tipo de ficheiro
    $allowedMimeTypes = ["application/pdf"];
    if (!in_array($pdf['type'], $allowedMimeTypes)) {
        echo json_encode(["success" => false, "message" => "Arquivo não é um PDF válido"]);
        exit();
    }

    // Pasta de uploads
    $uploadDir = "../uploads/";
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }

    // Nome do ficheiro
    $fileName = time() . "_" . basename($pdf['name']);
    $targetFile = $uploadDir . $fileName;

    // Mover o ficheiro
    if (move_uploaded_file($pdf['tmp_name'], $targetFile)) {
        $data_de_upload = date("Y-m-d H:i:s");

        // Obter o ID da "turma" com base no "ano" e "turma"
        $stmt = $conn->prepare("SELECT id FROM turmas WHERE ano = ? AND turma = ?");
        $stmt->bind_param("ss", $ano, $turma);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            echo json_encode(["success" => false, "message" => "Turma não encontrada"]);
            exit();
        }

        $row = $result->fetch_assoc();
        $turma_id = $row['id'];
        $stmt->close();

        // Insere na tabela "calendarios" com o "turma_id"
        $stmt = $conn->prepare("INSERT INTO calendarios (turma_id, pdf, data_de_upload) VALUES (?, ?, ?)");
        $stmt->bind_param("iss", $turma_id, $fileName, $data_de_upload);

        if ($stmt->execute()) {
            echo json_encode(["success" => true, "message" => "Upload realizado e dados salvos com sucesso"]);
        } else {
            echo json_encode(["success" => false, "message" => "Erro ao salvar os dados na base de dados"]);
        }
        $stmt->close();
    } else {
        echo json_encode(["success" => false, "message" => "Erro ao mover o arquivo para o diretório"]);
    }
} else {
    echo json_encode(["success" => false, "message" => "Dados incompletos"]);
}

$conn->close();
?>
