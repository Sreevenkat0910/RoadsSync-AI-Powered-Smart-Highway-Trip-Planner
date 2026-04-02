package com.roadsync.controller;

import com.roadsync.dto.DayTrafficPoint;
import com.roadsync.dto.HolidayImpactPoint;
import com.roadsync.dto.RouteCongestionPoint;
import com.roadsync.dto.TimePredictionPoint;
import com.roadsync.dto.TrafficDistributionPoint;
import com.roadsync.dto.TrafficTimePoint;
import com.roadsync.service.AnalyticsService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/traffic-time")
    public List<TrafficTimePoint> trafficTime() {
        return analyticsService.getTrafficVsTime();
    }

    @GetMapping("/holiday-impact")
    public List<HolidayImpactPoint> holidayImpact() {
        return analyticsService.getHolidayImpact();
    }

    @GetMapping("/route-congestion")
    public List<RouteCongestionPoint> routeCongestion() {
        return analyticsService.getRouteCongestion();
    }

    @GetMapping("/day-traffic")
    public List<DayTrafficPoint> dayTraffic() {
        return analyticsService.getDayTraffic();
    }

    @GetMapping("/traffic-distribution")
    public List<TrafficDistributionPoint> trafficDistribution() {
        return analyticsService.getTrafficDistribution();
    }

    @GetMapping("/time-predictions")
    public List<TimePredictionPoint> timePredictions() {
        return analyticsService.getTimePredictions();
    }
}

