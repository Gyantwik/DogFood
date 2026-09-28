package com.dogfood.health;

import com.dogfood.auth.EventRoleRepository;
import com.dogfood.events.EventRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;

@RestController
@RequestMapping("/api/health")
public class HealthController {

    private final DataSource dataSource;
    private final EventRoleRepository eventRoleRepository;
    private final EventRepository eventRepository;

    public HealthController(DataSource dataSource, EventRoleRepository eventRoleRepository, EventRepository eventRepository) {
        this.dataSource = dataSource;
        this.eventRoleRepository = eventRoleRepository;
        this.eventRepository = eventRepository;
    }

    @GetMapping
    public ResponseEntity<HealthResponse> getHealth() {
        String dbStatus = "DISCONNECTED";
        try (Connection conn = dataSource.getConnection()) {
            if (conn.isValid(2)) {
                dbStatus = "CONNECTED";
            }
        } catch (Exception ignored) {
            dbStatus = "ERROR";
        }

        long rolesLoaded = eventRoleRepository.count();
        long eventsCount = eventRepository.count();
        boolean seeded = rolesLoaded > 0;

        HealthResponse response = new HealthResponse("UP", dbStatus, seeded, rolesLoaded, eventsCount);
        return ResponseEntity.ok(response);
    }
}
