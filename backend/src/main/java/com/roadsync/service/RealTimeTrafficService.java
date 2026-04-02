package com.roadsync.service;

import java.util.concurrent.ThreadLocalRandom;
import org.springframework.stereotype.Service;

@Service
public class RealTimeTrafficService {

    public int getLiveAdjustment(int hour) {
        int randomVariation = ThreadLocalRandom.current().nextInt(-6, 7);
        int spike = 0;

        if (hour >= 7 && hour <= 10) {
            spike += 12;
        } else if (hour >= 17 && hour <= 21) {
            spike += 15;
        } else if (hour >= 0 && hour <= 5) {
            spike -= 4;
        }

        return randomVariation + spike;
    }

    public int mergeWithPrediction(Integer predictedScore, int hour) {
        int safePredicted = predictedScore == null ? 0 : predictedScore;
        int finalScore = safePredicted + getLiveAdjustment(hour);
        return Math.max(0, Math.min(100, finalScore));
    }

    public boolean isLiveTrafficEnabled() {
        return true;
    }
}

