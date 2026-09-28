package com.dogfood.events.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateTrackRequest {

    @NotBlank(message = "Track name is required")
    private String name;

    private String description;

    public CreateTrackRequest() {}

    public CreateTrackRequest(String name, String description) {
        this.name = name;
        this.description = description;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
