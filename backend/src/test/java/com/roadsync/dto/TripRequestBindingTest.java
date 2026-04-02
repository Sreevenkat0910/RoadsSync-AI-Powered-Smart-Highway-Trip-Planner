package com.roadsync.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class TripRequestBindingTest {

    @Test
    void preferredTimeDeserializesFromJson() throws Exception {
        ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
        String json =
                "{\"userId\":1,\"vehicleId\":2,\"source\":\"Hyderabad\",\"destination\":\"Vijayawada\","
                        + "\"travelDate\":\"2026-04-10\",\"preferredTime\":\"morning\"}";
        TripRequest r = mapper.readValue(json, TripRequest.class);
        assertThat(r.getPreferredTime()).isEqualTo("morning");
        assertThat(r.getUserId()).isEqualTo(1L);
        assertThat(r.getVehicleId()).isEqualTo(2L);
        assertThat(r.getTravelDate()).isEqualTo(LocalDate.of(2026, 4, 10));
    }

    @Test
    void omittedPreferredTimeIsNull() throws Exception {
        ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
        String json =
                "{\"userId\":1,\"vehicleId\":2,\"source\":\"a\",\"destination\":\"b\",\"travelDate\":\"2026-04-10\"}";
        TripRequest r = mapper.readValue(json, TripRequest.class);
        assertThat(r.getPreferredTime()).isNull();
    }
}
