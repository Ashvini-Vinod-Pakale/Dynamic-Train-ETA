package com.traineta.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class WeatherService {

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public WeatherService() {

        this.restClient =
                RestClient.builder().build();

        this.objectMapper =
                new ObjectMapper();
    }

    public int getWeatherFactor(
            Double latitude,
            Double longitude) {

        try {

            // =====================================================
            // CHECK GPS
            // =====================================================

            if (latitude == null
                    || longitude == null) {

                System.out.println(
                        "WEATHER → GPS unavailable → Factor 0"
                );

                return 0;
            }

            // =====================================================
            // OPEN-METEO API
            // =====================================================

            String url =
                    "https://api.open-meteo.com/v1/forecast"
                            + "?latitude=" + latitude
                            + "&longitude=" + longitude
                            + "&current=weather_code";

            String response =
                    restClient.get()
                            .uri(url)
                            .retrieve()
                            .body(String.class);

            // =====================================================
            // PARSE RESPONSE
            // =====================================================

            JsonNode root =
                    objectMapper.readTree(response);

            int weatherCode =
                    root.path("current")
                            .path("weather_code")
                            .asInt(0);

            // =====================================================
            // WEATHER → FACTOR
            // =====================================================

            int weatherFactor =
                    calculateWeatherFactor(
                            weatherCode
                    );

            System.out.println(
                    "WEATHER → Code: "
                            + weatherCode
                            + " → Factor: "
                            + weatherFactor
            );

            return weatherFactor;

        } catch (Exception e) {

            System.out.println(
                    "WEATHER API FAILED → "
                            + e.getMessage()
                            + " → Factor 0"
            );

            return 0;
        }
    }

    // =============================================================
    // WEATHER CODE → MODEL FACTOR
    // =============================================================

    private int calculateWeatherFactor(
            int weatherCode) {

        /*
         * Open-Meteo WMO weather codes:
         *
         * 0       = Clear sky
         * 1-3     = Mainly clear / cloudy
         * 45-48   = Fog
         * 51-57   = Drizzle
         * 61-67   = Rain
         * 71-77   = Snow
         * 80-82   = Rain showers
         * 85-86   = Snow showers
         * 95-99   = Thunderstorm
         *
         * Factor 1 = adverse weather
         * Factor 0 = normal weather
         */

        if ((weatherCode >= 51
                    && weatherCode <= 67)
                || (weatherCode >= 80
                    && weatherCode <= 82)
                || (weatherCode >= 95
                    && weatherCode <= 99)) {

            return 1;
        }

        return 0;
    }
}