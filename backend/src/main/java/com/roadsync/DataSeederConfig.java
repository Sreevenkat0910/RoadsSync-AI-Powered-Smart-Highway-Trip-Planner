package com.roadsync;

import com.roadsync.model.Trip;
import com.roadsync.model.User;
import com.roadsync.model.Vehicle;
import com.roadsync.repository.TripRepository;
import com.roadsync.repository.UserRepository;
import com.roadsync.repository.VehicleRepository;
import java.time.LocalDate;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataSeederConfig {

    @Bean
    CommandLineRunner seedData(
            UserRepository userRepository,
            VehicleRepository vehicleRepository,
            TripRepository tripRepository
    ) {
        return args -> {
            if (userRepository.count() > 0) {
                return;
            }

            User user1 = userRepository.save(new User(null, "Rahul Sharma", "rahul@roadsync.in"));
            User user2 = userRepository.save(new User(null, "Ananya Reddy", "ananya@roadsync.in"));

            Vehicle vehicle1 = vehicleRepository.save(new Vehicle(null, "car", "petrol", 15.2, user1));
            Vehicle vehicle2 = vehicleRepository.save(new Vehicle(null, "EV", "electric", 320.0, user1));
            Vehicle vehicle3 = vehicleRepository.save(new Vehicle(null, "bike", "petrol", 45.0, user2));

            tripRepository.save(new Trip(null, "Hyderabad", "Vijayawada", LocalDate.now().plusDays(2), null, user1, vehicle1));
            tripRepository.save(new Trip(null, "Bangalore", "Mysore", LocalDate.now().plusDays(5), null, user1, vehicle2));
            tripRepository.save(new Trip(null, "Delhi", "Jaipur", LocalDate.now().plusDays(1), null, user2, vehicle3));
        };
    }
}

