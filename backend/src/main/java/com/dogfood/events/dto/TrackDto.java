package com.dogfood.events.dto;

public class TrackDto {

    private Long id;
    private Long eventId;
    private String name;
    private String description;

    public TrackDto() {}

    public TrackDto(Long id, Long eventId, String name, String description) {
        this.id = id;
        this.eventId = eventId;
        this.name = name;
        this.description = description;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getEventId() { return eventId; }
    public void setEventId(Long eventId) { this.eventId = eventId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
