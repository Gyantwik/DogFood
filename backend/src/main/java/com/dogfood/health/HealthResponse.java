package com.dogfood.health;

public class HealthResponse {
    private String status;
    private String database;
    private boolean seeded;
    private long roles_loaded;
    private long events_count;

    public HealthResponse() {}

    public HealthResponse(String status, String database, boolean seeded, long rolesLoaded, long eventsCount) {
        this.status = status;
        this.database = database;
        this.seeded = seeded;
        this.roles_loaded = rolesLoaded;
        this.events_count = eventsCount;
    }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDatabase() { return database; }
    public void setDatabase(String database) { this.database = database; }

    public boolean isSeeded() { return seeded; }
    public void setSeeded(boolean seeded) { this.seeded = seeded; }

    public long getRoles_loaded() { return roles_loaded; }
    public void setRoles_loaded(long roles_loaded) { this.roles_loaded = roles_loaded; }

    public long getEvents_count() { return events_count; }
    public void setEvents_count(long events_count) { this.events_count = events_count; }
}
