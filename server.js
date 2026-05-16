//  Shelby Bodenstein
// u25038967
// COS216 Task 2 - Multi-User NodeJS WebSocket Server
require("dotenv").config();

const WebSocket = require("ws");
const readline = require("readline");

// ENVIRONMENT CONFIG

const API_URL = process.env.API_URL;
const SERVER_API_KEY = process.env.SERVER_API_KEY;
const WHEATLEY_USERNAME = process.env.WHEATLEY_USERNAME;
const WHEATLEY_PASSWORD = process.env.WHEATLEY_PASSWORD;

if (!API_URL) {
    console.error("ERROR: API_URL is missing in .env");
    process.exit(1);
}

if (!SERVER_API_KEY) {
    console.error("ERROR: SERVER_API_KEY is missing in .env");
    process.exit(1);
}

if (!WHEATLEY_USERNAME) {
    console.error("ERROR: WHEATLEY_USERNAME is missing in .env");
    process.exit(1);
}

if (!WHEATLEY_PASSWORD) {
    console.error("ERROR: WHEATLEY_PASSWORD is missing in .env");
    process.exit(1);
}  
// PORT SETUP

const argPort = process.argv[2];

if (!argPort) {
    console.error("Usage: node server.js <port>");
    console.error("Example: node server.js 3000");
    process.exit(1);
}

const PORT = Number(argPort);

if (!Number.isInteger(PORT) || PORT < 1024 || PORT > 49151) {
    console.error("ERROR: Port must be between 1024 and 49151.");
    process.exit(1);
}

// GLOBAL SERVER STATE

const wss = new WebSocket.Server({ port: PORT });

// username -> ws
const users = new Map();

// flightId -> Set of websocket clients tracking that flight
const flightSubscribers = new Map();

// flightId -> flight animation state
const activeFlights = new Map();

// flightId -> Set of passenger usernames who are booked/passengers to notify
const boardingWindows = new Map();

console.log("===============================================");
console.log("COS216 Task 2 WebSocket Server started");
console.log("Listening on ws://localhost:" + PORT);
console.log("===============================================");

// HELPER FUNCTIONS

function safeSend(ws, obj) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(obj));
    }
}

function broadcast(obj) {
    const message = JSON.stringify(obj);

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function sendToUsername(username, obj) {
    const ws = users.get(username);

    if (!ws) {
        return false;
    }

    safeSend(ws, obj);
    return true;
}

function addSubscriber(flightId, ws) {
    const key = String(flightId);

    if (!flightSubscribers.has(key)) {
        flightSubscribers.set(key, new Set());
    }

    flightSubscribers.get(key).add(ws);
}

function removeSocketFromSubscribers(ws) {
    for (const [flightId, subscribers] of flightSubscribers.entries()) {
        subscribers.delete(ws);

        if (subscribers.size === 0) {
            flightSubscribers.delete(flightId);
        }
    }
}

function broadcastToFlightSubscribers(flightId, obj) {
    const key = String(flightId);
    const subscribers = flightSubscribers.get(key);

    if (!subscribers) {
        return;
    }

    subscribers.forEach((ws) => {
        safeSend(ws, obj);
    });
}

async function callApi(payload) {
    console.log("AUTH:", WHEATLEY_USERNAME, "|", WHEATLEY_PASSWORD);
    const auth = Buffer
        .from(WHEATLEY_USERNAME + ":" + WHEATLEY_PASSWORD)
        .toString("base64");

    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Basic " + auth
        },
        body: JSON.stringify(payload)
    });

    const text = await response.text();

    let data;

    try {
        data = JSON.parse(text);
    } catch (err) {
        throw new Error(
            "API did not return valid JSON. HTTP status: " +
            response.status +
            ". Raw response: " +
            text.substring(0, 200)
        );
    }

    if (!data.success) {
        throw new Error(data.message || "API request failed");
    }

    return data.data;
}

function getAuthPayload(ws) {
    return {
        username: ws.user.username,
        password: ws.user.password
    };
}

function calculateInterpolatedPosition(originLat, originLong, destLat, destLong, progress) {
    const latitude = originLat + (destLat - originLat) * progress;
    const longitude = originLong + (destLong - originLong) * progress;

    return {
        latitude: latitude,
        longitude: longitude
    };
}

function getFlightDurationSeconds(flight) {
    const hours = Number(flight.flight_duration_hours);

    if (!hours || hours <= 0) {
        // Fallback for testing.
        return 60;
    }

    /*
        The spec says interpolate over N seconds where N is the flight
        duration in hours. So if flight_duration_hours = 2, animation is 2 seconds.
        This is strange in real life, but matches the assignment wording.
    */
    return Math.max(1, Math.round(hours));
}

