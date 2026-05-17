<?php
//Hannah Diedrick
//u25044215
require_once "config.php";

header("Content-Type: application/json");

echo json_encode([
    "DB_HOST" => DB_HOST,
    "DB_USER" => DB_USER,
    "DB_NAME" => DB_NAME,
    "SERVER_API_KEY_LOADED" => SERVER_API_KEY ? true : false
]);
?>
