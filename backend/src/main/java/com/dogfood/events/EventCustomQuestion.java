package com.dogfood.events;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "event_custom_questions")
public class EventCustomQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String prompt;

    @Column(name = "question_type", length = 50)
    private String questionType = "TEXT";

    private boolean required = false;

    @Column(name = "display_order")
    private int displayOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public EventCustomQuestion() {}

    public EventCustomQuestion(Long eventId, String prompt, String questionType, boolean required, int displayOrder) {
        this.eventId = eventId;
        this.prompt = prompt;
        this.questionType = questionType != null ? questionType : "TEXT";
        this.required = required;
        this.displayOrder = displayOrder;
        this.createdAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public String getPrompt() { return prompt; }
    public void setPrompt(String prompt) { this.prompt = prompt; }

    public String getQuestionType() { return questionType; }
    public void setQuestionType(String questionType) { this.questionType = questionType; }

    public boolean isRequired() { return required; }
    public void setRequired(boolean required) { this.required = required; }

    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int displayOrder) { this.displayOrder = displayOrder; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
