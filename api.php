<?php
require_once "config.php";

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Server-Key");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit;
}

class API
{
    private $conn;

    public function __construct()
    {
        $this->conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

        if ($this->conn->connect_error) {
            $this->sendResponse(false, "Database connection failed", null, 500);
        }
    }

    public function handleRequest()
    {
        if ($_SERVER["REQUEST_METHOD"] !== "POST") {
            $this->sendResponse(false, "Only POST requests are allowed", null, 405);
        }

        $rawInput = file_get_contents("php://input");
        $input = json_decode($rawInput, true);

        if (!$input || !isset($input["type"])) {
            $this->sendResponse(false, "Invalid JSON or missing type", null, 400);
        }

        $type = $input["type"];

        switch ($type) {
            case "Login":
                $this->login($input);
                break;

            case "GetAllFlights":
                $user = $this->authenticateUser($input);
                $this->getAllFlights($user);
                break;

            case "GetFlight":
                $user = $this->authenticateUser($input);
                $this->getFlight($user, $input);
                break;

            case "DispatchFlight":
                $user = $this->authenticateUser($input);
                $this->dispatchFlight($user, $input);
                break;

            case "UpdateFlightPosition":
                $this->authenticateServer($input);
                $this->updateFlightPosition($input);
                break;

            case "GetAirports":
                $this->getAirports();
                break;

            case "BoardFlight":
                $user = $this->authenticateUser($input);
                $this->boardFlight($user, $input);
                break;

            default:
                $this->sendResponse(false, "Unknown request type", null, 400);
        }
    }

    private function sendResponse($success, $message, $data = null, $statusCode = 200)
    {
        http_response_code($statusCode);

        echo json_encode([
            "success" => $success,
            "timestamp" => date("Y-m-d H:i:s"),
            "message" => $message,
            "data" => $data
        ]);

        exit;
    }

    private function login($input)
    {
        if (!isset($input["username"]) || !isset($input["password"])) {
            $this->sendResponse(false, "Username and password are required", null, 400);
        }

        $username = $input["username"];
        $password = $input["password"];

        $stmt = $this->conn->prepare("
            SELECT id, username, password, email, type
            FROM Users
            WHERE username = ?
            LIMIT 1
        ");

        $stmt->bind_param("s", $username);
        $stmt->execute();

        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            $this->sendResponse(false, "Invalid username or password", null, 401);
        }

        $user = $result->fetch_assoc();

        if (!password_verify($password, $user["password"])) {
            $this->sendResponse(false, "Invalid username or password", null, 401);
        }

        unset($user["password"]);

        $this->sendResponse(true, "Login successful", $user);
    }

    private function authenticateUser($input)
    {
        if (!isset($input["username"]) || !isset($input["password"])) {
            $this->sendResponse(false, "Authentication required", null, 401);
        }

        $username = $input["username"];
        $password = $input["password"];

        $stmt = $this->conn->prepare("
            SELECT id, username, password, email, type
            FROM Users
            WHERE username = ?
            LIMIT 1
        ");

        $stmt->bind_param("s", $username);
        $stmt->execute();

        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            $this->sendResponse(false, "Invalid authentication details", null, 401);
        }

        $user = $result->fetch_assoc();

        if (!password_verify($password, $user["password"])) {
            $this->sendResponse(false, "Invalid authentication details", null, 401);
        }

        unset($user["password"]);
        return $user;
    }

    private function authenticateServer($input)
    {
        if (!isset($input["server_key"])) {
            $this->sendResponse(false, "Missing server key", null, 401);
        }

        if ($input["server_key"] !== SERVER_API_KEY) {
            $this->sendResponse(false, "Invalid server key", null, 403);
        }
    }

