package com.dogfood.security;

import com.dogfood.auth.EventRole;
import com.dogfood.auth.EventRoleRepository;
import com.dogfood.auth.RoleType;
import com.dogfood.auth.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.access.AccessDeniedException;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

class EventAuthorizationPolicyTest {

    private EventRoleRepository eventRoleRepository;
    private EventAuthorizationPolicy policy;

    @BeforeEach
    void setUp() {
        eventRoleRepository = Mockito.mock(EventRoleRepository.class);
        policy = new EventAuthorizationPolicy(eventRoleRepository);
    }

    @Test
    void testRequireEventRole_Success() {
        User user = new User("judge_a", "judge_a@dogfood.local", "hash");
        user.setId(2L);
        EventRole role = new EventRole(user, 1L, RoleType.JUDGE);

        when(eventRoleRepository.findByUserIdAndEventIdAndRole(2L, 1L, RoleType.JUDGE))
                .thenReturn(Optional.of(role));

        assertDoesNotThrow(() -> policy.requireEventRole(2L, 1L, RoleType.JUDGE));
    }

    @Test
    void testRequireEventRole_AccessDenied() {
        when(eventRoleRepository.findByUserIdAndEventIdAndRole(2L, 1L, RoleType.ORGANIZER))
                .thenReturn(Optional.empty());

        assertThrows(AccessDeniedException.class, () -> policy.requireEventRole(2L, 1L, RoleType.ORGANIZER));
    }
}
