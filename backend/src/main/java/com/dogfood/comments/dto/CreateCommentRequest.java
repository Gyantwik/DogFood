package com.dogfood.comments.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateCommentRequest {

    private String authorName;
    private String authorEmail;

    @NotBlank(message = "Comment content cannot be blank")
    @Size(min = 1, max = 1000, message = "Comment must be between 1 and 1000 characters")
    private String content;

    public CreateCommentRequest() {}

    public CreateCommentRequest(String authorName, String authorEmail, String content) {
        this.authorName = authorName;
        this.authorEmail = authorEmail;
        this.content = content;
    }

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }

    public String getAuthorEmail() { return authorEmail; }
    public void setAuthorEmail(String authorEmail) { this.authorEmail = authorEmail; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
}
