package com.roadsync.service;

import com.roadsync.dto.RouteOption;
import com.roadsync.dto.RouteScoreBreakdown;
import com.roadsync.dto.RouteScoreDetail;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class RouteOptimizationService {

    private static final double WEIGHT_TRAFFIC = 0.5;
    private static final double WEIGHT_DISTANCE = 0.3;
    private static final double WEIGHT_TOLL = 0.2;

    public RouteOptimizationResult optimize(List<RouteOption> routes) {
        if (routes == null || routes.isEmpty()) {
            return new RouteOptimizationResult(null, null);
        }

        List<Double> trafficVals = new ArrayList<>();
        List<Double> distanceVals = new ArrayList<>();
        List<Double> tollVals = new ArrayList<>();
        for (RouteOption r : routes) {
            trafficVals.add(r.trafficScore() == null ? 0.0 : r.trafficScore().doubleValue());
            distanceVals.add(r.distanceKm() == null ? 0.0 : r.distanceKm().doubleValue());
            tollVals.add(r.tollCost() == null ? 0.0 : r.tollCost());
        }

        List<RouteScoreDetail> details = new ArrayList<>();
        for (int i = 0; i < routes.size(); i++) {
            RouteOption r = routes.get(i);
            double nt = normalize(trafficVals.get(i), trafficVals);
            double nd = normalize(distanceVals.get(i), distanceVals);
            double ntol = normalize(tollVals.get(i), tollVals);
            double finalScore =
                    WEIGHT_TRAFFIC * nt + WEIGHT_DISTANCE * nd + WEIGHT_TOLL * ntol;

            details.add(new RouteScoreDetail(
                    r.routeName(),
                    r.distanceKm(),
                    r.durationMinutes(),
                    r.trafficLevel(),
                    r.trafficScore(),
                    r.tollCost(),
                    nt,
                    nd,
                    ntol,
                    finalScore
            ));
        }

        RouteScoreDetail best = details.stream()
                .min(Comparator.comparingDouble(RouteScoreDetail::finalScore))
                .orElse(null);

        RouteScoreBreakdown breakdown = new RouteScoreBreakdown(
                WEIGHT_TRAFFIC,
                WEIGHT_DISTANCE,
                WEIGHT_TOLL,
                details
        );

        return new RouteOptimizationResult(best, breakdown);
    }

    /**
     * Min-max scale to [0, 1]. If all values are equal, returns 0.5 for each.
     */
    static double normalize(double value, List<Double> all) {
        double min = all.stream().mapToDouble(Double::doubleValue).min().orElse(0);
        double max = all.stream().mapToDouble(Double::doubleValue).max().orElse(0);
        if (max <= min) {
            return 0.5;
        }
        return (value - min) / (max - min);
    }

    public record RouteOptimizationResult(
            RouteScoreDetail bestRoute,
            RouteScoreBreakdown scoreBreakdown
    ) {
    }
}
