// Cyberpunk Dopamine Blog - Engine
document.addEventListener('DOMContentLoaded', () => {
    let blogPosts = [];
    let currentFilterTag = null;
    let currentSearchQuery = '';

    const mainContent = document.getElementById('main-content');
    const searchInput = document.getElementById('search-input');
    const tagsContainer = document.getElementById('tags-container');
    const dopamineBar = document.getElementById('dopamine-bar');
    const dopaminePercent = document.getElementById('dopamine-percent');
    const dopamineStatus = document.getElementById('dopamine-status');

    // Fetch posts database
    fetch('posts.json')
        .then(res => res.json())
        .then(data => {
            blogPosts = data;
            initBlog();
        })
        .catch(err => {
            console.error('Error loading posts:', err);
            mainContent.innerHTML = `<div class="post-detail"><h2 style="color:var(--text-pink)">ERROR_LOADING_DATASTREAM</h2></div>`;
        });

    function initBlog() {
        // Render initial view based on current hash
        handleRouting();
        window.addEventListener('hashchange', handleRouting);

        // Generate tags sidebar
        renderTagsSidebar();

        // Search Input handler
        searchInput.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value.toLowerCase().trim();
            // Redirect to home if inside a post to show search results
            if (window.location.hash.startsWith('#/post/')) {
                window.location.hash = '#/';
            } else {
                renderPostList();
            }
        });

        // Initialize Dopamine Scroll Tracker
        window.addEventListener('scroll', updateDopamineMeter);
        updateDopamineMeter();
    }

    // Client-side Router
    function handleRouting() {
        const hash = window.location.hash || '#/';
        
        if (hash.startsWith('#/post/')) {
            const postId = hash.replace('#/post/', '');
            renderPostDetail(postId);
        } else {
            renderPostList();
        }
        
        // Reset scroll position on route change
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Render Grid View
    function renderPostList() {
        // Filter posts
        const filteredPosts = blogPosts.filter(post => {
            const matchesTag = !currentFilterTag || post.tags.includes(currentFilterTag);
            const matchesSearch = !currentSearchQuery || 
                post.title.toLowerCase().includes(currentSearchQuery) || 
                post.summary.toLowerCase().includes(currentSearchQuery) || 
                post.content.toLowerCase().includes(currentSearchQuery);
            return matchesTag && matchesSearch;
        });

        if (filteredPosts.length === 0) {
            mainContent.innerHTML = `
                <div class="post-detail" style="text-align: center; border-color: var(--border-pink); box-shadow: var(--glow-pink);">
                    <h2 style="color: var(--text-pink); font-family: 'Orbitron'; margin-bottom: 10px;">NO_DATA_MATCHES</h2>
                    <p style="color: var(--text-muted)">検索キーワードまたはタグのフィルターを変更してください。</p>
                </div>
            `;
            return;
        }

        let gridHtml = '<div class="posts-grid">';
        filteredPosts.forEach(post => {
            const tagsHtml = post.tags.map(tag => `<span class="post-tag">#${tag}</span>`).join(' ');
            
            gridHtml += `
                <article class="post-card" onclick="window.location.hash='#/post/${post.id}'">
                    <img class="post-card-thumb" src="${post.thumbnail}" alt="${post.title}" loading="lazy">
                    <div class="post-card-body">
                        <div class="post-meta">
                            <span>${post.date}</span>
                            <span>INDEX: [${post.id.substring(0,6)}]</span>
                        </div>
                        <h2 class="post-card-title">${escapeHTML(post.title)}</h2>
                        <p class="post-card-summary">${escapeHTML(post.summary)}</p>
                        <div class="post-tags">${tagsHtml}</div>
                    </div>
                </article>
            `;
        });
        gridHtml += '</div>';
        
        mainContent.innerHTML = gridHtml;
    }

    // Render Single Post
    function renderPostDetail(id) {
        const post = blogPosts.find(p => p.id === id);
        
        if (!post) {
            mainContent.innerHTML = `
                <div class="post-detail" style="border-color: var(--border-pink); box-shadow: var(--glow-pink);">
                    <button class="btn-back" onclick="window.location.hash='#/'">&lt; RETURN</button>
                    <h2 style="color: var(--text-pink)">404_POST_NOT_FOUND</h2>
                    <p style="margin-top: 15px;">指定されたアドレスは見つかりません。</p>
                </div>
            `;
            return;
        }

        const formattedContent = parseMarkdown(post.content);
        const tagsHtml = post.tags.map(tag => `<span class="post-tag">#${tag}</span>`).join(' ');

        mainContent.innerHTML = `
            <article class="post-detail">
                <button class="btn-back" onclick="window.location.hash='#/'">&lt; RETURN</button>
                <h1 class="post-detail-title">${escapeHTML(post.title)}</h1>
                <div class="post-detail-meta">
                    PUBLISHED: ${post.date} | TAGS: ${tagsHtml}
                </div>
                <div class="post-content">
                    ${formattedContent}
                </div>
            </article>
        `;
    }

    // Dynamic Tag Generator
    function renderTagsSidebar() {
        // Gather all unique tags
        const allTags = new Set();
        blogPosts.forEach(post => {
            post.tags.forEach(tag => allTags.add(tag));
        });

        let tagsHtml = `<button class="tag-btn ${!currentFilterTag ? 'active' : ''}" id="tag-all-btn">ALL_DATA</button>`;
        allTags.forEach(tag => {
            tagsHtml += `<button class="tag-btn ${currentFilterTag === tag ? 'active' : ''}" data-tag="${tag}">${tag}</button>`;
        });

        tagsContainer.innerHTML = tagsHtml;

        // Event delegation
        tagsContainer.querySelectorAll('.tag-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                tagsContainer.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (btn.id === 'tag-all-btn') {
                    currentFilterTag = null;
                } else {
                    currentFilterTag = btn.getAttribute('data-tag');
                }

                // Redirect to homepage if on post view when switching tags
                if (window.location.hash.startsWith('#/post/')) {
                    window.location.hash = '#/';
                } else {
                    renderPostList();
                }
            });
        });
    }

    const topScrollIndicator = document.getElementById('top-scroll-indicator');

    // Scroll Tracker for Dopamine Meter
    function updateDopamineMeter() {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        
        let scrollPercent = 0;
        if (docHeight > 0) {
            scrollPercent = Math.min(Math.round((scrollTop / docHeight) * 100), 100);
        }

        if (dopamineBar) {
            dopamineBar.style.width = `${scrollPercent}%`;
        }
        if (dopaminePercent) {
            dopaminePercent.innerText = `${scrollPercent}%`;
        }
        if (topScrollIndicator) {
            topScrollIndicator.style.width = `${scrollPercent}%`;
        }

        // Update dopamine status message based on scroll level
        if (scrollPercent >= 100) {
            dopamineStatus.innerText = "STATUS: DOPAMINE OVERLOAD!!";
            dopamineStatus.classList.add('overload');
            dopamineBar.style.background = 'linear-gradient(90deg, #ff007f, #00f0ff)';
        } else if (scrollPercent > 70) {
            dopamineStatus.innerText = "STATUS: EXCITED";
            dopamineStatus.classList.remove('overload');
            dopamineBar.style.background = 'linear-gradient(90deg, #9d00ff, #ff007f)';
        } else if (scrollPercent > 30) {
            dopamineStatus.innerText = "STATUS: INTERESTED";
            dopamineStatus.classList.remove('overload');
            dopamineBar.style.background = 'var(--border-purple)';
        } else {
            dopamineStatus.innerText = "STATUS: CALM";
            dopamineStatus.classList.remove('overload');
            dopamineBar.style.background = 'var(--border-purple)';
        }
    }

    // Super Simple Markdown Parser
    function parseMarkdown(md) {
        let html = md;
        
        // Escape HTML tags to prevent XSS but keep formatting
        // (Simplified since we control content)
        
        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Bold / Strong
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Inline Code
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        
        // Images: ![alt](url)
        html = html.replace(/\!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1">');
        
        // Paragraphs (split by double newline, wrapping non-HTML lines)
        const lines = html.split(/\n\n+/);
        html = lines.map(line => {
            const trimmed = line.trim();
            if (!trimmed) return '';
            if (trimmed.startsWith('<h') || trimmed.startsWith('<img') || trimmed.startsWith('<ul') || trimmed.startsWith('<ol')) {
                return trimmed;
            }
            return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
        }).join('');

        return html;
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});
