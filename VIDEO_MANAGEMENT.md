# Video Management with Next-Video

This project uses `next-video` for professional video handling on the landing page. This document outlines the setup, configuration, and best practices.

## Overview

- **Video Provider**: `next-video` v2.2.0
- **Video Location**: `/public/videos/`
- **Primary Video**: `chained_demo.mp4` (demo video for landing page)
- **Git Strategy**: Videos excluded from repository to save storage

## Configuration

### Next.js Configuration (`next.config.mjs`)

```javascript
import { withNextVideo } from "next-video/process";

export default withNextVideo(nextConfig, {
  folder: "videos",
  path: "/videos/",
  transform: {
    formats: ["mp4", "webm"],
    sizes: [
      { width: 1920, height: 1080, name: "1080p" },
      { width: 1280, height: 720, name: "720p" },
      { width: 854, height: 480, name: "480p" },
    ],
  },
  poster: {
    time: 1, // Generate poster at 1 second
  },
});
```

### Git Exclusions (`.gitignore`)

```gitignore
# next-video generated files and cache
public/_next-video/
.next-video/
videos/_next-video/

# Large video files (exclude to save Git storage)
public/videos/*.mp4
public/videos/*.webm
public/videos/*.mov
public/videos/*.avi
!public/videos/chained_demo.mp4

# Video processing artifacts
public/videos/*-poster.jpg
public/videos/*-poster.png
public/videos/*-720p.*
public/videos/*-480p.*
public/videos/*-1080p.*
```

## Usage

### Basic Video Component

```jsx
import Video from "next-video";

<Video
  src="/videos/chained_demo.mp4"
  controls
  autoPlay
  muted
  loop
  className="w-full h-auto rounded-xl opacity-90 hover:opacity-100 transition-opacity duration-300"
/>;
```

### Features

- **Automatic Optimization**: Multiple formats and resolutions generated
- **Poster Generation**: Automatic thumbnail creation
- **Responsive**: Adapts to different screen sizes
- **Performance**: Optimized loading and streaming
- **Accessibility**: Built-in controls and keyboard navigation

## File Management

### Adding New Videos

1. Place video files in `/public/videos/`
2. Use the `Video` component in your React components
3. Videos will be automatically processed and optimized

### Video Requirements

- **Format**: MP4 recommended (H.264 codec)
- **Size**: Keep under 50MB for web performance
- **Resolution**: 1920x1080 maximum recommended
- **Duration**: Keep under 2 minutes for landing page videos

### Deployment Considerations

- Videos are excluded from Git repository
- Upload videos directly to your hosting platform
- Ensure video files exist in production environment
- Consider using a CDN for large video files

## Troubleshooting

### Common Issues

1. **404 Errors**: Ensure video files exist in `/public/videos/`
2. **Build Errors**: Check `next.config.mjs` configuration
3. **Performance**: Optimize video file sizes before upload

### Development vs Production

- **Development**: Videos load from local `/public/videos/`
- **Production**: Ensure videos are uploaded to hosting platform
- **CDN**: Consider using external video hosting for better performance

## Best Practices

1. **Optimize Videos**: Use tools like FFmpeg to compress videos
2. **Multiple Formats**: Let next-video generate WebM for better compression
3. **Poster Images**: Automatic poster generation improves loading experience
4. **Accessibility**: Always include controls and consider captions
5. **Performance**: Use `loading="lazy"` for videos below the fold

## Security

- Videos are served from the same domain
- No external dependencies for video playback
- CSP headers configured to allow video content
- No tracking or analytics from video provider

## Maintenance

- Regularly check video file sizes
- Monitor loading performance
- Update next-video package as needed
- Clean up unused video files

## Support

For issues with video playback or configuration:

1. Check browser console for errors
2. Verify video file format compatibility
3. Test with different browsers
4. Review next-video documentation: https://next-video.dev
