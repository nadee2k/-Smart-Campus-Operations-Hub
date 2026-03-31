package com.smartcampus.ticket.dto;

import jakarta.validation.constraints.NotBlank;

public class CommentRequest {

    @NotBlank(message = "Content is required")
    private String content;

    private Boolean isInternal;

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Boolean getIsInternal() { return isInternal; }
    public void setIsInternal(Boolean isInternal) { this.isInternal = isInternal; }
}
