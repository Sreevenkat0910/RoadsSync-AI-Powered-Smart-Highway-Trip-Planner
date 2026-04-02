package com.roadsync.service;

import com.roadsync.dto.Stop;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class StopService {

    public List<Stop> getStops(double distanceKm) {
        List<Stop> stops = new ArrayList<>();

        // Food stops every ~120 km.
        for (double marker = 120; marker < distanceKm; marker += 120) {
            stops.add(new Stop(
                    "Highway Food Plaza " + (int) marker,
                    "food",
                    "Near KM " + (int) marker,
                    marker
            ));
        }

        // Fuel stops every ~220 km.
        for (double marker = 220; marker < distanceKm; marker += 220) {
            stops.add(new Stop(
                    "HP Petrol Pump " + (int) marker,
                    "fuel",
                    "Near KM " + (int) marker,
                    marker
            ));
        }

        return stops;
    }
}

