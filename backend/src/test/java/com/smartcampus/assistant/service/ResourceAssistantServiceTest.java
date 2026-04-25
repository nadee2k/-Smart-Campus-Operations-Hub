package com.smartcampus.assistant.service;

import com.smartcampus.assistant.dto.AssistantChatMessage;
import com.smartcampus.assistant.dto.AssistantChatRequest;
import com.smartcampus.assistant.dto.AssistantChatResponse;
import com.smartcampus.auth.entity.Role;
import com.smartcampus.auth.entity.User;
import com.smartcampus.auth.service.UserService;
import com.smartcampus.booking.dto.BookingResponse;
import com.smartcampus.booking.entity.BookingStatus;
import com.smartcampus.booking.service.BookingService;
import com.smartcampus.resource.entity.CampusResource;
import com.smartcampus.resource.entity.ResourceStatus;
import com.smartcampus.resource.entity.ResourceType;
import com.smartcampus.resource.repository.CampusResourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResourceAssistantServiceTest {

    @Mock
    private CampusResourceRepository resourceRepository;

    @Mock
    private BookingService bookingService;

    @Mock
    private UserService userService;

    private ResourceAssistantServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new ResourceAssistantServiceImpl(
                resourceRepository,
                bookingService,
                userService,
                RestClient.builder(),
                "",
                "gpt-5.2",
                "https://api.openai.com/v1"
        );
    }

    @Test
    void chat_shouldReturnFallbackSuggestionsWhenApiKeyMissing() {
        User user = new User("john@uniops.edu", "John", null, "local-1");
        user.setId(1L);
        user.setRole(Role.USER);

        CampusResource meetingRoom = new CampusResource();
        meetingRoom.setId(10L);
        meetingRoom.setName("Innovation Hub");
        meetingRoom.setType(ResourceType.MEETING_ROOM);
        meetingRoom.setCapacity(20);
        meetingRoom.setLocation("Building B");
        meetingRoom.setStatus(ResourceStatus.ACTIVE);
        meetingRoom.setDeleted(false);

        CampusResource lectureHall = new CampusResource();
        lectureHall.setId(20L);
        lectureHall.setName("Main Hall");
        lectureHall.setType(ResourceType.LECTURE_HALL);
        lectureHall.setCapacity(200);
        lectureHall.setLocation("Building A");
        lectureHall.setStatus(ResourceStatus.ACTIVE);
        lectureHall.setDeleted(false);

        when(userService.findById(1L)).thenReturn(user);
        when(resourceRepository.findByDeletedFalse(PageRequest.of(0, 100)))
                .thenReturn(new PageImpl<>(List.of(meetingRoom, lectureHall)));

        AssistantChatRequest request = new AssistantChatRequest();
        request.setMessages(List.of(new AssistantChatMessage("user", "Find a meeting room for 15 people")));

        AssistantChatResponse response = service.chat(request, 1L);

        assertThat(response.aiEnhanced()).isFalse();
        assertThat(response.suggestions()).isNotEmpty();
        assertThat(response.suggestions().get(0).name()).isEqualTo("Innovation Hub");
        assertThat(response.answer()).contains("best matches");
    }

    @Test
    void chat_shouldExplainSwapNeedsExistingBooking() {
        User user = new User("john@uniops.edu", "John", null, "local-1");
        user.setId(1L);
        user.setRole(Role.USER);

        when(userService.findById(1L)).thenReturn(user);
        when(resourceRepository.findByDeletedFalse(PageRequest.of(0, 100)))
                .thenReturn(new PageImpl<>(List.of()));
        when(bookingService.getByUser(1L, PageRequest.of(0, 20)))
                .thenReturn(new PageImpl<>(List.of()));

        AssistantChatRequest request = new AssistantChatRequest();
        request.setMessages(List.of(new AssistantChatMessage("user", "I need to swap my booking")));

        AssistantChatResponse response = service.chat(request, 1L);

        assertThat(response.answer()).contains("do not have any active upcoming bookings to swap");
        assertThat(response.suggestions()).isEmpty();
    }

    @Test
    void chat_shouldUseExistingBookingContextForSwapSuggestions() {
        User user = new User("john@uniops.edu", "John", null, "local-1");
        user.setId(1L);
        user.setRole(Role.USER);

        CampusResource currentRoom = new CampusResource();
        currentRoom.setId(10L);
        currentRoom.setName("Innovation Hub");
        currentRoom.setType(ResourceType.MEETING_ROOM);
        currentRoom.setCapacity(20);
        currentRoom.setLocation("Building B");
        currentRoom.setStatus(ResourceStatus.ACTIVE);
        currentRoom.setDeleted(false);

        CampusResource alternateRoom = new CampusResource();
        alternateRoom.setId(11L);
        alternateRoom.setName("Collab Studio");
        alternateRoom.setType(ResourceType.MEETING_ROOM);
        alternateRoom.setCapacity(18);
        alternateRoom.setLocation("Building C");
        alternateRoom.setStatus(ResourceStatus.ACTIVE);
        alternateRoom.setDeleted(false);

        BookingResponse existingBooking = new BookingResponse(
                77L,
                10L,
                "Innovation Hub",
                1L,
                "John",
                LocalDateTime.now().plusDays(1),
                LocalDateTime.now().plusDays(1).plusHours(2),
                "Team discussion",
                12,
                BookingStatus.APPROVED,
                null,
                null,
                false,
                null,
                LocalDateTime.now()
        );

        when(userService.findById(1L)).thenReturn(user);
        when(resourceRepository.findByDeletedFalse(PageRequest.of(0, 100)))
                .thenReturn(new PageImpl<>(List.of(currentRoom, alternateRoom)));
        when(bookingService.getByUser(1L, PageRequest.of(0, 20)))
                .thenReturn(new PageImpl<>(List.of(existingBooking)));

        AssistantChatRequest request = new AssistantChatRequest();
        request.setMessages(List.of(new AssistantChatMessage("user", "Can I swap my booking to another room?")));

        AssistantChatResponse response = service.chat(request, 1L);

        assertThat(response.answer()).contains("I found your booking for Innovation Hub");
        assertThat(response.suggestions()).isNotEmpty();
        assertThat(response.suggestions().get(0).name()).isEqualTo("Collab Studio");
        assertThat(response.suggestions().get(0).bookingUrl()).contains("swapBookingId=77");
        assertThat(response.suggestions()).noneMatch(suggestion -> suggestion.id().equals(10L));
    }
}