function countBoardedPassengers(flight) {
    if (!flight.passengers || !Array.isArray(flight.passengers)) {
        return {
            confirmed: 0,
            total: 0
        };
    }

    let confirmed = 0;

    flight.passengers.forEach((p) => {
        if (Number(p.boarding_confirmed) === 1) {
            confirmed++;
        }
    });

    return {
        confirmed: confirmed,
        total: flight.passengers.length
    };
}

// FLIGHT ANIMATION

async function startFlightAnimation(flightId, atcWs) {
    const flightKey = String(flightId);

    if (activeFlights.has(flightKey)) {
        safeSend(atcWs, {
            type: "ERROR",
            message: "Flight animation is already running",
            flight_id: flightId
        });
        return;
    }

    try {
        const flight = await callApi({
            type: "GetFlight",
            ...getAuthPayload(atcWs),
            flight_id: flightId
        });

        const originLat = Number(flight.origin_latitude);
        const originLong = Number(flight.origin_longitude);
        const destLat = Number(flight.destination_latitude);
        const destLong = Number(flight.destination_longitude);

        const durationSeconds = getFlightDurationSeconds(flight);
        const totalTicks = durationSeconds;
        let currentTick = 0;

        const state = {
            flight_id: flightId,
            flight_number: flight.flight_number,
            status: "In Flight",
            originLat: originLat,
            originLong: originLong,
            destLat: destLat,
            destLong: destLong,
            latitude: originLat,
            longitude: originLong,
            durationSeconds: durationSeconds,
            currentTick: currentTick,
            estimatedSecondsRemaining: durationSeconds,
            interval: null
        };

        activeFlights.set(flightKey, state);

        // Move status from Boarding to In Flight in DB.
        await callApi({
            type: "UpdateFlightPosition",
            server_key: SERVER_API_KEY,
            flight_id: flightId,
            latitude: originLat,
            longitude: originLong,
            status: "In Flight"
        });

        state.interval = setInterval(async () => {
            try {
                currentTick++;
                state.currentTick = currentTick;

                const progress = Math.min(currentTick / totalTicks, 1);
                const position = calculateInterpolatedPosition(
                    originLat,
                    originLong,
                    destLat,
                    destLong,
                    progress
                );

                state.latitude = position.latitude;
                state.longitude = position.longitude;
                state.estimatedSecondsRemaining = Math.max(totalTicks - currentTick, 0);

                broadcastToFlightSubscribers(flightId, {
                    type: "POSITION",
                    flight_id: flightId,
                    flight_number: flight.flight_number,
                    latitude: position.latitude,
                    longitude: position.longitude,
                    progress: progress,
                    status: progress >= 1 ? "Landed" : "In Flight",
                    estimated_seconds_remaining: state.estimatedSecondsRemaining
                });

                /*
                    I update the database on every tick here because the task
                    wants the latest aircraft position to be continuously available.
                    If your marker wants fewer DB writes, change this to every 5 ticks.
                */
                await callApi({
                    type: "UpdateFlightPosition",
                    server_key: SERVER_API_KEY,
                    flight_id: flightId,
                    latitude: position.latitude,
                    longitude: position.longitude,
                    status: progress >= 1 ? "Landed" : "In Flight"
                });

                if (progress >= 1) {
                    clearInterval(state.interval);
                    activeFlights.delete(flightKey);

                    broadcastToFlightSubscribers(flightId, {
                        type: "LANDED",
                        flight_id: flightId,
                        flight_number: flight.flight_number,
                        message: "Flight has landed."
                    });
                }
            } catch (err) {
                console.error("Animation error for flight " + flightId + ":", err.message);
            }
        }, 1000);
    } catch (err) {
        safeSend(atcWs, {
            type: "ERROR",
            message: err.message,
            flight_id: flightId
        });
    }
}

// WEBSOCKET MESSAGE HANDLERS

async function handleLogin(ws, msg) {
    if (!msg.username || !msg.password) {
        safeSend(ws, {
            type: "ERROR",
            message: "LOGIN requires username and password"
        });
        return;
    }

    try {
        const user = await callApi({
            type: "Login",
            username: msg.username,
            password: msg.password
        });

        ws.user = {
            id: user.id,
            username: user.username,
            password: msg.password,
            email: user.email,
            type: user.type
        };

        users.set(user.username, ws);

        safeSend(ws, {
            type: "LOGIN_SUCCESS",
            message: "Connected and authenticated",
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                type: user.type
            }
        });

        console.log(user.username + " connected as " + user.type);
    } catch (err) {
        safeSend(ws, {
            type: "ERROR",
            message: "Login failed: " + err.message
        });
    }
}

