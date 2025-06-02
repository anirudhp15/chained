# Vercel Deployment Guide with Video Support

This guide covers deploying your Next.js app with video support to Vercel.

## Overview

- **Video Solution**: HTML5 video elements (simple and reliable)
- **Video File**: `chained_demo.mp4` (included in Git for deployment)
- **Size**: Landing page optimized (12.6 kB vs 77.6 kB with next-video)
- **Deployment**: Automatic via Vercel Git integration

## Pre-Deployment Checklist

### ✅ **Video Configuration**

- [x] HTML5 video elements implemented
- [x] Demo video (`chained_demo.mp4`) included in repository
- [x] Video paths use `/videos/` (served from `public/videos/`)
- [x] Video attributes configured: `controls`, `autoPlay`, `muted`, `loop`

### ✅ **Build Verification**

- [x] `npm run build` completes successfully
- [x] No next-video dependencies
- [x] No API route conflicts
- [x] Landing page size optimized

### ✅ **Git Configuration**

- [x] Demo video included in Git (for Vercel deployment)
- [x] Future large videos can be excluded via `.gitignore`
- [x] Clean repository without unnecessary video processing files

## Deployment Steps

### 1. **Connect to Vercel**

```bash
# Install Vercel CLI (optional)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
vercel
```

### 2. **Automatic Deployment via Git**

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect repository to Vercel dashboard
3. Vercel automatically deploys on every push to main branch

### 3. **Environment Variables**

Ensure these environment variables are set in Vercel dashboard:

```env
NEXT_PUBLIC_CONVEX_URL=your_convex_url
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
# ... other environment variables
```

## Video Handling in Production

### **How Videos Work on Vercel**

1. **Static Files**: Videos in `public/videos/` are served as static assets
2. **CDN**: Vercel automatically serves videos through their global CDN
3. **Caching**: Videos are cached at edge locations for fast loading
4. **Direct Access**: Videos accessible at `https://yourdomain.com/videos/chained_demo.mp4`

### **Video Performance Optimization**

```jsx
// Current implementation (optimized)
<video
  src="/videos/chained_demo.mp4"
  controls
  autoPlay
  muted
  loop
  className="w-full h-auto rounded-xl opacity-90 hover:opacity-100 transition-opacity duration-300"
  preload="metadata" // Only load metadata initially
  poster="/videos/chained_demo-poster.jpg" // Optional: add poster image
/>
```

### **Adding New Videos**

1. **For Small Videos** (< 10MB):

   ```bash
   # Add to public/videos/
   cp new-video.mp4 public/videos/

   # Use in components
   <video src="/videos/new-video.mp4" controls />
   ```

2. **For Large Videos** (> 10MB):

   ```bash
   # Add to .gitignore to exclude from Git
   echo "public/videos/large-video.mp4" >> .gitignore

   # Upload directly to Vercel after deployment
   # Or use external video hosting (YouTube, Vimeo, etc.)
   ```

## Troubleshooting

### **Common Issues**

1. **Video Not Loading**

   ```bash
   # Check file exists
   ls public/videos/chained_demo.mp4

   # Verify path in code
   grep -r "/videos/" app/
   ```

2. **Large File Warnings**

   ```bash
   # Check video file size
   du -h public/videos/*.mp4

   # Compress if needed
   ffmpeg -i input.mp4 -vcodec h264 -acodec mp2 output.mp4
   ```

3. **Build Failures**
   ```bash
   # Clean build
   rm -rf .next
   npm run build
   ```

### **Performance Monitoring**

- Monitor video loading times in Vercel Analytics
- Check Core Web Vitals for video impact
- Use browser dev tools to verify video caching

## Alternative Video Solutions

### **For Larger Scale Video Needs**

1. **External Video Hosting**:

   ```jsx
   // YouTube embed
   <iframe
     src="https://www.youtube.com/embed/VIDEO_ID"
     className="w-full h-auto rounded-xl"
     allowFullScreen
   />

   // Vimeo embed
   <iframe
     src="https://player.vimeo.com/video/VIDEO_ID"
     className="w-full h-auto rounded-xl"
     allowFullScreen
   />
   ```

2. **Video CDN Services**:
   - Cloudinary
   - Mux
   - JW Player
   - Wistia

## Security Considerations

- Videos served from same domain (no CORS issues)
- CSP headers configured to allow video content
- No external video dependencies
- No tracking or analytics from third-party video providers

## Monitoring & Maintenance

### **Regular Checks**

- Monitor video loading performance
- Check video file sizes before adding new ones
- Verify videos work across different browsers
- Test video loading on mobile devices

### **Updates**

- Keep Next.js updated for latest video optimizations
- Monitor Vercel limits for static file sizes
- Consider video compression for better performance

## Support

For video-related issues:

1. Check browser console for errors
2. Verify video file format (MP4 H.264 recommended)
3. Test video loading in incognito mode
4. Check Vercel deployment logs

## Summary

✅ **Simple & Reliable**: HTML5 video elements work everywhere
✅ **Fast Deployment**: No complex video processing
✅ **CDN Optimized**: Vercel serves videos globally
✅ **Git Friendly**: Demo video included, large videos excluded
✅ **Performance**: Optimized bundle size and loading
✅ **Scalable**: Easy to add more videos or switch to external hosting

Your video implementation is production-ready for Vercel deployment!
