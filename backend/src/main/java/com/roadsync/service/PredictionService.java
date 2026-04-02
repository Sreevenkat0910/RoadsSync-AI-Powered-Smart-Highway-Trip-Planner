package com.roadsync.service;

import com.roadsync.dto.MLRequest;
import com.roadsync.dto.MLResponse;
import com.roadsync.dto.TimePrediction;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class PredictionService {

    private static final Logger log = LoggerFactory.getLogger(PredictionService.class);

    /**
     * Default grid when {@code preferredTime} is absent or unrecognized (matches switch {@code default}).
     */
    static final List<Integer> ALL_TIME_SLOTS = List.of(4, 6, 8, 10, 12, 14, 16, 18, 20);

    private final MLService mlService;
    private final RealTimeTrafficService realTimeTrafficService;

    public PredictionService(MLService mlService, RealTimeTrafficService realTimeTrafficService) {
        this.mlService = mlService;
        this.realTimeTrafficService = realTimeTrafficService;
    }

    public Map<String, Object> getBestDepartureTime(
            String source,
            String destination,
            LocalDate travelDate,
            Integer preferredStartHour,
            Integer preferredEndHour,
            String preferredTime
    ) {
        List<Integer> filteredTimeSlots = resolveFilteredTimeSlots(
                preferredTime,
                preferredStartHour,
                preferredEndHour
        );
        List<TimePrediction> predictions = new ArrayList<>();

        Integer bestHour = null;
        int bestScore = Integer.MAX_VALUE;

        for (Integer slot : filteredTimeSlots) {
            MLRequest request = buildRequest(source, destination, travelDate, slot);
            MLResponse response = mlService.predict(request);

            // Treat fallback response as failed slot and skip it.
            if (response == null || response.traffic_level() == null || response.traffic_score() == null) {
                continue;
            }
            if ("unknown".equalsIgnoreCase(response.traffic_level()) && response.traffic_score() == 0) {
                continue;
            }

            // Differentiate scores across hours so similar ML outputs still rank distinctly.
            int differentiatedScore = response.traffic_score() + (int) Math.round(slot * 0.5);
            differentiatedScore = Math.min(100, Math.max(0, differentiatedScore));

            int conveniencePenalty = getConveniencePenalty(slot);
            int liveAdjustedScore = realTimeTrafficService.mergeWithPrediction(differentiatedScore, slot);
            int finalScore = liveAdjustedScore + conveniencePenalty;

            predictions.add(new TimePrediction(
                    formatSlotLabel(slot),
                    scoreToLevel(finalScore),
                    finalScore
            ));

            if (finalScore < bestScore) {
                bestScore = finalScore;
                bestHour = slot;
            }
        }

        String bestDepartureTime = bestHour == null ? "N/A" : formatBestTime(bestHour);
        return Map.of(
                "bestDepartureTime", bestDepartureTime,
                "predictions", predictions
        );
    }

    /**
     * If {@code preferredTime} is set, uses an explicit slot list for that band.
     * Otherwise uses {@link #ALL_TIME_SLOTS}, optionally narrowed by start/end hour.
     */
    private List<Integer> resolveFilteredTimeSlots(
            String preferredTime,
            Integer preferredStartHour,
            Integer preferredEndHour
    ) {
        if (preferredTime != null && !preferredTime.isBlank()) {
            String normalized = preferredTime.toLowerCase().trim();
            List<Integer> timeSlots = slotsForPreferredTime(normalized);
            if (timeSlots == null) {
                log.warn("Unknown preferredTime '{}', using default slots", normalized);
                timeSlots = ALL_TIME_SLOTS;
            }
            System.out.println("Preferred Time: " + normalized);
            System.out.println("Using Slots: " + timeSlots);
            log.info("Preferred departure band: {} -> slots {}", normalized, timeSlots);
            return timeSlots;
        }
        List<Integer> fallback = filterTimeSlots(ALL_TIME_SLOTS, preferredStartHour, preferredEndHour);
        System.out.println("Preferred Time: (none)");
        System.out.println("Using Slots: " + fallback);
        return fallback;
    }

    /**
     * Maps preferred time label to exact hour slots (only these run in the prediction loop).
     * Input should already be {@code toLowerCase().trim()}; camelCase and spaces are normalized (e.g. {@code earlyMorning}, {@code early morning}).
     */
    static List<Integer> slotsForPreferredTime(String preferredTime) {
        if (preferredTime == null || preferredTime.isBlank()) {
            return null;
        }
        String key = preferredTime.toLowerCase().trim().replace("_", "").replaceAll("\\s+", "");
        return switch (key) {
            case "midnight" -> List.of(0, 2, 4);
            case "earlymorning" -> List.of(5, 6);
            case "morning" -> List.of(7, 8, 9, 10);
            case "afternoon" -> List.of(12, 13, 14);
            case "evening" -> List.of(16, 17, 18);
            case "night" -> List.of(20, 21, 22);
            default -> null;
        };
    }

    private List<Integer> filterTimeSlots(List<Integer> slots, Integer preferredStartHour, Integer preferredEndHour) {
        if (preferredStartHour == null || preferredEndHour == null) {
            return slots;
        }
        int start = Math.max(0, preferredStartHour);
        int end = Math.min(23, preferredEndHour);
        if (start > end) {
            return slots;
        }
        List<Integer> filtered = slots.stream()
                .filter(slot -> slot >= start && slot <= end)
                .toList();
        return filtered.isEmpty() ? slots : filtered;
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

    private int getConveniencePenalty(int hour) {
        int conveniencePenalty = 0;
        if (hour < 5) {
            conveniencePenalty += 15; // penalize very early travel
        }
        if (hour > 22) {
            conveniencePenalty += 10; // penalize late night
        }
        return conveniencePenalty;
    }

    private String scoreToLevel(int score) {
        if (score <= 35) {
            return "low";
        }
        if (score <= 70) {
            return "medium";
        }
        return "high";
    }
}

