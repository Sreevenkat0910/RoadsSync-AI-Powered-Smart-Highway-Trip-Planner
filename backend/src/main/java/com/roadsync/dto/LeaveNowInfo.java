package com.roadsync.dto;

public record LeaveNowInfo(
        String trafficLevel,
        Integer trafficScore,
        Integer delay
) {
}

