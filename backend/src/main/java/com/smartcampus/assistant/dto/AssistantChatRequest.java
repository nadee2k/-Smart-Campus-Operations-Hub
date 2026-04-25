package com.smartcampus.assistant.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class AssistantChatRequest {

    @NotEmpty(message = "At least one message is required")
    @Valid
    private List<AssistantChatMessage> messages;

    private Long resourceId;

    public List<AssistantChatMessage> getMessages() {
        return messages;
    }

    public void setMessages(List<AssistantChatMessage> messages) {
        this.messages = messages;
    }

    public Long getResourceId() {
        return resourceId;
    }

    public void setResourceId(Long resourceId) {
        this.resourceId = resourceId;
    }
}
