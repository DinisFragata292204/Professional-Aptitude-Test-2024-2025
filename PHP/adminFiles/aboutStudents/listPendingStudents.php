<?php
// adminFiles/aboutStudents/listPendingStudents.php
session_start();
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require '../../config_api.php';
$config = include '../../config_api.php';

$conn = new mysqli($config['db_host'], $config['db_user'], $config['db_pass'], $config['db_name']);
if ($conn->connect_error) {
    die(json_encode(["success" => false, "message" => "Erro na conexão com a base de dados."]));
}

$query = "SELECT du.id AS user_id, du.email, du.estado, t.ano, t.turma, a.turma_id 
          FROM dadosdoutilizador du
          INNER JOIN alunos a ON du.id = a.user_id
          INNER JOIN turmas t ON a.turma_id = t.id
          WHERE du.estado = 'pendente'";

$result = $conn->query($query);

$students = [];
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $students[] = $row;
    }
    echo json_encode(["success" => true, "students" => $students]);
} else {
    echo json_encode(["success" => false, "message" => "Erro ao Procurar os dados."]);
}

$conn->close();
?>