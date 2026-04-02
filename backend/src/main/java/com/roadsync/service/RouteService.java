package com.roadsync.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.roadsync.dto.MLRequest;
import com.roadsync.dto.MLResponse;
import com.roadsync.dto.RouteOption;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class RouteService {

    private static final String DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json";
    private static final int MAX_ROUTES = 3;

    private final RestTemplate restTemplate;
    private final MLService mlService;
    private final String googleMapsApiKey;

    public RouteService(
            RestTemplate restTemplate,
            MLService mlService,
            @Value("${external.google.maps.api-key:}") String googleMapsApiKey
    ) {
        this.restTemplate = restTemplate;
        this.mlService = mlService;
        this.googleMapsApiKey = googleMapsApiKey;
    }

    public List<RouteOption> getRouteOptions(String source, String destination, LocalDate travelDate, int hour) {
        if (googleMapsApiKey == null || googleMapsApiKey.isBlank()) {
            return List.of();
        }

        try {
            String url = UriComponentsBuilder.fromHttpUrl(DIRECTIONS_URL)
                    .queryParam("origin", source)
                    .queryParam("destination", destination)
                    .queryParam("alternatives", "true")
                    .queryParam("key", googleMapsApiKey)
                    .toUriString();

            ResponseEntity<JsonNode> response = restTemplate.getForEntity(url, JsonNode.class);
            JsonNode body = response.getBody();
            if (body == null || !body.has("routes")) {
                return List.of();
            }

            JsonNode routes = body.get("routes");
            if (routes == null || !routes.isArray()) {
                return List.of();
            }

            List<RouteOption> options = new ArrayList<>();
            int count = Math.min(MAX_ROUTES, routes.size());
            for (int i = 0; i < count; i++) {
                JsonNode route = routes.get(i);
                JsonNode leg = route.path("legs").isArray() && route.path("legs").size() > 0
                        ? route.path("legs").get(0)
                        : null;
                if (leg == null) {
                    continue;
                }

                String routeName = route.path("summary").asText();
                if (routeName == null || routeName.isBlank()) {
                    routeName = "Route " + (i + 1);
                }
                int distanceKm = (int) Math.round(leg.path("distance").path("value").asDouble(0.0) / 1000.0);
                int durationMinutes = (int) Math.round(leg.path("duration").path("value").asDouble(0.0) / 60.0);

                MLRequest mlRequest = buildRouteMlRequest(routeName, travelDate, hour);
                MLResponse mlResponse = mlService.predict(mlRequest);
                String trafficLevel = mlResponse.traffic_level() == null ? "unknown" : mlResponse.traffic_level();
                int trafficScore = mlResponse.traffic_score() == null ? 0 : mlResponse.traffic_score();

                options.add(new RouteOption(
                        routeName,
                        distanceKm,
                        durationMinutes,
                        trafficLevel,
                        trafficScore
                ));
            }

            return options;
        } catch (RestClientException ex) {
            return List.of();
        }
    }

    private MLRequest buildRouteMlRequest(String routeName, LocalDate travelDate, int hour) {
        DayOfWeek dow = travelDate.getDayOfWeek();
        int isWeekend = (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) ? 1 : 0;
        return new MLRequest(
                hour,
                dow.toString(),
                travelDate.getMonthValue(),
                isWeekend,
                0,
                0,
                sanitizeRoute(routeName)
        );
    }

    private String sanitizeRoute(String routeName) {
        String cleaned = routeName == null ? "" : routeName.trim().replaceAll("[^A-Za-z0-9\\- ]", "");
        if (cleaned.isBlank()) {
            return "UNKNOWN-ROUTE";
        }
        return cleaned;
    }
}

