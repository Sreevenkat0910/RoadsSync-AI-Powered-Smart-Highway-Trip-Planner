package com.roadsync.util;

public final class DelayCalculator {

    private DelayCalculator() {
        // Utility class
    }

    public static int calculateDelay(int trafficScore) {
        if (trafficScore <= 30) {
            return 5;
        } else if (trafficScore <= 50) {
            return 10;
        } else if (trafficScore <= 70) {
            return 20;
        } else if (trafficScore <= 85) {
            return 35;
        }
        return 50;
    }
}

