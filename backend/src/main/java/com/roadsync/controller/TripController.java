package com.roadsync.controller;

import com.roadsync.dto.TripRequest;
import com.roadsync.dto.TripResponse;
import com.roadsync.service.TripService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/trips")
public class TripController {

    private final TripService tripService;

    public TripController(TripService tripService) {
        this.tripService = tripService;
    }

    @PostMapping("/plan-trip")
    public ResponseEntity<TripResponse> planTrip(@Valid @RequestBody TripRequest request) {
        return ResponseEntity.ok(tripService.createTrip(request));
    }
}

