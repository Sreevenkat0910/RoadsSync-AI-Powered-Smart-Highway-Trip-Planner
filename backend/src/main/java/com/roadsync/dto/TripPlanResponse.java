package com.roadsync.dto;

import java.util.List;

public record TripPlanResponse(
        String message,
        Long tripId,
        String trafficLevel,
        Integer trafficScore,
        String suggestedDepartureTime,
        String bestDepartureTime,
        List<TimePrediction> predictions,
        List<Stop> stops
) {
}

