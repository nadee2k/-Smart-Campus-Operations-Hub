package com.smartcampus.assistant.service;

import com.smartcampus.assistant.dto.AssistantChatMessage;
import com.smartcampus.assistant.dto.AssistantChatRequest;
import com.smartcampus.assistant.dto.AssistantChatResponse;
import com.smartcampus.assistant.dto.AssistantResourceSuggestion;
import com.smartcampus.auth.entity.User;
import com.smartcampus.auth.service.UserService;
import com.smartcampus.booking.service.BookingService;
import com.smartcampus.common.exception.BadRequestException;
import com.smartcampus.resource.dto.ResourceResponse;
import com.smartcampus.resource.repository.CampusResourceRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ResourceAssistantServiceImpl implements ResourceAssistantService {

    private static final Pattern ATTENDEE_PATTERN =
            Pattern.compile("(\\d+)\\s*(people|persons|students|attendees|seats?)", Pattern.CASE_INSENSITIVE);

    private final CampusResourceRepository resourceRepository;
    private final BookingService bookingService;
    private final UserService userService;
    private final RestClient restClient;
    private final String openAiApiKey;
    private final String openAiModel;

    public ResourceAssistantServiceImpl(CampusResourceRepository resourceRepository,
                                        BookingService bookingService,
                                        UserService userService,
                                        RestClient.Builder restClientBuilder,
                                        @Value("${app.ai.openai.api-key:}") String openAiApiKey,
                                        @Value("${app.ai.openai.model:gpt-5.2}") String openAiModel,
                                        @Value("${app.ai.openai.base-url:https://api.openai.com/v1}") String openAiBaseUrl) {
        this.resourceRepository = resourceRepository;
        this.bookingService = bookingService;
        this.userService = userService;
        this.restClient = restClientBuilder.baseUrl(openAiBaseUrl).build();
        this.openAiApiKey = openAiApiKey;
        this.openAiModel = openAiModel;
    }

    @Override
    @Transactional(readOnly = true)
    public AssistantChatResponse chat(AssistantChatRequest request, Long userId) {
        if (request.getMessages() == null || request.getMessages().isEmpty()) {
            throw new BadRequestException("At least one message is required");
        }

        String latestUserMessage = request.getMessages().stream()
                .filter(message -> "user".equalsIgnoreCase(message.role()))
                .reduce((first, second) -> second)
                .map(AssistantChatMessage::content)
                .orElseThrow(() -> new BadRequestException("A user message is required"));

        User user = userService.findById(userId);
        List<ResourceResponse> resources = resourceRepository.findByDeletedFalse(PageRequest.of(0, 100))
                .stream()
                .map(this::toResourceResponse)
                .toList();

        List<AssistantResourceSuggestion> suggestions = findSuggestions(resources, latestUserMessage, request.getResourceId());
        String fallbackAnswer = buildFallbackAnswer(user, latestUserMessage, suggestions, request.getResourceId(), resources);

        if (!StringUtils.hasText(openAiApiKey)) {
            return new AssistantChatResponse(fallbackAnswer, suggestions, false, "fallback");
        }

        try {
            String aiAnswer = generateAiAnswer(user, request.getMessages(), suggestions, request.getResourceId(), resources, fallbackAnswer);
            return new AssistantChatResponse(aiAnswer, suggestions, true, "openai");
        } catch (RestClientException | IllegalStateException exception) {
            return new AssistantChatResponse(fallbackAnswer, suggestions, false, "fallback");
        }
    }

    private String generateAiAnswer(User user,
                                    List<AssistantChatMessage> messages,
                                    List<AssistantResourceSuggestion> suggestions,
                                    Long selectedResourceId,
                                    List<ResourceResponse> resources,
                                    String fallbackAnswer) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("model", openAiModel);
        payload.put("reasoning", Map.of("effort", "low"));
        payload.put("instructions", buildInstructions());
        payload.put("input", buildInputMessages(user, messages, suggestions, selectedResourceId, resources, fallbackAnswer));

        Map<String, Object> response = restClient.post()
                .uri("/responses")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + openAiApiKey)
                .body(payload)
                .retrieve()
                .body(Map.class);

        String answer = extractOutputText(response);
        if (!StringUtils.hasText(answer)) {
            throw new IllegalStateException("No answer returned from OpenAI");
        }
        return answer.trim();
    }

    private List<Map<String, Object>> buildInputMessages(User user,
                                                         List<AssistantChatMessage> messages,
                                                         List<AssistantResourceSuggestion> suggestions,
                                                         Long selectedResourceId,
                                                         List<ResourceResponse> resources,
                                                         String fallbackAnswer) {
        List<Map<String, Object>> input = new ArrayList<>();

        input.add(Map.of(
                "role", "developer",
                "content", buildContextBlock(user, suggestions, selectedResourceId, resources, fallbackAnswer)
        ));

        messages.stream()
                .filter(message -> StringUtils.hasText(message.content()))
                .limit(10)
                .forEach(message -> input.add(Map.of(
                        "role", normalizeRole(message.role()),
                        "content", message.content()
                )));

        return input;
    }

    private String buildInstructions() {
        return """
                You are the UniOps AI Resource Assistant.
                Answer only using the campus resource data and booking guidance provided by the application.
                Be helpful, concise, and actionable.
                If the user asks for recommendations, explain the top 1-3 matches and why they fit.
                If the user asks to book, guide them toward the provided booking links rather than inventing a completed booking.
                Do not claim live availability beyond the provided data.
                """;
    }

    private String buildContextBlock(User user,
                                     List<AssistantResourceSuggestion> suggestions,
                                     Long selectedResourceId,
                                     List<ResourceResponse> resources,
                                     String fallbackAnswer) {
        String selectedResource = resources.stream()
                .filter(resource -> selectedResourceId != null && selectedResourceId.equals(resource.id()))
                .findFirst()
                .map(resource -> String.format(
                        Locale.US,
                        "Selected resource: %s (%s), capacity %d, status %s, location %s, availability %s-%s.",
                        resource.name(),
                        resource.type(),
                        resource.capacity(),
                        resource.status(),
                        safe(resource.location()),
                        safe(resource.availabilityStartTime()),
                        safe(resource.availabilityEndTime())
                ))
                .orElse("No resource is currently selected.");

        String suggestionText = suggestions.isEmpty()
                ? "No strong resource matches were found from the local data."
                : suggestions.stream()
                .map(suggestion -> String.format(
                        Locale.US,
                        "- %s | %s | capacity %d | %s | %s | booking link %s",
                        suggestion.name(),
                        suggestion.type(),
                        suggestion.capacity(),
                        suggestion.status(),
                        suggestion.reason(),
                        suggestion.bookingUrl()
                ))
                .collect(Collectors.joining("\n"));

        return """
                User profile:
                - Name: %s
                - Role: %s

                Local booking guidance:
                - If the user wants to reserve a room, point them to the provided booking links.
                - Suggestions are already ranked by the application.

                Selected resource context:
                %s

                Ranked resource suggestions:
                %s

                Safe fallback answer:
                %s
                """.formatted(
                user.getName(),
                user.getRole(),
                selectedResource,
                suggestionText,
                fallbackAnswer
        );
    }

    private String extractOutputText(Map<String, Object> response) {
        Object output = response.get("output");
        if (!(output instanceof List<?> outputItems)) {
            return null;
        }

        StringBuilder builder = new StringBuilder();
        for (Object outputItem : outputItems) {
            if (!(outputItem instanceof Map<?, ?> itemMap)) {
                continue;
            }
            Object content = itemMap.get("content");
            if (!(content instanceof List<?> contentItems)) {
                continue;
            }
            for (Object contentItem : contentItems) {
                if (!(contentItem instanceof Map<?, ?> contentMap)) {
                    continue;
                }
                if ("output_text".equals(contentMap.get("type")) && contentMap.get("text") instanceof String text) {
                    if (builder.length() > 0) {
                        builder.append("\n");
                    }
                    builder.append(text);
                }
            }
        }
        return builder.toString();
    }

    private List<AssistantResourceSuggestion> findSuggestions(List<ResourceResponse> resources,
                                                              String query,
                                                              Long selectedResourceId) {
        Integer attendeeCount = extractAttendeeCount(query);
        String loweredQuery = query.toLowerCase(Locale.US);

        return resources.stream()
                .map(resource -> scoreSuggestion(resource, loweredQuery, attendeeCount, selectedResourceId))
                .filter(scored -> scored.score > 0)
                .sorted(Comparator.comparingInt(ScoredSuggestion::score).reversed())
                .limit(3)
                .map(ScoredSuggestion::suggestion)
                .toList();
    }

    private ScoredSuggestion scoreSuggestion(ResourceResponse resource,
                                             String loweredQuery,
                                             Integer attendeeCount,
                                             Long selectedResourceId) {
        int score = 0;
        List<String> reasons = new ArrayList<>();

        String haystack = String.join(" ",
                safe(resource.name()).toLowerCase(Locale.US),
                safe(resource.type()).toLowerCase(Locale.US),
                safe(resource.location()).toLowerCase(Locale.US),
                safe(resource.department()).toLowerCase(Locale.US),
                safe(resource.ownerName()).toLowerCase(Locale.US),
                String.join(" ", resource.amenities() == null ? List.of() : resource.amenities()).toLowerCase(Locale.US)
        );

        for (String token : tokenize(loweredQuery)) {
            if (token.length() > 2 && haystack.contains(token)) {
                score += 8;
            }
        }

        if (selectedResourceId != null && selectedResourceId.equals(resource.id())) {
            score += 15;
            reasons.add("matches the resource you were already viewing");
        }

        String type = resource.type() != null ? resource.type().name() : "";
        if (loweredQuery.contains("lab") && type.contains("LAB")) {
            score += 18;
            reasons.add("fits lab-style usage");
        }
        if ((loweredQuery.contains("lecture") || loweredQuery.contains("class") || loweredQuery.contains("hall")) && type.contains("LECTURE_HALL")) {
            score += 18;
            reasons.add("fits lecture or class sessions");
        }
        if ((loweredQuery.contains("meeting") || loweredQuery.contains("discussion") || loweredQuery.contains("board")) && type.contains("MEETING_ROOM")) {
            score += 18;
            reasons.add("fits meetings and small group discussions");
        }
        if ((loweredQuery.contains("equipment") || loweredQuery.contains("projector") || loweredQuery.contains("device")) && type.contains("EQUIPMENT")) {
            score += 18;
            reasons.add("matches equipment-related needs");
        }

        if (attendeeCount != null && resource.capacity() != null) {
            if (resource.capacity() >= attendeeCount) {
                score += 20;
                reasons.add("can hold about " + attendeeCount + " attendees");
                if (resource.capacity() <= attendeeCount + 20) {
                    score += 8;
                    reasons.add("capacity is close to your group size");
                }
            } else {
                score -= 25;
            }
        }

        if (resource.status() != null && "ACTIVE".equals(resource.status().name())) {
            score += 10;
            reasons.add("currently active");
        } else {
            score -= 20;
        }

        if (resource.amenities() != null) {
            for (String amenity : resource.amenities()) {
                if (loweredQuery.contains(amenity.toLowerCase(Locale.US))) {
                    score += 10;
                    reasons.add("includes " + amenity);
                }
            }
        }

        if (reasons.isEmpty() && score > 0) {
            reasons.add("matches your request better than other available options");
        }

        return new ScoredSuggestion(
                score,
                new AssistantResourceSuggestion(
                        resource.id(),
                        resource.name(),
                        resource.type() != null ? resource.type().name().replace('_', ' ') : "RESOURCE",
                        resource.capacity(),
                        safe(resource.location()),
                        resource.status() != null ? resource.status().name().replace('_', ' ') : "UNKNOWN",
                        String.join(", ", reasons.stream().distinct().limit(2).toList()),
                        "/bookings/create?resourceId=" + resource.id()
                )
        );
    }

    private String buildFallbackAnswer(User user,
                                       String latestUserMessage,
                                       List<AssistantResourceSuggestion> suggestions,
                                       Long selectedResourceId,
                                       List<ResourceResponse> resources) {
        if (selectedResourceId != null) {
            ResourceResponse selected = resources.stream()
                    .filter(resource -> selectedResourceId.equals(resource.id()))
                    .findFirst()
                    .orElse(null);
            if (selected != null && asksAboutResourceDetails(latestUserMessage)) {
                return String.format(
                        Locale.US,
                        "%s, %s is a %s in %s with capacity for %d people. Its current status is %s, and its normal availability window is %s to %s.",
                        user.getName(),
                        selected.name(),
                        selected.type() != null ? selected.type().name().replace('_', ' ').toLowerCase(Locale.US) : "resource",
                        safe(selected.location()),
                        selected.capacity() != null ? selected.capacity() : 0,
                        selected.status() != null ? selected.status().name().replace('_', ' ').toLowerCase(Locale.US) : "unknown",
                        safe(selected.availabilityStartTime()),
                        safe(selected.availabilityEndTime())
                );
            }
        }

        if (suggestions.isEmpty()) {
            return "I couldn’t find a strong resource match from the current campus data. Try mentioning the group size, room type, location, or equipment you need.";
        }

        String topSuggestionLine = suggestions.stream()
                .map(suggestion -> suggestion.name() + " (" + suggestion.reason() + ")")
                .collect(Collectors.joining("; "));

        return "Based on the current resource data, the best matches are " + topSuggestionLine
                + ". Use the booking action on any suggestion card to continue with a reservation.";
    }

    private boolean asksAboutResourceDetails(String message) {
        String lowered = message.toLowerCase(Locale.US);
        return lowered.contains("tell me about")
                || lowered.contains("details")
                || lowered.contains("capacity")
                || lowered.contains("where")
                || lowered.contains("available")
                || lowered.contains("status");
    }

    private Integer extractAttendeeCount(String query) {
        Matcher matcher = ATTENDEE_PATTERN.matcher(query);
        if (matcher.find()) {
            return Integer.parseInt(matcher.group(1));
        }
        return null;
    }

    private List<String> tokenize(String text) {
        return List.of(text.split("[^a-zA-Z0-9]+")).stream()
                .filter(StringUtils::hasText)
                .toList();
    }

    private String normalizeRole(String role) {
        if ("assistant".equalsIgnoreCase(role)) {
            return "assistant";
        }
        return "user";
    }

    private String safe(Object value) {
        return value == null ? "-" : value.toString();
    }

    private ResourceResponse toResourceResponse(com.smartcampus.resource.entity.CampusResource resource) {
        return new ResourceResponse(
                resource.getId(),
                resource.getName(),
                resource.getType(),
                resource.getCapacity(),
                resource.getLocation(),
                resource.getAmenities(),
                resource.getPhotoUrls(),
                resource.getLayoutMapUrl(),
                resource.getView360Url(),
                resource.getOwnerName(),
                resource.getDepartment(),
                resource.getMaintenanceScore(),
                resource.getAvailabilityStartTime(),
                resource.getAvailabilityEndTime(),
                resource.getStatus(),
                resource.getCreatedAt(),
                resource.getUpdatedAt()
        );
    }

    private record ScoredSuggestion(int score, AssistantResourceSuggestion suggestion) {
    }
}
