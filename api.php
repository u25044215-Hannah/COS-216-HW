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
