package com.smartcampus.assistant.controller;

import com.smartcampus.assistant.dto.AssistantChatRequest;
import com.smartcampus.assistant.dto.AssistantChatResponse;
import com.smartcampus.assistant.service.ResourceAssistantService;
import com.smartcampus.config.security.AuthUtil;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/assistant/resource")
public class ResourceAssistantController {

    private final ResourceAssistantService resourceAssistantService;

    public ResourceAssistantController(ResourceAssistantService resourceAssistantService) {
        this.resourceAssistantService = resourceAssistantService;
    }

    @PostMapping("/chat")
    public ResponseEntity<AssistantChatResponse> chat(@Valid @RequestBody AssistantChatRequest request) {
        return ResponseEntity.ok(resourceAssistantService.chat(request, AuthUtil.getCurrentUserId()));
    }
}
