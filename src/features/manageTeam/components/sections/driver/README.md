# Driver Section Components

This folder contains sub-components for managing driver information in the team management feature.

## Components

### DriverPaymentInfo.tsx

Manages payment-related fields:

- Account Manager assignment
- Tax percentage
- Pay rate (with currency and unit)
- Payment preview

### DriverContactInfo.tsx

Manages contact information:

- Phone number
- Physical address (with Google Places autocomplete)

**Note:** Address creation/linking needs to be implemented via API endpoint when saving.

### DriverVehicleInfo.tsx

Manages vehicle information:

- Make, Model, Year
- VIN number
- Vehicle summary preview

### DriverDocuments.tsx

Manages document uploads:

- Driver's License
- Insurance
- Medical Card

**Note:** File upload to Supabase storage needs to be implemented. Currently stores file paths as placeholders.

## Usage

These components are used by `DriverSection.tsx` which orchestrates them and handles the show/hide toggle for driver configuration.

All components read from and write to the `useCurrentUserStore` Zustand store.

## Database Schema

Driver fields are stored in the `Drivers` table with foreign keys to:

- `Vehicles` table for vehicle information
- `Addresses` table for address information
- `AccountManagers` table for account manager assignment

Document paths reference Supabase storage buckets.

## Future Improvements

1. **Address Management**: Implement API endpoint to create addresses and link to drivers
2. **File Upload**: Implement Supabase storage upload with proper bucket configuration
3. **Document Viewer**: Add ability to view uploaded documents in the UI
4. **Validation**: Add field validation (phone format, VIN format, required fields)
