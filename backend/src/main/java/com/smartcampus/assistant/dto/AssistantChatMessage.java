package com.smartcampus.assistant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AssistantChatMessage(
        @NotBlank(message = "Message role is required")
        String role,
        @NotBlank(message = "Message content is required")
        String content
) {
}
