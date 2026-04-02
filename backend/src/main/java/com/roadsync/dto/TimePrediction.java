package com.roadsync.dto;

public record TimePrediction(
        String time,
        String trafficLevel,
        Integer trafficScore
) {
}

