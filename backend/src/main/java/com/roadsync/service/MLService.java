package com.roadsync.service;

import com.roadsync.dto.MLRequest;
import com.roadsync.dto.MLResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

@Service
public class MLService {

    private final RestTemplate restTemplate;
    private final String mlServiceBaseUrl;

    public MLService(
            RestTemplate restTemplate,
            @Value("${ml.service.base-url:http://127.0.0.1:8000}") String mlServiceBaseUrl
    ) {
        this.restTemplate = restTemplate;
        this.mlServiceBaseUrl = mlServiceBaseUrl;
    }

    public MLResponse predict(MLRequest request) {
        try {
            ResponseEntity<MLResponse> response = restTemplate.postForEntity(
                    mlServiceBaseUrl + "/predict",
                    request,
                    MLResponse.class
            );
            MLResponse body = response.getBody();
            if (body == null || body.traffic_level() == null || body.traffic_score() == null) {
                return fallback();
            }
            return body;
        } catch (RestClientException ex) {
            return fallback();
        }
    }

    private MLResponse fallback() {
        return new MLResponse("unknown", 0);
    }
}

