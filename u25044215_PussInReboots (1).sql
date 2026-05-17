-- phpMyAdmin SQL Dump
-- version 5.0.4deb2~bpo10+1
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: May 17, 2026 at 11:40 PM
-- Server version: 10.3.39-MariaDB-0+deb10u2
-- PHP Version: 7.3.31-1~deb10u7

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u25044215_PussInReboots`
--

-- --------------------------------------------------------

--
-- Table structure for table `Airports`
--

CREATE TABLE `Airports` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `iata_code` char(3) NOT NULL,
  `city` varchar(100) NOT NULL,
  `country` varchar(100) NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Airports`
--

INSERT INTO `Airports` (`id`, `name`, `iata_code`, `city`, `country`, `latitude`, `longitude`) VALUES
(1, 'OR Tambo International Airport', 'JNB', 'Johannesburg', 'South Africa', '-26.1337000', '28.2420000'),
(2, 'Cape Town International Airport', 'CPT', 'Cape Town', 'South Africa', '-33.9694000', '18.5972000'),
(3, 'King Shaka International Airport', 'DUR', 'Durban', 'South Africa', '-29.6144000', '31.1197000'),
(4, 'Bram Fischer International Airport', 'BFN', 'Bloemfontein', 'South Africa', '-29.0927000', '26.3024000'),
(5, 'Port Elizabeth International Airport', 'PLZ', 'Gqeberha', 'South Africa', '-33.9849000', '25.6173000'),
(6, 'George Airport', 'GRJ', 'George', 'South Africa', '-34.0056000', '22.3789000'),
(7, 'Kruger Mpumalanga International Airport', 'MQP', 'Nelspruit', 'South Africa', '-25.3832000', '31.1056000'),
(8, 'Lanseria International Airport', 'HLA', 'Johannesburg', 'South Africa', '-25.9385000', '27.9261000'),
(9, 'Heathrow Airport', 'LHR', 'London', 'United Kingdom', '51.4700000', '-0.4543000'),
(10, 'Dubai International Airport', 'DXB', 'Dubai', 'United Arab Emirates', '25.2532000', '55.3657000');

-- --------------------------------------------------------

--
-- Table structure for table `Flights`
--

