package com.roadsync.dto;

public record RouteScoreDetail(
        String routeName,
        Integer distanceKm,
        Integer durationMinutes,
        String trafficLevel,
        Integer trafficScore,
        Double tollCost,
        double normalizedTraffic,
        double normalizedDistance,
        double normalizedToll,
        double finalScore
) {
}
