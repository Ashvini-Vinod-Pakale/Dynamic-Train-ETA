# 🚆 Dynamic Train ETA & Delay Prediction System

## 📌 Overview

Dynamic Train ETA is an AI-powered railway information system designed to provide dynamic train arrival predictions and future delay estimation.

The system combines train operating information, prediction logic, dynamic ETA calculation, real-time WebSocket communication, and an interactive React dashboard.

---

## 🎯 Problem Statement

Traditional railway schedules provide planned arrival times, but actual train operations can change because of variations in speed, existing delays, previous station delays, and operational conditions.

Therefore, passengers need more useful and dynamically updated information about:

- Current train status
- Expected arrival time
- Current delay
- Possible future delay
- Upcoming station information

Our system addresses this problem by processing train information and generating Dynamic ETA and future delay predictions.

---

## 💡 Proposed Solution

The proposed system follows this workflow:

```text
Live Train Data
       ↓
Data Processing
       ↓
Prediction Engine
       ↓
Future Delay Prediction
       ↓
Dynamic ETA
       ↓
Spring Boot Backend
       ↓
WebSocket
       ↓
React Frontend