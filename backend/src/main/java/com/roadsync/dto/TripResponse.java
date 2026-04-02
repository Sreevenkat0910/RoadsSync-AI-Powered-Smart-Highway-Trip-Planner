package com.roadsync.dto;

import java.util.List;

public record TripResponse(
        String message,
        Long tripId,
        String trafficLevel,
        Integer trafficScore,
        String bestDepartureTime,
        String bestOverallTime,
        String bestPreferredTime,
        List<TimePrediction> alternatives,
        List<RouteOption> routes,
        RouteScoreDetail bestRoute,
        RouteScoreBreakdown scoreBreakdown,
        List<Stop> stops,
        LeaveNowInfo leaveNow,
        BestTimeInfo bestTime,
        Integer timeSaved,
        Boolean liveTraffic
) {
}