CREATE TABLE `Flights` (
  `id` int(11) NOT NULL,
  `flight_number` varchar(20) NOT NULL,
  `origin_airport_id` int(11) NOT NULL,
  `destination_airport_id` int(11) NOT NULL,
  `departure_time` datetime NOT NULL,
  `flight_duration_hours` decimal(5,2) NOT NULL,
  `status` enum('Scheduled','Boarding','In Flight','Landed') NOT NULL DEFAULT 'Scheduled',
  `current_latitude` decimal(10,7) DEFAULT NULL,
  `current_longitude` decimal(10,7) DEFAULT NULL,
  `dispatched_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Flights`
--

INSERT INTO `Flights` (`id`, `flight_number`, `origin_airport_id`, `destination_airport_id`, `departure_time`, `flight_duration_hours`, `status`, `current_latitude`, `current_longitude`, `dispatched_at`) VALUES
(1, 'SA101', 1, 2, '2026-03-01 08:00:00', '2.00', 'Landed', '-33.9694000', '18.5972000', '2026-05-17 00:15:01'),
(2, 'SA102', 2, 1, '2026-03-01 11:00:00', '2.00', 'Landed', '-26.1337000', '28.2420000', '2026-05-17 00:21:20'),
(3, 'SA201', 1, 3, '2026-03-01 09:30:00', '1.25', 'Landed', '-29.6144000', '31.1197000', '2026-05-17 23:10:15'),
(4, 'SA202', 3, 1, '2026-03-01 13:30:00', '1.25', 'Scheduled', '-29.6144000', '31.1197000', NULL),
(5, 'SA301', 1, 9, '2026-03-02 19:00:00', '11.00', 'Scheduled', '-26.1337000', '28.2420000', NULL),
(6, 'SA302', 9, 1, '2026-03-03 21:00:00', '11.00', 'Scheduled', '51.4700000', '-0.4543000', NULL),
(7, 'SA401', 1, 10, '2026-03-04 16:00:00', '8.00', 'Scheduled', '-26.1337000', '28.2420000', NULL),
(8, 'SA402', 10, 1, '2026-03-05 02:00:00', '8.00', 'Landed', '-26.1337000', '28.2420000', '2026-05-17 23:11:33'),
(9, 'SA501', 2, 5, '2026-03-02 07:45:00', '1.50', 'Scheduled', '-33.9694000', '18.5972000', NULL),
(10, 'SA601', 8, 7, '2026-03-02 12:15:00', '1.00', 'Scheduled', '-25.9385000', '27.9261000', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `Passenger_Flights`
--

CREATE TABLE `Passenger_Flights` (
  `id` int(11) NOT NULL,
  `passenger_id` int(11) NOT NULL,
  `flight_id` int(11) NOT NULL,
  `seat_number` varchar(10) DEFAULT NULL,
  `boarding_confirmed` tinyint(1) NOT NULL DEFAULT 0,
  `confirmed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Passenger_Flights`
--

INSERT INTO `Passenger_Flights` (`id`, `passenger_id`, `flight_id`, `seat_number`, `boarding_confirmed`, `confirmed_at`) VALUES
(1, 2, 1, '12A', 0, NULL),
(2, 2, 3, '14C', 0, NULL),
(3, 2, 5, '21B', 0, NULL),
(4, 3, 1, '12B', 0, NULL),
(5, 3, 2, '10A', 0, NULL),
(6, 3, 7, '19D', 0, NULL),
(7, 4, 4, '8F', 0, NULL),
(8, 4, 6, '15A', 0, NULL),
(9, 4, 8, '22C', 0, NULL),
(10, 4, 10, '3A', 0, NULL),
(18, 7, 1, '17A', 0, NULL),
(19, 7, 3, '17B', 0, NULL),
(20, 7, 5, '17C', 0, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `Users`
--

CREATE TABLE `Users` (
  `id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(150) NOT NULL,
  `type` enum('Passenger','ATC') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `Users`
--

INSERT INTO `Users` (`id`, `username`, `password`, `email`, `type`) VALUES
(1, 'atc1', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'atc1@example.com', 'ATC'),
(2, 'passenger1', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'passenger1@example.com', 'Passenger'),
(3, 'passenger2', '$2y$10$Q9gBTlktTY2zI5Ngw.qdyePR/eQESqIHiXDFWFKzgcEcEImcdlXGq', 'passenger2@example.com', 'Passenger'),
(4, 'passenger3', '$2y$10$Q9gBTlktTY2zI5Ngw.qdyePR/eQESqIHiXDFWFKzgcEcEImcdlXGq', 'passenger3@example.com', 'Passenger'),
(6, 'tester', '$2y$12$OyNyJlQeKuwNOtkaTnsxQeHAp3gWwKqQNO2XjRZqPbHlG.uDpp97S', 'tester@example.com', 'ATC'),
(7, 'testerP', '$2y$12$ifkG3H5ebEv5f8Epm4WuoeibUbdx3hGy2WjnUVtvtjx2t.DuxouXG', 'testerP@example.com', 'Passenger');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `Airports`
--
ALTER TABLE `Airports`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `iata_code` (`iata_code`);

--
-- Indexes for table `Flights`
--
ALTER TABLE `Flights`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `flight_number` (`flight_number`),
  ADD KEY `origin_airport_id` (`origin_airport_id`),
  ADD KEY `destination_airport_id` (`destination_airport_id`);

--
-- Indexes for table `Passenger_Flights`
--
ALTER TABLE `Passenger_Flights`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_passenger_flight` (`passenger_id`,`flight_id`),
  ADD KEY `flight_id` (`flight_id`);

--
-- Indexes for table `Users`
--
ALTER TABLE `Users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `Airports`
--
ALTER TABLE `Airports`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `Flights`
--
ALTER TABLE `Flights`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `Passenger_Flights`
--
ALTER TABLE `Passenger_Flights`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `Users`
--
ALTER TABLE `Users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `Flights`
--
ALTER TABLE `Flights`
  ADD CONSTRAINT `Flights_ibfk_1` FOREIGN KEY (`origin_airport_id`) REFERENCES `Airports` (`id`),
  ADD CONSTRAINT `Flights_ibfk_2` FOREIGN KEY (`destination_airport_id`) REFERENCES `Airports` (`id`);

--
-- Constraints for table `Passenger_Flights`
--
ALTER TABLE `Passenger_Flights`
  ADD CONSTRAINT `Passenger_Flights_ibfk_1` FOREIGN KEY (`passenger_id`) REFERENCES `Users` (`id`),
  ADD CONSTRAINT `Passenger_Flights_ibfk_2` FOREIGN KEY (`flight_id`) REFERENCES `Flights` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
