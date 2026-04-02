package com.roadsync.service;

import org.springframework.stereotype.Service;

@Service
public class TestService {

    public String getBackendStatus() {
        return "RoadSync backend is running";
    }
}

