package com.roadsync.dto;

public record RouteOption(
        String routeName,
        Integer distanceKm,
        Integer durationMinutes,
        String trafficLevel,
        Integer trafficScore
) {
}

