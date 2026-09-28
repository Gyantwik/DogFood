package com.dogfood.export;

import com.dogfood.auth.RoleType;
import com.dogfood.auth.User;
import com.dogfood.common.audit.AuditLogService;
import com.dogfood.security.EventAuthorizationPolicy;
import com.dogfood.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ExportAuditLoggingTest {

    @Mock private CsvExportService csvExportService;
    @Mock private EventAuthorizationPolicy authorizationPolicy;
    @Mock private AuditLogService auditLogService;

    @InjectMocks private ExportController exportController;

    private UserPrincipal organizerPrincipal;
    private Long eventId = 1L;
    private Long organizerId = 10L;

    @BeforeEach
    void setUp() {
        User user = new User("organizer", "organizer@dogfood.local", "hash");
        user.setId(organizerId);
        organizerPrincipal = UserPrincipal.create(user);
    }

    @Test
    void testExportScores_AuthorizedSuccess_LogsExportCsvAction() {
        byte[] mockCsv = "Score ID,Submission ID,Raw Score\n1,101,4.5\n".getBytes(StandardCharsets.UTF_8);
        when(csvExportService.exportScoresCsv(eventId)).thenReturn(mockCsv);
        doNothing().when(authorizationPolicy).requireEventRole(organizerId, eventId, RoleType.ORGANIZER);

        ResponseEntity<byte[]> response = exportController.exportScores(eventId, organizerPrincipal);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("text/csv", response.getHeaders().getContentType().toString());

        ArgumentCaptor<String> detailsCaptor = ArgumentCaptor.forClass(String.class);
        verify(auditLogService, times(1)).logAction(eq(organizerId), eq(eventId), eq("EXPORT_CSV"), detailsCaptor.capture());

        String loggedDetails = detailsCaptor.getValue();
        assertTrue(loggedDetails.contains("scores CSV"));
        assertFalse(loggedDetails.contains("Bearer"));
        assertFalse(loggedDetails.contains("Score ID"));
    }

    @Test
    void testExportSubmissions_AuthorizedSuccess_LogsExportCsvAction() {
        byte[] mockCsv = "Submission ID,Title\n101,Test Project\n".getBytes(StandardCharsets.UTF_8);
        when(csvExportService.exportSubmissionsCsv(eventId)).thenReturn(mockCsv);
        doNothing().when(authorizationPolicy).requireEventRole(organizerId, eventId, RoleType.ORGANIZER);

        ResponseEntity<byte[]> response = exportController.exportSubmissions(eventId, organizerPrincipal);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(auditLogService, times(1)).logAction(eq(organizerId), eq(eventId), eq("EXPORT_CSV"), anyString());
    }

    @Test
    void testExportResults_AuthorizedSuccess_LogsExportCsvAction() {
        byte[] mockCsv = "Rank,Title,Score\n1,Alpha,95.0\n".getBytes(StandardCharsets.UTF_8);
        when(csvExportService.exportResultsCsv(eventId)).thenReturn(mockCsv);
        doNothing().when(authorizationPolicy).requireEventRole(organizerId, eventId, RoleType.ORGANIZER);

        ResponseEntity<byte[]> response = exportController.exportResults(eventId, organizerPrincipal);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(auditLogService, times(1)).logAction(eq(organizerId), eq(eventId), eq("EXPORT_CSV"), anyString());
    }

    @Test
    void testExportScores_DeniedRole_DoesNotLogAuditAction() {
        doThrow(new AccessDeniedException("Access denied: ORGANIZER role required"))
                .when(authorizationPolicy).requireEventRole(organizerId, eventId, RoleType.ORGANIZER);

        assertThrows(AccessDeniedException.class, () -> exportController.exportScores(eventId, organizerPrincipal));

        verify(csvExportService, never()).exportScoresCsv(anyLong());
        verify(auditLogService, never()).logAction(any(), any(), any(), any());
    }

    @Test
    void testExportScores_ServiceFailure_DoesNotLogAuditAction() {
        doNothing().when(authorizationPolicy).requireEventRole(organizerId, eventId, RoleType.ORGANIZER);
        when(csvExportService.exportScoresCsv(eventId)).thenThrow(new RuntimeException("Database error generating CSV"));

        assertThrows(RuntimeException.class, () -> exportController.exportScores(eventId, organizerPrincipal));

        verify(auditLogService, never()).logAction(any(), any(), any(), any());
    }
}
