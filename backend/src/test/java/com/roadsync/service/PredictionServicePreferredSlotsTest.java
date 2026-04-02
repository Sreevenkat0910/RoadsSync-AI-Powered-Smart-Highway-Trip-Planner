package com.roadsync.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.roadsync.dto.MLRequest;
import com.roadsync.dto.MLResponse;
import java.time.LocalDate;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PredictionServicePreferredSlotsTest {

    @Mock
    private MLService mlService;

    @Mock
    private RealTimeTrafficService realTimeTrafficService;

    @InjectMocks
    private PredictionService predictionService;

    @BeforeEach
    void setUp() {
        lenient().when(realTimeTrafficService.mergeWithPrediction(anyInt(), anyInt()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(mlService.predict(any(MLRequest.class))).thenReturn(new MLResponse("medium", 55));
    }

    @Test
    void morningOnlyEvaluatesListedSlots() {
        predictionService.getBestDepartureTime(
                "Hyderabad", "Vijayawada", LocalDate.of(2026, 6, 10), null, null, "morning");
        verify(mlService, times(4)).predict(any(MLRequest.class));
    }

    @Test
    void midnightEvaluatesThreeSlots() {
        predictionService.getBestDepartureTime(
                "Hyderabad", "Vijayawada", LocalDate.of(2026, 6, 10), null, null, "midnight");
        verify(mlService, times(3)).predict(any(MLRequest.class));
    }

    @Test
    void earlyMorningEvaluatesTwoSlots() {
        predictionService.getBestDepartureTime(
                "Hyderabad", "Vijayawada", LocalDate.of(2026, 6, 10), null, null, "earlyMorning");
        verify(mlService, times(2)).predict(any(MLRequest.class));
    }

    @Test
    void afternoonEvaluatesThreeSlots() {
        predictionService.getBestDepartureTime(
                "Hyderabad", "Vijayawada", LocalDate.of(2026, 6, 10), null, null, "afternoon");
        verify(mlService, times(3)).predict(any(MLRequest.class));
    }

    @Test
    void eveningEvaluatesThreeSlots() {
        predictionService.getBestDepartureTime(
                "Hyderabad", "Vijayawada", LocalDate.of(2026, 6, 10), null, null, "evening");
        verify(mlService, times(3)).predict(any(MLRequest.class));
    }

    @Test
    void nightEvaluatesThreeSlots() {
        predictionService.getBestDepartureTime(
                "Hyderabad", "Vijayawada", LocalDate.of(2026, 6, 10), null, null, "night");
        verify(mlService, times(3)).predict(any(MLRequest.class));
    }

    @Test
    void noPreferredTimeUsesAllSlots() {
        predictionService.getBestDepartureTime(
                "Hyderabad", "Vijayawada", LocalDate.of(2026, 6, 10), null, null, null);
        verify(mlService, times(PredictionService.ALL_TIME_SLOTS.size())).predict(any(MLRequest.class));
    }

    @Test
    void bestDepartureTimeIsChosenOnlyFromPreferredSlots() {
        when(mlService.predict(any(MLRequest.class))).thenAnswer(invocation -> {
            MLRequest req = invocation.getArgument(0);
            int score = req.hour() == 10 ? 25 : 60;
            return new MLResponse("medium", score);
        });
        @SuppressWarnings("unchecked")
        Map<String, Object> result = predictionService.getBestDepartureTime(
                "Hyderabad", "Vijayawada", LocalDate.of(2026, 6, 10), null, null, "morning");
        assertThat(result.get("bestDepartureTime")).isEqualTo("10:00 AM");
    }
}
