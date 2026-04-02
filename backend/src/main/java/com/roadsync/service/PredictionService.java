package com.roadsync.service;

import com.roadsync.dto.MLRequest;
import com.roadsync.dto.MLResponse;
import com.roadsync.dto.TimePrediction;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class PredictionService {

    private final MLService mlService;

    public PredictionService(MLService mlService) {
        this.mlService = mlService;
    }

    public Map<String, Object> getBestDepartureTime(
            String source,
            String destination,
            LocalDate travelDate
    ) {
        List<Integer> timeSlots = Arrays.asList(4, 6, 8, 10, 12, 14, 16, 18, 20);
        List<TimePrediction> predictions = new ArrayList<>();

        Integer bestHour = null;
        int bestScore = Integer.MAX_VALUE;

        for (Integer slot : timeSlots) {
            MLRequest request = buildRequest(source, destination, travelDate, slot);
            MLResponse response = mlService.predict(request);

            // Treat fallback response as failed slot and skip it.
            if (response == null || response.traffic_level() == null || response.traffic_score() == null) {
                continue;
            }
            if ("unknown".equalsIgnoreCase(response.traffic_level()) && response.traffic_score() == 0) {
                continue;
            }

            predictions.add(new TimePrediction(
                    formatSlotLabel(slot),
                    response.traffic_level(),
                    response.traffic_score()
            ));

            if (response.traffic_score() < bestScore) {
                bestScore = response.traffic_score();
                bestHour = slot;
            }
        }

        String bestDepartureTime = bestHour == null ? "N/A" : formatBestTime(bestHour);
        return Map.of(
                "bestDepartureTime", bestDepartureTime,
                "predictions", predictions
        );
    }

    private MLRequest buildRequest(String source, String destination, LocalDate travelDate, int hour) {
        DayOfWeek dow = travelDate.getDayOfWeek();
        int isWeekend = (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) ? 1 : 0;

        return new MLRequest(
                hour,
                dow.toString(),
                travelDate.getMonthValue(),
                isWeekend,
                0,
                0,
                buildRouteCode(source, destination)
        );
    }

    private String buildRouteCode(String source, String destination) {
        return shortCode(source) + "-" + shortCode(destination);
    }

    private String shortCode(String value) {
        String cleaned = value == null ? "" : value.trim().replaceAll("[^A-Za-z]", "");
        if (cleaned.length() >= 3) {
            return cleaned.substring(0, 3).toUpperCase();
        }
        return cleaned.toUpperCase();
    }

    private String formatBestTime(int hour) {
        int hour12 = hour % 12 == 0 ? 12 : hour % 12;
        String meridiem = hour < 12 ? "AM" : "PM";
        return String.format("%02d:00 %s", hour12, meridiem);
    }

    private String formatSlotLabel(int hour) {
        return formatBestTime(hour);
    }
}

