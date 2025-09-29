<?php
session_start();

// --- CORS e JSON headers ---
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Só POST real
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Método inválido."]);
    exit;
}

// Primeiro tenta JSON
$raw      = file_get_contents('php://input');
$postData = json_decode($raw, true);
// Se não vier JSON, cai no multipart/form-data
if (!is_array($postData)) {
    $postData = $_POST;
}

// Campos obrigatórios
if (empty($postData['event_id']) || empty($postData['email'])) {
    echo json_encode([
        "success" => false,
        "message" => "Parâmetros 'event_id' e 'email' são obrigatórios."
    ]);
    exit;
}

// Sanitização
$event_id   = intval($postData['event_id']);
$email      = trim($postData['email']);
$titulo     = isset($postData['title'])          ? trim($postData['title']) : null;
$descricao  = isset($postData['descricao'])      ? trim($postData['descricao']) : null;
$start_dt   = isset($postData['start_datetime']) ? trim($postData['start_datetime']) : null;
$end_dt     = isset($postData['end_datetime'])   ? trim($postData['end_datetime']) : null;
$turma_id   = (isset($postData['turma_id']) && is_numeric($postData['turma_id']))
                ? intval($postData['turma_id'])
                : null;
$color      = isset($postData['color'])          ? trim($postData['color']) : null;

// Upload opcional de ficheiro
$fileField = null;
if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
    $uploaddir = __DIR__ . '/uploads/events/';
    if (!is_dir($uploaddir)) mkdir($uploaddir, 0755, true);
    $origName = basename($_FILES['file']['name']);
    $safeName = time() . '_' . preg_replace('/[^A-Za-z0-9\.\-_]/', '_', $origName);
    $target   = $uploaddir . $safeName;
    if (move_uploaded_file($_FILES['file']['tmp_name'], $target)) {
        $fileField = 'uploads/events/' . $safeName;
    }
}

// Conexão ao BD
$config = include '../../../config_api.php';
$conn   = new mysqli(
    $config['db_host'],
    $config['db_user'],
    $config['db_pass'],
    $config['db_name']
);
if ($conn->connect_error) {
    echo json_encode([
      "success" => false,
      "message" => "Erro de ligação: " . $conn->connect_error
    ]);
    exit;
}

// procura o professor_id
$emailEsc = $conn->real_escape_string($email);
$q = "
  SELECT p.id AS prof_id
    FROM dadosdoutilizador d
    JOIN professores p ON p.user_id = d.id
   WHERE d.email = '{$emailEsc}'
   LIMIT 1
";
$res = $conn->query($q);
if (!$res || $res->num_rows === 0) {
    echo json_encode(["success" => false, "message" => "Professor não encontrado."]);
    exit;
}
$prof_id = intval($res->fetch_assoc()['prof_id']);

// Monta dinamicamente o SET do UPDATE
$fields = []; $types = ""; $values = [];
if ($titulo    !== null) { $fields[]="titulo = ?";      $types.="s"; $values[]=$titulo;    }
if ($descricao !== null) { $fields[]="descricao = ?";   $types.="s"; $values[]=$descricao; }
if ($start_dt  !== null) { $fields[]="data_comeco = ?"; $types.="s"; $values[]=$start_dt;  }
if ($end_dt    !== null) { $fields[]="data_fim = ?";    $types.="s"; $values[]=$end_dt;    }
if ($turma_id  !== null) { $fields[]="turma_id = ?";    $types.="i"; $values[]=$turma_id;  }
if ($color     !== null) { $fields[]="cores = ?";       $types.="s"; $values[]=$color;     }
if ($fileField !== null) { $fields[]="arquivo = ?";     $types.="s"; $values[]=$fileField; }

// Sem campos a atualizar?
if (empty($fields)) {
    echo json_encode(["success" => false, "message" => "Nenhum campo para atualizar."]);
    exit;
}

// Prepara e executa
$setSql = implode(", ", $fields);
$sql = "
  UPDATE eventos
     SET {$setSql},
         updated_at = NOW()
   WHERE id = ? AND professor_id = ?
";
$types     .= "ii";
$values[]   = $event_id;
$values[]   = $prof_id;

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Erro no prepare: " . $conn->error]);
    exit;
}
$stmt->bind_param($types, ...$values);

if ($stmt->execute()) {
    echo json_encode(["success" => true, "message" => "Evento atualizado com sucesso."]);
} else {
    echo json_encode(["success" => false, "message" => "Erro ao atualizar evento: " . $stmt->error]);
}

$stmt->close();
$conn->close();
?>