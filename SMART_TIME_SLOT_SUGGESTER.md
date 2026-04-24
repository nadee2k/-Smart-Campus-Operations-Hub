# Smart Time Slot Suggester - Feature Documentation

## Overview

The **Smart Time Slot Suggester** is an intelligent booking recommendation system that suggests the best times to reserve campus resources based on historical booking patterns and utilization data.

## Features

### 1. **Intelligent Time Slot Ranking**
- Analyzes 90 days of historical booking data
- Scores available time slots on a 0-100 scale
- Considers multiple factors for ranking:
  - **Hourly utilization patterns** (40% weight)
  - **Day-of-week patterns** (30% weight)
  - **Time-of-day preferences** (20% weight)
  - **Availability bonus** (10% weight)

### 2. **Pattern Analysis**
The system tracks:
- **Peak hours** - When resources are most frequently booked
- **Day-of-week trends** - Which days have higher/lower demand
- **Utilization rates** - Historical booking density by hour
- **Approval rates** - Percentage of bookings that get approved
- **Check-in rates** - Show-up rate for approved bookings
- **Cancellation patterns** - When users typically cancel

### 3. **Smart Reasoning**
Each suggestion includes human-readable insights:
```
"Monday at 14:00 - Peak business hours with good availability. Historically under-utilized time."
```

### 4. **Real-Time Ranking**
Suggestions are ranked from best to worst, considering:
- Moderate utilization zones (30-70% is ideal)
- Mid-day preference (10 AM - 4 PM priority)
- Historical pattern alignment

## Backend Implementation

### New Services

#### `BookingPatternsService`
Analyzes historical booking data and provides pattern insights.

**Methods:**
```java
List<HourlyPatternData> getHourlyPatterns(Long resourceId)
```
Returns hourly utilization patterns (0-100 scale) for past 90 days.

```java
List<DayOfWeekPatternData> getDayOfWeekPatterns(Long resourceId)
```
Returns day-of-week utilization patterns.

```java
Map<String, Object> getBookingStatistics(Long resourceId)
```
Returns comprehensive statistics:
- `totalBookings`: Total bookings in past 90 days
- `approvedBookings`: Number of approved bookings
- `approvalRate`: Percentage of approved bookings (0-100%)
- `checkInRate`: Percentage of check-ins among approved bookings
- `cancellationRate`: Percentage of cancelled bookings
- `peakDay`: Day with most bookings
- `peakHour`: Hour with most bookings
- `averageAttendees`: Average group size

### Enhanced `BookingServiceImpl`

**Updated `getSuggestions()` method** now:
1. Collects up to 15 available slots across 3 days
2. Calculates historical patterns
3. Scores each slot based on patterns
4. Returns top 5 ranked by score

Each suggestion includes:
```json
{
  "start": "2026-04-26T14:00:00",
  "end": "2026-04-26T15:00:00",
  "date": "2026-04-26",
  "score": 87.5,
  "reasoning": "Monday at 14:00 - Peak business hours with good availability"
}
```

### New API Endpoints

#### Analytics Controller
```
GET /api/analytics/resources/{resourceId}/patterns/hourly
GET /api/analytics/resources/{resourceId}/patterns/day-of-week
GET /api/analytics/resources/{resourceId}/patterns/statistics
```

These provide data for visualization and insights.

#### Booking Controller
```
GET /api/bookings/suggestions?resourceId={id}&date={YYYY-MM-DD}&duration={minutes}
```

Enhanced to return ranked suggestions with scores and reasoning.

### New DTOs

- `TimeSuggestionResponse` - Structure for individual suggestions
- `HourlyPatternData` - Hourly utilization metrics
- `DayOfWeekPatternData` - Weekly utilization metrics

## Frontend Implementation

### Enhanced Components

