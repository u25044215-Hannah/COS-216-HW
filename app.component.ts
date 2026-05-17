
import { AfterViewInit, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';


import { NgIf, NgFor } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, NgIf, NgFor],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements AfterViewInit {
  socketStatus = 'Disconnected';
  socket!: WebSocket;
  username = '';
  password = '';
  role = '';
  message = '';
  flights: any[] = [];
  selectedFlight: any = null;
  aircraftMarker!: L.Marker;
  boardingFlightId: any = null;
  boardingMessage = '';
  boardingCountdown = 0;
  boardingTimer: any = null;
  flightProgress = 0;
  connectSocket() {
    this.socket = new WebSocket('ws://localhost:3000');

    this.socket.onopen = () => {
      this.socketStatus = 'Connected';
      console.log('Connected to WebSocket');

      
    };

    this.socket.onclose = () => {
      this.socketStatus = 'Disconnected';
      this.message = 'Connection lost. Please reconnect.';
      console.log('Disconnected from WebSocket');
    };

    this.socket.onerror = () => {
      this.socketStatus = 'Error';
      this.message = 'WebSocket connection error.';
      console.log('WebSocket error');
    };

    this.socket.onmessage = (message) => {
      const data = JSON.parse(message.data);
      console.log(data);
      if (data.type === 'BOARDING_CONFIRMED') {
        this.message = data.message;
      }

      if (data.type === 'NO_SHOW') {
        this.message = data.message;
      }

      if (data.type === 'ATC_DISCONNECTED') {
        this.message = data.message;
      }

      if (data.type === 'SERVER_SHUTDOWN') {
        this.message = data.message;
        this.socketStatus = 'Disconnected';
      }

      if (data.type === 'KILLED') {
        this.message = data.message;
        this.socketStatus = 'Disconnected';
      }

      if (data.type === 'ERROR') {
        this.message = data.message;
      }
      if (data.type === 'FLIGHT_LIST') {
        this.flights = data.data;
        this.message = 'Flights loaded successfully';
      }
      if (data.type === 'LOGIN_SUCCESS') {
        this.role = data.user.type;
        this.message = 'Logged in as ' + data.user.type;

        this.socket.send(JSON.stringify({
          type: 'GET_FLIGHTS'
        }));

        this.socket.send(JSON.stringify({
        type: 'GET_AIRPORTS'
      }));
      }
      if (data.type === 'TRACK_SUCCESS') {

        this.message =
          'Tracking flight ' + data.flight_number;

        if (data.latitude && data.longitude) {

          if (!this.aircraftMarker) {

            this.aircraftMarker = L.marker([
              data.latitude,
              data.longitude
            ]).addTo(this.map);

          } else {

            this.aircraftMarker.setLatLng([
              data.latitude,
              data.longitude
            ]);

          }

          this.map.setView([
            data.latitude,
            data.longitude
          ], 6);

        }
      }

      if (data.type === 'DISPATCH_SUCCESS') {
        this.message = data.message;
      }

      if (data.type === 'BOARD_SUCCESS') {
        this.message = data.message;
      }

      if (data.type === 'LANDED') {
        this.message = 'Flight landed successfully.';
      }
      if (data.flights) {
        this.flights = data.flights;
      }
      if (data.type === 'POSITION') {
        this.flightProgress = Math.round(data.progress * 100);
        const latitude = data.latitude;
        const longitude = data.longitude;

        if (!this.aircraftMarker) {

          this.aircraftMarker = L.marker([
            latitude,
            longitude
          ]).addTo(this.map);

        } else {

          this.aircraftMarker.setLatLng([
            latitude,
            longitude
          ]);

        }

      }
      if (data.type === 'BOARDING_CALL') {
        this.boardingFlightId = data.flight_id;
        this.boardingMessage = data.message || 'Boarding call received!';
        this.boardingCountdown = 60;

        this.boardingTimer = setInterval(() => {
          this.boardingCountdown--;

          if (this.boardingCountdown <= 0) {
            clearInterval(this.boardingTimer);
            this.boardingMessage = 'Boarding window expired.';
          }
        }, 1000);
      }
      if (data.type === 'AIRPORT_LIST') {

        data.data.forEach((airport: any) => {

          L.circleMarker([
            airport.latitude,
            airport.longitude
          ], {
            radius: 6,
            color: 'blue'
          })

            .addTo(this.map)

            .bindPopup(
              airport.name + ' (' + airport.iata_code + ')'
            );

        });

      }
    };
  }
  login() {

    const loginData = {
      type: 'LOGIN',
      username: this.username,
      password: this.password
    };

    this.socket.send(
      JSON.stringify(loginData)
    );

  }
  map!: L.Map;

  ngAfterViewInit() {
    this.map = L.map('map').setView([0, 20], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(this.map);

  }

  
  selectFlight(flight: any) {
    this.selectedFlight = flight;
  }

  trackFlight(flight: any) {
    const message = {
      type: 'TRACK',
      flight_id: flight.id
    };

    this.socket.send(JSON.stringify(message));
  }

  dispatchFlight(flight: any) {
    const message = {
      type: 'DISPATCH',
      flight_id: flight.id
    };

    this.socket.send(JSON.stringify(message));
  }

  boardFlight() {
    const message = {
      type: 'BOARD',
      flight_id: this.boardingFlightId
    };

    this.socket.send(JSON.stringify(message));
    this.message = 'Boarding confirmation sent.';
  }

}
