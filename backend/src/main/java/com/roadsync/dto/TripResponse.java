package com.roadsync.dto;

import java.util.List;

public record TripResponse(
        String message,
        Long tripId,
        String trafficLevel,
        Integer trafficScore,
        String bestDepartureTime,
        List<TimePrediction> alternatives,
        List<RouteOption> routes,
        LeaveNowInfo leaveNow,
        BestTimeInfo bestTime,
        Integer timeSaved
) {
}

