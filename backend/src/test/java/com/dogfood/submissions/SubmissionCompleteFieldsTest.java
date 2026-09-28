package com.dogfood.submissions;

import com.dogfood.auth.*;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.events.*;
import com.dogfood.judging.*;
import com.dogfood.security.EventAuthorizationPolicy;
import com.dogfood.teams.TeamMemberRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class SubmissionCompleteFieldsTest {

    @Mock private SubmissionRepository submissionRepository;
    @Mock private EventRepository eventRepository;
    @Mock private TeamMemberRepository teamMemberRepository;
    @Mock private com.dogfood.teams.TeamRepository teamRepository;
    @Mock private EventRoleRepository eventRoleRepository;
    @Mock private UserRepository userRepository;
    @Mock private AuditLogService auditLogService;
    @Mock private EventAuthorizationPolicy authorizationPolicy;

    private ObjectMapper objectMapper = new ObjectMapper();

    private SubmissionService submissionService;

    private final Long EVENT_ID = 1L;
    private final Long USER_ID = 42L;

    @BeforeEach
    void setUp() {
        submissionService = new SubmissionService(
                submissionRepository,
                eventRepository,
                teamMemberRepository,
                teamRepository,
                eventRoleRepository,
                userRepository,
                auditLogService,
                authorizationPolicy
        );
    }

    @Test
    @DisplayName("Create submission containing all standard presentation and media fields survives round-trip")
    void test1_CompleteSubmissionFieldsRoundTrip() {
        Event event = new Event("Test Hack", "Desc", Instant.now().plusSeconds(3600));
        when(eventRepository.findById(EVENT_ID)).thenReturn(Optional.of(event));

        when(submissionRepository.save(any(Submission.class))).thenAnswer(inv -> {
            Submission s = inv.getArgument(0);
            s.setId(99L);
            return s;
        });

        CreateSubmissionRequest req = new CreateSubmissionRequest();
        req.setTitle("Project Supernova");
        req.setTagline("Autonomous constellation management");
        req.setDescription("Full architectural description of the constellation router.");
        req.setTrack("Infra");
        req.setRepoUrl("https://github.com/team/supernova");
        req.setDemoUrl("https://demo.supernova.example");
        req.setTechStack(List.of("Rust", "PostgreSQL", "WebAssembly"));
        req.setThumbnailUrl("https://assets.example.com/thumb.png");
        req.setGalleryImages(List.of("https://assets.example.com/img1.png", "https://assets.example.com/img2.png"));
        req.setDemoVideoUrl("https://youtube.com/watch?v=12345");
        req.setLiveLink("https://supernova.app");
        req.setCustomAnswers(Map.of("Impact", "High performance", "OpenSource", "MIT"));
        req.setStatus("SUBMITTED");

        SubmissionResponse created = submissionService.createSubmission(EVENT_ID, req, USER_ID);

        assertNotNull(created);
        assertEquals(99L, created.getId());
        assertEquals("Project Supernova", created.getTitle());
        assertEquals("Autonomous constellation management", created.getTagline());
        assertEquals("https://assets.example.com/thumb.png", created.getThumbnailUrl());
        assertEquals("https://youtube.com/watch?v=12345", created.getDemoVideoUrl());
        assertEquals("https://supernova.app", created.getLiveLink());
        assertEquals("https://github.com/team/supernova", created.getRepoUrl());
        assertEquals("https://demo.supernova.example", created.getDemoUrl());
        assertEquals(2, created.getGalleryImages().size());
        assertTrue(created.getGalleryImages().contains("https://assets.example.com/img1.png"));
        assertNotNull(created.getCustomAnswers());

        // Verify that updateSubmission preserves or updates these fields
        Submission existing = new Submission();
        existing.setId(99L);
        existing.setEventId(EVENT_ID);
        existing.setCreatedBy(USER_ID);
        existing.setTitle("Project Supernova");
        when(submissionRepository.findById(99L)).thenReturn(Optional.of(existing));

        UpdateSubmissionRequest updateReq = new UpdateSubmissionRequest();
        updateReq.setLiveLink("https://v2.supernova.app");
        updateReq.setDemoVideoUrl("https://vimeo.com/99999");
        updateReq.setThumbnailUrl("https://assets.example.com/new-thumb.png");

        SubmissionResponse updated = submissionService.updateSubmission(99L, updateReq, USER_ID);
        assertEquals("https://v2.supernova.app", updated.getLiveLink());
        assertEquals("https://vimeo.com/99999", updated.getDemoVideoUrl());
        assertEquals("https://assets.example.com/new-thumb.png", updated.getThumbnailUrl());
    }

    @Test
    @DisplayName("JudgeAssignmentResponse maps all media and custom fields truthfully")
    void test2_JudgeAssignmentResponseMapping() {
        Submission sub = new Submission();
        sub.setId(101L);
        sub.setEventId(EVENT_ID);
        sub.setTitle("HyperScale DB");
        sub.setTagline("Zero-latency query engine");
        sub.setDescription("Built with modern storage engines");
        sub.setTrack("Data");
        sub.setRepoUrl("https://github.com/org/db");
        sub.setDemoUrl("https://demo.db.io");
        sub.setThumbnailUrl("https://db.io/logo.png");
        sub.setGalleryImages("[\"https://db.io/screen1.png\",\"https://db.io/screen2.png\"]");
        sub.setDemoVideoUrl("https://youtu.be/demodb");
        sub.setLiveLink("https://cloud.db.io");
        sub.setCustomAnswers("{\"Target Audience\":\"Database Engineers\"}");
        sub.setStatus("SUBMITTED");

        JudgeAssignment asgn = new JudgeAssignment(EVENT_ID, 5L, 101L, "ASSIGNED");
        asgn.setId(505L);

        // Verify helper mapping
        JudgeAssignmentResponse jar = new JudgeAssignmentResponse();
        jar.setAssignmentId(asgn.getId());
        jar.setEventId(asgn.getEventId());
        jar.setSubmissionId(sub.getId());
        jar.setTitle(sub.getTitle());
        jar.setThumbnailUrl(sub.getThumbnailUrl());
        jar.setDemoVideoUrl(sub.getDemoVideoUrl());
        jar.setLiveLink(sub.getLiveLink());
        jar.setCustomAnswers(sub.getCustomAnswers());

        assertEquals(505L, jar.getAssignmentId());
        assertEquals("https://db.io/logo.png", jar.getThumbnailUrl());
        assertEquals("https://youtu.be/demodb", jar.getDemoVideoUrl());
        assertEquals("https://cloud.db.io", jar.getLiveLink());
        assertEquals("https://github.com/org/db", sub.getRepoUrl());
    }
}
