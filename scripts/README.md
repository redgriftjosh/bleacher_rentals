# Sample Data Generator

## generate-sample-events

Generates realistic sample events for development and testing using Faker.js.

### Usage

```bash
# Generate 50 events (default)
npm run generate:events

# Generate custom number of events
npm run generate:events -- --count=100
```

### What it generates

For each event, the script creates:

- **Realistic event data**
  - Company/organization names + event types (Championship, Festival, Concert, etc.)
  - Random dates spanning 6 months past to 12 months future
  - Setup/teardown dates (70% have setup, 60% have teardown)
  - Event durations: 1-7 days

- **Addresses**
  - Street addresses, cities, states, zip codes
  - Latitude/longitude coordinates

- **Bleacher assignments**
  - 1-5 random bleachers per event
  - Setup/teardown confirmation flags
  - Optional notes for setup/teardown

- **Financial data**
  - $1,200 per bleacher assigned
  - Contract revenue calculated automatically

- **Status distribution**
  - 50% Booked
  - 35% Quoted
  - 15% Lost

- **Account managers**
  - Randomly assigned from 3 seed account managers

- **Additional details**
  - Random color hues for dashboard visualization
  - Seat counts (7-row, 10-row, 15-row bleachers)
  - Optional notes (40% of events)
  - Optional Goodshuffle URLs (30% of events)
  - Lenient flag (30% of events)
  - Must be clean flag (20% of events)

### Requirements

- Local Supabase must be running (`supabase start`)
- `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
- Existing bleachers in database (run `supabase db reset` first)

### Tips

- Run this after `supabase db reset` to get fresh sample data
- Safe to run multiple times (generates new UUIDs each time)
- Great for testing dashboard views, filters, and calculations
- Produces realistic date distributions for testing time-based features
