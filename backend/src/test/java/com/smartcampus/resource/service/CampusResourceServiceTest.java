package com.smartcampus.resource.service;

import com.smartcampus.activity.service.ActivityLogService;
import com.smartcampus.auth.entity.User;
import com.smartcampus.auth.repository.UserRepository;
import com.smartcampus.booking.entity.Booking;
import com.smartcampus.booking.entity.BookingStatus;
import com.smartcampus.booking.repository.BookingRepository;
import com.smartcampus.common.exception.AccessDeniedException;
import com.smartcampus.common.exception.ConflictException;
import com.smartcampus.common.exception.ResourceNotFoundException;
import com.smartcampus.resource.dto.ResourceBlackoutRequest;
import com.smartcampus.resource.dto.ResourceBlackoutResponse;
import com.smartcampus.resource.dto.ResourceRequest;
import com.smartcampus.resource.dto.ResourceReviewRequest;
import com.smartcampus.resource.dto.ResourceReviewResponse;
import com.smartcampus.resource.dto.ResourceResponse;
import com.smartcampus.resource.dto.WeeklyResourceReportResponse;
import com.smartcampus.resource.entity.CampusResource;
import com.smartcampus.resource.entity.ResourceBlackout;
import com.smartcampus.resource.entity.ResourceReview;
import com.smartcampus.resource.entity.ResourceStatus;
import com.smartcampus.resource.entity.ResourceType;
import com.smartcampus.resource.repository.CampusResourceRepository;
import com.smartcampus.resource.repository.ResourceBlackoutRepository;
import com.smartcampus.resource.repository.ResourceReviewRepository;
import com.smartcampus.ticket.repository.TicketRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CampusResourceServiceTest {

    @Mock
    private CampusResourceRepository repository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private ResourceBlackoutRepository blackoutRepository;

    @Mock
    private ResourceReviewRepository reviewRepository;

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ModelMapper modelMapper;

    @Mock
    private ActivityLogService activityLogService;

    @InjectMocks
    private CampusResourceServiceImpl service;

    private CampusResource resource;
    private ResourceRequest request;
    private ResourceBlackoutRequest blackoutRequest;
    private ResourceReviewRequest reviewRequest;
    private User user;

    @BeforeEach
    void setUp() {
        resource = new CampusResource();
        resource.setId(1L);
        resource.setName("Main Hall");
        resource.setType(ResourceType.LECTURE_HALL);
        resource.setCapacity(200);
        resource.setLocation("Building A");
        resource.setDescription("Large lecture hall for academic sessions.");
        resource.setAvailabilityStartTime(LocalTime.of(8, 0));
        resource.setAvailabilityEndTime(LocalTime.of(18, 0));
        resource.setStatus(ResourceStatus.ACTIVE);
        resource.setDeleted(false);
        resource.setCreatedAt(LocalDateTime.now());
        resource.setUpdatedAt(LocalDateTime.now());

        user = new User();
        user.setId(11L);
        user.setName("Alice");
        user.setPictureUrl("https://example.com/alice.png");

        request = new ResourceRequest();
        request.setName("Main Hall");
        request.setType(ResourceType.LECTURE_HALL);
        request.setCapacity(200);
        request.setLocation("Building A");
        request.setDescription("Large lecture hall for academic sessions.");

        blackoutRequest = new ResourceBlackoutRequest();
        blackoutRequest.setTitle("Maintenance");
        blackoutRequest.setReason("Projector replacement");
        blackoutRequest.setStartTime(LocalDateTime.of(2026, 4, 26, 9, 0));
        blackoutRequest.setEndTime(LocalDateTime.of(2026, 4, 26, 12, 0));

        reviewRequest = new ResourceReviewRequest();
        reviewRequest.setRating(5);
        reviewRequest.setComment("Excellent study environment");
    }

    @Test
    void create_shouldReturnCreatedResource() {
        when(modelMapper.map(any(ResourceRequest.class), eq(CampusResource.class))).thenReturn(resource);
        when(repository.save(any(CampusResource.class))).thenReturn(resource);

        ResourceResponse result = service.create(request);

        assertThat(result).isNotNull();
        assertThat(result.name()).isEqualTo("Main Hall");
        assertThat(result.type()).isEqualTo(ResourceType.LECTURE_HALL);
        assertThat(result.description()).isEqualTo("Large lecture hall for academic sessions.");
        verify(repository).save(any(CampusResource.class));
    }

    @Test
    void getById_shouldReturnResource() {
        when(repository.findById(1L)).thenReturn(Optional.of(resource));

        ResourceResponse result = service.getById(1L);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(1L);
    }

    @Test
    void getById_shouldThrowWhenNotFound() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getById_shouldThrowWhenDeleted() {
        resource.setDeleted(true);
        when(repository.findById(1L)).thenReturn(Optional.of(resource));

        assertThatThrownBy(() -> service.getById(1L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getAll_shouldReturnPagedResults() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<CampusResource> page = new PageImpl<>(List.of(resource));
        when(repository.findByDeletedFalse(pageable)).thenReturn(page);

        Page<ResourceResponse> result = service.getAll(pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void update_shouldUpdateAndReturnResource() {
        when(repository.findById(1L)).thenReturn(Optional.of(resource));
        doNothing().when(modelMapper).map(any(ResourceRequest.class), any(CampusResource.class));
        when(repository.save(any(CampusResource.class))).thenReturn(resource);

        ResourceResponse result = service.update(1L, request);

        assertThat(result).isNotNull();
        verify(repository).save(any(CampusResource.class));
    }

    @Test
    void cloneResource_shouldDuplicateFieldsAndLogActivity() {
        when(repository.findById(1L)).thenReturn(Optional.of(resource));
        when(repository.save(any(CampusResource.class))).thenAnswer(invocation -> {
            CampusResource saved = invocation.getArgument(0);
            saved.setId(2L);
            return saved;
        });

        ResourceResponse result = service.cloneResource(1L);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(2L);
        assertThat(result.name()).isEqualTo("Main Hall (Copy)");
        assertThat(result.type()).isEqualTo(resource.getType());
        assertThat(result.capacity()).isEqualTo(resource.getCapacity());
        assertThat(result.location()).isEqualTo(resource.getLocation());
        assertThat(result.description()).isEqualTo(resource.getDescription());
        verify(activityLogService).log(
                isNull(),
                eq("Admin"),
                eq("RESOURCE_CLONED"),
                eq("RESOURCE"),
                eq(2L),
                contains("Cloned resource from Main Hall to Main Hall (Copy)")
        );
    }

    @Test
    void delete_shouldSoftDeleteResource() {
        when(repository.findById(1L)).thenReturn(Optional.of(resource));
        when(repository.save(any(CampusResource.class))).thenReturn(resource);

        service.delete(1L);

        verify(repository).save(argThat(r -> r.getDeleted()));
    }

    @Test
    void search_shouldDelegateToRepository() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<CampusResource> page = new PageImpl<>(List.of(resource));
        when(repository.search(any(), any(), any(), any())).thenReturn(page);

        Page<ResourceResponse> result = service.search(ResourceType.LECTURE_HALL, null, "Main", pageable);

        assertThat(result.getTotalElements()).isEqualTo(1);
    }

    @Test
    void toggleStatus_shouldFlipBetweenActiveAndOutOfService() {
        when(repository.findById(1L)).thenReturn(Optional.of(resource));
        when(repository.save(any(CampusResource.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResourceResponse firstResult = service.toggleStatus(1L);
        assertThat(firstResult.status()).isEqualTo(ResourceStatus.OUT_OF_SERVICE);

        ResourceResponse secondResult = service.toggleStatus(1L);
        assertThat(secondResult.status()).isEqualTo(ResourceStatus.ACTIVE);
    }

    @Test
    void createBlackout_shouldPersistAndReturnBlackout() {
        when(repository.findById(1L)).thenReturn(Optional.of(resource));
        when(blackoutRepository.findOverlapping(eq(1L), any(), any())).thenReturn(List.of());
        when(bookingRepository.findConflicting(eq(1L), any(), any())).thenReturn(List.of());
        when(blackoutRepository.save(any(ResourceBlackout.class))).thenAnswer(invocation -> {
            ResourceBlackout blackout = invocation.getArgument(0);
            blackout.setId(5L);
            blackout.setCreatedAt(LocalDateTime.of(2026, 4, 24, 10, 0));
            return blackout;
        });

        ResourceBlackoutResponse result = service.createBlackout(1L, blackoutRequest);

        assertThat(result.id()).isEqualTo(5L);
        assertThat(result.title()).isEqualTo("Maintenance");
        assertThat(result.reason()).isEqualTo("Projector replacement");
        verify(activityLogService).log(
                isNull(),
                eq("Admin"),
                eq("RESOURCE_BLACKOUT_CREATED"),
                eq("RESOURCE"),
                eq(1L),
                contains("Blocked Main Hall")
        );
    }

    @Test
    void createBlackout_shouldThrowWhenOverlappingBookingExists() {
        Booking conflictingBooking = new Booking();
        conflictingBooking.setId(8L);

        when(repository.findById(1L)).thenReturn(Optional.of(resource));
        when(blackoutRepository.findOverlapping(eq(1L), any(), any())).thenReturn(List.of());
        when(bookingRepository.findConflicting(eq(1L), any(), any())).thenReturn(List.of(conflictingBooking));

        assertThatThrownBy(() -> service.createBlackout(1L, blackoutRequest))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("existing booking");
    }

    @Test
    void getReviews_shouldReturnMappedReviews() {
        ResourceReview review = new ResourceReview();
        review.setId(21L);
        review.setResource(resource);
        review.setUser(user);
        review.setRating(5);
        review.setComment("Excellent study environment");
        review.setCreatedAt(LocalDateTime.of(2026, 4, 24, 8, 0));
        review.setUpdatedAt(LocalDateTime.of(2026, 4, 24, 8, 30));

        when(repository.findById(1L)).thenReturn(Optional.of(resource));
        when(reviewRepository.findByResourceIdOrderByUpdatedAtDescCreatedAtDesc(1L)).thenReturn(List.of(review));

        List<ResourceReviewResponse> result = service.getReviews(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).userName()).isEqualTo("Alice");
        assertThat(result.get(0).rating()).isEqualTo(5);
    }

    @Test
    void upsertReview_shouldCreateOrUpdateReview() {
        when(repository.findById(1L)).thenReturn(Optional.of(resource));
        when(userRepository.findById(11L)).thenReturn(Optional.of(user));
        when(reviewRepository.findByResourceIdAndUserId(1L, 11L)).thenReturn(Optional.empty());
        when(reviewRepository.save(any(ResourceReview.class))).thenAnswer(invocation -> {
            ResourceReview saved = invocation.getArgument(0);
            saved.setId(44L);
            saved.setCreatedAt(LocalDateTime.of(2026, 4, 24, 9, 0));
            saved.setUpdatedAt(LocalDateTime.of(2026, 4, 24, 9, 0));
            return saved;
        });

        ResourceReviewResponse result = service.upsertReview(1L, reviewRequest, 11L);

        assertThat(result.id()).isEqualTo(44L);
        assertThat(result.userId()).isEqualTo(11L);
        assertThat(result.comment()).isEqualTo("Excellent study environment");
        verify(activityLogService).log(
                eq(11L),
                eq("Alice"),
                eq("RESOURCE_REVIEW_CREATED"),
                eq("RESOURCE"),
                eq(1L),
                contains("5-star review")
        );
    }

    @Test
    void deleteReview_shouldRejectWhenDifferentUserAndNotAdmin() {
        ResourceReview review = new ResourceReview();
        review.setId(33L);
        review.setResource(resource);
        review.setUser(user);

        when(repository.findById(1L)).thenReturn(Optional.of(resource));
        when(reviewRepository.findByIdAndResourceId(33L, 1L)).thenReturn(Optional.of(review));

        assertThatThrownBy(() -> service.deleteReview(1L, 33L, 99L, false))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("only delete your own review");
    }

    @Test
    void getWeeklyReport_shouldBuildSummaryFromBookingsAndTickets() {
        Booking approvedBooking = new Booking();
        approvedBooking.setStatus(BookingStatus.APPROVED);
        approvedBooking.setStartTime(LocalDateTime.of(2026, 4, 20, 9, 0));
        approvedBooking.setEndTime(LocalDateTime.of(2026, 4, 20, 11, 0));
        approvedBooking.setExpectedAttendees(80);
        approvedBooking.setCheckedIn(true);

        Booking pendingBooking = new Booking();
        pendingBooking.setStatus(BookingStatus.PENDING);
        pendingBooking.setStartTime(LocalDateTime.of(2026, 4, 20, 14, 0));
        pendingBooking.setEndTime(LocalDateTime.of(2026, 4, 20, 15, 0));
        pendingBooking.setExpectedAttendees(40);
        pendingBooking.setCheckedIn(false);

        when(repository.findById(1L)).thenReturn(Optional.of(resource));
        when(bookingRepository.findByResourceIdAndStartTimeBetween(eq(1L), any(), any()))
                .thenReturn(List.of(approvedBooking, pendingBooking));
        when(ticketRepository.findByResourceIdAndCreatedAtBetween(eq(1L), any(), any()))
                .thenReturn(List.of());
        when(ticketRepository.countByResourceIdAndStatusInAndUpdatedAtBetween(eq(1L), any(), any(), any()))
                .thenReturn(1L);
        when(ticketRepository.countByResourceIdAndStatusNotIn(eq(1L), any()))
                .thenReturn(0L);

        WeeklyResourceReportResponse result = service.getWeeklyReport(1L);

        assertThat(result.totalBookings()).isEqualTo(2);
        assertThat(result.approvedBookings()).isEqualTo(1);
        assertThat(result.pendingBookings()).isEqualTo(1);
        assertThat(result.checkedInBookings()).isEqualTo(1);
        assertThat(result.averageAttendees()).isEqualTo(60.0);
        assertThat(result.totalReservedHours()).isEqualTo(3.0);
        assertThat(result.busiestDay()).isEqualTo("Monday");
        assertThat(result.busiestTimeRange()).isEqualTo("9:00 AM - 10:00 AM");
        assertThat(result.operationalSummary()).contains("2 bookings");
    }
}