#### `BookingCreatePage.jsx`
- Updated `SuggestionPanel` component
- Now displays:
  - Match rank (#1, #2, #3, etc.)
  - Desirability score (0-100%) with visual indicator
  - Smart reasoning for each slot
  - Color-coded scores (green: 80+, amber: 60-80, orange: <60)

#### New `BookingPatternsInsights.jsx` Component
Displays booking pattern analytics with:
- **Statistics Cards**: Key metrics at a glance
- **Hourly Chart**: Bar chart of hourly utilization
- **Weekly Chart**: Line chart of day-of-week patterns
- **Smart Insights**: Key findings and recommendations

### Key UI Improvements

1. **Visual Score Indicator**
   - Circular progress indicator (0-100%)
   - Color-coded: Green (good) → Amber (fair) → Orange (less ideal)

2. **Reasoning Display**
   - Shows why slot is recommended
   - References historical patterns
   - Highlights peak vs. slow times

3. **Pattern Visualizations**
   - Recharts integration for trending data
   - Hourly utilization bar chart
   - Weekly pattern line chart
   - Statistics cards with key metrics

## Scoring Algorithm

### Score Calculation (0-100 scale)

The system combines four weighted factors:

**1. Hourly Desirability (40% weight)**
```
score = 1.0 - |utilization_rate - 0.5| * 0.5
```
Prefers times with moderate utilization (30-70% is ideal - indicates good availability with reasonable demand)

**2. Day-of-Week Desirability (30% weight)**
```
score = 1.0 - |day_utilization - 0.5| * 0.5
```
Similar logic for days: prefers moderately busy days

**3. Time Preference (20% weight)**
```
if hour >= 10 && hour <= 16:
  score = 1.0 - (|hour - 13| / 6.0)  // Peak at 1 PM
else if hour >= 8 && hour <= 22:
  score = 0.3  // Other hours acceptable
```
Strongly prefers mid-day slots (10 AM - 4 PM), with peak at 1 PM

**4. Availability Bonus (10% weight)**
```
bonus = 0.2  // Fixed bonus for available slots
```

Final score is normalized to 0-100 scale.

## Usage Examples

### 1. Booking a Resource
When creating a booking:
1. User selects resource, date, and duration
2. If chosen slot is taken, smart suggestions appear
3. Suggestions ranked by score
4. User clicks a suggestion to apply
5. Form updates with suggested time

### 2. Analyzing Patterns
Administrators can view pattern analytics:
1. Navigate to Resource Detail Page
2. Scroll to "Booking Patterns" section
3. View hourly and weekly charts
4. See key statistics and insights

## Examples

### Scenario: Conference Room Booking

**Historical Data (90 days):**
- Peak hour: 2 PM (14:00) - 12 bookings
- Peak day: Wednesday - 15 bookings
- Utilization: 60% average

**Available Slots for 1-hour booking:**
- Monday 10:00 - Score: 82% ✓ Best
  - "Peak business hours with good availability. Historically under-utilized time."
- Friday 2:00 PM - Score: 75%
  - "Popular time slot. Peak business hours."
- Tuesday 3:00 PM - Score: 68%
  - "Late afternoon/evening, typically less busy"

### Score Distribution

For a well-utilized resource:
- **90-100%** - Excellent: Mid-day, moderately busy day, historically optimal
- **75-90%** - Good: Business hours, good availability patterns
- **60-75%** - Fair: Still available, but less ideal patterns
- **Below 60%** - Acceptable: Available but not recommended as first choice

## Performance Considerations

### Caching
- Pattern data cached for 1 hour (`@Cacheable`)
- Reduces database queries for frequent suggestions
- Cache invalidated when new bookings created

### Query Optimization
- Only reads bookings from past 90 days
- Aggregates at service level (not database)
- Indexes on resource_id, status, and time fields

### Database Requirements
Ensure indexes exist:
```sql
CREATE INDEX idx_bookings_resource_status_time ON bookings(resource_id, status, start_time);
```

## Future Enhancements

1. **User Preferences**
   - Remember user's preferred times
   - Learn from user's booking history
   - Personalized suggestions

2. **Advanced Patterns**
   - Semester-based patterns (exam season, holidays)
   - Event-driven recommendations
   - Department-level preferences

3. **Machine Learning**
   - Predict booking demand
   - Optimize resource scheduling
   - Anomaly detection for unusual patterns

4. **Group Recommendations**
   - Find times suitable for multiple resources
   - Team scheduling optimization

5. **Predictive Analytics**
   - Forecast future utilization
   - Capacity planning

## Configuration

### Adjustable Parameters

In `BookingServiceImpl`:
```java
// Lookback period
LocalDateTime.now().minusDays(90)  // Change 90 to desired number

// Time range
dayStart = checkDate.atTime(8, 0)   // Start of day
dayEnd = checkDate.atTime(22, 0)    // End of day

// Peak hour preference
if (hour >= 10 && hour <= 16)       // Mid-day window
```

### Weights
Modify scoring factors in `calculateSlotScore()`:
```java
score += hourlyDesirability * 0.40    // Hourly weight
score += dayDesirability * 0.30       // Day-of-week weight
score += timePreference * 0.20        // Time-of-day weight
score += availabilityBonus * 0.10     // Availability weight
```

## Testing

### Unit Tests
Test pattern calculation:
```java
@Test
void testHourlyPatternCalculation() {
  // Create test bookings
  // Call getHourlyPatterns()
  // Verify correct calculation
}
```

### Integration Tests
Test end-to-end flow:
```java
@Test
void testSmartSuggestions() {
  // Create historical bookings
  // Request suggestions
  // Verify ranking and scoring
}
```

## Troubleshooting

### Issue: All suggestions have same score
- Likely: Insufficient historical data (<2 weeks)
- Solution: Seeds more historical booking data

### Issue: Peak times not reflected in suggestions
- Check: Database indexes are created
- Verify: Historical data includes peak hours

### Issue: Scores seem too high/low
- Review: Scoring weights and formulas
- Adjust: Tuning parameters based on use case

## API Documentation

See `/api/bookings/suggestions` endpoint for live examples.

Run application and visit: `http://localhost:8080/swagger-ui.html` (if Springdoc-OpenAPI configured)

---

**Version:** 1.0  
**Last Updated:** April 2026  
**Maintained by:** Development Team
