package com.roadsync.dto;

public record MLRequest(
        int hour,
        String day_of_week,
        int month,
        int is_weekend,
        int is_holiday,
        int days_to_holiday,
        String route
) {
}

