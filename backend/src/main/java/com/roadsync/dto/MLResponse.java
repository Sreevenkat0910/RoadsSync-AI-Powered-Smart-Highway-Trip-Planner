package com.roadsync.dto;

public record MLResponse(
        String traffic_level,
        Integer traffic_score
) {
}

