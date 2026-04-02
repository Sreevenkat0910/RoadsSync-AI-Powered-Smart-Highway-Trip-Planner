package com.roadsync.dto;

import java.util.List;

public record RouteScoreBreakdown(
        double weightTraffic,
        double weightDistance,
        double weightToll,
        List<RouteScoreDetail> routes
) {
}