async function handleDispatch(ws, msg) {
    if (!ws.user) {
        safeSend(ws, {
            type: "ERROR",
            message: "You must LOGIN before DISPATCH"
        });
        return;
    }

    if (ws.user.type !== "ATC") {
        safeSend(ws, {
            type: "ERROR",
            message: "Only ATC users may dispatch flights"
        });
        return;
    }

    if (!msg.flight_id) {
        safeSend(ws, {
            type: "ERROR",
            message: "DISPATCH requires flight_id"
        });
        return;
    }

    try {
        await callApi({
            type: "DispatchFlight",
            ...getAuthPayload(ws),
            flight_id: msg.flight_id
        });

        const flight = await callApi({
            type: "GetFlight",
            ...getAuthPayload(ws),
            flight_id: msg.flight_id
        });

        safeSend(ws, {
            type: "DISPATCH_SUCCESS",
            message: "Flight dispatched",
            flight_id: msg.flight_id,
            flight_number: flight.flight_number
        });

        // Notify passengers booked on the flight.
        if (flight.passengers && Array.isArray(flight.passengers)) {
            flight.passengers.forEach((passenger) => {
                sendToUsername(passenger.username, {
                    type: "BOARDING_CALL",
                    message: "Boarding call for flight " + flight.flight_number,
                    flight_id: msg.flight_id,
                    flight_number: flight.flight_number
                });
            });
        }

        boardingWindows.set(String(msg.flight_id), {
            openedAt: Date.now(),
            atcUsername: ws.user.username
        });

        // Boarding window is 60 seconds.
        setTimeout(() => {
            boardingWindows.delete(String(msg.flight_id));
        }, 60000);

        console.log("Flight " + flight.flight_number + " dispatched. Boarding window started.");

        // Start animation loop.
        startFlightAnimation(msg.flight_id, ws);
    } catch (err) {
        safeSend(ws, {
            type: "ERROR",
            message: err.message
        });
    }
}

async function handleBoard(ws, msg) {
    if (!ws.user) {
        safeSend(ws, {
            type: "ERROR",
            message: "You must LOGIN before BOARD"
        });
        return;
    }

    if (ws.user.type !== "Passenger") {
        safeSend(ws, {
            type: "ERROR",
            message: "Only Passenger users may BOARD"
        });
        return;
    }

    if (!msg.flight_id) {
        safeSend(ws, {
            type: "ERROR",
            message: "BOARD requires flight_id"
        });
        return;
    }

    const windowInfo = boardingWindows.get(String(msg.flight_id));

    if (!windowInfo) {
        safeSend(ws, {
            type: "ERROR",
            message: "Boarding window has expired",
            flight_id: msg.flight_id
        });

        // Notify ATC if still connected.
        if (windowInfo && windowInfo.atcUsername) {
            sendToUsername(windowInfo.atcUsername, {
                type: "NO_SHOW",
                message: ws.user.username + " missed the boarding window",
                passenger_username: ws.user.username,
                flight_id: msg.flight_id
            });
        }

        return;
    }

    try {
        await callApi({
            type: "BoardFlight",
            ...getAuthPayload(ws),
            flight_id: msg.flight_id
        });

        safeSend(ws, {
            type: "BOARD_SUCCESS",
            message: "Boarding confirmed",
            flight_id: msg.flight_id
        });

        sendToUsername(windowInfo.atcUsername, {
            type: "BOARDING_CONFIRMED",
            message: ws.user.username + " confirmed boarding",
            passenger_username: ws.user.username,
            flight_id: msg.flight_id
        });
    } catch (err) {
        safeSend(ws, {
            type: "ERROR",
            message: err.message,
            flight_id: msg.flight_id
        });

        sendToUsername(windowInfo.atcUsername, {
            type: "NO_SHOW_OR_BOARDING_ERROR",
            message: ws.user.username + " could not board: " + err.message,
            passenger_username: ws.user.username,
            flight_id: msg.flight_id
        });
    }
}

async function handleTrack(ws, msg) {
    if (!ws.user) {
        safeSend(ws, {
            type: "ERROR",
            message: "You must LOGIN before TRACK"
        });
        return;
    }

    if (!msg.flight_id) {
        safeSend(ws, {
            type: "ERROR",
            message: "TRACK requires flight_id"
        });
        return;
    }

    try {
        /*
            Your PHP API already blocks passengers from retrieving flights
            they are not booked on. That means this call enforces the Passenger
            restriction required by the spec.
        */
        const flight = await callApi({
            type: "GetFlight",
            ...getAuthPayload(ws),
            flight_id: msg.flight_id
        });

        addSubscriber(msg.flight_id, ws);

        safeSend(ws, {
            type: "TRACK_SUCCESS",
            message: "You are now tracking flight " + flight.flight_number,
            flight_id: msg.flight_id,
            flight_number: flight.flight_number,
            latitude: flight.current_latitude,
            longitude: flight.current_longitude,
            status: flight.status
        });
    } catch (err) {
        safeSend(ws, {
            type: "ERROR",
            message: err.message,
            flight_id: msg.flight_id
        });
    }
}

