package com.smartcampus.assistant.dto;

import java.util.List;

public record AssistantChatResponse(
        String answer,
        List<AssistantResourceSuggestion> suggestions,
        boolean aiEnhanced,
        String mode
) {
}
