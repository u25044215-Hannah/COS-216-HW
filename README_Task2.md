# COS216 Task 2 - Multi-User NodeJS WebSocket Server

## Project Information

**Project:** COS216 Homework Assignment - Task 2  
**Task:** Multi-User NodeJS WebSocket Server  
**Author:** Shelby Bodenstein  
**Student Number:** u25038967  

This project implements the Task 2 WebSocket server for the COS216 flight tracking system. The server runs locally using NodeJS and communicates with the PHP API from Task 1 hosted on Wheatley.

The assignment requires the NodeJS server to run on localhost, not on Wheatley, and to accept multiple WebSocket clients at the same time. The server must also use the PHP API to get, dispatch, board, and update flights. :contentReference[oaicite:0]{index=0}

---

## Technologies Used

This server uses:

- NodeJS
- WebSockets using the `ws` package
- `dotenv` for environment variables
- `readline` for server terminal commands
- PHP API from Task 1
- MySQL database through the PHP API

Dependencies:

```json
{
  "dotenv": "^16.4.5",
  "ws": "^8.18.0"
}
