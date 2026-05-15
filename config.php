<?php
// config.php

function loadEnv($path)
{
    if (!file_exists($path)) {
        die(json_encode([
            "success" => false,
            "message" => ".env file not found"
        ]));
    }

    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    foreach ($lines as $line) {
        $line = trim($line);

        // Ignore comments
        if ($line === "" || strpos($line, "#") === 0) {
            continue;
        }

        // Ignore invalid lines
        if (strpos($line, "=") === false) {
            continue;
        }

        list($name, $value) = explode("=", $line, 2);

        $name = trim($name);
        $value = trim($value);

        // Remove quotes if you used them
        $value = trim($value, "\"'");

        $_ENV[$name] = $value;
        putenv("$name=$value");
    }
}

// Load the .env file from the same folder as config.php
loadEnv(__DIR__ . "/.env");

// Database settings
define("DB_HOST", getenv("DB_HOST"));
define("DB_USER", getenv("DB_USER"));
define("DB_PASS", getenv("DB_PASS"));
define("DB_NAME", getenv("DB_NAME"));

// Server-to-server key for NodeJS UpdateFlightPosition endpoint
define("SERVER_API_KEY", getenv("SERVER_API_KEY"));
?>
