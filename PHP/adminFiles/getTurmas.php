<?php
// corrige o nome do header (egerias unicode hyphens)
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

// ajusta o caminho para a config
$config = include '../config_api.php'; 
$conn = new mysqli(
    $config['db_host'],
    $config['db_user'],
    $config['db_pass'],
    $config['db_name']
);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
      "success" => false,
      "message" => "Erro na conexão com a base de dados"
    ]);
    exit;
}

// filtra por status = 'ativo' (e não = 1)
$sql = "
    SELECT id, ano, turma
    FROM turmas
    WHERE status = 'ativo'
    ORDER BY ano, turma
";
$result = $conn->query($sql);

$turmas = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $turmas[] = $row;
    }
}

echo json_encode([
  "success" => true,
  "turmas"  => $turmas
]);

$conn->close();