<?php 
session_start();

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// Verifica se o método é POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(["success" => false, "message" => "Método não permitido"]);
    exit();
}

// Inclui a configuração e cria a conexão com a base de dados
$config = include '../config_api.php';
$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Erro na conexão com a base de dados"]);
    exit();
}

// Recebe e decodifica os dados JSON enviados
$rawInput = file_get_contents("php://input");
$data = json_decode($rawInput);
if (!isset($data->email) || !isset($data->background_user) || !isset($data->tema_user)) {
    echo json_encode(["success" => false, "message" => "Parâmetros insuficientes"]);
    exit();
}

$email = $conn->real_escape_string($data->email);
$backgroundInput = $data->background_user;
$tema_user = $conn->real_escape_string($data->tema_user);

// procura o ID do utilizador
$queryUser = "SELECT id FROM dadosdoutilizador WHERE email = '$email' LIMIT 1";
$resultUser = $conn->query($queryUser);
if (!$resultUser || $resultUser->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Utilizador não encontrado"]);
    exit();
}
$rowUser = $resultUser->fetch_assoc();
$user_id = $rowUser['id'];

// Diretórios e configurações
$uploadDir = "../uploads/backgrounds/";
$defaultImages = ["bg1.jpg", "bg2.jpg", "bg3.jpg", "bg4.jpg", "bg5.jpg"];

$finalFilePath = "";

// Se o background estiver vazio, tenta recuperar o background previamente configurado
if (empty($backgroundInput)) {
    $queryExisting = "SELECT background_user FROM personalizacao_utilizador WHERE user_id = '$user_id' LIMIT 1";
    $resultExisting = $conn->query($queryExisting);
    if($resultExisting && $resultExisting->num_rows > 0) {
        $rowExisting = $resultExisting->fetch_assoc();
        $finalFilePath = $rowExisting['background_user'];
    } else {
        // Se ainda não houver personalização, define um padrão
        $finalFilePath = "assets/images/bg1.jpg";
    }
} 
// Verifica se o background é um dos padrões (apenas o nome do arquivo)
elseif (in_array(basename($backgroundInput), $defaultImages)) {
    $sourcePath = "../uploads/backgroundsPadrao/" . basename($backgroundInput);
    if (!file_exists($sourcePath)) {
        echo json_encode(["success" => false, "message" => "Arquivo padrão não encontrado"]);
        exit();
    }
    $pathInfo = pathinfo($sourcePath);
    $extension = isset($pathInfo['extension']) ? strtolower($pathInfo['extension']) : "jpg";
    $fileName = "background_{$user_id}_" . time() . "." . $extension;
    $finalFilePath = "uploads/backgrounds/" . $fileName;
    $fullFilePath = $uploadDir . $fileName;
    if (!copy($sourcePath, $fullFilePath)) {
        echo json_encode(["success" => false, "message" => "Erro ao copiar a imagem padrão"]);
        exit();
    }
} 
// Se a imagem for enviada em base64
elseif (strpos($backgroundInput, "data:image/") === 0) {
    if (preg_match('/^data:image\/(\w+);base64,/', $backgroundInput, $matches)) {
        $backgroundInput = substr($backgroundInput, strpos($backgroundInput, ',') + 1);
        $type = strtolower($matches[1]);
        if (!in_array($type, ['jpg', 'jpeg', 'png', 'gif'])) {
            echo json_encode(["success" => false, "message" => "Tipo de imagem não suportado"]);
            exit();
        }
        $backgroundInput = str_replace(' ', '+', $backgroundInput);
        $dataImage = base64_decode($backgroundInput);
        if ($dataImage === false) {
            echo json_encode(["success" => false, "message" => "Erro ao decodificar a imagem"]);
            exit();
        }
        $fileName = "background_{$user_id}_" . time() . "." . $type;
        $finalFilePath = "uploads/backgrounds/" . $fileName;
        $fullFilePath = $uploadDir . $fileName;
        file_put_contents($fullFilePath, $dataImage);
    } else {
        echo json_encode(["success" => false, "message" => "Erro na formatação da imagem"]);
        exit();
    }
} 
// Se a imagem vier como URL
elseif (filter_var($backgroundInput, FILTER_VALIDATE_URL)) {
    $dataImage = file_get_contents($backgroundInput);
    if ($dataImage === false) {
        echo json_encode(["success" => false, "message" => "Erro ao baixar a imagem da URL"]);
        exit();
    }
    $pathInfo = pathinfo(parse_url($backgroundInput, PHP_URL_PATH));
    $extension = isset($pathInfo['extension']) ? strtolower($pathInfo['extension']) : "jpg";
    if (!in_array($extension, ['jpg', 'jpeg', 'png', 'gif'])) {
        $extension = "jpg";
    }
    $fileName = "background_{$user_id}_" . time() . "." . $extension;
    $finalFilePath = "uploads/backgrounds/" . $fileName;
    $fullFilePath = $uploadDir . $fileName;
    file_put_contents($fullFilePath, $dataImage);
} 
// Se o background já for um caminho válido no servidor (não sendo nova imagem)
elseif (strpos($backgroundInput, "uploads/") === 0 || strpos($backgroundInput, "assets/") === 0) {
    $finalFilePath = $backgroundInput;
} else {
    echo json_encode(["success" => false, "message" => "Nenhum background válido fornecido"]);
    exit();
}

// Remove a imagem antiga se existir, somente se a imagem foi alterada e estiver na pasta de uploads
$queryExisting = "SELECT background_user FROM personalizacao_utilizador WHERE user_id = '$user_id' LIMIT 1";
$resultExisting = $conn->query($queryExisting);
if ($resultExisting && $resultExisting->num_rows > 0) {
    $rowExisting = $resultExisting->fetch_assoc();
    $oldBackground = $rowExisting['background_user'];
    if (!empty($oldBackground) && $finalFilePath !== $oldBackground && strpos($oldBackground, 'uploads/backgrounds/') !== false) {
        $oldPath = "../" . $oldBackground;
        if (file_exists($oldPath)) {
            unlink($oldPath);
        }
    }
}

// Insere ou atualiza a personalização do utilizador
$queryCheck = "SELECT id FROM personalizacao_utilizador WHERE user_id = '$user_id' LIMIT 1";
$resultCheck = $conn->query($queryCheck);
if ($resultCheck && $resultCheck->num_rows > 0) {
    $updateQuery = "UPDATE personalizacao_utilizador SET background_user = '$finalFilePath', tema_user = '$tema_user' WHERE user_id = '$user_id'";
    if ($conn->query($updateQuery)) {
        echo json_encode(["success" => true, "message" => "Personalização atualizada", "background_user" => $finalFilePath, "tema_user" => $tema_user]);
    } else {
        echo json_encode(["success" => false, "message" => "Erro ao atualizar personalização"]);
    }
} else {
    $insertQuery = "INSERT INTO personalizacao_utilizador (user_id, background_user, tema_user) VALUES ('$user_id', '$finalFilePath', '$tema_user')";
    if ($conn->query($insertQuery)) {
        echo json_encode(["success" => true, "message" => "Personalização inserida", "background_user" => $finalFilePath, "tema_user" => $tema_user]);
    } else {
        echo json_encode(["success" => false, "message" => "Erro ao inserir personalização"]);
    }
}

$conn->close();
?>