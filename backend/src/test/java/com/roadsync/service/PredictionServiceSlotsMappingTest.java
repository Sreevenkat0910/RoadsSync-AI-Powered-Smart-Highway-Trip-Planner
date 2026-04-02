package com.roadsync.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class PredictionServiceSlotsMappingTest {

    @Test
    void staticMappingMatchesSpec() {
        assertThat(PredictionService.slotsForPreferredTime("midnight")).containsExactly(0, 2, 4);
        assertThat(PredictionService.slotsForPreferredTime("earlyMorning")).containsExactly(5, 6);
        assertThat(PredictionService.slotsForPreferredTime("early morning")).containsExactly(5, 6);
        assertThat(PredictionService.slotsForPreferredTime("early_morning")).containsExactly(5, 6);
        assertThat(PredictionService.slotsForPreferredTime("morning")).containsExactly(7, 8, 9, 10);
        assertThat(PredictionService.slotsForPreferredTime("afternoon")).containsExactly(12, 13, 14);
        assertThat(PredictionService.slotsForPreferredTime("evening")).containsExactly(16, 17, 18);
        assertThat(PredictionService.slotsForPreferredTime("night")).containsExactly(20, 21, 22);
    }

    @Test
    void differentCategoriesProduceDifferentSlotSets() {
        assertThat(PredictionService.slotsForPreferredTime("morning"))
                .isNotEqualTo(PredictionService.slotsForPreferredTime("afternoon"));
        assertThat(PredictionService.slotsForPreferredTime("evening"))
                .doesNotContainAnyElementsOf(PredictionService.slotsForPreferredTime("morning"));
        assertThat(PredictionService.slotsForPreferredTime("midnight").size()).isEqualTo(3);
        assertThat(PredictionService.slotsForPreferredTime("morning").size()).isEqualTo(4);
        assertThat(PredictionService.slotsForPreferredTime("afternoon").size()).isEqualTo(3);
    }

    @Test
    void defaultGridMatchesNineSlots() {
        assertThat(PredictionService.ALL_TIME_SLOTS).containsExactly(4, 6, 8, 10, 12, 14, 16, 18, 20);
    }
}
