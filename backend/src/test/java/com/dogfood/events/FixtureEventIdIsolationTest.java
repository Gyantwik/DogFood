package com.dogfood.events;

import com.dogfood.auth.*;
import com.dogfood.config.DataSeeder;
import com.dogfood.judging.*;
import com.dogfood.security.JwtTokenProvider;
import com.dogfood.teams.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class FixtureEventIdIsolationTest {

    @Mock private UserRepository userRepository;
    @Mock private EventRoleRepository eventRoleRepository;
    @Mock private EventRepository eventRepository;
    @Mock private TrackRepository trackRepository;
    @Mock private TeamRepository teamRepository;
    @Mock private TeamMemberRepository teamMemberRepository;
    @Mock private SubmissionRepository submissionRepository;
    @Mock private RubricRepository rubricRepository;
    @Mock private RubricCriterionRepository rubricCriterionRepository;
    @Mock private JudgeAssignmentRepository judgeAssignmentRepository;
    @Mock private JudgeTrackRepository judgeTrackRepository;
    @Mock private ScoreRepository scoreRepository;
    @Mock private ScoreCriterionValueRepository scoreCriterionValueRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwtTokenProvider;

    @InjectMocks private DataSeeder dataSeeder;

    @Test
    void testFixtureEventDoesNotOverwriteUnrelatedEventAtId1() {
        // Event 1 is an unrelated legacy event
        Event unrelatedEvent1 = new Event("Legacy Hackathon 2024", "Unrelated", Instant.now());
        unrelatedEvent1.setId(1L);

        // When searching all events, only unrelated event 1 exists initially
        when(eventRepository.findAll()).thenReturn(Collections.singletonList(unrelatedEvent1));
        when(eventRepository.save(any(Event.class))).thenAnswer(invocation -> {
            Event e = invocation.getArgument(0);
            if (e.getName().equals("Sample Hack 2026")) {
                e.setId(2L);
            }
            return e;
        });

        when(userRepository.findByEmail(anyString())).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(50L);
            return u;
        });
        when(jwtTokenProvider.generateToken(any(), any(), any())).thenReturn("mock_token");

        // Mock other repository saves to return valid entities with IDs
        when(trackRepository.findByEventIdAndName(anyLong(), anyString())).thenReturn(Optional.empty());
        when(trackRepository.save(any(Track.class))).thenAnswer(inv -> {
            Track t = inv.getArgument(0);
            t.setId(10L);
            return t;
        });

        when(teamRepository.findByInviteCode(anyString())).thenReturn(Optional.empty());
        when(teamRepository.save(any(Team.class))).thenAnswer(inv -> {
            Team tm = inv.getArgument(0);
            tm.setId(20L);
            return tm;
        });

        when(submissionRepository.findByEventIdAndTitle(anyLong(), anyString())).thenReturn(Optional.empty());
        when(submissionRepository.save(any(Submission.class))).thenAnswer(inv -> {
            Submission s = inv.getArgument(0);
            s.setId(30L);
            return s;
        });

        when(rubricRepository.findByEventId(anyLong())).thenReturn(Optional.empty());
        when(rubricRepository.save(any(Rubric.class))).thenAnswer(inv -> {
            Rubric r = inv.getArgument(0);
            r.setId(40L);
            return r;
        });

        when(scoreRepository.save(any(Score.class))).thenAnswer(inv -> {
            Score sc = inv.getArgument(0);
            sc.setId(50L);
            return sc;
        });

        // Run seeder
        dataSeeder.run();

        // Verify Event 1 was NEVER mutated or overwritten with Sample Hack 2026
        assertEquals("Legacy Hackathon 2024", unrelatedEvent1.getName());
        assertEquals(1L, unrelatedEvent1.getId());

        // Verify save was called for Sample Hack 2026 with generated ID 2
        verify(eventRepository, atLeastOnce()).save(argThat(e -> 
            e.getName().equals("Sample Hack 2026") && "CLOSED".equals(e.getStatus())
        ));
    }
}