async function handleMessage(ws, rawMessage) {
    let msg;

    try {
        msg = JSON.parse(rawMessage);
    } catch (err) {
        safeSend(ws, {
            type: "ERROR",
            message: "Invalid JSON message"
        });
        return;
    }

    if (!msg.type) {
        safeSend(ws, {
            type: "ERROR",
            message: "Message must contain type"
        });
        return;
    }

    switch (msg.type) {
        case "LOGIN":
            await handleLogin(ws, msg);
            break;

        case "DISPATCH":
            await handleDispatch(ws, msg);
            break;

        case "BOARD":
            await handleBoard(ws, msg);
            break;

        case "TRACK":
            await handleTrack(ws, msg);
            break;

        default:
            safeSend(ws, {
                type: "ERROR",
                message: "Unknown WebSocket message type: " + msg.type
            });
    }
}

// CONNECTION HANDLING

wss.on("connection", (ws) => {
    console.log("New client connected");

    safeSend(ws, {
        type: "CONNECTED",
        message: "Connected to COS216 Task 2 WebSocket server. Please send LOGIN."
    });

    ws.on("message", async (message) => {
        await handleMessage(ws, message.toString());
    });

    ws.on("close", () => {
        if (ws.user) {
            console.log(ws.user.username + " disconnected");

            users.delete(ws.user.username);

            if (ws.user.type === "ATC") {
                broadcast({
                    type: "ATC_DISCONNECTED",
                    message: "ATC connection was lost briefly, but active flights are unaffected.",
                    username: ws.user.username
                });
            }
        } else {
            console.log("Unauthenticated client disconnected");
        }

        removeSocketFromSubscribers(ws);
    });

    ws.on("error", (err) => {
        console.error("Socket error:", err.message);
    });
});

// SERVER CLI COMMANDS

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("");
console.log("Available CLI commands:");
console.log("FLIGHT STATUS <flight id>");
console.log("KILL <username>");
console.log("QUIT");
console.log("");

async function handleFlightStatusCommand(parts) {
    const flightId = parts[2];

    if (!flightId) {
        console.log("Usage: FLIGHT STATUS <flight id>");
        return;
    }

    const active = activeFlights.get(String(flightId));

    if (active) {
        console.log("===============================================");
        console.log("Flight number: " + active.flight_number);
        console.log("Current status: " + active.status);
        console.log("Current GPS: " + active.latitude + ", " + active.longitude);
        console.log("Estimated time remaining: " + active.estimatedSecondsRemaining + " seconds");
        console.log("===============================================");
        return;
    }

    /*
        For CLI, we do not know which user credentials to use for GetFlight.
        So the live in-memory flight state is the reliable option for active flights.
    */
    console.log("No active in-memory flight found for flight id " + flightId);
    console.log("Tip: use this command after dispatching a flight.");
}

function handleKillCommand(parts) {
    const username = parts[1];

    if (!username) {
        console.log("Usage: KILL <username>");
        return;
    }

    const ws = users.get(username);

    if (!ws) {
        console.log("No connected user found with username: " + username);
        return;
    }

    safeSend(ws, {
        type: "KILLED",
        message: "Your connection was closed by the server administrator."
    });

    ws.close();
    users.delete(username);

    console.log("Killed connection for user: " + username);
}

function handleQuitCommand() {
    console.log("Shutting down server...");

    broadcast({
        type: "SERVER_SHUTDOWN",
        message: "Server is shutting down. All connections will be closed."
    });

    for (const [, state] of activeFlights.entries()) {
        if (state.interval) {
            clearInterval(state.interval);
        }
    }

    activeFlights.clear();

    wss.clients.forEach((client) => {
        client.close();
    });

    wss.close(() => {
        console.log("Server closed.");
        process.exit(0);
    });

    setTimeout(() => {
        process.exit(0);
    }, 1000);
}

rl.on("line", async (input) => {
    const command = input.trim();

    if (command === "") {
        return;
    }

    const parts = command.split(/\s+/);
    const upper = parts.map((p) => p.toUpperCase());

    if (upper[0] === "FLIGHT" && upper[1] === "STATUS") {
        await handleFlightStatusCommand(parts);
    } else if (upper[0] === "KILL") {
        handleKillCommand(parts);
    } else if (upper[0] === "QUIT") {
        handleQuitCommand();
    } else {
        console.log("Unknown command.");
        console.log("Valid commands:");
        console.log("FLIGHT STATUS <flight id>");
        console.log("KILL <username>");
        console.log("QUIT");
    }
});