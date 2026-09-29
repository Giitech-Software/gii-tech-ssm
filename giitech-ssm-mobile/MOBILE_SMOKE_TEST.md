# Mobile Smoke Test Checklist

Run the app with `npx expo start` and test on a physical Android or iOS device.

## Authentication and access

- Sign in as student, parent, teacher, staff, admin, and superadmin.
- Confirm each role sees only its dashboard tools.
- Sign out and confirm protected routes return to login.
- Restart the app and confirm the current session behavior.

## Administration workspace

- Sign in as an admin and confirm the landing screen shows only the Administration overview.
- Confirm overview metrics are grouped and readable without a long mixed tool list.
- Open Academic operations, Finance and AI controls, and School administration one at a time.
- Confirm each dropdown expands and collapses with the correct workspace icon and chevron.
- Confirm every expanded action has a distinct icon, label, description, and opens the correct page.
- Confirm admin users do not see the general School updates section on the landing screen.

## Offline workflows

- Open student assignments and materials while online.
- Disable connectivity and confirm cached materials remain visible.
- Save a quiz draft offline.
- Submit offline and confirm the queued status.
- Restore connectivity and confirm the queue synchronizes.
- Confirm the dashboard pending-sync count returns to zero.

## Attendance and QR

- Grant camera permission.
- Scan a generated student QR identity.
- Confirm student details before saving attendance.
- Record Present and Absent outcomes.
- Test manual student-ID fallback.
- Confirm unauthorized roles cannot open QR attendance.

## Payments

- Parent creates a Mobile Money payment intent.
- Admin sees the pending intent.
- Admin reconciles paid and failed outcomes.
- Confirm the parent payment history remains readable.

## AI assessment

- Teacher generates a suggestion for a written submission.
- Confirm the suggestion remains pending.
- Approve one suggestion and reject another.
- Confirm administrator AI audit, usage, cost, and alert screens.

## Visual and device checks

- Verify NativeWind layouts on small and large screens.
- Test keyboard input and scrolling on forms.
- Confirm camera permission wording.
- Confirm no deprecated SafeAreaView warning appears.
