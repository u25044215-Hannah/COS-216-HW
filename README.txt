# COS216 Homework Assignment - Task 1: PHP API and Database

## Project Overview

This project implements **Task 1** of the COS216 Homework Assignment. The task requires a PHP API hosted on Wheatley and connected to a MySQL database. The API is used by the later NodeJS WebSocket server and Angular frontend to manage and track flights in real time.

The system supports two types of users:

1. **Passenger**
   - Can view only the flights they are booked on.
   - Can view details of their own flights.
   - Can confirm boarding after an ATC dispatches their flight.
   - Can only board within the 60-second boarding window.

2. **ATC**
   - Can view all flights.
   - Can view passenger lists for flights.
   - Can dispatch scheduled flights.
   - Can monitor flight positions and statuses.

The assignment specification requires the PHP API to support the following endpoints:

- `Login`
- `GetAllFlights`
- `GetFlight`
- `DispatchFlight`
- `UpdateFlightPosition`
- `GetAirports`
- `BoardFlight`

The specification also requires four main database tables:

- `Users`
- `Airports`
- `Flights`
- `Passenger_Flights`

---

# File Structure

The Task 1 folder contains the following files:

```text
COS216PussInReboots/
│
├── api.php
├── config.php
├── configTest.php
├── test_db.php
├── create_database.sql
├── .env
├── .env.example
├── .gitignore
└── README.md
