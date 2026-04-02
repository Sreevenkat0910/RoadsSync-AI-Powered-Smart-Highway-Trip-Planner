package com.roadsync.dto;

public record RouteCongestionPoint(
        String route,
        Integer avgTraffic
) {
}

