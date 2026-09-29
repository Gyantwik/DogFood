package com.dogfood.bulk;

public class CloneEventRequest {

    private String newName;
    private Boolean copyTracks = true;
    private Boolean copyRubrics = true;
    private Boolean copyCustomQuestions = true;
    private Long dateOffsetDays = 0L; // Shift timeline dates by N days

    public CloneEventRequest() {}

    public CloneEventRequest(String newName, Boolean copyTracks, Boolean copyRubrics, Boolean copyCustomQuestions, Long dateOffsetDays) {
        this.newName = newName;
        this.copyTracks = copyTracks != null ? copyTracks : true;
        this.copyRubrics = copyRubrics != null ? copyRubrics : true;
        this.copyCustomQuestions = copyCustomQuestions != null ? copyCustomQuestions : true;
        this.dateOffsetDays = dateOffsetDays != null ? dateOffsetDays : 0L;
    }

    public String getNewName() {
        return newName;
    }

    public void setNewName(String newName) {
        this.newName = newName;
    }

    public Boolean getCopyTracks() {
        return copyTracks;
    }

    public void setCopyTracks(Boolean copyTracks) {
        this.copyTracks = copyTracks;
    }

    public Boolean getCopyRubrics() {
        return copyRubrics;
    }

    public void setCopyRubrics(Boolean copyRubrics) {
        this.copyRubrics = copyRubrics;
    }

    public Boolean getCopyCustomQuestions() {
        return copyCustomQuestions;
    }

    public void setCopyCustomQuestions(Boolean copyCustomQuestions) {
        this.copyCustomQuestions = copyCustomQuestions;
    }

    public Long getDateOffsetDays() {
        return dateOffsetDays;
    }

    public void setDateOffsetDays(Long dateOffsetDays) {
        this.dateOffsetDays = dateOffsetDays;
    }
}
