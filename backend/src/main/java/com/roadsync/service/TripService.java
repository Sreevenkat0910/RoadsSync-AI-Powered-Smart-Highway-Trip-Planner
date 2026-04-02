package com.roadsync.service;

import com.roadsync.dto.TripRequest;
import com.roadsync.dto.BestTimeInfo;
import com.roadsync.dto.LeaveNowInfo;
import com.roadsync.dto.MLRequest;
import com.roadsync.dto.MLResponse;
import com.roadsync.dto.RouteOption;
import com.roadsync.dto.Stop;
import com.roadsync.dto.TimePrediction;
import com.roadsync.dto.TripResponse;
import com.roadsync.util.DelayCalculator;
import com.roadsync.model.Trip;
import com.roadsync.model.User;
import com.roadsync.model.Vehicle;
import com.roadsync.repository.TripRepository;
import com.roadsync.repository.UserRepository;
import com.roadsync.repository.VehicleRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TripService {

    private final TripRepository tripRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final MLService mlService;
    private final RealTimeTrafficService realTimeTrafficService;
    private final StopService stopService;
    private final PredictionService predictionService;
    private final RouteService routeService;
    private final RouteOptimizationService routeOptimizationService;

    public TripService(
            TripRepository tripRepository,
            UserRepository userRepository,
            VehicleRepository vehicleRepository,
            MLService mlService,
            RealTimeTrafficService realTimeTrafficService,
            StopService stopService,
            PredictionService predictionService,
            RouteService routeService,
            RouteOptimizationService routeOptimizationService
    ) {
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
        this.vehicleRepository = vehicleRepository;
        this.mlService = mlService;
        this.realTimeTrafficService = realTimeTrafficService;
        this.stopService = stopService;
        this.predictionService = predictionService;
        this.routeService = routeService;
        this.routeOptimizationService = routeOptimizationService;
    }

    public TripResponse createTrip(TripRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found for userId=" + request.getUserId()));

        Vehicle vehicle = vehicleRepository.findById(request.getVehicleId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Vehicle not found for vehicleId=" + request.getVehicleId()));

        if (!vehicle.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vehicle does not belong to the specified user");
        }

        Trip trip = new Trip();
        trip.setSource(request.getSource());
        trip.setDestination(request.getDestination());
        trip.setTravelDate(request.getTravelDate());
        trip.setCreatedAt(LocalDateTime.now());
        trip.setUser(user);
        trip.setVehicle(vehicle);

        Trip savedTrip = tripRepository.save(trip);
        MLResponse leaveNowPrediction = fetchCurrentTrafficPrediction(savedTrip);

        String preferredTimeRaw = request.getPreferredTime();
        Map<String, Object> overallMap = null;
        String bestOverallTime;
        if (preferredTimeRaw == null || preferredTimeRaw.isBlank()) {
            overallMap = predictionService.getBestDepartureTime(
                    savedTrip.getSource(),
                    savedTrip.getDestination(),
                    savedTrip.getTravelDate(),
                    null,
                    null,
                    null
            );
            bestOverallTime = normalizeBestDepartureTime((String) overallMap.get("bestDepartureTime"));
        } else {
            // Do not compute global best when user chose a band — avoids suggesting e.g. 4 AM while "afternoon" is selected.
            bestOverallTime = null;
        }

        Map<String, Object> departureMap;
        if (preferredTimeRaw != null && !preferredTimeRaw.isBlank()) {
            departureMap = predictionService.getBestDepartureTime(
                    savedTrip.getSource(),
                    savedTrip.getDestination(),
                    savedTrip.getTravelDate(),
                    request.getPreferredStartHour(),
                    request.getPreferredEndHour(),
                    preferredTimeRaw
            );
        } else {
            departureMap = overallMap;
        }

        String bestDepartureTime = (String) departureMap.get("bestDepartureTime");
        @SuppressWarnings("unchecked")
        List<TimePrediction> rawPredictions = (List<TimePrediction>) departureMap.get("predictions");
        List<TimePrediction> predictions = rawPredictions == null ? List.of() : rawPredictions;
        if (bestDepartureTime == null || bestDepartureTime.isBlank() || "N/A".equalsIgnoreCase(bestDepartureTime)) {
            bestDepartureTime = "Not available";
        }

        String bestPreferredTime =
                preferredTimeRaw != null && !preferredTimeRaw.isBlank() ? bestDepartureTime : null;

        final String bestTimeKey = bestDepartureTime;
        TimePrediction bestPrediction = predictions.stream()
                .filter(p -> p != null && p.time() != null && p.time().equalsIgnoreCase(bestTimeKey))
                .findFirst()
                .orElseGet(() -> predictions.stream()
                        .filter(p -> p != null && p.trafficScore() != null)
                        .min(Comparator.comparingInt(TimePrediction::trafficScore))
                        .orElse(null));

        List<TimePrediction> alternatives = predictions.stream()
                .filter(p -> p != null && p.time() != null && !p.time().equalsIgnoreCase(bestTimeKey))
                .collect(Collectors.toList());

        // Stops are still computed for internal use; response now focuses on departure alternatives.
        double approximateDistanceKm = 250.0;
        List<Stop> stops = stopService.getStops(approximateDistanceKm);
        List<Stop> resolvedStops = (stops == null || stops.isEmpty())
                ? List.of(new Stop("Emergency Medical Aid", "medical", "Near midpoint", 125.0))
                : stops;

        int currentHour = LocalDateTime.now().getHour();
        int currentScore = realTimeTrafficService.mergeWithPrediction(leaveNowPrediction.traffic_score(), currentHour);
        String currentLevel = scoreToLevel(currentScore);
        int bestScore = bestPrediction == null || bestPrediction.trafficScore() == null ? 0 : bestPrediction.trafficScore();
        int currentDelay = DelayCalculator.calculateDelay(currentScore);
        int bestDelay = DelayCalculator.calculateDelay(bestScore);
        int timeSaved = Math.max(0, currentDelay - bestDelay);
        int routeHour = resolveRoutePredictionHour(bestDepartureTime);
        List<RouteOption> routes = routeService.getRouteOptions(
                savedTrip.getSource(),
                savedTrip.getDestination(),
                savedTrip.getTravelDate(),
                routeHour
        );
        RouteOptimizationService.RouteOptimizationResult routeOpt =
                routeOptimizationService.optimize(routes);

        LeaveNowInfo leaveNow = new LeaveNowInfo(
                currentLevel,
                currentScore,
                currentDelay
        );
        BestTimeInfo bestTime = new BestTimeInfo(
                bestDepartureTime,
                bestPrediction == null || bestPrediction.trafficLevel() == null ? "unknown" : bestPrediction.trafficLevel(),
                bestScore,
                bestDelay
        );

        System.out.println("Trip stops before response: " + resolvedStops);

        return new TripResponse(
                "Trip saved successfully",
                savedTrip.getId(),
                currentLevel,
                currentScore,
                bestDepartureTime,
                bestOverallTime,
                bestPreferredTime,
                alternatives,
                routes,
                routeOpt.bestRoute(),
                routeOpt.scoreBreakdown(),
                resolvedStops,
                leaveNow,
                bestTime,
                timeSaved,
                realTimeTrafficService.isLiveTrafficEnabled()
        );
    }

    private MLResponse fetchTrafficPrediction(Trip trip, int hour) {
        LocalDate date = trip.getTravelDate();
        DayOfWeek dow = date.getDayOfWeek();
        int isWeekend = (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) ? 1 : 0;
        int isHoliday = 0;      // simple placeholder logic for now
        int daysToHoliday = 0;  // simple placeholder logic for now

        MLRequest mlRequest = new MLRequest(
                hour,
                capitalize(dow.name()),
                date.getMonthValue(),
                isWeekend,
                isHoliday,
                daysToHoliday,
                buildRouteCode(trip.getSource(), trip.getDestination())
        );

        return mlService.predict(mlRequest);
    }

    private MLResponse fetchCurrentTrafficPrediction(Trip trip) {
        LocalDateTime now = LocalDateTime.now();
        DayOfWeek dow = now.getDayOfWeek();
        int isWeekend = (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) ? 1 : 0;

        MLRequest mlRequest = new MLRequest(
                now.getHour(),
                capitalize(dow.name()),
                now.getMonthValue(),
                isWeekend,
                0,
                0,
                buildRouteCode(trip.getSource(), trip.getDestination())
        );
        return mlService.predict(mlRequest);
    }

    private int resolveRoutePredictionHour(String bestDepartureTime) {
        if (bestDepartureTime != null && !bestDepartureTime.isBlank() && !"Not available".equalsIgnoreCase(bestDepartureTime)) {
            try {
                return java.time.LocalTime.parse(bestDepartureTime, DateTimeFormatter.ofPattern("hh:mm a")).getHour();
            } catch (DateTimeParseException ignored) {
                // Fallback to current hour if format differs.
            }
        }
        return LocalDateTime.now().getHour();
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

    private String capitalize(String upperCaseText) {
        String lower = upperCaseText.toLowerCase();
        return Character.toUpperCase(lower.charAt(0)) + lower.substring(1);
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

    private static String normalizeBestDepartureTime(String raw) {
        if (raw == null || raw.isBlank() || "N/A".equalsIgnoreCase(raw)) {
            return "Not available";
        }
        return raw;
    }
}