    private function getAllFlights($user)
    {
        if ($user["type"] === "ATC") {
            $sql = "
                SELECT 
                    f.id,
                    f.flight_number,
                    f.departure_time,
                    f.flight_duration_hours,
                    f.status,
                    f.current_latitude,
                    f.current_longitude,
                    f.dispatched_at,

                    origin.id AS origin_id,
                    origin.name AS origin_name,
                    origin.iata_code AS origin_iata,
                    origin.city AS origin_city,
                    origin.country AS origin_country,
                    origin.latitude AS origin_latitude,
                    origin.longitude AS origin_longitude,

                    dest.id AS destination_id,
                    dest.name AS destination_name,
                    dest.iata_code AS destination_iata,
                    dest.city AS destination_city,
                    dest.country AS destination_country,
                    dest.latitude AS destination_latitude,
                    dest.longitude AS destination_longitude

                FROM Flights f
                JOIN Airports origin ON f.origin_airport_id = origin.id
                JOIN Airports dest ON f.destination_airport_id = dest.id
                ORDER BY f.departure_time ASC
            ";

            $result = $this->conn->query($sql);
            $flights = [];

            while ($row = $result->fetch_assoc()) {
                $flights[] = $row;
            }

            $this->sendResponse(true, "All flights returned", $flights);
        }

        if ($user["type"] === "Passenger") {
            $stmt = $this->conn->prepare("
                SELECT 
                    f.id,
                    f.flight_number,
                    f.departure_time,
                    f.flight_duration_hours,
                    f.status,
                    f.current_latitude,
                    f.current_longitude,
                    f.dispatched_at,
                    pf.seat_number,
                    pf.boarding_confirmed,
                    pf.confirmed_at,

                    origin.id AS origin_id,
                    origin.name AS origin_name,
                    origin.iata_code AS origin_iata,
                    origin.city AS origin_city,
                    origin.country AS origin_country,
                    origin.latitude AS origin_latitude,
                    origin.longitude AS origin_longitude,

                    dest.id AS destination_id,
                    dest.name AS destination_name,
                    dest.iata_code AS destination_iata,
                    dest.city AS destination_city,
                    dest.country AS destination_country,
                    dest.latitude AS destination_latitude,
                    dest.longitude AS destination_longitude

                FROM Passenger_Flights pf
                JOIN Flights f ON pf.flight_id = f.id
                JOIN Airports origin ON f.origin_airport_id = origin.id
                JOIN Airports dest ON f.destination_airport_id = dest.id
                WHERE pf.passenger_id = ?
                ORDER BY f.departure_time ASC
            ");

            $stmt->bind_param("i", $user["id"]);
            $stmt->execute();

            $result = $stmt->get_result();
            $flights = [];

            while ($row = $result->fetch_assoc()) {
                $flights[] = $row;
            }

            $this->sendResponse(true, "Passenger flights returned", $flights);
        }

        $this->sendResponse(false, "Invalid user type", null, 403);
    }

    private function getFlight($user, $input)
    {
        if (!isset($input["flight_id"])) {
            $this->sendResponse(false, "flight_id is required", null, 400);
        }

        $flightId = intval($input["flight_id"]);

        if ($user["type"] === "Passenger") {
            $check = $this->conn->prepare("
                SELECT id
                FROM Passenger_Flights
                WHERE passenger_id = ? AND flight_id = ?
            ");

            $check->bind_param("ii", $user["id"], $flightId);
            $check->execute();

            $checkResult = $check->get_result();

            if ($checkResult->num_rows === 0) {
                $this->sendResponse(false, "You are not booked on this flight", null, 403);
            }
        }

        $stmt = $this->conn->prepare("
            SELECT 
                f.id,
                f.flight_number,
                f.departure_time,
                f.flight_duration_hours,
                f.status,
                f.current_latitude,
                f.current_longitude,
                f.dispatched_at,

                origin.id AS origin_id,
                origin.name AS origin_name,
                origin.iata_code AS origin_iata,
                origin.city AS origin_city,
                origin.country AS origin_country,
                origin.latitude AS origin_latitude,
                origin.longitude AS origin_longitude,

                dest.id AS destination_id,
                dest.name AS destination_name,
                dest.iata_code AS destination_iata,
                dest.city AS destination_city,
                dest.country AS destination_country,
                dest.latitude AS destination_latitude,
                dest.longitude AS destination_longitude

            FROM Flights f
            JOIN Airports origin ON f.origin_airport_id = origin.id
            JOIN Airports dest ON f.destination_airport_id = dest.id
            WHERE f.id = ?
        ");

        $stmt->bind_param("i", $flightId);
        $stmt->execute();

        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            $this->sendResponse(false, "Flight not found", null, 404);
        }

        $flight = $result->fetch_assoc();

        if ($user["type"] === "ATC") {
            $passengerStmt = $this->conn->prepare("
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    pf.seat_number,
                    pf.boarding_confirmed,
                    pf.confirmed_at
                FROM Passenger_Flights pf
                JOIN Users u ON pf.passenger_id = u.id
                WHERE pf.flight_id = ?
                ORDER BY u.username ASC
            ");

            $passengerStmt->bind_param("i", $flightId);
            $passengerStmt->execute();

            $passengerResult = $passengerStmt->get_result();
            $passengers = [];

            while ($row = $passengerResult->fetch_assoc()) {
                $passengers[] = $row;
            }

            $flight["passengers"] = $passengers;
        }

        $this->sendResponse(true, "Flight returned", $flight);
    }

    private function dispatchFlight($user, $input)
    {
        if ($user["type"] !== "ATC") {
            $this->sendResponse(false, "Only ATC users may dispatch flights", null, 403);
        }

        if (!isset($input["flight_id"])) {
            $this->sendResponse(false, "flight_id is required", null, 400);
        }

        $flightId = intval($input["flight_id"]);

        $stmt = $this->conn->prepare("
            SELECT id, status
            FROM Flights
            WHERE id = ?
        ");

        $stmt->bind_param("i", $flightId);
        $stmt->execute();

        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            $this->sendResponse(false, "Flight not found", null, 404);
        }

        $flight = $result->fetch_assoc();

        if ($flight["status"] !== "Scheduled") {
            $this->sendResponse(false, "Flight is not in Scheduled state", null, 400);
        }

        $update = $this->conn->prepare("
            UPDATE Flights
            SET status = 'Boarding',
                dispatched_at = NOW()
            WHERE id = ?
        ");

        $update->bind_param("i", $flightId);

        if (!$update->execute()) {
            $this->sendResponse(false, "Could not dispatch flight", null, 500);
        }

        $this->sendResponse(true, "Flight dispatched and moved to Boarding", [
            "flight_id" => $flightId,
            "status" => "Boarding"
        ]);
    }

    private function updateFlightPosition($input)
    {
        if (!isset($input["flight_id"]) || !isset($input["latitude"]) || !isset($input["longitude"]) || !isset($input["status"])) {
            $this->sendResponse(false, "flight_id, latitude, longitude and status are required", null, 400);
        }

        $flightId = intval($input["flight_id"]);
        $latitude = floatval($input["latitude"]);
        $longitude = floatval($input["longitude"]);
        $status = $input["status"];

        $allowedStatuses = ["Scheduled", "Boarding", "In Flight", "Landed"];

        if (!in_array($status, $allowedStatuses)) {
            $this->sendResponse(false, "Invalid flight status", null, 400);
        }

        $stmt = $this->conn->prepare("
            UPDATE Flights
            SET current_latitude = ?,
                current_longitude = ?,
                status = ?
            WHERE id = ?
        ");

        $stmt->bind_param("ddsi", $latitude, $longitude, $status, $flightId);

        if (!$stmt->execute()) {
            $this->sendResponse(false, "Could not update flight position", null, 500);
        }

        if ($stmt->affected_rows === 0) {
            $this->sendResponse(false, "Flight not found or no change made", null, 404);
        }

        $this->sendResponse(true, "Flight position updated", [
            "flight_id" => $flightId,
            "latitude" => $latitude,
            "longitude" => $longitude,
            "status" => $status
        ]);
    }

    private function getAirports()
    {
        $sql = "
            SELECT id, name, iata_code, city, country, latitude, longitude
            FROM Airports
            ORDER BY name ASC
        ";

        $result = $this->conn->query($sql);
        $airports = [];

        while ($row = $result->fetch_assoc()) {
            $airports[] = $row;
        }

        $this->sendResponse(true, "Airports returned", $airports);
    }

    private function boardFlight($user, $input)
    {
        if ($user["type"] !== "Passenger") {
            $this->sendResponse(false, "Only passengers may board flights", null, 403);
        }

        if (!isset($input["flight_id"])) {
            $this->sendResponse(false, "flight_id is required", null, 400);
        }

        $flightId = intval($input["flight_id"]);

        $stmt = $this->conn->prepare("
            SELECT 
                f.id,
                f.status,
                f.dispatched_at,
                pf.id AS passenger_flight_id,
                pf.boarding_confirmed
            FROM Flights f
            JOIN Passenger_Flights pf ON f.id = pf.flight_id
            WHERE f.id = ? AND pf.passenger_id = ?
        ");

        $stmt->bind_param("ii", $flightId, $user["id"]);
        $stmt->execute();

        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            $this->sendResponse(false, "You are not booked on this flight", null, 403);
        }

        $row = $result->fetch_assoc();

        if ($row["status"] !== "Boarding") {
            $this->sendResponse(false, "Flight is not currently boarding", null, 400);
        }

        if ($row["boarding_confirmed"] == 1) {
            $this->sendResponse(false, "Boarding already confirmed", null, 400);
        }

        if ($row["dispatched_at"] === null) {
            $this->sendResponse(false, "Flight has not been dispatched yet", null, 400);
        }

        $dispatchedAt = strtotime($row["dispatched_at"]);
        $now = time();
        $secondsSinceDispatch = $now - $dispatchedAt;

        if ($secondsSinceDispatch > 60) {
            $this->sendResponse(false, "Boarding confirmation window has expired", null, 400);
        }

        $update = $this->conn->prepare("
            UPDATE Passenger_Flights
            SET boarding_confirmed = 1,
                confirmed_at = NOW()
            WHERE id = ?
        ");

        $update->bind_param("i", $row["passenger_flight_id"]);

        if (!$update->execute()) {
            $this->sendResponse(false, "Could not confirm boarding", null, 500);
        }

        $this->sendResponse(true, "Boarding confirmed", [
            "flight_id" => $flightId,
            "passenger_id" => $user["id"],
            "seconds_since_dispatch" => $secondsSinceDispatch
        ]);
    }
}

$api = new API();
$api->handleRequest();
?>
