# PostHog Analytics Setup Guide

## 🎯 Overview

Your Chained app now has comprehensive analytics tracking with session recording, event tracking, and user behavior analysis. This guide will help you set up dashboards and interpret the data.

## 🔧 PostHog Features Enabled

### ✅ Session Recording

- **100% sample rate** during beta
- Records user interactions, clicks, scrolls, form inputs
- Console logs captured
- Performance metrics included
- Email addresses visible (passwords masked)

### ✅ Event Tracking

- **30+ custom events** tracking user behavior
- Landing page interactions
- Access gate conversions
- User journey mapping
- Scroll depth tracking

### ✅ Performance Monitoring

- Page load times
- First paint / First contentful paint
- DOM content loaded time
- Core Web Vitals

## 📊 Key Events Being Tracked

### Landing Page Analytics

```javascript
- landing_hero_viewed
- landing_cta_clicked
- landing_feature_viewed
- landing_feature_cta_clicked
- landing_section_viewed
- page_scrolled (25%, 50%, 75%, 90%, 100%)
- external_link_clicked
- demo_video_played
- demo_video_paused
```

### Access Gate Analytics

```javascript
-access_gate_opened -
  access_gate_closed -
  access_gate_mode_changed(code / waitlist) -
  access_code_attempted -
  access_code_validated -
  waitlist_joined -
  waitlist_error;
```

### User Journey Analytics

```javascript
-user_journey_step -
  landing_page_loaded -
  beta_access_granted -
  page_performance;
```

## 🎨 PostHog Dashboard Setup

### 1. Landing Page Performance Dashboard

Create insights for:

- **Unique visitors** (Daily/Weekly trends)
- **Page scroll depth** (Funnel: 25% → 50% → 75% → 100%)
- **CTA click rates** by button location
- **Feature engagement** (which features get most views/clicks)
- **Session duration** and bounce rate

### 2. Beta Access Conversion Dashboard

Track your closed beta funnel:

- **Access gate opens** (total attempts)
- **Access code success rate** (valid vs invalid codes)
- **Waitlist conversion** (visitors → waitlist signup)
- **Access code usage** (which codes are most used)
- **Geographic distribution** of signups

### 3. User Behavior Dashboard

Deep dive into user interactions:

- **Session recordings** filtered by key events
- **Rage click detection** (frustrated users)
- **Dead click analysis** (UI/UX issues)
- **Feature adoption** (which features drive interest)
- **User journey flows** (landing → access → conversion)

## 🔍 Key Metrics to Monitor

### Conversion Funnel

1. **Landing page views** → Access gate opens (Interest rate)
2. **Access gate opens** → Code attempts (Engagement rate)
3. **Code attempts** → Successful validation (Success rate)
4. **Waitlist signups** → Position tracking (Demand tracking)

### User Experience Metrics

- **Average scroll depth** (engagement indicator)
- **Time on page** (interest level)
- **Click-through rates** on CTAs
- **Error rates** in access gate

### Beta Program Health

- **Access code utilization** (how many codes are being used)
- **Waitlist growth rate** (demand for your product)
- **User feedback quality** (waitlist messages)
- **Geographic reach** (market expansion)

## 📈 PostHog Query Examples

### Most Engaged Users (Session Recording)

```sql
-- Find users with longest sessions
SELECT user_id, session_duration, scroll_percentage
FROM sessions
WHERE session_duration > 60
ORDER BY session_duration DESC
```

### Access Code Performance

```sql
-- Track access code success rates
SELECT properties.access_code,
       COUNT(*) as attempts,
       SUM(CASE WHEN properties.success = true THEN 1 ELSE 0 END) as successes
FROM events
WHERE event = 'access_code_attempted'
GROUP BY properties.access_code
```

### Feature Interest Analysis

```sql
-- Which features generate most interest
SELECT properties.feature_name, COUNT(*) as views
FROM events
WHERE event = 'landing_feature_viewed'
GROUP BY properties.feature_name
ORDER BY views DESC
```

## 🚨 Alerts to Set Up

### High-Priority Alerts

1. **Error spike**: Waitlist errors > 5% rate
2. **Access code issues**: Invalid code attempts > 10/hour
3. **High bounce rate**: Scroll < 25% for >50% of users
4. **Performance degradation**: Page load time > 3 seconds

### Growth Alerts

1. **Waitlist surge**: >20 signups in 1 hour
2. **Viral activity**: High referrer diversity
3. **Feature engagement**: Specific feature views spike

## 🎯 Weekly Analytics Review

### Monday: Performance Review

- Check page load times and Core Web Vitals
- Review any performance degradation alerts
- Analyze weekend traffic patterns

### Wednesday: Conversion Analysis

- Access gate conversion rates
- Most/least effective CTAs
- Geographic conversion differences

### Friday: User Experience Review

- Watch session recordings of frustrated users
- Identify UI/UX pain points
- Review user feedback from waitlist messages

## 🔗 PostHog Dashboard Links

After setting up these dashboards, save these URLs:

1. **Landing Page Performance**: [Create Dashboard]
2. **Beta Access Funnel**: [Create Dashboard]
3. **User Behavior Analysis**: [Create Dashboard]
4. **Real-time Monitoring**: [Create Dashboard]

## 📱 Mobile Analytics

All events include viewport dimensions and user agent, so you can:

- Filter by device type (mobile/desktop/tablet)
- Compare conversion rates across devices
- Identify mobile-specific issues

## 🔒 Privacy & Compliance

- Passwords are automatically masked
- Email addresses are tracked (for beta user identification)
- No sensitive personal data beyond email/name is collected
- Session recordings can be disabled by setting `disable_session_recording: true`

## 🚀 Next Steps

1. **Create the 4 core dashboards** in PostHog
2. **Set up critical alerts** for errors and performance
3. **Review analytics weekly** to optimize conversion
4. **Use session recordings** to identify UX improvements
5. **Track feature engagement** to guide product development

---

**Pro Tip**: Start with the Beta Access Conversion Dashboard first - it will give you immediate insights into how well your closed beta strategy is working!
