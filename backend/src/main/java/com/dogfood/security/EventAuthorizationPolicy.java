package com.dogfood.security;

import com.dogfood.auth.EventRole;
import com.dogfood.auth.EventRoleRepository;
import com.dogfood.auth.RoleType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class EventAuthorizationPolicy {

    private final EventRoleRepository eventRoleRepository;

    public EventAuthorizationPolicy(EventRoleRepository eventRoleRepository) {
        this.eventRoleRepository = eventRoleRepository;
    }

    /**
     * Enforces that a given user has the required role for the specific event.
     * Throws AccessDeniedException if not authorized.
     */
    public void requireEventRole(Long userId, Long eventId, RoleType requiredRole) {
        if (userId == null || eventId == null || requiredRole == null) {
            throw new AccessDeniedException("Unauthorized: missing user or event credentials");
        }

        Optional<EventRole> eventRole = eventRoleRepository.findByUserIdAndEventIdAndRole(userId, eventId, requiredRole);
        if (eventRole.isEmpty()) {
            throw new AccessDeniedException(
                    String.format("Access denied: User %d does not have %s role for Event %d", userId, requiredRole, eventId)
            );
        }
    }

    /**
     * Checks if a user has any of the specified roles for the event.
     */
    public boolean hasEventRole(Long userId, Long eventId, RoleType role) {
        if (userId == null || eventId == null || role == null) {
            return false;
        }
        return eventRoleRepository.findByUserIdAndEventIdAndRole(userId, eventId, role).isPresent();
    }

    /**
     * Checks if a user has ORGANIZER or ADMIN role.
     */
    public boolean isOrganizerOrAdmin(Long userId) {
        if (userId == null) {
            return false;
        }
        return eventRoleRepository.findByUserId(userId).stream()
                .anyMatch(r -> r.getRole() == RoleType.ORGANIZER || r.getRole() == RoleType.ADMIN);
    }

    /**
     * Enforces that a user has ORGANIZER or ADMIN role to create new events.
     * Throws AccessDeniedException if not authorized.
     */
    public void requireOrganizerOrAdmin(Long userId) {
        if (userId == null) {
            throw new AccessDeniedException("Unauthorized: missing user credentials");
        }
        if (!isOrganizerOrAdmin(userId)) {
            throw new AccessDeniedException(
                    String.format("Access denied: User %d does not have ORGANIZER or ADMIN role to create events", userId)
            );
        }
    }
}
