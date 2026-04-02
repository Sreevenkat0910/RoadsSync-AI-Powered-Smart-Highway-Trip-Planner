package com.roadsync.dto;

public record BestTimeInfo(
        String time,
        String trafficLevel,
        Integer trafficScore,
        Integer delay
) {
}

