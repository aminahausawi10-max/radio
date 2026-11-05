/**
 * Arab Hausa RTV - Universal Media Embed & Adaptive Video Player Engine
 */
(function(window) {
    'use strict';

    function adaptVideoContainer(video) {
        if (!video) return;
        var w = video.videoWidth;
        var h = video.videoHeight;
        if (!w || !h) return;

        var ratio = w / h;
        var container = video.closest('.arab-hausa-video-container') ||
                        video.closest('.arab-hausa-card-video-wrap') || 
                        video.closest('.arab-hausa-modal-video-wrap') || 
                        video.closest('.rhnd-video-container') || 
                        video.closest('.rhnd-card-video-wrap') || 
                        video.closest('.rhnd-modal-video-wrap') || 
                        video.closest('.public-media-preview') ||
                        video.parentElement;

        video.style.objectFit = 'contain';
        video.style.objectPosition = 'center';

        if (container) {
            container.classList.remove(
                'arab-hausa-video-portrait', 'arab-hausa-video-square', 'arab-hausa-video-landscape',
                'rhnd-video-portrait', 'rhnd-video-square', 'rhnd-video-landscape'
            );

            if (ratio < 0.85) {
                // Portrait (9:16)
                container.classList.add('arab-hausa-video-portrait', 'rhnd-video-portrait');
                if (container.classList.contains('arab-hausa-card-video-wrap') || container.classList.contains('rhnd-card-video-wrap')) {
                    container.style.height = '380px';
                }
            } else if (ratio >= 0.85 && ratio <= 1.15) {
                // Square (1:1)
                container.classList.add('arab-hausa-video-square', 'rhnd-video-square');
                if (container.classList.contains('arab-hausa-card-video-wrap') || container.classList.contains('rhnd-card-video-wrap')) {
                    container.style.height = '320px';
                }
            } else {
                // Landscape (16:9)
                container.classList.add('arab-hausa-video-landscape', 'rhnd-video-landscape');
                if (container.classList.contains('arab-hausa-card-video-wrap') || container.classList.contains('rhnd-card-video-wrap')) {
                    container.style.height = 'auto';
                }
            }
        }
    }

    window.adaptVideoContainer = adaptVideoContainer;

    function autoInitAllVideos() {
        var videos = document.querySelectorAll('video');
        for (var i = 0; i < videos.length; i++) {
            var v = videos[i];
            if (v.readyState >= 1) {
                adaptVideoContainer(v);
            } else {
                v.addEventListener('loadedmetadata', function() {
                    adaptVideoContainer(this);
                });
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInitAllVideos);
    } else {
        autoInitAllVideos();
    }

    const ARAB_HAUSA_MEDIA = {
        adaptVideoContainer: adaptVideoContainer,

        parse: function(url) {
            if (!url || typeof url !== 'string') return null;
            url = url.trim();
            if (!url) return null;

            // YouTube
            var ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([A-Za-z0-9_-]{11})/);
            if (ytMatch && ytMatch[1]) {
                var ytId = ytMatch[1];
                return {
                    type: 'youtube',
                    id: ytId,
                    url: url,
                    embedUrl: 'https://www.youtube.com/embed/' + ytId + '?rel=0&modestbranding=1',
                    thumbnail: 'https://img.youtube.com/vi/' + ytId + '/hqdefault.jpg'
                };
            }

            // TikTok
            var ttLong = url.match(/tiktok\.com\/@[^/?#\s]+\/(?:video|photo)\/(\d+)/);
            var ttShort = url.match(/(?:vm\.tiktok\.com|vt\.tiktok\.com|tiktok\.com\/t)\/([A-Za-z0-9_-]+)/);
            var ttIdMatch = ttLong || url.match(/tiktok\.com\/v\/(\d+)/);
            if (ttIdMatch || ttShort || url.indexOf('tiktok.com') !== -1) {
                var ttVideoId = ttIdMatch ? ttIdMatch[1] : (ttShort ? ttShort[1] : null);
                var ttEmbedUrl = ttIdMatch ? ('https://www.tiktok.com/embed/v2/' + ttIdMatch[1]) : null;
                return { type: 'tiktok', id: ttVideoId, url: url, embedUrl: ttEmbedUrl };
            }

            // Instagram
            var igMatch = url.match(/(?:instagram\.com|instagr\.am)\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
            if (igMatch && igMatch[1]) {
                return {
                    type: 'instagram',
                    id: igMatch[1],
                    url: url,
                    embedUrl: 'https://www.instagram.com/reel/' + igMatch[1] + '/embed/'
                };
            }

            // Facebook
            if (url.match(/(?:facebook\.com|fb\.watch|fb\.gg)/)) {
                return {
                    type: 'facebook',
                    id: null,
                    url: url,
                    embedUrl: 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(url) + '&show_text=0&width=500'
                };
            }

            // Direct Video (Cloudinary CDN, MP4, WebM, MOV)
            return { type: 'direct', id: null, url: url, embedUrl: url };
        },

        getCardMediaHtml: function(post, heightPx) {
            heightPx = heightPx || 220;
            if (!post || !post.video) return '';
            var media = this.parse(post.video);
            if (!media) return '';

            var clickFn = "event.stopPropagation(); if(typeof openNewsArticle==='function') openNewsArticle(" + post.id + ");";

            if (media.type === 'youtube' && media.thumbnail) {
                return '<div class="arab-hausa-card-video-wrap rhnd-card-video-wrap" style="height:' + heightPx + 'px;cursor:pointer;" onclick="' + clickFn + '">' +
                    '<img src="' + media.thumbnail + '" alt="Arab Hausa RTV Video" style="width:100%;height:100%;object-fit:contain;object-position:center;">' +
                    '<div style="position:absolute;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">' +
                        '<div style="width:50px;height:50px;border-radius:50%;background:#D32F2F;color:white;display:flex;align-items:center;justify-content:center;font-size:1.3rem;">▶</div>' +
                    '</div>' +
                '</div>';
            }

            if (media.type === 'tiktok' || media.type === 'instagram' || media.type === 'facebook') {
                return '<div class="arab-hausa-card-video-wrap rhnd-card-video-wrap" style="height:' + heightPx + 'px;cursor:pointer;flex-direction:column;" onclick="' + clickFn + '">' +
                    '<div style="width:52px;height:52px;border-radius:50%;background:#0A2342;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.5rem;margin-bottom:8px;">▶</div>' +
                    '<span style="color:#cbd5e1;font-size:0.85rem;font-weight:600;">Danna don kallon bidiyo (Arab Hausa RTV)</span>' +
                '</div>';
            }

            return '<div class="arab-hausa-card-video-wrap rhnd-card-video-wrap" onclick="event.stopPropagation()">' +
                '<video controls playsinline webkit-playsinline preload="metadata" onloadedmetadata="if(window.adaptVideoContainer)window.adaptVideoContainer(this)" style="width:100%;height:100%;object-fit:contain;object-position:center;display:block;background:#000;" src="' + post.video + '"></video>' +
            '</div>';
        },

        getModalEmbedHtml: function(videoUrl) {
            var media = this.parse(videoUrl);
            if (!media) return '';

            if (media.type === 'youtube' && media.embedUrl) {
                return '<div style="position:relative;padding-bottom:56.25%;height:0;margin-bottom:20px;border-radius:12px;overflow:hidden;background:#000;">' +
                    '<iframe src="' + media.embedUrl + '" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;" allowfullscreen></iframe>' +
                '</div>';
            }

            if (media.type === 'tiktok') {
                this.ensureThirdPartyScripts();
                if (media.embedUrl) {
                    return '<div style="margin-bottom:20px;display:flex;justify-content:center;border-radius:12px;overflow:hidden;background:#000;">' +
                        '<iframe src="' + media.embedUrl + '" style="width:100%;max-width:325px;height:600px;border:none;" allowfullscreen></iframe>' +
                    '</div>';
                }
                return '<div style="margin-bottom:20px;"><blockquote class="tiktok-embed" cite="' + media.url + '" data-video-id="' + media.id + '"><section></section></blockquote></div>';
            }

            if (media.type === 'instagram') {
                this.ensureThirdPartyScripts();
                return '<div style="margin-bottom:20px;display:flex;justify-content:center;"><blockquote class="instagram-media" data-instgrm-permalink="' + media.url + '" data-instgrm-version="14"><section></section></blockquote></div>';
            }

            if (media.type === 'facebook') {
                return '<div style="margin-bottom:20px;display:flex;justify-content:center;">' +
                    '<iframe src="' + media.embedUrl + '" style="width:100%;height:400px;border:none;" scrolling="no" allowfullscreen="true"></iframe>' +
                '</div>';
            }

            return '<div class="arab-hausa-modal-video-wrap rhnd-modal-video-wrap">' +
                '<video controls playsinline webkit-playsinline preload="metadata" onloadedmetadata="if(window.adaptVideoContainer)window.adaptVideoContainer(this)" style="width:100%;height:auto;max-height:75vh;object-fit:contain;object-position:center;display:block;background:#000;" src="' + media.url + '"></video>' +
            '</div>';
        },

        renderAdminPreview: function(containerId, url) {
            var container = document.getElementById(containerId);
            if (!container) return;
            if (!url) { container.style.display = 'none'; return; }
            var media = this.parse(url);
            if (!media) { container.style.display = 'none'; return; }

            var previewInner = '';
            if (media.type === 'youtube' || media.type === 'facebook') {
                previewInner = '<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;background:#000;margin-top:6px;"><iframe src="' + media.embedUrl + '" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"></iframe></div>';
            } else if (media.type === 'tiktok' || media.type === 'instagram') {
                previewInner = '<div style="width:100%;height:140px;background:#0A2342;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;margin-top:6px;">' + (media.type === 'tiktok' ? 'TikTok' : 'Instagram') + ' Link Detected</div>';
            } else {
                previewInner = '<div class="arab-hausa-video-container rhnd-video-container" style="margin-top:6px;max-height:280px;">' +
                    '<video controls playsinline webkit-playsinline preload="metadata" onloadedmetadata="if(window.adaptVideoContainer)window.adaptVideoContainer(this)" style="width:100%;height:auto;max-height:280px;border-radius:8px;background:#000;object-fit:contain;object-position:center;display:block;" src="' + media.url + '"></video>' +
                '</div>';
            }

            container.innerHTML = previewInner;
            container.style.display = 'block';
        },

        ensureThirdPartyScripts: function() {
            if (!document.getElementById('tiktok-embed-script')) {
                var s = document.createElement('script');
                s.id = 'tiktok-embed-script';
                s.src = 'https://www.tiktok.com/embed.js';
                s.async = true;
                document.body.appendChild(s);
            }
            if (!document.getElementById('ig-embed-script')) {
                var s2 = document.createElement('script');
                s2.id = 'ig-embed-script';
                s2.src = 'https://www.instagram.com/embed.js';
                s2.async = true;
                document.body.appendChild(s2);
            }
            if (window.instgrm && window.instgrm.Embeds) {
                setTimeout(function() { window.instgrm.Embeds.process(); }, 500);
            }
        }
    };

    window.ARAB_HAUSA_MEDIA = ARAB_HAUSA_MEDIA;
    window.RHND_MEDIA = ARAB_HAUSA_MEDIA; // Alias for compatibility
})(window);
