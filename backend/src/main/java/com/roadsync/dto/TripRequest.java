package com.roadsync.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record TripRequest(
        @NotNull(message = "userId is required")
        Long userId,

        @NotNull(message = "vehicleId is required")
        Long vehicleId,

        @NotBlank(message = "source is required")
        String source,

        @NotBlank(message = "destination is required")
        String destination,

        @NotNull(message = "travelDate is required")
        LocalDate travelDate
) {
}

