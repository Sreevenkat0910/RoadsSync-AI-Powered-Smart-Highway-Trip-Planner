package com.roadsync.dto;

public record Stop(
        String name,
        String type,
        String location,
        double distanceFromStart
) {
}

