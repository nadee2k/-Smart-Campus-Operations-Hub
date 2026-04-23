package com.smartcampus.assistant.service;

import com.smartcampus.assistant.dto.AssistantChatRequest;
import com.smartcampus.assistant.dto.AssistantChatResponse;

public interface ResourceAssistantService {

    AssistantChatResponse chat(AssistantChatRequest request, Long userId);
}
