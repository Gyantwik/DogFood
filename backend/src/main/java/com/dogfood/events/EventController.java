package com.dogfood.events;

import com.dogfood.common.ApiResponse;
import com.dogfood.events.dto.CreateEventRequest;
import com.dogfood.events.dto.CreateTrackRequest;
import com.dogfood.events.dto.EventDetailResponse;
import com.dogfood.events.dto.EventRegistrationResponse;
import com.dogfood.events.dto.TrackDto;
import com.dogfood.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Event>>> listEvents() {
        List<Event> events = eventService.listEvents();
        return ResponseEntity.ok(ApiResponse.ok(events));
    }

    @GetMapping("/{eventId}")
    public ResponseEntity<ApiResponse<EventDetailResponse>> getEvent(@PathVariable Long eventId) {
        EventDetailResponse event = eventService.getEvent(eventId);
        return ResponseEntity.ok(ApiResponse.ok(event));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<EventDetailResponse>> createEvent(
            @Valid @RequestBody CreateEventRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        EventDetailResponse response = eventService.createEvent(request, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Event created successfully", response));
    }

    @PostMapping("/{eventId}/tracks")
    public ResponseEntity<ApiResponse<TrackDto>> addTrack(
            @PathVariable Long eventId,
            @Valid @RequestBody CreateTrackRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        TrackDto track = eventService.addTrack(eventId, request, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Track added successfully", track));
    }

    @GetMapping("/{eventId}/tracks")
    public ResponseEntity<ApiResponse<List<TrackDto>>> getTracks(@PathVariable Long eventId) {
        List<TrackDto> tracks = eventService.getTracks(eventId);
        return ResponseEntity.ok(ApiResponse.ok(tracks));
    }

    @PostMapping("/{eventId}/register")
    public ResponseEntity<ApiResponse<EventRegistrationResponse>> registerForEvent(
            @PathVariable Long eventId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        EventRegistrationResponse response = eventService.registerForEvent(eventId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Registered successfully", response));
    }

    @GetMapping("/{eventId}/questions")
    public ResponseEntity<ApiResponse<List<EventCustomQuestion>>> getCustomQuestions(@PathVariable Long eventId) {
        List<EventCustomQuestion> questions = eventService.getCustomQuestions(eventId);
        return ResponseEntity.ok(ApiResponse.ok(questions));
    }

    @PostMapping("/{eventId}/questions")
    public ResponseEntity<ApiResponse<EventCustomQuestion>> addCustomQuestion(
            @PathVariable Long eventId,
            @RequestBody java.util.Map<String, Object> body,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        String prompt = (String) body.getOrDefault("prompt", "");
        String questionType = (String) body.getOrDefault("questionType", "TEXT");
        boolean required = Boolean.TRUE.equals(body.get("required"));
        EventCustomQuestion created = eventService.addCustomQuestion(eventId, prompt, questionType, required, currentUser.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Question added successfully", created));
    }

    @DeleteMapping("/{eventId}/questions/{questionId}")
    public ResponseEntity<ApiResponse<Void>> deleteCustomQuestion(
            @PathVariable Long eventId,
            @PathVariable Long questionId,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        eventService.deleteCustomQuestion(eventId, questionId, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Question deleted successfully", null));
    }

    @RequestMapping(value = "/{eventId}", method = {RequestMethod.PUT, RequestMethod.PATCH})
    public ResponseEntity<ApiResponse<EventDetailResponse>> updateEvent(
            @PathVariable Long eventId,
            @RequestBody CreateEventRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ApiResponse.error("Authentication required"));
        }
        EventDetailResponse response = eventService.updateEvent(eventId, request, currentUser.getId());
        return ResponseEntity.ok(ApiResponse.ok("Event updated successfully", response));
    }
}
