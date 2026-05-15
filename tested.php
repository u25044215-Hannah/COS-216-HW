<?php
require_once "config.php";

header("Content-Type: application/json");

$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    echo json_encode([
        "success" => false,
        "message" => "Database connection failed",
        "error" => $conn->connect_error
    ]);
    exit;
}

echo json_encode([
    "success" => true,
    "message" => "Database connected successfully"
]);

$conn->close();
?>
