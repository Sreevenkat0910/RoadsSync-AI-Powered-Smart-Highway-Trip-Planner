package com.roadsync.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import com.roadsync.dto.RouteOption;
import com.roadsync.dto.RouteScoreDetail;
import java.util.List;
import org.junit.jupiter.api.Test;

class RouteOptimizationServiceTest {

    private final RouteOptimizationService service = new RouteOptimizationService();

    @Test
    void normalizeUsesMinMaxScale() {
        List<Double> vals = List.of(10.0, 30.0, 50.0);
        assertThat(RouteOptimizationService.normalize(10.0, vals)).isCloseTo(0.0, within(1e-9));
        assertThat(RouteOptimizationService.normalize(50.0, vals)).isCloseTo(1.0, within(1e-9));
        assertThat(RouteOptimizationService.normalize(30.0, vals)).isCloseTo(0.5, within(1e-9));
    }

    @Test
    void normalizeWhenAllEqualReturnsHalf() {
        List<Double> vals = List.of(7.0, 7.0, 7.0);
        assertThat(RouteOptimizationService.normalize(7.0, vals)).isEqualTo(0.5);
    }

    @Test
    void finalScoreMatchesWeightedFormula() {
        List<RouteOption> routes = List.of(
                new RouteOption("LowTraffic", 100, 60, "low", 20, 50.0),
                new RouteOption("HighTraffic", 200, 120, "high", 80, 100.0),
                new RouteOption("Mid", 150, 90, "medium", 50, 75.0)
        );

        RouteOptimizationService.RouteOptimizationResult result = service.optimize(routes);
        RouteScoreDetail best = result.bestRoute();

        assertThat(best).isNotNull();
        assertThat(best.routeName()).isEqualTo("LowTraffic");

        RouteScoreDetail low = result.scoreBreakdown().routes().stream()
                .filter(r -> "LowTraffic".equals(r.routeName()))
                .findFirst()
                .orElseThrow();
        // nT=0, nD=0, nTol=0 -> final = 0
        assertThat(low.finalScore()).isCloseTo(0.0, within(1e-9));

        RouteScoreDetail high = result.scoreBreakdown().routes().stream()
                .filter(r -> "HighTraffic".equals(r.routeName()))
                .findFirst()
                .orElseThrow();
        // nT=1, nD=1, nTol=1 -> final = 0.5+0.3+0.2 = 1
        assertThat(high.finalScore()).isCloseTo(1.0, within(1e-9));

        RouteScoreDetail mid = result.scoreBreakdown().routes().stream()
                .filter(r -> "Mid".equals(r.routeName()))
                .findFirst()
                .orElseThrow();
        // nT=nD=nTol=0.5 -> 0.5*0.5 + 0.3*0.5 + 0.2*0.5 = 0.5
        assertThat(mid.finalScore()).isCloseTo(0.5, within(1e-9));
    }

    @Test
    void emptyRoutesReturnsNullBreakdown() {
        RouteOptimizationService.RouteOptimizationResult result = service.optimize(List.of());
        assertThat(result.bestRoute()).isNull();
        assertThat(result.scoreBreakdown()).isNull();
    }
}
