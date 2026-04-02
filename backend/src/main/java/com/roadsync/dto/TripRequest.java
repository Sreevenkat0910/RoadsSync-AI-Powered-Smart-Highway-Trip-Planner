package com.roadsync.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TripRequest {

    @NotNull(message = "userId is required")
    private Long userId;

    @NotNull(message = "vehicleId is required")
    private Long vehicleId;

    @NotBlank(message = "source is required")
    private String source;

    @NotBlank(message = "destination is required")
    private String destination;

    @NotNull(message = "travelDate is required")
    private LocalDate travelDate;

    private Integer preferredStartHour;
    private Integer preferredEndHour;

    /**
     * Optional UI label (lowercase): midnight | early morning | morning | afternoon | evening | night — maps to departure slots.
     */
    private String preferredTime;
}
