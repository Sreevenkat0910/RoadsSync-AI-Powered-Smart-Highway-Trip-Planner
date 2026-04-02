package com.roadsync.service;

import com.roadsync.dto.DayTrafficPoint;
import com.roadsync.dto.HolidayImpactPoint;
import com.roadsync.dto.RouteCongestionPoint;
import com.roadsync.dto.TimePredictionPoint;
import com.roadsync.dto.TrafficDistributionPoint;
import com.roadsync.dto.TrafficTimePoint;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class AnalyticsService {

    public List<TrafficTimePoint> getTrafficVsTime() {
        return List.of(
                new TrafficTimePoint("2024-11-10", 85),
                new TrafficTimePoint("2024-11-11", 60),
                new TrafficTimePoint("2024-11-12", 72),
                new TrafficTimePoint("2024-11-13", 67),
                new TrafficTimePoint("2024-11-14", 79)
        );
    }

    public List<HolidayImpactPoint> getHolidayImpact() {
        return List.of(
                new HolidayImpactPoint("Yes", 80),
                new HolidayImpactPoint("No", 50)
        );
    }

    public List<RouteCongestionPoint> getRouteCongestion() {
        return List.of(
                new RouteCongestionPoint("HYD-VJA", 75),
                new RouteCongestionPoint("BLR-MYS", 60),
                new RouteCongestionPoint("MUM-PUN", 82)
        );
    }

    public List<DayTrafficPoint> getDayTraffic() {
        return List.of(
                new DayTrafficPoint("Monday", 50),
                new DayTrafficPoint("Tuesday", 56),
                new DayTrafficPoint("Wednesday", 61),
                new DayTrafficPoint("Thursday", 58),
                new DayTrafficPoint("Friday", 69),
                new DayTrafficPoint("Saturday", 74),
                new DayTrafficPoint("Sunday", 80)
        );
    }

    public List<TrafficDistributionPoint> getTrafficDistribution() {
        return List.of(
                new TrafficDistributionPoint("Low", 22),
                new TrafficDistributionPoint("Medium", 44),
                new TrafficDistributionPoint("High", 34)
        );
    }

    public List<TimePredictionPoint> getTimePredictions() {
        return List.of(
                new TimePredictionPoint("04:00 AM", 20),
                new TimePredictionPoint("06:00 AM", 35),
                new TimePredictionPoint("08:00 AM", 58),
                new TimePredictionPoint("10:00 AM", 62),
                new TimePredictionPoint("12:00 PM", 66),
                new TimePredictionPoint("02:00 PM", 61),
                new TimePredictionPoint("04:00 PM", 74),
                new TimePredictionPoint("06:00 PM", 87),
                new TimePredictionPoint("08:00 PM", 81)
        );
    }
}

