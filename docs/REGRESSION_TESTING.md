# Regression Testing Guide

## Purpose

This guide ensures that improvements don't break existing functionality. Use this checklist before and after each change.

## Pre-Change Baseline

### 1. Document Current State

**Take Notes**:
- Current behavior for each feature
- Error messages
- Loading states
- Data formats
- API responses

**Screenshot Key Screens** (optional):
- Login pages
- Dashboards
- Forms
- Error states

### 2. Record Current Performance

```bash
# Build time
time npm run build:br

# Bundle size
npm run build:br
ls -lh dist/assets/*.js

# Check console for warnings
# Open browser DevTools → Console
```

## Testing Checklist

### Authentication & Authorization

#### Business User
- [ ] Can login with valid credentials
- [ ] Redirected to business menu after login
- [ ] Session persists on page refresh
- [ ] Session expires after 1 day
- [ ] Can logout successfully
- [ ] Cannot access collaborator/master routes
- [ ] Can access all business routes

#### Collaborator User
- [ ] Can login with valid credentials
- [ ] Redirected to collaborator menu after login
- [ ] Session persists on page refresh
- [ ] Session expires after 1 day
- [ ] Can logout successfully
- [ ] Cannot access business/master routes
- [ ] Can access all collaborator routes

#### Master User
- [ ] Can login with valid credentials
- [ ] Redirected to master menu after login
- [ ] Can select business
- [ ] Session persists on page refresh
- [ ] Can logout successfully
- [ ] Cannot access business/collaborator routes
- [ ] Can access all master routes

#### Invited User
- [ ] Can access public queue pages
- [ ] Session expires after 6 hours
- [ ] Can join queues
- [ ] Cannot access private routes

### Queue Management

#### Business Queue Admin
- [ ] Can view all queues
- [ ] Can create new queue
- [ ] Can edit existing queue
- [ ] Can delete queue
- [ ] Queue list updates in real-time

#### Public Queue Access
- [ ] Can view queue via QR code
- [ ] Can join queue
- [ ] Receives queue number
- [ ] Can see position in queue
- [ ] Real-time updates work

### Attention Management

- [ ] Can create attention
- [ ] Attention appears in list
- [ ] Can update attention status
- [ ] Real-time updates work
- [ ] Attention history loads correctly

### Booking Management

- [ ] Can view calendar
- [ ] Can create booking
- [ ] Can edit booking
- [ ] Can cancel booking
- [ ] Calendar displays correctly
- [ ] Date picker works

### Client Management

- [ ] Can view client list
- [ ] Can search clients
- [ ] Can view client details
- [ ] Can edit client
- [ ] Client history loads
- [ ] Client attentions display

### Dashboard & Reports

- [ ] Dashboard loads
- [ ] Charts render correctly
- [ ] Metrics display correctly
- [ ] Date filters work
- [ ] Reports generate
- [ ] Reports download

### Real-time Features

- [ ] Queue updates in real-time
- [ ] Attention updates in real-time
- [ ] Messages appear in real-time
- [ ] No memory leaks (check DevTools)
- [ ] Unsubscribe works on component unmount

### State Management

- [ ] Store getters return correct data
- [ ] Store actions update state
- [ ] localStorage syncs with store
- [ ] State persists on refresh
- [ ] State resets on logout

### API Calls

- [ ] All API calls succeed
- [ ] Error handling works
- [ ] Loading states display
- [ ] Retry logic works (if implemented)
- [ ] Timeout handling works

### Internationalization

- [ ] Language selector works
- [ ] All text translates
- [ ] Dates format correctly
- [ ] Numbers format correctly
- [ ] No hardcoded strings

### Error Handling

- [ ] Network errors display message
- [ ] API errors display message
- [ ] Validation errors display
- [ ] Error messages are user-friendly
- [ ] Errors don't break app

### Performance

- [ ] Initial load time acceptable
- [ ] Route transitions smooth
- [ ] No unnecessary re-renders
- [ ] Images load correctly
- [ ] No console warnings/errors

## Automated Testing (When Available)

### Unit Tests
```bash
npm run test:unit
```

### Component Tests
```bash
npm run test:component
```

### E2E Tests
```bash
npm run test:e2e
```

## Browser Testing

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

## Performance Testing

### Lighthouse Audit
```bash
# Run Lighthouse
# Target: 90+ Performance, 90+ Accessibility
```

### Bundle Analysis
```bash
npm run build:br
# Check bundle size hasn't increased significantly
```

## Regression Test Script

### Quick Test (5 minutes)
1. Login as business user
2. Navigate to dashboard
3. Create a queue
4. View queue
5. Logout

### Full Test (30 minutes)
1. Complete authentication checklist
2. Test 3-4 key features
3. Check console for errors
4. Verify real-time updates

### Comprehensive Test (2 hours)
1. Complete all checklists
2. Test all user types
3. Test all major features
4. Performance check
5. Browser compatibility

## After Each Change

### Immediate Checks
1. ✅ App builds without errors
2. ✅ No console errors
3. ✅ Login works
4. ✅ Key feature works

### Before Committing
1. ✅ All tests pass
2. ✅ No new warnings
3. ✅ Code formatted
4. ✅ Documentation updated

### Before Merging
1. ✅ Full regression test
2. ✅ Code review
3. ✅ Performance check
4. ✅ Security check

## Common Issues to Watch For

### State Management
- ❌ Store getters return undefined
- ❌ State doesn't persist
- ❌ Race conditions

### API Calls
- ❌ Requests fail silently
- ❌ Error handling breaks
- ❌ Loading states stuck

### Real-time
- ❌ Listeners don't unsubscribe
- ❌ Memory leaks
- ❌ Updates don't appear

### Components
- ❌ Components don't render
- ❌ Props not passed correctly
- ❌ Events not emitted

## Reporting Issues

If you find a regression:

1. **Document**:
   - What changed
   - What broke
   - Steps to reproduce
   - Expected vs actual behavior

2. **Screenshot/Video**: Visual evidence

3. **Console Logs**: Error messages

4. **Rollback**: Revert change immediately

5. **Fix**: Address issue before retrying

## Success Criteria

✅ **Zero Regressions**: All existing functionality works
✅ **No New Errors**: Console clean
✅ **Performance Maintained**: Same or better
✅ **User Experience**: No negative impact

---

**Remember**: When in doubt, test more! 🧪

